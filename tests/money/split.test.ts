import { describe, it, expect } from "vitest";
import { splitAmount, splitReais, toCents, fromCents, toNum } from "@/lib/services/money";
import { Prisma } from "@prisma/client";

/**
 * Split de parcela (US5 / FR-013): a soma das parcelas é SEMPRE igual ao total;
 * o resíduo do arredondamento vai para a última parcela.
 */

describe("splitAmount (centavos)", () => {
  it("100,00 em 3 → 33,33 + 33,33 + 33,34 (soma exata)", () => {
    const parts = splitAmount(10000, 3);
    expect(parts).toEqual([3333, 3333, 3334]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it("90,00 em 3 → todas iguais (30,00) quando divide exato", () => {
    expect(splitAmount(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it("10,00 em 3 → 3,33 + 3,33 + 3,34", () => {
    const parts = splitAmount(1000, 3);
    expect(parts).toEqual([333, 333, 334]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it("0,01 em 2 → 0,00 + 0,01 (resíduo na última)", () => {
    expect(splitAmount(1, 2)).toEqual([0, 1]);
  });

  it("1 parcela → o total inteiro", () => {
    expect(splitAmount(12345, 1)).toEqual([12345]);
  });

  it("soma sempre bate para vários totais/quantidades", () => {
    const totals = [1, 7, 100, 9999, 123456, 1000001];
    const counts = [1, 2, 3, 4, 5, 7, 12, 13];
    for (const t of totals) {
      for (const n of counts) {
        const parts = splitAmount(t, n);
        expect(parts.length).toBe(n);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(t);
      }
    }
  });

  it("rejeita n < 1 e total não-inteiro", () => {
    expect(() => splitAmount(100, 0)).toThrow();
    expect(() => splitAmount(100.5, 3)).toThrow();
  });
});

describe("splitReais / toCents / fromCents", () => {
  it("100 reais em 3 → [33.33, 33.33, 33.34] e soma 100", () => {
    const parts = splitReais(100, 3);
    expect(parts).toEqual([33.33, 33.33, 33.34]);
    expect(Number(parts.reduce((a, b) => a + b, 0).toFixed(2))).toBe(100);
  });

  it("toCents arredonda ruído de float (0.1+0.2)", () => {
    expect(toCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 → 30 centavos
    expect(fromCents(30)).toBe(0.3);
  });
});

describe("toNum", () => {
  it("converte Decimal, number e nulo", () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum(12.5)).toBe(12.5);
    expect(toNum(new Prisma.Decimal("1234.56"))).toBe(1234.56);
  });
});
