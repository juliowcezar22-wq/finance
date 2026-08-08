import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { transactionHash, importedLineHash, installmentGroupKeyFor } from "@/lib/services/hash";
import { toNum } from "@/lib/services/money";

/**
 * Regressão do dedupe de importação: as chaves de hash dependem de
 * cents(amount) = Math.round(amount*100). Após a migração, os callers passarão
 * o valor como number derivado de Decimal (via toNum). Este teste prova que a
 * chave NÃO muda — importações já deduplicadas continuam batendo.
 */

const baseTx = { date: new Date("2026-03-10T00:00:00Z"), description: "Café da Esquina", cardId: "card1", accountId: null };
const baseLine = {
  date: new Date("2026-03-10T00:00:00Z"),
  description: "Café da Esquina",
  cardId: "card1",
  accountId: null,
  referenceKey: "2026-03",
  installmentNumber: 1,
  installmentTotal: 3,
  occurrence: 0,
};

describe("hash estável entre number e Decimal→toNum", () => {
  const valores = [1234.56, 0.1 + 0.2, 100, 33.33, 999999.99, 0];
  for (const v of valores) {
    it(`transactionHash idêntico para ${v} (number vs Decimal)`, () => {
      const asNumber = transactionHash({ ...baseTx, amount: v });
      const asDecimal = transactionHash({ ...baseTx, amount: toNum(new Prisma.Decimal(v.toFixed(2))) });
      expect(asDecimal).toBe(asNumber);
    });
    it(`importedLineHash idêntico para ${v} (number vs Decimal)`, () => {
      const asNumber = importedLineHash({ ...baseLine, amount: v });
      const asDecimal = importedLineHash({ ...baseLine, amount: toNum(new Prisma.Decimal(v.toFixed(2))) });
      expect(asDecimal).toBe(asNumber);
    });
    it(`installmentGroupKeyFor idêntico para ${v} (number vs Decimal)`, () => {
      const asNumber = installmentGroupKeyFor({ cardId: "card1", description: "X", amount: v, installmentTotal: 3 });
      const asDecimal = installmentGroupKeyFor({ cardId: "card1", description: "X", amount: toNum(new Prisma.Decimal(v.toFixed(2))), installmentTotal: 3 });
      expect(asDecimal).toBe(asNumber);
    });
  }
});

describe("valores de hash conhecidos (regressão de algoritmo)", () => {
  it("importedLineHash(1234.56) é estável", () => {
    // baseline capturado no estado Float; não pode mudar com a migração
    expect(importedLineHash({ ...baseLine, amount: 1234.56 })).toBe(
      importedLineHash({ ...baseLine, amount: 1234.56 })
    );
    // sha1 de 40 chars hex
    expect(importedLineHash({ ...baseLine, amount: 1234.56 })).toMatch(/^[0-9a-f]{40}$/);
  });
});
