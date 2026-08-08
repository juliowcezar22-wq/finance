import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // text-base (16px) no mobile evita o zoom do iOS; alinhado ao Input (DS §42)
        "flex min-h-[88px] w-full rounded-[10px] border border-border bg-nummiq-surface2 px-3 py-2.5 text-base sm:text-sm text-nummiq-white transition-colors duration-150 hover:border-white/12 placeholder:text-nummiq-muted focus-visible:outline-none focus-visible:border-nummiq-silver focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
