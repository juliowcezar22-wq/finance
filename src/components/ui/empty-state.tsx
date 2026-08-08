import * as React from "react";
import { cn } from "@/lib/utils";
import { NummiqSymbol } from "@/components/brand";

// NQ UI — EmptyState (DS §61). Mensagem simples + próxima ação. Sem ruído.
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 opacity-40">
        {icon ?? <NummiqSymbol size={40} />}
      </div>
      <p className="text-sm font-medium text-nummiq-white">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-nummiq-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
