import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * setupFile do Vitest: carrega `.env.test` em process.env ANTES de qualquer
 * import de módulo (prisma, session) ser avaliado. Os valores do arquivo
 * SOBRESCREVEM o ambiente do shell — mesmo espírito de scripts/with-env.ts —
 * para garantir que os testes falem com o banco de testes, e não com o dev
 * por acidente.
 */
const file = resolve(process.cwd(), ".env.test");
if (!existsSync(file)) {
  throw new Error(
    "tests: .env.test não encontrado. Crie a partir de .env.test.example."
  );
}
for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  const [, key, raw] = m;
  process.env[key] = raw.replace(/^["']|["']$/g, "");
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("tests: SESSION_SECRET ausente/curto em .env.test.");
}
