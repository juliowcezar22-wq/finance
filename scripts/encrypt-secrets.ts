/**
 * CIFRA os segredos legados em texto plano (feature 007): AISetting.apiKey e
 * WhatsAppSetting.token/clientToken/remindersSecret. Idempotente — pula os que
 * já estão no formato cifrado (`v1:`).
 *
 * Segurança:
 *  - DRY-RUN por padrão (só relatório).
 *  - Com --apply: grava BACKUP JSON dos valores atuais em ./backups/ antes.
 *  - Exige SECRETS_KEY no ambiente (via with-env).
 *
 * Uso:
 *   npm run db:encrypt-secrets              (dry-run)
 *   npm run db:encrypt-secrets -- --apply   (executa com backup)
 */
import { loadEnv } from "./env";
loadEnv();

import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { encryptSecret, isEncrypted } from "../src/lib/crypto/secrets";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`=== Nummiq — cifra de segredos legados (${APPLY ? "APLICANDO" : "DRY-RUN"}) ===\n`);

  const ai = await prisma.aISetting.findUnique({ where: { id: "default" } });
  const wa = await prisma.whatsAppSetting.findUnique({ where: { id: "default" } });

  const plan: { model: string; field: string }[] = [];
  const backup: Record<string, unknown> = { ai, wa };

  if (ai?.apiKey && !isEncrypted(ai.apiKey)) plan.push({ model: "AISetting", field: "apiKey" });
  for (const field of ["token", "clientToken", "remindersSecret"] as const) {
    if (wa?.[field] && !isEncrypted(wa[field] as string)) plan.push({ model: "WhatsAppSetting", field });
  }

  if (plan.length === 0) {
    console.log("Nenhum segredo em texto plano — nada a cifrar (idempotente).");
    return;
  }
  for (const p of plan) console.log(`  cifrar ${p.model}.${p.field}`);
  console.log(`\n${plan.length} segredo(s) a cifrar.`);

  if (!APPLY) {
    console.log("(dry-run — nada alterado. Rode com -- --apply para efetivar.)");
    return;
  }

  const dir = resolve(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(resolve(dir, `secrets-${stamp}.json`), JSON.stringify(backup, null, 2));

  if (ai?.apiKey && !isEncrypted(ai.apiKey)) {
    await prisma.aISetting.update({ where: { id: "default" }, data: { apiKey: encryptSecret(ai.apiKey) } });
  }
  const waData: Record<string, string> = {};
  for (const field of ["token", "clientToken", "remindersSecret"] as const) {
    if (wa?.[field] && !isEncrypted(wa[field] as string)) waData[field] = encryptSecret(wa[field] as string);
  }
  if (Object.keys(waData).length) {
    await prisma.whatsAppSetting.update({ where: { id: "default" }, data: waData });
  }
  console.log(`✓ ${plan.length} segredo(s) cifrado(s). Backup em backups/secrets-${stamp}.json`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
