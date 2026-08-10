import { cn } from "@/lib/utils";

// NQ UI — Skeleton (DS §59/§60). Shimmer discreto sobre superfície.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-nq rounded-[10px]", className)} {...props} />;
}
