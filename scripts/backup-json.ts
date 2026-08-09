/**
 * BACKUP JSON de todas as tabelas de dados — rede de segurança antes de
 * migrações destrutivas (feature 002). Dump completo (inclui registros órfãos)
 * num único arquivo timestampado em ./backups/.
 *
 * Uso:
 *   npm run db:backup            (banco de dev, via with-env)
 *   npm run db:test:backup       (banco de teste)
 *
 * Restauração é manual/assistida (não automatizada) — o objetivo é não perder
 * dado silenciosamente. Complementa o PITR/snapshot do Supabase.
 */
import { loadEnv } from "./env";
loadEnv();

import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

// Todos os modelos com dados (owned + globais). Mantido explícito de propósito.
const MODELS = [
  "user", "person", "account", "creditCard", "accountCard", "category",
  "transaction", "installment", "creditCardInvoice", "receivable", "income",
  "cashBox", "cashBoxMovement", "personPayment", "goal", "importBatch",
  "categorizationRule", "aISetting", "aIConversation", "aIMessage", "aIMemory",
  "whatsAppSetting", "whatsAppMessage", "loginAttempt",
] as const;

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dump: Record<string, unknown[]> = {};
  let total = 0;
  for (const m of MODELS) {
    const delegate = (prisma as any)[m];
    if (!delegate?.findMany) continue;
    const rows = await delegate.findMany();
    dump[m] = rows;
    total += rows.length;
    console.log(`  ${m}: ${rows.length}`);
  }
  const dir = resolve(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `backup-${stamp}.json`);
  writeFileSync(file, JSON.stringify(dump, null, 2));
  console.log(`\n✓ ${total} registros salvos em ${file}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
