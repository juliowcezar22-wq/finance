import { Card } from "@/lib/ui";
import { cn } from "@/lib/utils";

// NQ UI — StatCard (DS §34, §35, §71). Sóbrio, número protagonista, sem
// gradientes coloridos. Cor funcional só quando há significado.
export function StatCard({
  title,
  value,
  hint,
  intent = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  intent?: "default" | "positive" | "negative" | "warning";
}) {
  const valueColor =
    intent === "positive"
      ? "text-nummiq-success"
      : intent === "negative"
        ? "text-nummiq-danger"
        : intent === "warning"
          ? "text-nummiq-warning"
          : "text-nummiq-white";

  return (
    <Card className="p-5 transition-colors duration-150 ease-nq hover:border-white/12">
      <p className="text-[11px] uppercase tracking-[0.14em] text-nummiq-muted font-medium">
        {title}
      </p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight break-words", valueColor)}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-nummiq-muted">{hint}</p>}
    </Card>
  );
}
