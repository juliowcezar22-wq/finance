import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithoutScope } from "@/lib/auth/owner-scope";
import { TEST_PREFIX } from "./../setup/db";

/**
 * Autocadastro (US2, hardening pós-revisão): resposta NEUTRA — não revela se o
 * e-mail já existe (sem oráculo de enumeração). FR-005 (não vazar informação).
 */

// next/headers/navigation não são usados por signUpAction, mas o módulo auth.ts
// os importa no topo — mock leve para o import não quebrar fora do runtime Next.
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: () => new Map(),
}));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

import { signUpAction } from "@/lib/actions/auth";

function form(name: string, email: string, password: string): FormData {
  const fd = new FormData();
  fd.set("name", name);
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

const emails: string[] = [];
function newEmail(): string {
  const e = `${TEST_PREFIX}signup-${Date.now()}-${emails.length}@example.test`;
  emails.push(e);
  return e;
}

afterEach(async () => {
  await runWithoutScope(() =>
    prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  );
  emails.length = 0;
});

describe("signUpAction — sem enumeração", () => {
  it("e-mail novo → sucesso; MESMO e-mail de novo → também sucesso (resposta idêntica)", async () => {
    const email = newEmail();
    const r1 = await signUpAction(null, form("Fulano", email, "senha123"));
    expect(r1?.success).toBe(true);
    expect(r1?.error).toBeUndefined();

    const r2 = await signUpAction(null, form("Fulano", email, "senha123"));
    expect(r2?.success).toBe(true);
    expect(r2?.error).toBeUndefined();

    // não duplicou o usuário
    const count = await runWithoutScope(() => prisma.user.count({ where: { email } }));
    expect(count).toBe(1);
  });
});
