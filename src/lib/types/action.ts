/**
 * Resultado padronizado de server actions (008/FR-007).
 *
 * Uso:
 *   export async function saveThing(fd: FormData): Promise<ActionResult> {
 *     await getViewer();
 *     const parsed = Schema.safeParse(...);
 *     if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
 *     ...
 *     return ok();
 *   }
 *
 * Regra (constituição, princípio VII): validação com safeParse na borda; erros
 * viram `err(...)` tratado — nunca exceção crua estourando no client.
 */
export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export function ok<T = void>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

export function err<T = void>(error: string): ActionResult<T> {
  return { ok: false, error };
}

/**
 * Converte exceções em ActionResult (para actions que chamam serviços que podem
 * lançar): use em volta do corpo após a autenticação.
 */
export async function guarded<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    return err(msg);
  }
}
