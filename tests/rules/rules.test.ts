import { describe, it, expect } from "vitest";
import { applyRulesSync, type RuleContext } from "@/lib/services/rules";
import { Prisma } from "@prisma/client";

/**
 * Regras de categorização (M11/FR-001): applyRulesSync é pura — testes de
 * unidade sem banco. Cobre contains/cardId/limiares Decimal/prioridade/
 * primeiro-vence e resolução de responsável.
 */

function rule(over: Partial<Record<string, unknown>>): any {
  return {
    id: "r",
    name: "regra",
    priority: 100,
    active: true,
    descriptionContains: null,
    cardId: null,
    amountGreaterThan: null,
    amountLessThan: null,
    categoryId: null,
    responsibleName: null,
    belongsTo: null,
    reimbursable: null,
    status: null,
    ownerId: "u",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

const ctx = (rules: any[], people: Array<[string, string]> = []): RuleContext => ({
  rules,
  personIdByName: new Map(people),
});

describe("applyRulesSync", () => {
  it("match por descrição (case-insensitive)", () => {
    const c = ctx([rule({ descriptionContains: "uber", categoryId: "cat-transporte" })]);
    expect(applyRulesSync(c, { description: "UBER *TRIP", amount: 20 }).categoryId).toBe(
      "cat-transporte"
    );
    expect(applyRulesSync(c, { description: "mercado", amount: 20 }).categoryId).toBeUndefined();
  });

  it("limiares monetários (Decimal) — gt exclusivo e lt exclusivo", () => {
    const c = ctx([
      rule({
        amountGreaterThan: new Prisma.Decimal("100.00"),
        amountLessThan: new Prisma.Decimal("500.00"),
        categoryId: "cat-media",
      }),
    ]);
    expect(applyRulesSync(c, { description: "x", amount: 100 }).categoryId).toBeUndefined(); // não > 100
    expect(applyRulesSync(c, { description: "x", amount: 100.01 }).categoryId).toBe("cat-media");
    expect(applyRulesSync(c, { description: "x", amount: 499.99 }).categoryId).toBe("cat-media");
    expect(applyRulesSync(c, { description: "x", amount: 500 }).categoryId).toBeUndefined(); // não < 500
  });

  it("condição de cartão precisa casar exatamente", () => {
    const c = ctx([rule({ cardId: "card-1", belongsTo: "empresa" })]);
    expect(applyRulesSync(c, { description: "x", cardId: "card-1", amount: 1 }).belongsTo).toBe(
      "empresa"
    );
    expect(
      applyRulesSync(c, { description: "x", cardId: "card-2", amount: 1 }).belongsTo
    ).toBeUndefined();
  });

  it("prioridade: primeira regra a definir um campo vence (não sobrescreve)", () => {
    const c = ctx([
      rule({ descriptionContains: "ifood", categoryId: "cat-a", priority: 1 }),
      rule({ descriptionContains: "ifood", categoryId: "cat-b", status: "pago", priority: 2 }),
    ]);
    const eff = applyRulesSync(c, { description: "IFOOD *PEDIDO", amount: 50 });
    expect(eff.categoryId).toBe("cat-a"); // primeira vence
    expect(eff.status).toBe("pago"); // campo ainda vazio é preenchido pela segunda
  });

  it("responsável resolvido por nome; nome desconhecido é ignorado", () => {
    const c = ctx(
      [rule({ descriptionContains: "escola", responsibleName: "Isis" })],
      [["Isis", "person-isis"]]
    );
    expect(applyRulesSync(c, { description: "ESCOLA X", amount: 1 }).responsibleId).toBe(
      "person-isis"
    );
    const c2 = ctx([rule({ descriptionContains: "escola", responsibleName: "Ninguem" })]);
    expect(
      applyRulesSync(c2, { description: "ESCOLA X", amount: 1 }).responsibleId
    ).toBeUndefined();
  });

  it("regra sem condições casa tudo (efeito default)", () => {
    const c = ctx([rule({ belongsTo: "pessoal" })]);
    expect(applyRulesSync(c, { description: "qualquer", amount: 1 }).belongsTo).toBe("pessoal");
  });
});
