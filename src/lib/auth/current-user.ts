import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session";
import { getUserFromToken, type CurrentUser } from "./resolve-user";

export type { CurrentUser };
export { getUserFromToken };

/**
 * Lê a sessão do cookie e devolve o usuário ativo correspondente.
 * Retorna null quando não há sessão válida, o usuário foi desativado ou a
 * sessão foi revogada (logout).
 *
 * Memoizado por request (React.cache): layout + página + actions dentro da
 * mesma renderização compartilham 1 única consulta ao banco. A resolução em si
 * vive em resolve-user.ts (sem React), para ser testável.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return getUserFromToken(token);
});
