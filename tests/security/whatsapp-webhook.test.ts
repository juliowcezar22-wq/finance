import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

/**
 * Webhook do WhatsApp (US3): autenticação por Client-Token timing-safe,
 * fail-closed sem token configurado, e deduplicação por providerMessageId.
 * FR-008, FR-011, FR-013; SC-006, SC-007.
 */

let mockSettings: any = null;

vi.mock("@/lib/whatsapp/provider", () => ({
  getWhatsAppSettings: async () => mockSettings,
  isAllowedSender: (from: string) => !!from,
  sendText: async () => ({ ok: true }),
}));
vi.mock("@/lib/whatsapp/agent", () => ({
  runAgent: async () => ({ reply: "ok", action: "none", created: null, error: null }),
}));
vi.mock("@/lib/auth/system-owner", () => ({ getPrimaryAdminId: async () => "admin-test" }));

import { POST } from "@/app/api/whatsapp/webhook/route";
import { prisma } from "@/lib/prisma";
import { runWithoutScope } from "@/lib/auth/owner-scope";

const TOKEN = "client-token-secreto-para-teste";
const MSG_PREFIX = "test-001-wh-";
const TEST_PHONE = "5511987650001";

function post(headers: Record<string, string>, body: any): any {
  return new Request("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function countByMsgId(id: string): Promise<number> {
  return runWithoutScope(() =>
    prisma.whatsAppMessage.count({ where: { providerMessageId: id } })
  );
}

beforeEach(() => {
  mockSettings = null;
});

afterAll(async () => {
  await runWithoutScope(() =>
    prisma.whatsAppMessage.deleteMany({
      where: {
        OR: [{ providerMessageId: { startsWith: MSG_PREFIX } }, { fromNumber: TEST_PHONE }],
      },
    })
  );
});

describe("Autenticação do webhook", () => {
  it("501 quando Client-Token não está configurado (fail-closed)", async () => {
    mockSettings = { enabled: true, clientToken: null };
    const res = await POST(post({}, { phone: TEST_PHONE, messageId: `${MSG_PREFIX}a`, text: { message: "oi" } }));
    expect(res.status).toBe(501);
    expect(await countByMsgId(`${MSG_PREFIX}a`)).toBe(0);
  });

  it("501 quando não há settings", async () => {
    mockSettings = null;
    const res = await POST(post({ "client-token": TOKEN }, { phone: TEST_PHONE, messageId: `${MSG_PREFIX}b` }));
    expect(res.status).toBe(501);
  });

  it("401 sem header client-token — nada é gravado nem processado", async () => {
    mockSettings = { enabled: true, clientToken: TOKEN };
    const res = await POST(post({}, { phone: TEST_PHONE, messageId: `${MSG_PREFIX}c`, text: { message: "oi" } }));
    expect(res.status).toBe(401);
    expect(await countByMsgId(`${MSG_PREFIX}c`)).toBe(0);
  });

  it("401 com client-token errado", async () => {
    mockSettings = { enabled: true, clientToken: TOKEN };
    const res = await POST(
      post({ "client-token": "errado" }, { phone: TEST_PHONE, messageId: `${MSG_PREFIX}d`, text: { message: "oi" } })
    );
    expect(res.status).toBe(401);
    expect(await countByMsgId(`${MSG_PREFIX}d`)).toBe(0);
  });

  it("ignora quando desabilitado (após auth ok)", async () => {
    mockSettings = { enabled: false, clientToken: TOKEN };
    const res = await POST(
      post({ "client-token": TOKEN }, { phone: TEST_PHONE, messageId: `${MSG_PREFIX}e`, text: { message: "oi" } })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("disabled");
  });
});

describe("Deduplicação por providerMessageId", () => {
  it("mesma mensagem entregue 2× → processa 1×, 2ª ignorada como duplicata", async () => {
    mockSettings = { enabled: true, clientToken: TOKEN, myNumber: TEST_PHONE };
    const id = `${MSG_PREFIX}dup`;
    const body = { phone: TEST_PHONE, messageId: id, text: { message: "lançar 10" } };

    const r1 = await POST(post({ "client-token": TOKEN }, body));
    expect(r1.status).toBe(200);
    expect((await r1.json()).ignored).toBeUndefined();

    const r2 = await POST(post({ "client-token": TOKEN }, body));
    expect(r2.status).toBe(200);
    expect((await r2.json()).ignored).toBe("duplicate");

    // exatamente 1 registro de entrada com esse id
    expect(await countByMsgId(id)).toBe(1);
  });
});
