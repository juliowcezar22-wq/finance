import { readFileSync, existsSync } from "fs";
import { resolve, basename } from "path";
import { spawnSync } from "child_process";

/**
 * Executa um comando com as variáveis de um arquivo .env específico.
 *
 *   tsx scripts/with-env.ts <arquivo-env> -- <comando> [args...]
 *   ex.: tsx scripts/with-env.ts .env.test -- prisma db push
 *
 * Diferente do loader dos scripts (env.ts), aqui os valores do arquivo
 * SOBRESCREVEM o ambiente do shell: se você tiver uma URL de outro banco
 * exportada por acidente, o arquivo escolhido é o que vale.
 *
 * Guarda anti-acidente: recusa executar se APP_ENV não for
 * "development" ou "test". Credenciais de produção não devem existir
 * neste repositório — produção vive apenas no projeto/Vercel original.
 */

const [, , envFile, ...rest] = process.argv;
const command = rest[0] === "--" ? rest.slice(1) : rest;

if (!envFile || command.length === 0) {
  console.error("Uso: tsx scripts/with-env.ts <arquivo-env> -- <comando> [args...]");
  process.exit(2);
}

const file = resolve(process.cwd(), envFile);
if (!existsSync(file)) {
  const example = `${basename(envFile)}.example`;
  console.error(`Arquivo "${envFile}" não encontrado.`);
  console.error(`Crie a partir do template: cp ${example} ${basename(envFile)}`);
  process.exit(2);
}

for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  const [, key, raw] = m;
  process.env[key] = raw.replace(/^["']|["']$/g, "");
}

const appEnv = process.env.APP_ENV;
if (appEnv !== "development" && appEnv !== "test") {
  console.error(`BLOQUEADO: APP_ENV="${appEnv ?? "(não definido)"}" em ${envFile}.`);
  console.error('Os scripts de banco só rodam com APP_ENV="development" ou "test".');
  console.error("Este repositório não deve conter credenciais de produção.");
  process.exit(1);
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
