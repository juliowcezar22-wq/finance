import { prisma } from "@/lib/prisma";

/**
 * Guardas de desativação de usuário (FR-008 da feature 002).
 *
 * IMPORTANTE: este módulo NÃO é "use server" de propósito — as funções aqui não
 * viram endpoints invocáveis. As server actions públicas (src/lib/actions/users.ts)
 * fazem `requireAdmin()` e então chamam estas funções.
 */

export const LAST_ADMIN_ERROR =
  "Não é possível remover o último administrador ativo (desativar ou rebaixar de ADMIN).";

/**
 * Roda `fn` numa transação SERIALIZABLE com retry. O SERIALIZABLE detecta o
 * conflito de duas desativações concorrentes de admins DIFERENTES (que sob
 * READ COMMITTED ambas passariam, zerando os admins) e aborta uma; o retry
 * reavalia já com a mudança visível e rejeita corretamente.
 */
export async function txSerializable<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (e: any) {
      // P2034: falha de serialização / conflito de escrita / deadlock.
      if (e?.code === "P2034" && attempt < 2) continue;
      throw e;
    }
  }
}

/** Lança se `id` é o único admin ativo (dentro da transação `tx`). */
export async function assertOtherActiveAdmin(tx: any, id: string) {
  const others = await tx.user.count({
    where: { role: "ADMIN", active: true, id: { not: id } },
  });
  if (others < 1) throw new Error(LAST_ADMIN_ERROR);
}

/**
 * Desativa um usuário sem deixar o sistema sem admin ativo (FR-008): checa e
 * escreve sob SERIALIZABLE (com retry), fechando a corrida de desativações
 * concorrentes de admins diferentes. Lança em violação (o caller converte).
 */
export async function deactivateGuarded(id: string) {
  await txSerializable(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id },
      select: { role: true, active: true },
    });
    if (!target) throw new Error("Usuário não encontrado.");
    if (target.role === "ADMIN" && target.active) await assertOtherActiveAdmin(tx, id);
    await tx.user.update({ where: { id }, data: { active: false } });
  });
}
