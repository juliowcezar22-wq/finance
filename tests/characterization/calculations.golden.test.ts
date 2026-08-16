import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Escopo de dono via pilha síncrona (o ALS real não atravessa o engine do
// Prisma sob Vitest — ver tests/setup/owner-scope-double.ts).
vi.mock("@/lib/auth/owner-scope", () => import("../setup/owner-scope-double"));

import { prisma } from "@/lib/prisma";
import { runWithOwner, runWithoutScope } from "@/lib/auth/owner-scope";
import * as calc from "@/lib/services/calculations";
import { TEST_PREFIX } from "../setup/db";

/**
 * Caracterização (golden) de src/lib/services/calculations.ts — FR-003/FR-004.
 * Semeia um dataset FIXO e trava os resultados atuais. Roda VERDE em Float
 * (baseline) e deve continuar VERDE após a migração Float→Decimal.
 *
 * Comparação na PRECISÃO EXIBIDA: dinheiro ao centavo (2 casas), razões a 4
 * casas — NÃO igualdade bruta de float (o Decimal legitimamente remove o ruído
 * de 0,1+0,2; isso é melhoria, não regressão).
 */

const P = `${TEST_PREFIX}gold-`;
const REF = new Date("2026-03-15T12:00:00.000Z"); // março/2026
const inMarch = new Date("2026-03-10T12:00:00.000Z");

let userId: string;
let personId: string;
let cardId: string;
let goalId: string;

const money = (n: number) => Number(n.toFixed(2));
const ratio = (n: number) => Number(n.toFixed(4));

beforeAll(async () => {
  const seeded = await runWithoutScope(async () => {
    const u = await prisma.user.create({
      data: {
        name: `${P}user`,
        email: `${P}${Date.now()}@example.test`,
        passwordHash: "x",
        role: "USER",
        active: true,
      },
    });
    return u.id;
  });
  userId = seeded;

  await runWithOwner(userId, async () => {
    const person = await prisma.person.create({ data: { name: `${P}pessoa` } });
    personId = person.id;
    const card = await prisma.creditCard.create({
      data: { name: `${P}cartao`, closingDay: 1, dueDay: 10 },
    });
    cardId = card.id;
    const goal = await prisma.goal.create({
      data: { name: `${P}meta`, targetAmount: 2000, currentAmount: 500 },
    });
    goalId = goal.id;

    // Transações (março/2026)
    await prisma.transaction.createMany({
      data: [
        {
          date: inMarch,
          description: `${P}t1`,
          amount: 100,
          type: "despesa",
          status: "pago",
          belongsTo: "pessoal",
          cardId,
        },
        {
          date: inMarch,
          description: `${P}t2`,
          amount: 50,
          type: "despesa",
          status: "pendente",
          belongsTo: "empresa",
        },
        {
          date: inMarch,
          description: `${P}t3`,
          amount: 25.5,
          type: "despesa",
          status: "devendo",
          belongsTo: "pessoal",
          responsibleId: personId,
        },
        {
          date: inMarch,
          description: `${P}t4`,
          amount: 200,
          type: "receita",
          status: "pago",
          belongsTo: "pessoal",
        },
        {
          date: inMarch,
          description: `${P}t5`,
          amount: 999,
          type: "despesa",
          status: "cancelado",
          belongsTo: "pessoal",
        },
      ],
    });

    // Receitas agora vivem em Transaction (type=receita): "pago" = recebida,
    // "pendente" = prevista (feature 005 — unificação de movimentações).
    await prisma.transaction.createMany({
      data: [
        {
          date: inMarch,
          description: `${P}r1`,
          amount: 300,
          type: "receita",
          status: "pago",
          belongsTo: "pessoal",
        },
        {
          date: inMarch,
          description: `${P}r2`,
          amount: 150,
          type: "receita",
          status: "pendente",
          belongsTo: "pessoal",
        },
      ],
    });

    await prisma.cashBox.createMany({
      data: [
        { name: `${P}cx1`, currentAmount: 1000, type: "EMERGENCY" },
        { name: `${P}cx2`, currentAmount: 500, type: "PERSONAL" },
      ],
    });

    await prisma.creditCardInvoice.createMany({
      data: [
        {
          cardId,
          referenceYear: 2026,
          referenceMonth: 3,
          closingDate: inMarch,
          dueDate: inMarch,
          total: 400,
          paid: 100,
          status: "aberta",
        },
        {
          cardId,
          referenceYear: 2026,
          referenceMonth: 2,
          closingDate: inMarch,
          dueDate: inMarch,
          total: 200,
          paid: 200,
          status: "paga",
        },
      ],
    });

    await prisma.receivable.create({
      data: { personId, amount: 80, dueDate: inMarch, status: "aberto" },
    });
  });
});

afterAll(async () => {
  await runWithoutScope(async () => {
    await prisma.receivable.deleteMany({ where: { ownerId: userId } });
    await prisma.transaction.deleteMany({ where: { ownerId: userId } });
    await prisma.creditCardInvoice.deleteMany({ where: { ownerId: userId } });
    await prisma.income.deleteMany({ where: { ownerId: userId } });
    await prisma.cashBoxMovement.deleteMany({ where: { ownerId: userId } });
    await prisma.cashBox.deleteMany({ where: { ownerId: userId } });
    await prisma.goal.deleteMany({ where: { ownerId: userId } });
    await prisma.creditCard.deleteMany({ where: { ownerId: userId } });
    await prisma.person.deleteMany({ where: { ownerId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });
});

// Executa uma função de calculations.ts no escopo do usuário de teste.
const as = <T>(fn: () => Promise<T>) => runWithOwner(userId, fn);

describe("Golden — totais monetários (ao centavo)", () => {
  it("totalDespesasMes = 175,50", async () =>
    expect(money((await as(() => calc.totalDespesasMes(REF))) as number)).toBe(175.5));
  it("totalReceitasMes = 500,00", async () =>
    expect(money((await as(() => calc.totalReceitasMes(REF))) as number)).toBe(500));
  it("receitasPrevistasMes = 150,00", async () =>
    expect(money((await as(() => calc.receitasPrevistasMes(REF))) as number)).toBe(150));
  it("despesasPrevistasMes = 75,50", async () =>
    expect(money((await as(() => calc.despesasPrevistasMes(REF))) as number)).toBe(75.5));
  it("despesasPagasMes = 100,00", async () =>
    expect(money((await as(() => calc.despesasPagasMes(REF))) as number)).toBe(100));
  it("faturasPagasMes = 200,00", async () =>
    expect(money((await as(() => calc.faturasPagasMes(REF))) as number)).toBe(200));
  it("totalEmCaixa = 1500,00", async () =>
    expect(money((await as(() => calc.totalEmCaixa())) as number)).toBe(1500));
  it("totalReservaEmergencia = 1000,00", async () =>
    expect(money((await as(() => calc.totalReservaEmergencia())) as number)).toBe(1000));
  it("totalAReceber = 80,00", async () =>
    expect(money((await as(() => calc.totalAReceber())) as number)).toBe(80));
  it("saldoPrevistoMes = 324,50", async () =>
    expect(money((await as(() => calc.saldoPrevistoMes(REF))) as number)).toBe(324.5));
  it("sobraReal = 200,00", async () =>
    expect(money((await as(() => calc.sobraReal(REF))) as number)).toBe(200));
  it("saldoPrevistoCompleto = 354,50", async () =>
    expect(money((await as(() => calc.saldoPrevistoCompleto(REF))) as number)).toBe(354.5));
  it("gastosPorPertenceA(pessoal) = 125,50", async () =>
    expect(money((await as(() => calc.gastosPorPertenceA("pessoal", REF))) as number)).toBe(125.5));
});

describe("Golden — faturas e limites", () => {
  it("totalFaturas(abertas...) = {400,100,300}", async () => {
    const f = await as(() => calc.totalFaturas(["aberta", "fechada", "parcial", "atrasada"]));
    expect(money(f.total)).toBe(400);
    expect(money(f.paid)).toBe(100);
    expect(money(f.openAmount)).toBe(300);
  });
  it("limiteUsado(cartao) = 300 (aberta: 400-100)", async () =>
    expect(money((await as(() => calc.limiteUsado(cardId))) as number)).toBe(300));
});

describe("Golden — razões e classificações (precisão exibida)", () => {
  it("taxaEndividamento = 0,7510", async () =>
    expect(ratio((await as(() => calc.taxaEndividamento(REF))) as number)).toBe(0.751));
  it("comprometimentoFaturas = 0,6000", async () =>
    expect(ratio((await as(() => calc.comprometimentoFaturas(REF))) as number)).toBe(0.6));
  it("progressoMeta = 25", async () => expect(await as(() => calc.progressoMeta(goalId))).toBe(25));
  it("nivelReserva ≈ 8,547 meses, Forte", async () => {
    const n = await as(() => calc.nivelReserva(REF));
    expect(n.classificacao).toBe("Forte");
    expect(ratio(n.meses)).toBe(ratio(1500 / 175.5));
  });
});

describe("Golden — agrupamentos e dashboard", () => {
  it("totalPorPessoa: pessoa=25,50 e sem-responsável=150,00", async () => {
    const rows = await as(() => calc.totalPorPessoa());
    const byId = new Map(rows.map((r) => [r.personId, money(r.total)]));
    expect(byId.get(personId)).toBe(25.5);
    expect(byId.get(null)).toBe(150);
  });
  it("totalPorCartao: cartao=100,00", async () => {
    const rows = await as(() => calc.totalPorCartao());
    expect(money(rows.find((r) => r.cardId === cardId)!.total)).toBe(100);
  });
  it("quemMeDeve: pessoa=80,00", async () => {
    const rows = await as(() => calc.quemMeDeve());
    expect(money(rows.find((r) => r.personId === personId)!.total)).toBe(80);
  });
  it("getDashboardSummary bate em todos os campos", async () => {
    const s = await as(() => calc.getDashboardSummary(REF));
    expect(money(s.receitas)).toBe(500);
    expect(money(s.despesas)).toBe(175.5);
    expect(money(s.faturas.total)).toBe(400);
    expect(money(s.faturas.paid)).toBe(100);
    expect(money(s.faturas.openAmount)).toBe(300);
    expect(money(s.aReceber)).toBe(80);
    expect(money(s.caixa)).toBe(1500);
    expect(money(s.porPertenceA.pessoal)).toBe(125.5);
    expect(money(s.porPertenceA.empresa)).toBe(50);
    expect(money(s.porPertenceA.terceiro)).toBe(0);
    expect(money(s.receitasPrevistas)).toBe(150);
    expect(money(s.despesasPrevistas)).toBe(75.5);
    expect(money(s.sobraReal)).toBe(200);
    expect(ratio(s.taxaEndividamento)).toBe(0.751);
  });
});
