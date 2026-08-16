import { describe, it, expect, vi, afterEach } from "vitest";

// Isola a resiliência do banco: teto/consumo viram no-op.
vi.mock("@/lib/ai/usage", () => ({
  assertUnderDailyCap: async () => {},
  recordUsage: async () => {},
  AiBudgetExceededError: class extends Error {},
  DAILY_TOKEN_CAP: 100000,
}));

import { resilientFetch, chatComplete, type AISettings } from "@/lib/ai/provider";

const settings: AISettings = {
  provider: "openai",
  baseUrl: null,
  apiKey: "sk-test",
  model: "gpt-4o-mini",
  temperature: 0.3,
  enabled: true,
};

afterEach(() => vi.restoreAllMocks());

function mockFetch(fn: (url: string, init: any, call: number) => Promise<Response>) {
  let call = 0;
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(((url: any, init: any) => fn(String(url), init, ++call)) as any);
}

describe("resilientFetch — timeout", () => {
  it("aborta e lança erro amigável ao estourar o tempo limite", async () => {
    mockFetch(
      (_u, init) =>
        new Promise((_res, rej) => {
          init.signal.addEventListener("abort", () =>
            rej(Object.assign(new Error("aborted"), { name: "AbortError" }))
          );
        })
    );
    await expect(resilientFetch("http://x", {}, { timeoutMs: 40, retries: 0 })).rejects.toThrow(
      /tempo limite/i
    );
  });
});

describe("resilientFetch — retry", () => {
  it("503 seguido de 200 → entrega o 200 (retry)", async () => {
    const spy = mockFetch(async (_u, _i, call) =>
      call === 1 ? new Response("", { status: 503 }) : new Response("ok", { status: 200 })
    );
    const res = await resilientFetch("http://x", {}, { retries: 2 });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("400 (erro do cliente) NÃO retenta", async () => {
    const spy = mockFetch(async () => new Response("", { status: 400 }));
    const res = await resilientFetch("http://x", {}, { retries: 2 });
    expect(res.status).toBe(400);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("chatComplete — erro não vaza o corpo do provedor (FR-010)", () => {
  it("500 com corpo → mensagem genérica, sem o corpo", async () => {
    mockFetch(
      async () =>
        new Response(JSON.stringify({ error: { message: "SEGREDO-INTERNO-DO-PROVEDOR" } }), {
          status: 500,
        })
    );
    await expect(
      chatComplete({ settings, system: "s", messages: [{ role: "user", content: "oi" }] })
    ).rejects.toThrow(/erro do provedor de ia/i);
    // e NÃO contém o corpo interno
    await chatComplete({
      settings,
      system: "s",
      messages: [{ role: "user", content: "oi" }],
    }).catch((e) => {
      expect(String(e.message)).not.toContain("SEGREDO-INTERNO");
    });
  });

  it("401 → mensagem de chave inválida", async () => {
    mockFetch(async () => new Response("", { status: 401 }));
    await expect(
      chatComplete({ settings, system: "s", messages: [{ role: "user", content: "oi" }] })
    ).rejects.toThrow(/chave de api inválida/i);
  });
});
