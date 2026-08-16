import { describe, it, expect } from "vitest";
import { isAllowedSender } from "@/lib/whatsapp/provider";
import { parseIncoming } from "@/lib/whatsapp/parse";

/**
 * Autorização de remetente e extração de id (US3): igualdade exata canônica
 * (não sufixo) e providerMessageId por gateway. FR-010, FR-011.
 */

const settings = (myNumber: string) =>
  ({
    provider: "zapi",
    baseUrl: null,
    instanceId: null,
    token: null,
    clientToken: null,
    myNumber,
    remindersSecret: null,
    enabled: true,
  }) as any;

describe("isAllowedSender", () => {
  it("aceita o mesmo número em formatos BR equivalentes (com/sem 55, com/sem 9)", () => {
    const s = settings("5511987654321"); // 55 + 11 + 9 8765 4321
    expect(isAllowedSender("5511987654321", s)).toBe(true);
    expect(isAllowedSender("11987654321", s)).toBe(true); // sem DDI
    expect(isAllowedSender("1187654321", s)).toBe(true); // sem DDI e sem 9
    expect(isAllowedSender("+55 (11) 98765-4321", s)).toBe(true); // com máscara
  });

  it("REJEITA remetente forjado por sufixo (mesmos últimos dígitos, DDD/DDI diferente)", () => {
    const s = settings("5511987654321");
    expect(isAllowedSender("5521987654321", s)).toBe(false); // outro DDD
    expect(isAllowedSender("999987654321", s)).toBe(false); // prefixo arbitrário
    expect(isAllowedSender("87654321", s)).toBe(false); // só o final
  });

  it("rejeita vazio/nulo", () => {
    const s = settings("5511987654321");
    expect(isAllowedSender(null, s)).toBe(false);
    expect(isAllowedSender("", s)).toBe(false);
  });
});

describe("parseIncoming — providerMessageId", () => {
  it("extrai messageId do payload Z-API", () => {
    const msg = parseIncoming({
      phone: "5511987654321",
      messageId: "zapi-123",
      text: { message: "oi" },
    });
    expect(msg.providerMessageId).toBe("zapi-123");
    expect(msg.from).toBe("5511987654321");
  });

  it("extrai key.id do payload Evolution", () => {
    const msg = parseIncoming({
      data: {
        key: { remoteJid: "5511987654321@s.whatsapp.net", id: "evo-999" },
        message: { conversation: "oi" },
      },
    });
    expect(msg.providerMessageId).toBe("evo-999");
  });

  it("providerMessageId ausente vira undefined (fallback documentado)", () => {
    const msg = parseIncoming({ phone: "5511987654321", text: { message: "oi" } });
    expect(msg.providerMessageId).toBeUndefined();
  });
});
