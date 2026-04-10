import { cn } from "@/lib/utils";

export function Avatar({ name, className }) {
  const initials = name
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/70 to-cyan-400/80 font-semibold text-slate-950",
        className,
      )}
    >
      {initials || "ST"}
    </div>
  );
}
