/**
 * Logger estruturado do Nummiq (feature 011). Sem vendor: emite JSON por linha
 * no stdout/stderr — a Vercel indexa e filtra nativamente. Pronto para plugar
 * um coletor (Sentry etc.) depois: basta encaminhar dentro de `emit`.
 *
 * Uso:
 *   log.info("webhook.received", { from });
 *   log.error("ai.provider_failed", { provider, status }, err);
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, event: string, ctx?: Record<string, unknown>, err?: unknown) {
  // ctx primeiro: os campos do envelope (ts/level/event) sempre vencem.
  const entry: Record<string, unknown> = {
    ...ctx,
    ts: new Date().toISOString(),
    level,
    event,
  };
  if (err) {
    entry.error = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.stack && level === "error") {
      entry.stack = err.stack.split("\n").slice(0, 6).join("\n");
    }
  }
  let line: string;
  try {
    line = JSON.stringify(entry, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  } catch {
    // O logger NUNCA pode lançar (roda dentro de catch de rotas): fallback mínimo.
    line = JSON.stringify({ ts: entry.ts, level, event, logError: "unserializable ctx" });
  }
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, ctx?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") emit("debug", event, ctx);
  },
  info: (event: string, ctx?: Record<string, unknown>) => emit("info", event, ctx),
  warn: (event: string, ctx?: Record<string, unknown>, err?: unknown) =>
    emit("warn", event, ctx, err),
  error: (event: string, ctx?: Record<string, unknown>, err?: unknown) =>
    emit("error", event, ctx, err),
};
