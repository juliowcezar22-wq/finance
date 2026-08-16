import { prisma } from "@/lib/prisma";
import { errorMessage } from "@/lib/utils";
import { decryptMaybe } from "@/lib/crypto/secrets";
import { assertUnderDailyCap, recordUsage } from "@/lib/ai/usage";

export type AIProvider = "openai" | "anthropic" | "custom";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => 500 * Math.pow(3, attempt); // 500ms, 1500ms

/**
 * fetch resiliente para o provedor de IA: tempo limite (AbortController) e
 * retry com backoff em falha de rede, 5xx e 429. 4xx (exceto 429) NÃO retenta
 * (erro do cliente/chave). Só deve envolver chamadas de GERAÇÃO (idempotentes).
 *
 * NOTA (baixa severidade): o timeout cobre até a chegada dos HEADERS; a leitura
 * do corpo (res.json/text) acontece no chamador, após o clearTimeout. Para as
 * respostas pequenas de JSON aqui isso é aceitável; um provedor que trava no
 * meio do corpo dependeria do timeout da plataforma.
 */
export async function resilientFetch(
  url: string,
  init: RequestInit,
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30_000, retries = 2 } = opts;
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if ((res.status >= 500 || res.status === 429) && attempt < retries) {
        await sleep(backoff(attempt));
        continue;
      }
      return res;
    } catch (e: unknown) {
      clearTimeout(timer);
      const aborted = e instanceof Error && e.name === "AbortError";
      if (attempt < retries) {
        await sleep(backoff(attempt));
        continue;
      }
      throw new Error(
        aborted
          ? "O provedor de IA demorou a responder (tempo limite). Tente novamente."
          : "Falha de rede ao contatar o provedor de IA. Tente novamente."
      );
    }
  }
}

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type ChatResult = {
  text: string;
  usage: { promptTokens: number; completionTokens: number };
};

export type AISettings = {
  provider: AIProvider;
  baseUrl: string | null;
  apiKey: string | null;
  model: string;
  temperature: number;
  enabled: boolean;
};

const SINGLETON_ID = "default";

export async function getAISettings(): Promise<AISettings | null> {
  const s = await prisma.aISetting.findUnique({ where: { id: SINGLETON_ID } });
  if (!s) return null;
  return {
    provider: (s.provider as AIProvider) ?? "openai",
    baseUrl: s.baseUrl,
    apiKey: decryptMaybe(s.apiKey),
    model: s.model,
    temperature: s.temperature,
    enabled: s.enabled,
  };
}

export function isConfigured(s: AISettings | null): s is AISettings {
  return !!s && s.enabled && !!s.apiKey && !!s.model;
}

/** Mensagem amigável quando a IA não está pronta. */
export class AINotConfiguredError extends Error {
  constructor() {
    super(
      "A IA ainda não está configurada. Abra as configurações do Assistente e informe seu provedor, modelo e chave de API."
    );
  }
}

function openAiBase(s: AISettings): string {
  if (s.provider === "custom" && s.baseUrl) return s.baseUrl.replace(/\/$/, "");
  return "https://api.openai.com/v1";
}

/**
 * Chamada de chat agnóstica de provedor. Lança Error com mensagem legível em
 * caso de falha (chave inválida, rede, etc.).
 */
export async function chatComplete(opts: {
  settings: AISettings;
  system: string;
  messages: ChatMsg[];
  maxTokens?: number;
  /** Ignora o teto e não contabiliza consumo (ex.: teste de conexão barato). */
  skipCap?: boolean;
}): Promise<ChatResult> {
  const { settings: s, system, messages, maxTokens = 1200, skipCap = false } = opts;
  if (!s.apiKey) throw new AINotConfiguredError();

  // Teto de custo: bloqueia ANTES de contatar o provedor (0 custo ao exceder).
  if (!skipCap) await assertUnderDailyCap();

  const result =
    s.provider === "anthropic"
      ? await anthropicChat(s, system, messages, maxTokens)
      : await openAiChat(s, system, messages, maxTokens);

  if (!skipCap) await recordUsage(result.usage);
  return result;
}

async function openAiChat(
  s: AISettings,
  system: string,
  messages: ChatMsg[],
  maxTokens: number
): Promise<ChatResult> {
  const url = `${openAiBase(s)}/chat/completions`;
  const res = await resilientFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s.apiKey}`,
    },
    body: JSON.stringify({
      model: s.model,
      temperature: s.temperature,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ai] provedor OpenAI erro ${res.status}: ${body.slice(0, 500)}`);
    throw new Error(prettyHttpError(res.status));
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data?.choices?.[0]?.message?.content ?? "";
  return {
    text: String(text).trim(),
    usage: {
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
    },
  };
}

async function anthropicChat(
  s: AISettings,
  system: string,
  messages: ChatMsg[],
  maxTokens: number
): Promise<ChatResult> {
  const url = "https://api.anthropic.com/v1/messages";
  const res = await resilientFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": s.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: s.model,
      max_tokens: maxTokens,
      temperature: s.temperature,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ai] provedor Anthropic erro ${res.status}: ${body.slice(0, 500)}`);
    throw new Error(prettyHttpError(res.status));
  }
  const data = (await res.json()) as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = Array.isArray(data?.content)
    ? data.content.map((c) => c?.text ?? "").join("")
    : "";
  return {
    text: String(text).trim(),
    usage: {
      promptTokens: data?.usage?.input_tokens ?? 0,
      completionTokens: data?.usage?.output_tokens ?? 0,
    },
  };
}

/**
 * Mensagem de erro CURADA por status — nunca inclui o corpo cru da resposta do
 * provedor (que é logado no servidor). FR-010.
 */
function prettyHttpError(status: number): string {
  if (status === 401 || status === 403)
    return "Chave de API inválida ou sem permissão. Verifique a chave nas configurações.";
  if (status === 404)
    return "Modelo não encontrado. Verifique o nome do modelo nas configurações.";
  if (status === 429)
    return "Limite de uso/créditos atingido no provedor. Tente mais tarde ou verifique seu plano.";
  return `Erro do provedor de IA (${status}). Tente novamente mais tarde.`;
}

/** Teste de conexão curto e barato. */
export async function testConnection(s: AISettings): Promise<{ ok: boolean; message: string }> {
  try {
    const r = await chatComplete({
      settings: s,
      system: "Você é um verificador de conexão. Responda apenas: OK.",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 5,
      skipCap: true, // teste barato: sempre valida a chave, sem bloquear/contar
    });
    return { ok: true, message: `Conexão OK (resposta: "${r.text.slice(0, 20)}").` };
  } catch (e: unknown) {
    return { ok: false, message: errorMessage(e) };
  }
}
