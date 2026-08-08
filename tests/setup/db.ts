import { prisma } from "@/lib/prisma";
import { runWithOwner, runWithoutScope } from "@/lib/auth/owner-scope";

/**
 * Helpers de teste que respeitam o banco compartilhado dev/test: tudo que é
 * criado leva o prefixo `test-001-` e é removido no fim; nunca truncamos
 * tabelas. Escritas de setup/limpeza usam runWithoutScope (acesso completo).
 */

export const TEST_PREFIX = "test-001-";

export type TestUser = { id: string; email: string };

/** Cria dois usuários de teste isolados e retorna seus ids. */
export async function createTwoUsers(): Promise<{ a: TestUser; b: TestUser }> {
  return runWithoutScope(async () => {
    const mk = async (tag: string): Promise<TestUser> => {
      const email = `${TEST_PREFIX}${tag}-${cuidish()}@example.test`;
      const u = await prisma.user.create({
        data: {
          name: `${TEST_PREFIX}${tag}`,
          email,
          passwordHash: "x", // não usado nestes testes
          role: "USER",
          active: true,
        },
      });
      return { id: u.id, email };
    };
    return { a: await mk("a"), b: await mk("b") };
  });
}

/** Executa `fn` como o dono `userId` (escopo da extensão Prisma). */
export function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return runWithOwner(userId, fn);
}

/** Remove todos os registros criados pelos testes (por prefixo/dono). */
export async function cleanupTestData(userIds: string[]): Promise<void> {
  await runWithoutScope(async () => {
    // Ordem: filhos antes de pais para não esbarrar em FK.
    await prisma.receivable.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.transaction.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.creditCardInvoice.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.accountCard.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.creditCard.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.goal.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.account.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.whatsAppMessage.deleteMany({
      where: { fromNumber: { startsWith: TEST_PREFIX } },
    });
    await prisma.loginAttempt.deleteMany({
      where: { email: { startsWith: TEST_PREFIX } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });
}

// Sufixo aleatório simples para nomes únicos (sem depender de libs).
function cuidish(): string {
  return Math.abs(hashNow()).toString(36);
}
let counter = 0;
function hashNow(): number {
  counter += 1;
  return (Date.now() ^ (counter << 20)) >>> 0;
}
