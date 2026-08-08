import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { createHmac } from "crypto";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { getUserFromToken } from "@/lib/auth/resolve-user";
import { prisma } from "@/lib/prisma";
import { runWithoutScope } from "@/lib/auth/owner-scope";
import { TEST_PREFIX } from "../setup/db";

/**
 * Sessão (US2): assinatura + expiração + revogação por sessionVersion + boot
 * sem segredo. FR-005, FR-006; SC-003, SC-004.
 */

function b64url(s: string | Buffer): string {
  return Buffer.from(s).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Forja um token no formato ANTIGO (sem `sv`), assinado com o mesmo segredo.
function makeLegacyToken(payload: object): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", process.env.SESSION_SECRET!).update(body).digest());
  return `${body}.${sig}`;
}

let userId: string;

beforeAll(async () => {
  const u = await runWithoutScope(() =>
    prisma.user.create({
      data: {
        name: `${TEST_PREFIX}sess`,
        email: `${TEST_PREFIX}sess-${Date.now()}@example.test`,
        passwordHash: "x",
        role: "USER",
        active: true,
      },
    })
  );
  userId = u.id;
});

afterAll(async () => {
  await runWithoutScope(() => prisma.user.delete({ where: { id: userId } }).then(() => {}));
});

describe("Token de sessão", () => {
  it("roundtrip: cria e verifica com sv/role/uid", () => {
    const token = createSessionToken({ uid: "u1", role: "USER", sv: 3 });
    const p = verifySessionToken(token);
    expect(p?.uid).toBe("u1");
    expect(p?.role).toBe("USER");
    expect(p?.sv).toBe(3);
  });

  it("rejeita token expirado", () => {
    const token = createSessionToken({ uid: "u1", role: "USER", sv: 0 }, -1); // ttl negativo
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejeita assinatura adulterada", () => {
    const token = createSessionToken({ uid: "u1", role: "USER", sv: 0 });
    const [body] = token.split(".");
    expect(verifySessionToken(`${body}.assinaturaerrada`)).toBeNull();
  });

  it("rejeita token do formato antigo (sem sv)", () => {
    const legacy = makeLegacyToken({
      uid: "u1",
      role: "USER",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(verifySessionToken(legacy)).toBeNull();
  });
});

describe("Revogação por sessionVersion (getUserFromToken)", () => {
  it("aceita token cuja sv casa com o usuário", async () => {
    const token = createSessionToken({ uid: userId, role: "USER", sv: 0 });
    const u = await getUserFromToken(token);
    expect(u?.id).toBe(userId);
  });

  it("rejeita token após logout (sessionVersion incrementado)", async () => {
    const token = createSessionToken({ uid: userId, role: "USER", sv: 0 });
    await runWithoutScope(() =>
      prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } })
    );
    const u = await getUserFromToken(token); // token ainda tem sv:0
    expect(u).toBeNull();
    // um token novo (sv:1) volta a valer
    const fresh = createSessionToken({ uid: userId, role: "USER", sv: 1 });
    expect((await getUserFromToken(fresh))?.id).toBe(userId);
  });

  it("rejeita usuário inativo", async () => {
    await runWithoutScope(() =>
      prisma.user.update({ where: { id: userId }, data: { active: false } })
    );
    const current = await runWithoutScope(() =>
      prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } })
    );
    const token = createSessionToken({ uid: userId, role: "USER", sv: current!.sessionVersion });
    expect(await getUserFromToken(token)).toBeNull();
    await runWithoutScope(() =>
      prisma.user.update({ where: { id: userId }, data: { active: true } })
    );
  });
});

describe("Boot sem SESSION_SECRET", () => {
  it("import do módulo de sessão lança sem o segredo", async () => {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", "");
    await expect(import("@/lib/auth/session")).rejects.toThrow(/SESSION_SECRET/);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("import do módulo lança com segredo curto (<32)", async () => {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", "curto");
    await expect(import("@/lib/auth/session")).rejects.toThrow(/SESSION_SECRET/);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
