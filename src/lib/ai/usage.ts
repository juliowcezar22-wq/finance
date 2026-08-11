import { prisma } from "@/lib/prisma";
import { resolveOwnerId, runWithoutScope } from "@/lib/auth/owner-scope";

/**
 * Teto de consumo de IA por usuário por dia (M6). Bloqueia ANTES de contatar o
 * provedor (0 custo ao exceder). Contabiliza em tokens (prompt + completion).
 */

export const DAILY_TOKEN_CAP = Number(process.env.AI_DAILY_TOKEN_CAP) || 100_000;

export class AiBudgetExceededError extends Error {
  constructor() {
    super("Você atingiu o limite diário de uso da IA. Tente novamente amanhã.");
    this.name = "AiBudgetExceededError";
  }
}

/** Dia atual no fuso America/Sao_Paulo, normalizado para uma coluna DATE. */
function todaySP(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * Lança AiBudgetExceededError se o usuário atual já atingiu o teto do dia.
 * Sem dono resolvido (ex.: fora de request), não bloqueia nem contabiliza.
 * As operações usam ownerId explícito (runWithoutScope) para não depender de
 * particularidades da extensão de escopo em upsert de chave composta.
 */
export async function assertUnderDailyCap(): Promise<void> {
  const ownerId = await resolveOwnerId();
  if (!ownerId) return;
  const day = todaySP();
  const row = await runWithoutScope(() =>
    prisma.aiUsage.findUnique({
      where: { ownerId_day: { ownerId, day } },
      select: { promptTokens: true, completionTokens: true },
    })
  );
  const used = (row?.promptTokens ?? 0) + (row?.completionTokens ?? 0);
  if (used >= DAILY_TOKEN_CAP) throw new AiBudgetExceededError();
}

/** Contabiliza o consumo de uma chamada de IA para o usuário atual. */
export async function recordUsage(usage: {
  promptTokens: number;
  completionTokens: number;
}): Promise<void> {
  const ownerId = await resolveOwnerId();
  if (!ownerId) return;
  const day = todaySP();
  await runWithoutScope(() =>
    prisma.aiUsage.upsert({
      where: { ownerId_day: { ownerId, day } },
      create: {
        ownerId,
        day,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        calls: 1,
      },
      update: {
        promptTokens: { increment: usage.promptTokens },
        completionTokens: { increment: usage.completionTokens },
        calls: { increment: 1 },
      },
    })
  );
}
