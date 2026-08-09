import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "income" | "expense" | "cash";

// DS §49–§52 — colunas em grafite/platinum; verde/vermelho só com significado.
const TONE_BAR: Record<Tone, string> = {
  income: "bg-nummiq-success/55 group-hover:bg-nummiq-success/80",
  expense: "bg-nummiq-danger/55 group-hover:bg-nummiq-danger/80",
  cash: "bg-gradient-to-t from-nummiq-platinum/35 to-nummiq-platinum/75 group-hover:to-nummiq-platinum/90",
};

/**
 * Gráfico de colunas mensal — leve (CSS/Tailwind), sem dependências.
 * Tooltip nativo (title) + valor ao passar o mouse (group-hover).
 */
export function MonthlyBarChart({
  labels,
  values,
  tone = "cash",
}: {
  labels: string[];
  values: number[];
  tone?: Tone;
}) {
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));

  return (
    <div className="overflow-hidden">
      <div className="flex items-end gap-1.5 h-40 border-b border-border">
        {values.map((v, i) => {
          const pct = (Math.abs(v) / max) * 100;
          const h = v !== 0 ? Math.max(4, pct) : 0;
          return (
            <div
              key={i}
              className="flex-1 min-w-0 h-full flex flex-col justify-end items-center group"
            >
              <span className="mb-1 max-w-full truncate text-[9px] font-medium tabular-nums text-nummiq-white opacity-0 group-hover:opacity-100 transition-opacity">
                {formatBRL(v)}
              </span>
              <div
                className={cn("w-full rounded-t-[4px] transition-[height]", TONE_BAR[tone])}
                style={{ height: `${h}%` }}
                title={`${labels[i]}: ${formatBRL(v)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-2">
        {labels.map((l, i) => (
          <div
            key={i}
            className="flex-1 min-w-0 text-center text-[10px] text-nummiq-muted capitalize truncate"
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
