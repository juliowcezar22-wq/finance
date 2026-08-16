import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// NQ UI — Button (DS §38–§40, §82). Variantes preservam a API existente
// (default/destructive/outline/secondary/ghost/link) com estilo Nummiq.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-150 ease-nq focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] [&_svg]:shrink-0 [&_svg]:size-[18px]",
  {
    variants: {
      variant: {
        // Primário: gradiente que troca por tema (platinum no escuro, grafite no claro)
        default: "bg-primary-metal text-primary-metal-fg shadow-nq hover:brightness-105",
        // Destrutivo: contido — sem bloco vermelho (DS §41)
        destructive:
          "bg-nummiq-danger/10 text-nummiq-danger border border-nummiq-danger/25 hover:bg-nummiq-danger/15",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:border-nummiq-silver/40",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-nummiq-surface4",
        ghost: "text-foreground hover:bg-accent",
        link: "text-foreground underline-offset-4 hover:underline hover:text-nummiq-silver",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
