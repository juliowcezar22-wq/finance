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

/**
 * true se o e-mail excedeu o limite de falhas na janela. Conta apenas falhas
 * posteriores ao último sucesso. Lança em erro de banco — o chamador deve
 * tratar como fail-closed (negar o login).
 */
export async function isLockedOut(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: { email, success: true },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const floor =
    lastSuccess && lastSuccess.createdAt > since ? lastSuccess.createdAt : since;
  const fails = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gt: floor } },
  });
  return fails >= MAX_FAILS;
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
