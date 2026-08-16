"use client";
import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// NQ UI — MonthPicker. Substitui o <input type="month"> nativo.
// value/onChange no formato "YYYY-MM".
export function MonthPicker({
  value,
  onChange,
  className,
}: {
  value: string; // YYYY-MM
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [y, m] = value.split("-").map(Number);
  const now = new Date();
  const selYear = y || now.getFullYear();
  const selMonth = (m || now.getMonth() + 1) - 1;
  const [viewYear, setViewYear] = React.useState(selYear);

  React.useEffect(() => {
    if (open) setViewYear(selYear);
  }, [open, selYear]);

  const label = `${MESES_LONGOS[selMonth]} de ${selYear}`;

  function pick(monthIdx: number) {
    onChange(`${viewYear}-${String(monthIdx + 1).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center gap-2 rounded-[10px] border border-border bg-nummiq-surface2 px-3 text-sm text-nummiq-white transition-colors hover:border-nummiq-silver/30 focus-visible:border-nummiq-silver focus-visible:outline-none",
            className
          )}
        >
          <Calendar size={18} strokeWidth={1.75} className="text-nummiq-muted" />
          <span className="flex-1 text-left capitalize">{label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-[14px] border border-border bg-nummiq-surface3 p-3 shadow-nq data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((v) => v - 1)}
              aria-label="Ano anterior"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-nummiq-silver hover:bg-accent hover:text-nummiq-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium tabular-nums text-nummiq-white">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((v) => v + 1)}
              aria-label="Próximo ano"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-nummiq-silver hover:bg-accent hover:text-nummiq-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MESES.map((mes, i) => {
              const isSel = viewYear === selYear && i === selMonth;
              return (
                <button
                  key={mes}
                  type="button"
                  onClick={() => pick(i)}
                  className={cn(
                    "h-9 rounded-[8px] text-sm capitalize transition-colors",
                    isSel
                      ? "bg-primary-metal text-primary-metal-fg font-medium"
                      : "text-nummiq-silver hover:bg-accent hover:text-nummiq-white"
                  )}
                >
                  {mes}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
