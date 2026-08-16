import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { webhookRateLimited, WEBHOOK_MAX_PER_MIN } from "@/lib/whatsapp/rate-limit";

/**
 * Rate-limit do webhook (008/FR-010): 30 req/min persistido no Postgres.
 * WebhookHit é global (sem dono) — limpamos a tabela entre casos.
 */

async function clearHits() {
  await prisma.webhookHit.deleteMany({});
}

beforeEach(clearHits);
afterAll(clearHits);

describe("webhookRateLimited", () => {
  it("permite até o limite na janela", async () => {
    for (let i = 0; i < WEBHOOK_MAX_PER_MIN; i++) {
      expect(await webhookRateLimited()).toBe(false);
    }
  });

  it("bloqueia a requisição acima do limite", async () => {
    for (let i = 0; i < WEBHOOK_MAX_PER_MIN; i++) await webhookRateLimited();
    expect(await webhookRateLimited()).toBe(true); // 31ª
  });

  it("hits antigos (fora da janela de 1 min) não contam", async () => {
    const old = new Date(Date.now() - 2 * 60_000);
    await prisma.webhookHit.createMany({
      data: Array.from({ length: WEBHOOK_MAX_PER_MIN + 5 }, () => ({ createdAt: old })),
    });
    expect(await webhookRateLimited()).toBe(false);
  });
});
