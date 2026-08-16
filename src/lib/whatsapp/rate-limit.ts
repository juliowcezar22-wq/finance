import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const WEBHOOK_MAX_PER_MIN = 30;

/**
 * Rate-limit do webhook (30 req/min, janela deslizante) persistido no Postgres —
 * sobrevive a instâncias serverless (mesmo padrão do lockout de login da 001).
 *
 * UMA única instrução SQL: limpa hits velhos (>10 min) + registra o hit atual +
 * conta os ANTERIORES na janela. CTEs de modificação (INSERT/DELETE) sempre
 * executam (diferente de CTE SELECT, que é podada se não referenciada). Datas
 * calculadas só com o relógio do banco (sem skew). Preferimos 1 statement a
 * `$transaction([...])`: elimina qualquer interação com o batch do client
 * estendido e com promises concorrentes no pool de 1 conexão (as contagens
 * intermitentes que motivaram a reescrita vieram de suítes de teste
 * concorrentes no banco compartilhado).
 *
 * O count NÃO vê o INSERT do próprio statement (mesmo snapshot), então `c` são
 * os hits anteriores: c >= MAX ⇒ este é o (MAX+1)º ou além ⇒ bloqueia.
 * Fail-closed: erro de banco → o chamador NEGA a requisição.
 */
export async function webhookRateLimited(): Promise<boolean> {
  const id = randomUUID();
  const rows = await prisma.$queryRaw<Array<{ c: number }>>`
    WITH cleanup AS (
      DELETE FROM "WebhookHit" WHERE "createdAt" < now() - interval '10 minutes'
    ),
    ins AS (
      INSERT INTO "WebhookHit" (id) VALUES (${id})
    )
    SELECT count(*)::int AS c FROM "WebhookHit"
    WHERE "createdAt" > now() - interval '60 seconds'
  `;
  const priorHits = rows[0]?.c ?? Number.MAX_SAFE_INTEGER; // sem resposta → bloqueia
  return priorHits >= WEBHOOK_MAX_PER_MIN;
}
