import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Escopo de dono via pilha síncrona (ver tests/setup/owner-scope-double.ts):
// o ALS real não atravessa a fronteira do engine do Prisma sob Vitest.
vi.mock("@/lib/auth/owner-scope", () => import("../setup/owner-scope-double"));

import { prisma } from "@/lib/prisma";
import { runWithoutScope } from "@/lib/auth/owner-scope";
import {
  asUser,
  createTwoUsers,
  cleanupTestData,
  TEST_PREFIX,
  type TestUser,
} from "../setup/db";

/**
 * Teste de intrusão entre dois usuários (US1). Valida o mecanismo real de
 * isolamento — a extensão de escopo de dono em src/lib/prisma.ts — cobrindo
 * leitura, atualização e exclusão cruzadas. Após a feature 002 (ownerId NOT
 * NULL) o banco também REJEITA inserir registro sem dono. FR-001, FR-002, FR-005.
 */

let userA: TestUser;
let userB: TestUser;

beforeAll(async () => {
  const users = await createTwoUsers();
  userA = users.a;
  userB = users.b;
});

afterAll(async () => {
  await cleanupTestData([userA.id, userB.id]);
});

/** Cria uma conta e um cartão+fatura pertencentes ao dono informado. */
async function seedOwned(ownerId: string) {
  return asUser(ownerId, async () => {
    const account = await prisma.account.create({
      data: { name: `${TEST_PREFIX}acc` },
    });
    const card = await prisma.creditCard.create({
      data: { name: `${TEST_PREFIX}card`, closingDay: 1, dueDay: 10 },
    });
    const invoice = await prisma.creditCardInvoice.create({
      data: {
        cardId: card.id,
        referenceYear: 2026,
        referenceMonth: 1,
        closingDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-10"),
        total: 100,
        paid: 0,
        status: "aberta",
      },
    });
    const goal = await prisma.goal.create({
      data: { name: `${TEST_PREFIX}goal`, targetAmount: 500 },
    });
    return { accountId: account.id, cardId: card.id, invoiceId: invoice.id, goalId: goal.id };
  });
}

describe("Isolamento cross-tenant (extensão Prisma)", () => {
  it("B não LÊ registros de A por id (findUnique → null)", async () => {
    const a = await seedOwned(userA.id);
    await asUser(userB.id, async () => {
      expect(await prisma.account.findUnique({ where: { id: a.accountId } })).toBeNull();
      expect(await prisma.creditCardInvoice.findUnique({ where: { id: a.invoiceId } })).toBeNull();
      expect(await prisma.goal.findUnique({ where: { id: a.goalId } })).toBeNull();
    });
    // A continua enxergando o próprio
    await asUser(userA.id, async () => {
      expect(await prisma.account.findUnique({ where: { id: a.accountId } })).not.toBeNull();
    });
  });

  it("B não LISTA registros de A (findMany não vaza)", async () => {
    const a = await seedOwned(userA.id);
    await asUser(userB.id, async () => {
      const accounts = await prisma.account.findMany({});
      expect(accounts.some((x) => x.id === a.accountId)).toBe(false);
    });
  });

  it("B não ATUALIZA registro de A (update → erro genérico, dado intacto)", async () => {
    const a = await seedOwned(userA.id);
    await asUser(userB.id, async () => {
      await expect(
        prisma.goal.update({ where: { id: a.goalId }, data: { name: "hackeado" } })
      ).rejects.toThrow();
    });
    // valor permanece o original
    const untouched = await asUser(userA.id, () =>
      prisma.goal.findUnique({ where: { id: a.goalId } })
    );
    expect(untouched?.name).toBe(`${TEST_PREFIX}goal`);
  });

  it("B não paga/edita fatura de A (invoice update → erro, dado intacto)", async () => {
    const a = await seedOwned(userA.id);
    await asUser(userB.id, async () => {
      await expect(
        prisma.creditCardInvoice.update({
          where: { id: a.invoiceId },
          data: { paid: 999, status: "paga" },
        })
      ).rejects.toThrow();
    });
    const inv = await asUser(userA.id, () =>
      prisma.creditCardInvoice.findUnique({ where: { id: a.invoiceId } })
    );
    expect(Number(inv?.paid)).toBe(0); // paid agora é Decimal
    expect(inv?.status).toBe("aberta");
  });

  it("B não EXCLUI registro de A (delete → erro, dado permanece)", async () => {
    const a = await seedOwned(userA.id);
    await asUser(userB.id, async () => {
      await expect(
        prisma.account.delete({ where: { id: a.accountId } })
      ).rejects.toThrow();
    });
    const still = await asUser(userA.id, () =>
      prisma.account.findUnique({ where: { id: a.accountId } })
    );
    expect(still).not.toBeNull();
  });

  it("banco REJEITA inserir registro sem dono (ownerId null) — FR-005", async () => {
    // Após a 002, ownerId é NOT NULL: mesmo forçando (bypass do escopo), o
    // banco recusa um registro órfão. Órfãos deixam de ser possíveis na origem.
    await expect(
      runWithoutScope(() =>
        prisma.account.create({ data: { name: `${TEST_PREFIX}null`, ownerId: null } as any })
      )
    ).rejects.toThrow();
  });
});
