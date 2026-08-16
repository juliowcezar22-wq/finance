"use client";
import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// NQ UI — Toast (DS §80). Store leve + função toast(); Toaster no layout.
type Variant = "default" | "success" | "danger" | "info";
type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: Variant;
  open: boolean;
};

let counter = 0;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function emit() {
  for (const l of listeners) l(items);
}

export function toast(opts: { title: string; description?: string; variant?: Variant }) {
  const item: ToastItem = { id: ++counter, variant: "default", open: true, ...opts };
  items = [...items, item];
  emit();
  return item.id;
}

function dismiss(id: number) {
  // Fase 1: marca fechado (Radix roda a animação de saída)...
  items = items.map((t) => (t.id === id ? { ...t, open: false } : t));
  emit();
  // Fase 2: remove do store depois do slide-out (~300ms).
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 300);
}

const icons: Record<Variant, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 size={18} className="text-nummiq-success" />,
  danger: <AlertCircle size={18} className="text-nummiq-danger" />,
  info: <Info size={18} className="text-nummiq-info" />,
};

export function Toaster() {
  const [list, setList] = React.useState<ToastItem[]>(items);
  React.useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
      {list.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open={t.open}
          onOpenChange={(open) => !open && dismiss(t.id)}
          className="group pointer-events-auto relative flex items-start gap-3 rounded-[12px] border border-border bg-nummiq-surface3 p-4 pr-9 shadow-nq data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full"
        >
          {icons[t.variant] && <div className="mt-0.5 shrink-0">{icons[t.variant]}</div>}
          <div className="min-w-0 flex-1">
            <ToastPrimitive.Title className="text-sm font-medium text-nummiq-white">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="mt-0.5 text-[13px] text-nummiq-silver">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close
            aria-label="Fechar"
            className={cn(
              "absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-md text-nummiq-muted transition-colors hover:bg-accent hover:text-nummiq-white"
            )}
          >
            <X size={14} />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] m-0 flex w-full max-w-[380px] list-none flex-col gap-2.5 p-4 outline-none" />
    </ToastPrimitive.Provider>
  );
}
