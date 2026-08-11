import { prisma } from "@/lib/prisma";
import { decryptMaybe } from "@/lib/crypto/secrets";

export type WhatsAppSettings = {
  provider: string; // zapi | evolution | custom
  baseUrl: string | null;
  instanceId: string | null;
  token: string | null;
  clientToken: string | null;
  myNumber: string | null;
  remindersSecret: string | null;
  enabled: boolean;
};

const SINGLETON_ID = "default";

export async function getWhatsAppSettings(): Promise<WhatsAppSettings | null> {
  const s = await prisma.whatsAppSetting.findUnique({ where: { id: SINGLETON_ID } });
  if (!s) return null;
  return {
    provider: s.provider ?? "zapi",
    baseUrl: s.baseUrl,
    instanceId: s.instanceId,
    token: decryptMaybe(s.token),
    clientToken: decryptMaybe(s.clientToken),
    myNumber: s.myNumber,
    remindersSecret: decryptMaybe(s.remindersSecret),
    enabled: s.enabled,
  };
}

export function isWhatsAppReady(s: WhatsAppSettings | null): s is WhatsAppSettings {
  return !!s && s.enabled && !!s.baseUrl && !!s.myNumber;
}

/** Só dígitos (E.164 sem '+'). */
export function normalizeNumber(n: string | null | undefined): string {
  return (n ?? "").replace(/\D/g, "");
}

/**
 * Número nacional canônico BR para comparação: remove o DDI 55 quando presente
 * e insere o 9º dígito quando faltar (DDD+8 → DDD+9+8). Assim
 * `5511987654321`, `11987654321` e `1187654321` colapsam no mesmo valor.
 * Números não-BR passam sem alteração.
 */
function canonicalNumber(n: string): string {
  let x = n;
  if ((x.length === 12 || x.length === 13) && x.startsWith("55")) x = x.slice(2);
  if (x.length === 10) x = x.slice(0, 2) + "9" + x.slice(2); // DDD + 8 → DDD + 9 + 8
  return x;
}

export function isAllowedSender(from: string | null | undefined, s: WhatsAppSettings): boolean {
  const a = normalizeNumber(from);
  const b = normalizeNumber(s.myNumber);
  if (!a || !b) return false;
  // Igualdade exata do número canônico — sem `endsWith`/sufixo (forjável).
  return canonicalNumber(a) === canonicalNumber(b);
}

/**
 * Envia texto via gateway. Padrão Z-API; tolera Evolution/custom.
 * Retorna {ok, error?}.
 */
export async function sendText(
  to: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const s = await getWhatsAppSettings();
  if (!s || !s.baseUrl) return { ok: false, error: "WhatsApp não configurado." };

  const phone = normalizeNumber(to);
  const base = s.baseUrl.replace(/\/$/, "");

  let url: string;
  let body: any;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (s.provider === "evolution") {
    // Evolution API: POST {base}/message/sendText/{instance}
    url = `${base}/message/sendText/${s.instanceId ?? ""}`;
    if (s.token) headers["apikey"] = s.token;
    body = { number: phone, text: message };
  } else {
    // Z-API (default): POST {base}/instances/{id}/token/{token}/send-text
    url = `${base}/instances/${s.instanceId ?? ""}/token/${s.token ?? ""}/send-text`;
    if (s.clientToken) headers["Client-Token"] = s.clientToken;
    body = { phone, message };
  }

  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `Gateway respondeu ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: `Falha de rede ao enviar: ${e?.message ?? e}` };
  }
}
