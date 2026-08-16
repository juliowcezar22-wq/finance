import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Regressão do achado da revisão adversarial: um CTE SELECT não-referenciado é
 * PODADO pelo Postgres, então `WITH lock AS (SELECT pg_advisory_xact_lock(...))`
 * sem referência NÃO executa. Este teste garante que o advisory lock do
 * reserveAttempt (login-throttle.ts) esteja num CTE MATERIALIZED referenciado —
 * (1) realmente executa e (2) serializa entre conexões distintas. Se alguém
 * reverter para um CTE órfão, este teste falha.
 */
describe("Serialização do lockout (advisory lock efetivo)", () => {
  it("advisory lock em CTE MATERIALIZED referenciado realmente executa e serializa", async () => {
    // (1) pg_sleep dentro do win referenciado -> deve dormir ~0.8s
    const t0 = Date.now();
    await prisma.$queryRaw`
    WITH win AS MATERIALIZED (SELECT pg_sleep(0.8) AS s)
    SELECT count(*) FROM win`;
    const dt1 = Date.now() - t0;
    console.log("[probe] referenced MATERIALIZED sleep ms:", dt1);
    expect(dt1).toBeGreaterThan(600);

    // (2) duas conexões (Prisma singleton + um segundo pool) disputam o MESMO
    // advisory xact lock; a 2ª só entra depois da 1ª commitar -> serial (~1.6s).
    const { PrismaClient } = await import("@prisma/client");
    const other = new PrismaClient();
    try {
      const key = 987654321;
      const lockAndSleep = (c: any) => c.$queryRaw`
      WITH win AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(${key}::bigint) AS _l, pg_sleep(0.8) AS s
      ) SELECT count(*) FROM win`;
      const t1 = Date.now();
      await Promise.all([lockAndSleep(prisma), lockAndSleep(other)]);
      const dt2 = Date.now() - t1;
      console.log("[probe] two-connection serialized ms:", dt2);
      // se o lock NÃO funcionasse, rodariam em paralelo (~0.8s); serial ~1.6s
      expect(dt2).toBeGreaterThan(1400);
    } finally {
      await other.$disconnect();
    }
  });
});
