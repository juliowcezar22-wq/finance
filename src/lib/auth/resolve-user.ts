import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};

/**
 * Resolve o usuário a partir de um token de sessão, sem depender de `cookies()`
 * nem de `React.cache` — o que a torna testável fora do runtime do Next.
 * Rejeita quando: token inválido/expirado; usuário inexistente ou inativo; ou a
 * versão de sessão do token diverge da do usuário (revogação no logout).
 */
export async function getUserFromToken(
  token: string | undefined | null
): Promise<CurrentUser | null> {
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user || !user.active) return null;
  if (payload.sv !== user.sessionVersion) return null; // sessão revogada

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role as "ADMIN" | "USER") ?? "USER",
  };
}
