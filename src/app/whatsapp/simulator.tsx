"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { simulateMessage, sendRemindersNow } from "@/lib/actions/whatsapp";
import { NummiqSymbol } from "@/components/brand";
import { Send, Bell } from "lucide-react";

const EXAMPLES = [
  "Gastei 50 no mercado hoje no pix",
  "Recebi 3000 de salário ontem",
  "Criar caixa Reserva de emergência com 1000",
  "Quanto gastei esse mês?",
];

const ACTION_LABEL: Record<string, string> = {
  add_expense: "Despesa criada",
  add_income: "Receita criada",
  add_cashbox: "Caixa criado",
  add_cash_movement: "Movimentação de caixa",
  query: "Consulta",
  smalltalk: "Conversa",
  error: "Erro",
};

export function WhatsAppSimulator() {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ reply: string; action: string; error?: string } | null>(
    null
  );
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  function run(t: string) {
    const msg = t.trim();
    if (!msg || pending) return;
    setReminderMsg(null);
    start(async () => {
      const r = await simulateMessage(msg);
      setResult({ reply: r.reply, action: r.action, error: r.error });
      setText("");
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Teste o agente sem WhatsApp: escreva como se estivesse mandando uma mensagem. O agente
        interpreta e <strong>já cria de verdade</strong> no sistema.
      </p>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            onClick={() => run(e)}
            disabled={pending}
            className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              run(text);
            }
          }}
          placeholder="Ex.: paguei 120 de luz, vence dia 30"
          rows={1}
          className="min-h-[44px] resize-none"
        />
        <Button onClick={() => run(text)} disabled={pending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {pending && (
        <p className="animate-pulse text-sm text-muted-foreground">Nummiq está pensando…</p>
      )}

      {result && (
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
            <NummiqSymbol size={26} />
          </div>
          <div className="flex-1 rounded-2xl bg-muted px-3.5 py-2.5">
            <Badge
              variant={result.error ? "destructive" : "secondary"}
              className="mb-1.5 text-[10px]"
            >
              {ACTION_LABEL[result.action] ?? result.action}
            </Badge>
            <p className="whitespace-pre-wrap text-sm">{result.reply}</p>
          </div>
        </div>
      )}

      <div className="border-t pt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await sendRemindersNow();
              setReminderMsg(r.message);
            })
          }
        >
          <Bell className="mr-1 h-4 w-4" /> Enviar lembretes agora
        </Button>
        {reminderMsg && <p className="mt-2 text-xs text-muted-foreground">{reminderMsg}</p>}
      </div>
    </div>
  );
}
