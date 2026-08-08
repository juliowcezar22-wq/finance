import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * loginAction (US2): fail-closed em erro de banco e mensagem genérica no
 * bloqueio (não revela existência da conta). FR-007, FR-013.
 *
 * next/headers e o throttle são mockados para isolar a lógica da action de
 * dependências de request/DB.
 */

const cookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => ({ set: cookieSet, get: () => undefined, delete: vi.fn() }),
  headers: () => new Map([["x-forwarded-for", "203.0.113.9"]]),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const reserveAttempt = vi.fn();
vi.mock("@/lib/auth/login-throttle", () => ({
  reserveAttempt: (...a: unknown[]) => reserveAttempt(...a),
  recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
  pruneOldAttempts: vi.fn(),
}));

import { loginAction } from "@/lib/actions/auth";

function form(email: string, password: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

beforeEach(() => {
  reserveAttempt.mockReset();
  cookieSet.mockReset();
});

describe("loginAction — perímetro de segurança", () => {
  it("fail-closed: erro na reserva/lockout nega login com erro genérico", async () => {
    reserveAttempt.mockRejectedValueOnce(new Error("db down"));
    const res = await loginAction(null, form("alguem@example.test", "seja-o-que-for"));
    expect(res?.error).toMatch(/incorretos/i);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("conta bloqueada: mensagem genérica de espera, sem revelar existência", async () => {
    reserveAttempt.mockResolvedValueOnce(true);
    const res = await loginAction(null, form("alvo@example.test", "brute"));
    expect(res?.error).toMatch(/tentativas|aguarde/i);
    expect(cookieSet).not.toHaveBeenCalled();
  });
});
