/**
 * RECÁLCULO de parcelamentos manuais para soma exata (feature 002 / FR-013).
 *
 * Para cada transação com parcelas (Installment), a soma das parcelas deve ser
 * exatamente o valor total da transação. Onde não bate (resíduo perdido pelo
 * split antigo), recalcula com splitReais (a última parcela absorve o resíduo)
 * e atualiza os valores — preservando dueDate/paid/number.
 *
 * Segurança:
 *  - DRY-RUN por padrão (só relatório).
 *  - Com --apply: grava BACKUP JSON das parcelas afetadas em ./backups/ antes.
 *
 * Uso:
 *   npm run db:recompute-installments             (dry-run)
 *   npm run db:recompute-installments -- --apply  (executa com backup)
 */
import { loadEnv } from "./env";
loadEnv();

import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { splitReais, toNum } from "../src/lib/services/money";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const money = (n: number) => Number(n.toFixed(2));

async function main() {
  console.log(`=== Nummiq — recálculo de parcelas (${APPLY ? "APLICANDO" : "DRY-RUN"}) ===\n`);

  // Agrupa parcelas por transação.
  const installments = await prisma.installment.findMany({
    include: { transaction: { select: { amount: true } } },
    orderBy: { number: "asc" },
  });
  const byTx = new Map<string, typeof installments>();
  for (const inst of installments) {
    const arr = byTx.get(inst.transactionId) ?? [];
    arr.push(inst);
    byTx.set(inst.transactionId, arr);
  }

  const changes: { id: string; from: number; to: number }[] = [];
  for (const [txId, group] of byTx) {
    const total = toNum(group[0].transaction?.amount as any);
    const count = group.length;
    if (count < 1 || total <= 0) continue;
    const soma = money(group.reduce((s, g) => s + toNum(g.amount as any), 0));
    if (soma === money(total)) continue; // já bate

    const parts = splitReais(total, count); // parts[number-1]
    const sorted = [...group].sort((a, b) => a.number - b.number);
    sorted.forEach((inst, idx) => {
      const novo = parts[idx];
      if (money(toNum(inst.amount as any)) !== money(novo)) {
        changes.push({ id: inst.id, from: money(toNum(inst.amount as any)), to: money(novo) });
      }
    });
    console.log(`  tx ${txId}: total ${money(total)} em ${count}x — soma atual ${soma} → corrigindo`);
  }

  console.log(`\n${changes.length} parcela(s) a ajustar.`);
  if (changes.length === 0) return;

  if (!APPLY) {
    console.log("(dry-run — nada alterado. Rode com -- --apply para efetivar.)");
    return;
  }

  const dir = resolve(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(resolve(dir, `installments-${stamp}.json`), JSON.stringify(changes, null, 2));

  for (const c of changes) {
    await prisma.installment.update({ where: { id: c.id }, data: { amount: c.to } });
  }
  console.log(`✓ ${changes.length} parcela(s) atualizada(s). Backup em backups/installments-${stamp}.json`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
