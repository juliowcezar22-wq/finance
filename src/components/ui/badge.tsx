import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// NQ UI — Badge pill (DS §48). Cores funcionais em tint discreto, nunca sólidas.
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        secondary: "border-border bg-nummiq-surface3 text-nummiq-silver",
        success: "border-transparent bg-nummiq-success/10 text-nummiq-success",
        warning: "border-transparent bg-nummiq-warning/10 text-nummiq-warning",
        destructive: "border-transparent bg-nummiq-danger/10 text-nummiq-danger",
        info: "border-transparent bg-nummiq-info/10 text-nummiq-info",
        outline: "border-border text-nummiq-silver",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
