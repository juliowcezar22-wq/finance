"use client";
import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function fmtBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// NQ UI — DatePicker. Substitui o <input type="date"> nativo.
// Renderiza um input hidden `name` com value ISO (YYYY-MM-DD) para forms.
export function DatePicker({
  name,
  defaultValue,
  required,
  className,
}: {
  name: string;
  defaultValue?: string; // YYYY-MM-DD
  required?: boolean;
  className?: string;
}) {
  const today = new Date();
  const initial = defaultValue || "";
  const [value, setValue] = React.useState(initial);
  const [open, setOpen] = React.useState(false);

  const base = value
    ? (() => {
        const [y, m] = value.split("-").map(Number);
        return new Date(y, m - 1, 1);
      })()
    : new Date(today.getFullYear(), today.getMonth(), 1);
  const [view, setView] = React.useState(base);

  React.useEffect(() => {
    if (open) setView(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setValue(iso);
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-11 w-full items-center gap-2 rounded-[10px] border border-border bg-nummiq-surface2 px-3 text-sm transition-colors hover:border-nummiq-silver/30 focus-visible:outline-none focus-visible:border-nummiq-silver",
              value ? "text-nummiq-white" : "text-nummiq-muted",
              className
            )}
          >
            <Calendar size={18} strokeWidth={1.75} className="text-nummiq-muted" />
            <span className="flex-1 text-left">{value ? fmtBR(value) : "Selecionar data"}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[16.5rem] rounded-[14px] border border-border bg-nummiq-surface3 p-3 shadow-nq data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView(new Date(year, month - 1, 1))}
                aria-label="Mês anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-nummiq-silver hover:bg-accent hover:text-nummiq-white"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium capitalize text-nummiq-white">
                {MESES_LONGOS[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setView(new Date(year, month + 1, 1))}
                aria-label="Próximo mês"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-nummiq-silver hover:bg-accent hover:text-nummiq-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {SEMANA.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-medium text-nummiq-muted">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSel = value === iso;
                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === day;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(day)}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-[8px] text-sm tabular-nums transition-colors",
                      isSel
                        ? "bg-primary-metal text-primary-metal-fg font-medium"
                        : "text-nummiq-silver hover:bg-accent hover:text-nummiq-white",
                      !isSel && isToday && "ring-1 ring-inset ring-nummiq-silver/40"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
