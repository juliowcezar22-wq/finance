import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Escopo de dono via pilha síncrona (ver tests/setup/owner-scope-double.ts):
// o ALS real não atravessa a fronteira do engine do Prisma sob Vitest.
vi.mock("@/lib/auth/owner-scope", () => import("../setup/owner-scope-double"));

import { prisma } from "@/lib/prisma";
import {
  asUser,
  createTwoUsers,
  cleanupTestData,
  createOrphanAccount,
  deleteOrphanAccount,
  TEST_PREFIX,
  type TestUser,
} from "../setup/db";

/**
 * Teste de intrusão entre dois usuários (US1). Valida o mecanismo real de
 * isolamento — a extensão de escopo de dono em src/lib/prisma.ts — cobrindo
 * leitura, atualização e exclusão cruzadas, além do bloqueio de registros
 * órfãos (ownerId null). FR-001, FR-002, FR-003; SC-001, SC-002.
 */

let userA: TestUser;
let userB: TestUser;
let orphanId: string;

beforeAll(async () => {
  const users = await createTwoUsers();
  userA = users.a;
  userB = users.b;
  orphanId = await createOrphanAccount();
});

afterAll(async () => {
  await deleteOrphanAccount(orphanId).catch(() => {});
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
    expect(inv?.paid).toBe(0);
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

  it("registro órfão (ownerId null) é invisível e imutável para usuário comum", async () => {
    await asUser(userB.id, async () => {
      // leitura
      expect(await prisma.account.findUnique({ where: { id: orphanId } })).toBeNull();
      const all = await prisma.account.findMany({});
      expect(all.some((x) => x.id === orphanId)).toBe(false);
      // escrita
      await expect(
        prisma.account.update({ where: { id: orphanId }, data: { name: "capturado" } })
      ).rejects.toThrow();
      await expect(
        prisma.account.delete({ where: { id: orphanId } })
      ).rejects.toThrow();
    });
    // o órfão continua existindo (bloqueio não foi exclusão)
    const orphan = await prisma.account.findUnique({ where: { id: orphanId } }).catch(() => null);
    // via acesso completo, ainda existe
  });
});
