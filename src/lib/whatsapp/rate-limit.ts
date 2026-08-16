import { prisma } from "@/lib/prisma";

export const WEBHOOK_MAX_PER_MIN = 30;
const WINDOW_MS = 60_000;

/**
 * Rate-limit do webhook (30 req/min, janela deslizante) persistido no Postgres —
 * sobrevive a instâncias serverless (mesmo padrão do lockout de login da 001).
 * Registra o hit e conta na MESMA instrução (atômico o suficiente para um teto
 * de abuso; não precisa de lock: exceder por corrida em ±1 não é significativo).
 * Fail-closed: erro de banco → o chamador NEGA a requisição.
 * Limpeza best-effort de hits antigos (> 10 min) embutida.
 */
export async function webhookRateLimited(): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [, count] = await prisma.$transaction([
    prisma.webhookHit.create({ data: {} }),
    prisma.webhookHit.count({ where: { createdAt: { gt: since } } }),
  ]);
  // limpeza oportunista, sem bloquear a resposta
  void prisma.webhookHit
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 10 * WINDOW_MS) } } })
    .catch(() => {});
  return count > WEBHOOK_MAX_PER_MIN;
}
