import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full items-center justify-center rounded-full border px-3 py-1 text-center text-[11px] font-medium uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.2em]",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/15 text-primary",
        secondary: "border-white/10 bg-white/5 text-muted-foreground",
        success: "border-success/40 bg-success/15 text-green-300",
        warning: "border-warning/40 bg-warning/15 text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
