import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Config de testes da feature 001 (segurança). Roda contra o banco de
 * `.env.test` (carregado por tests/setup/env.ts). O banco é compartilhado com
 * o dev (plano free), então os testes usam registros próprios (prefixo
 * `test-001-`) e NUNCA truncam tabelas — a limpeza remove só o que criaram.
 *
 * Execução serial (singleFork + fileParallelism:false): evita corridas entre
 * arquivos de teste que compartilham o mesmo banco.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/env.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
});
