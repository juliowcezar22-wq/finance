import { describe, it, expect, afterEach, vi } from "vitest";

// current-user.ts usa React.cache no topo; no Vitest `cache` não existe.
// Passthrough para o módulo carregar (users.ts importa viewer → current-user).
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: (fn: unknown) => fn };
});

import { prisma } from "@/lib/prisma";
import { runWithoutScope } from "@/lib/auth/owner-scope";
import { deactivateGuarded } from "@/lib/auth/deactivate-user";
import { TEST_PREFIX } from "./../setup/db";

/**
 * Guarda de "último administrador ativo" (FR-008): desativar não pode deixar o
 * sistema sem nenhum admin ativo. A guarda é atômica (UPDATE condicional único).
 *
 * Nota: o banco de teste é compartilhado com o dev e pode conter o admin real,
 * então não forçamos "0 admins reais" (perigoso). Validamos os caminhos seguros
 * e o INVARIANTE de que o total de admins ativos nunca cai a zero.
 */

const created: string[] = [];

async function mkUser(role: "ADMIN" | "USER", active: boolean): Promise<string> {
  const u = await runWithoutScope(() =>
    prisma.user.create({
      data: {
        name: `${TEST_PREFIX}adm`,
        email: `${TEST_PREFIX}adm-${Date.now()}-${created.length}@example.test`,
        passwordHash: "x",
        role,
        active,
      },
    })
  );
  created.push(u.id);
  return u.id;
}

const isActive = (id: string) =>
  runWithoutScope(() => prisma.user.findUnique({ where: { id }, select: { active: true } })).then(
    (u) => !!u?.active
  );

const activeAdmins = () =>
  runWithoutScope(() => prisma.user.count({ where: { role: "ADMIN", active: true } }));

afterEach(async () => {
  await runWithoutScope(() => prisma.user.deleteMany({ where: { id: { in: created } } }));
  created.length = 0;
});

describe("deactivateGuarded — FR-008", () => {
  it("desativa usuário comum sem restrição", async () => {
    const u = await mkUser("USER", true);
    await deactivateGuarded(u);
    expect(await isActive(u)).toBe(false);
  });

  it("permite desativar um admin quando há outro admin ativo", async () => {
    const a = await mkUser("ADMIN", true);
    await mkUser("ADMIN", true); // garante ≥ 2 admins ativos
    await deactivateGuarded(a);
    expect(await isActive(a)).toBe(false);
  });

  it("INVARIANTE: nunca zera os admins ativos (bloqueia o último)", async () => {
    // Cria 2 admins de teste e desativa em sequência. A guarda protege o
    // último admin ativo do BANCO — se em algum ponto o alvo for o único
    // admin ativo, a operação lança; em nenhum caso o total chega a zero.
    const a = await mkUser("ADMIN", true);
    const b = await mkUser("ADMIN", true);
    for (const id of [a, b]) {
      try {
        await deactivateGuarded(id);
      } catch (e) {
        expect(String(e)).toMatch(/último administrador/i);
      }
      expect(await activeAdmins()).toBeGreaterThanOrEqual(1); // nunca zera
    }
  });
});
