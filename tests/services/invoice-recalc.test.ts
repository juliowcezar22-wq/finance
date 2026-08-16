import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("@/lib/auth/owner-scope", () => import("../setup/owner-scope-double"));

import { prisma } from "@/lib/prisma";
import { runWithOwner, runWithoutScope } from "@/lib/auth/owner-scope";
import { recalcInvoiceTotal } from "@/lib/services/invoices";
import { toNum } from "@/lib/services/money";
import { TEST_PREFIX } from "../setup/db";

/**
 * recalcInvoiceTotal (M11/FR-001): compras somam, estornos (receita/ajuste)
 * abatem, cancelados ficam de fora. Integração contra o banco de teste.
 */

const P = `${TEST_PREFIX}recalc-`;
let userId: string;
let cardId: string;
let invoiceId: string;
const ref = new Date("2026-04-10T12:00:00.000Z");

beforeAll(async () => {
  const u = await runWithoutScope(() =>
    prisma.user.create({
      data: {
        name: `${P}u`,
        email: `${P}${Date.now()}@example.test`,
        passwordHash: "x",
        role: "USER",
        active: true,
      },
    })
  );
  userId = u.id;
  await runWithOwner(userId, async () => {
    const card = await prisma.creditCard.create({
      data: { name: `${P}card`, closingDay: 1, dueDay: 10 },
    });
    cardId = card.id;
    const inv = await prisma.creditCardInvoice.create({
      data: {
        cardId,
        referenceYear: 2026,
        referenceMonth: 4,
        closingDate: ref,
        dueDate: ref,
        total: 0,
        paid: 0,
        status: "aberta",
      },
    });
    invoiceId = inv.id;
    await prisma.transaction.createMany({
      data: [
        {
          date: ref,
          description: `${P}compra1`,
          amount: 120.5,
          type: "despesa",
          status: "pendente",
          invoiceId,
          cardId,
        },
        {
          date: ref,
          description: `${P}compra2`,
          amount: 79.5,
          type: "despesa",
          status: "pago",
          invoiceId,
          cardId,
        },
        {
          date: ref,
          description: `${P}estorno`,
          amount: 30,
          type: "ajuste",
          status: "pendente",
          invoiceId,
          cardId,
        },
        {
          date: ref,
          description: `${P}credito`,
          amount: 10,
          type: "receita",
          status: "pago",
          invoiceId,
          cardId,
        },
        {
          date: ref,
          description: `${P}cancelada`,
          amount: 999,
          type: "despesa",
          status: "cancelado",
          invoiceId,
          cardId,
        },
      ],
    });
  });
});

afterAll(async () => {
  await runWithoutScope(async () => {
    await prisma.transaction.deleteMany({ where: { ownerId: userId } });
    await prisma.creditCardInvoice.deleteMany({ where: { ownerId: userId } });
    await prisma.creditCard.deleteMany({ where: { ownerId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });
});

describe("recalcInvoiceTotal", () => {
  it("compras − estornos/créditos, cancelados fora: 120,50 + 79,50 − 30 − 10 = 160,00", async () => {
    await runWithOwner(userId, () => recalcInvoiceTotal(invoiceId));
    const inv = await runWithOwner(userId, () =>
      prisma.creditCardInvoice.findUnique({ where: { id: invoiceId } })
    );
    expect(toNum(inv!.total)).toBe(160);
  });

  it("idempotente: recalcular de novo não muda o total", async () => {
    await runWithOwner(userId, () => recalcInvoiceTotal(invoiceId));
    await runWithOwner(userId, () => recalcInvoiceTotal(invoiceId));
    const inv = await runWithOwner(userId, () =>
      prisma.creditCardInvoice.findUnique({ where: { id: invoiceId } })
    );
    expect(toNum(inv!.total)).toBe(160);
  });
});
