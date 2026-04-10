import { cn } from "@/lib/utils";

export function Progress({ value = 0, className }) {
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
