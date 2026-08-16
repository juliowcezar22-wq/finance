import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // text-base (16px) no mobile evita o zoom do iOS; alinhado ao Input (DS §42)
          "flex min-h-[88px] w-full rounded-[10px] border border-border bg-nummiq-surface2 px-3 py-2.5 text-base text-nummiq-white transition-colors duration-150 placeholder:text-nummiq-muted hover:border-nummiq-silver/30 focus-visible:border-nummiq-silver focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
