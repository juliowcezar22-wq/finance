import type { Prisma } from "@prisma/client";

/**
 * Aritmética monetária centralizada. Trabalha em CENTAVOS inteiros onde a
 * exatidão importa (split de parcela), evitando o erro de ponto flutuante e
 * sendo agnóstica à representação da coluna (Float ou Decimal).
 */

/** Converte um valor em reais (number) para centavos inteiros. */
export function toCents(reais: number): number {
  return Math.round(reais * 100);
}

/** Converte centavos inteiros de volta para reais (number). */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Converte Prisma.Decimal | number | string | null para number (0 se nulo).
 * Tolera string porque um Decimal cruzando a fronteira Server→Client Component
 * é serializado pelo React como string.
 */
export function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  return v.toNumber();
}

/**
 * Divide `totalCents` em `n` parcelas cuja SOMA é exatamente `totalCents`.
 * As n-1 primeiras recebem o piso (floor) da divisão; a última absorve o
 * resíduo do arredondamento. Ex.: splitAmount(10000, 3) → [3333, 3333, 3334].
 * Lança se n < 1. Aceita totais negativos (mantém o sinal na última parcela).
 */
export function splitAmount(totalCents: number, n: number): number[] {
  if (!Number.isInteger(totalCents)) {
    throw new Error("splitAmount: totalCents deve ser inteiro (centavos).");
  }
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("splitAmount: n deve ser inteiro >= 1.");
  }
  const base = Math.trunc(totalCents / n); // trunc → resíduo vai para a última
  const parts = new Array<number>(n).fill(base);
  parts[n - 1] = totalCents - base * (n - 1);
  return parts;
}

/**
 * Conveniência: divide um valor em reais em `n` parcelas em reais, com soma
 * exata. Ex.: splitReais(100, 3) → [33.33, 33.33, 33.34].
 */
export function splitReais(reaisTotal: number, n: number): number[] {
  return splitAmount(toCents(reaisTotal), n).map(fromCents);
}
