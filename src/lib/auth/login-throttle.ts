import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Lockout de login persistido em Postgres (tabela LoginAttempt) — sobrevive a
 * instâncias serverless. Bloqueio por e-mail: 5 falhas consecutivas em 15 min
 * → bloqueia; um login bem-sucedido zera a contagem efetiva. O IP é apenas
 * auditoria (não participa da regra — resistência a ataque distribuído).
 */

export const MAX_FAILS = 5;
export const WINDOW_MS = 15 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

/** Contagem de falhas na janela (após o último sucesso), num client tx/global. */
async function countFails(db: any, email: string): Promise<number> {
  const since = new Date(Date.now() - WINDOW_MS);
  const lastSuccess = await db.loginAttempt.findFirst({
    where: { email, success: true },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const floor =
    lastSuccess && lastSuccess.createdAt > since ? lastSuccess.createdAt : since;
  return db.loginAttempt.count({
    where: { email, success: false, createdAt: { gt: floor } },
  });
}

/**
 * true se o e-mail excedeu o limite de falhas na janela. Lança em erro de banco
 * — o chamador deve tratar como fail-closed. (Mantido para diagnóstico/testes;
 * o caminho de login usa reserveAttempt, que é atômico.)
 */
export async function isLockedOut(email: string): Promise<boolean> {
  return (await countFails(prisma, email)) >= MAX_FAILS;
}

/**
 * Verifica o limite E reserva uma tentativa de falha de forma ATÔMICA, sob um
 * advisory lock por e-mail. Fecha a corrida check-then-act: tentativas
 * concorrentes do mesmo e-mail são serializadas, então a (MAX_FAILS+1)-ésima
 * sempre enxerga as reservas anteriores e é bloqueada — mesmo em rajada
 * paralela. Retorna `true` se JÁ bloqueado (nenhuma reserva feita); `false` se
 * permitido (uma falha foi reservada — o chamador registra o sucesso depois,
 * que reseta a janela). Lança em erro de banco (fail-closed no chamador).
 */
export async function reserveAttempt(email: string, ip: string | null): Promise<boolean> {
  // Tudo numa ÚNICA instrução (uma transação implícita): advisory lock por
  // e-mail → contagem de falhas na janela → INSERT condicional. Serializa entre
  // instâncias sem manter uma transação interativa aberta (compatível com o
  // pool de 1 conexão do serverless). Insere a falha só se ainda sob o teto;
  // `inserted = 0` ⇒ bloqueado.
  const id = randomUUID();
  const windowSecs = Math.floor(WINDOW_MS / 1000);
  const rows = await prisma.$queryRaw<Array<{ inserted: number }>>`
    WITH lock AS (SELECT pg_advisory_xact_lock(hashtext(${email}))),
    last_success AS (
      SELECT COALESCE(MAX("createdAt"), to_timestamp(0)) AS ts
      FROM "LoginAttempt" WHERE email = ${email} AND success = true
    ),
    bound AS (
      SELECT GREATEST(
        (SELECT ts FROM last_success),
        now() - make_interval(secs => ${windowSecs})
      ) AS f
    ),
    fails AS (
      SELECT count(*)::int AS c
      FROM "LoginAttempt", bound
      WHERE email = ${email} AND success = false AND "createdAt" > bound.f
    ),
    ins AS (
      INSERT INTO "LoginAttempt" (id, email, ip, success, "createdAt")
      SELECT ${id}, ${email}, ${ip}, false, now() FROM fails WHERE fails.c < ${MAX_FAILS}
      RETURNING 1
    )
    SELECT (SELECT count(*)::int FROM ins) AS inserted
  `;
  const inserted = rows[0]?.inserted ?? 0;
  return inserted === 0; // nada inserido ⇒ já no teto ⇒ bloqueado
}

/** Registra uma tentativa (sucesso ou falha). */
export async function recordLoginAttempt(
  email: string,
  ip: string | null,
  success: boolean
): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ip, success } });
}

/** Limpeza best-effort de tentativas antigas (não lança). */
export async function pruneOldAttempts(): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    });
  } catch {
    // best-effort — silenciar
  }
}
