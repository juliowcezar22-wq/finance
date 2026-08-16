"use client";
import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/lib/actions/ai";
import { SimpleMarkdown } from "./markdown";
import { NummiqSymbol } from "@/components/brand";
import { Send, User } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Como está minha saúde financeira este mês?",
  "Onde estou gastando demais?",
  "O que devo priorizar para pagar primeiro?",
  "Me dê 3 dicas para sobrar mais dinheiro.",
];

export function Chat({
  conversationId,
  initialMessages,
  configured,
  initialTokens,
}: {
  conversationId: string | null;
  initialMessages: Msg[];
  configured: boolean;
  initialTokens: number;
}) {
  const [convId, setConvId] = useState(conversationId);
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [tokens, setTokens] = useState(initialTokens);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function submit(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    start(async () => {
      const r = await sendChatMessage(convId, content);
      if (r.ok) {
        setConvId(r.conversationId);
        setMessages((m) => [...m, { role: "assistant", content: r.answer }]);
        setTokens((t) => t + r.tokens);
      } else {
        setError(r.error);
        // remove a mensagem otimista que falhou
        setMessages((m) => m.slice(0, -1));
        setInput(content);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <NummiqSymbol size={56} className="opacity-70" />
            <p className="max-w-sm text-sm">
              Pergunte qualquer coisa sobre suas finanças. O copiloto enxerga suas transações,
              faturas, gastos, pessoas e metas.
            </p>
            {configured && (
              <div className="flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                <NummiqSymbol size={24} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {m.role === "assistant" ? (
                <SimpleMarkdown text={m.content} />
              ) : (
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              )}
            </div>
            {m.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
              <NummiqSymbol size={24} />
            </div>
            <span className="animate-pulse">Analisando seus dados…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-3 border-t pt-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder={configured ? "Escreva sua pergunta…" : "Configure a IA para começar"}
            disabled={!configured || pending}
            rows={1}
            className="min-h-[44px] resize-none"
          />
          <Button onClick={() => submit(input)} disabled={!configured || pending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Enter envia · Shift+Enter quebra linha · {tokens.toLocaleString("pt-BR")} tokens nesta
          conversa
        </p>
      </div>
    </div>
  );
}
