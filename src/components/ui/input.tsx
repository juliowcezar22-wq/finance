import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// NQ UI — Input (DS §42). 44px, radius 10px, foco platinum, superfície escura.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // text-base (16px) no mobile evita o zoom do iOS ao focar; sm:text-sm no desktop
          "flex h-11 w-full rounded-[10px] border border-border bg-nummiq-surface2 px-3 text-base text-nummiq-white transition-colors duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-nummiq-silver placeholder:text-nummiq-muted hover:border-nummiq-silver/30 focus-visible:border-nummiq-silver focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
