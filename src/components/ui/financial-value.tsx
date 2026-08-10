import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

// NQ UI — FinancialValue (DS §16–§18, §71). Números tabulares; verde/vermelho
// apenas com significado (sinal do valor). Neutro por padrão (platinum/branco).
type Props = {
  /** Valor numérico em reais. Se `formatted` vier, tem prioridade. */
  value?: number;
  formatted?: string;
  /** Colorir por sinal (+ verde / − vermelho). Off por padrão (silêncio visual). */
  colorBySign?: boolean;
  /** Mostrar sinal explícito (+/−) — útil em variações. */
  signed?: boolean;
  size?: "sm" | "md" | "lg" | "display";
  className?: string;
};

const sizes = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  display: "text-[40px] sm:text-5xl leading-none",
} as const;

export function FinancialValue({
  value,
  formatted,
  colorBySign = false,
  signed = false,
  size = "md",
  className,
}: Props) {
  const n = typeof value === "number" ? value : undefined;
  let text = formatted ?? (n !== undefined ? formatBRL(Math.abs(n)) : "—");
  if (signed && n !== undefined && n !== 0) {
    text = `${n > 0 ? "+" : "−"}${text}`;
  } else if (n !== undefined && n < 0 && !signed) {
    text = `−${text}`;
  }

  const color =
    colorBySign && n !== undefined && n !== 0
      ? n > 0
        ? "text-nummiq-success"
        : "text-nummiq-danger"
      : "text-nummiq-white";

  return (
    <span
      data-numeric
      className={cn(
        "font-semibold tabular-nums tracking-tight",
        sizes[size],
        color,
        className
      )}
    >
      {text}
    </span>
  );
}
