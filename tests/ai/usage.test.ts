import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

vi.mock("@/lib/auth/owner-scope", () => import("../setup/owner-scope-double"));

import { prisma } from "@/lib/prisma";
import { runWithOwner, runWithoutScope } from "@/lib/auth/owner-scope";
import { assertUnderDailyCap, recordUsage, DAILY_TOKEN_CAP, AiBudgetExceededError } from "@/lib/ai/usage";
import { chatComplete, type AISettings } from "@/lib/ai/provider";
import { TEST_PREFIX } from "../setup/db";

/**
 * Teto de consumo de IA (US3 / FR-009): bloqueia ao atingir o teto diário SEM
 * contatar o provedor (0 custo). SC-006.
 */

let userId: string;

beforeAll(async () => {
  const u = await runWithoutScope(() =>
    prisma.user.create({
      data: { name: `${TEST_PREFIX}usage`, email: `${TEST_PREFIX}usage-${Date.now()}@example.test`, passwordHash: "x", role: "USER", active: true },
    })
  );
  userId = u.id;
});

afterEach(async () => {
  await runWithoutScope(() => prisma.aiUsage.deleteMany({ where: { ownerId: userId } }));
});

afterAll(async () => {
  await runWithoutScope(() => prisma.user.delete({ where: { id: userId } }).then(() => {}));
});

const settings: AISettings = {
  provider: "openai", baseUrl: null, apiKey: "sk-test", model: "gpt-4o-mini", temperature: 0.3, enabled: true,
};

describe("recordUsage / assertUnderDailyCap", () => {
  it("acumula consumo do dia e bloqueia ao atingir o teto", async () => {
    await runWithOwner(userId, async () => {
      await expect(assertUnderDailyCap()).resolves.toBeUndefined(); // zero uso → ok
      await recordUsage({ promptTokens: Math.floor(DAILY_TOKEN_CAP / 2), completionTokens: 0 });
      await expect(assertUnderDailyCap()).resolves.toBeUndefined(); // metade → ainda ok
      await recordUsage({ promptTokens: DAILY_TOKEN_CAP, completionTokens: 0 }); // ultrapassa
      await expect(assertUnderDailyCap()).rejects.toBeInstanceOf(AiBudgetExceededError);
    });
  });
});

describe("chatComplete respeita o teto ANTES de contatar o provedor", () => {
  it("no teto → AiBudgetExceededError e fetch NÃO é chamado (0 custo)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await runWithOwner(userId, async () => {
      await recordUsage({ promptTokens: DAILY_TOKEN_CAP, completionTokens: 0 }); // atinge o teto
      await expect(
        chatComplete({ settings, system: "s", messages: [{ role: "user", content: "oi" }] })
      ).rejects.toBeInstanceOf(AiBudgetExceededError);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("skipCap ignora o teto (teste de conexão sempre valida a chave)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }], usage: {} }), { status: 200 })
    );
    await runWithOwner(userId, async () => {
      await recordUsage({ promptTokens: DAILY_TOKEN_CAP, completionTokens: 0 }); // já no teto
      const r = await chatComplete({
        settings, system: "s", messages: [{ role: "user", content: "ping" }], skipCap: true,
      });
      expect(r.text).toBe("OK");
    });
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
