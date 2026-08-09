"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

// NQ UI — Select nativo estilizado (DS §44). Chevron platinum, 44px, radius 10px.
const chevron =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23A7A7AA' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>";

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, style, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        // text-base (16px) no mobile evita zoom do iOS; appearance-none p/ chevron custom
        "flex h-11 w-full appearance-none rounded-[10px] border border-border bg-nummiq-surface2 pl-3 pr-9 text-base sm:text-sm text-nummiq-white transition-colors duration-150 hover:border-nummiq-silver/30 cursor-pointer focus-visible:outline-none focus-visible:border-nummiq-silver focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        backgroundImage: `url("${chevron}")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.65rem center",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
