import { describe, it, expect, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { runWithoutScope } from "@/lib/auth/owner-scope";
import {
  isLockedOut,
  recordLoginAttempt,
  MAX_FAILS,
  WINDOW_MS,
} from "@/lib/auth/login-throttle";
import { TEST_PREFIX } from "../setup/db";

/**
 * Lockout de login (US2): 5 falhas/15 min por e-mail; sucesso zera; janela
 * expira; fail-closed em erro de banco. FR-007, FR-013; SC-005.
 */

function emailFor(tag: string) {
  return `${TEST_PREFIX}lock-${tag}-${Date.now()}@example.test`;
}

async function insertFail(email: string, when: Date) {
  await runWithoutScope(() =>
    prisma.loginAttempt.create({ data: { email, ip: null, success: false, createdAt: when } })
  );
}

afterEach(async () => {
  await runWithoutScope(() =>
    prisma.loginAttempt.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  );
  vi.restoreAllMocks();
});

describe("isLockedOut", () => {
  it("não bloqueia com menos de 5 falhas", async () => {
    const email = emailFor("a");
    for (let i = 0; i < MAX_FAILS - 1; i++) await recordLoginAttempt(email, null, false);
    expect(await isLockedOut(email)).toBe(false);
  });

  it("bloqueia na 5ª falha na janela", async () => {
    const email = emailFor("b");
    for (let i = 0; i < MAX_FAILS; i++) await recordLoginAttempt(email, null, false);
    expect(await isLockedOut(email)).toBe(true);
  });

  it("um sucesso zera a contagem efetiva", async () => {
    const email = emailFor("c");
    for (let i = 0; i < MAX_FAILS; i++) await recordLoginAttempt(email, null, false);
    expect(await isLockedOut(email)).toBe(true);
    await recordLoginAttempt(email, null, true);
    expect(await isLockedOut(email)).toBe(false);
  });

  it("ignora falhas fora da janela de 15 min", async () => {
    const email = emailFor("d");
    const old = new Date(Date.now() - WINDOW_MS - 60_000);
    for (let i = 0; i < MAX_FAILS; i++) await insertFail(email, old);
    expect(await isLockedOut(email)).toBe(false);
  });

  it("propaga erro de banco (para o chamador negar — fail-closed)", async () => {
    const email = emailFor("e");
    vi.spyOn(prisma.loginAttempt, "findFirst").mockRejectedValueOnce(new Error("db down"));
    await expect(isLockedOut(email)).rejects.toThrow();
  });
});
