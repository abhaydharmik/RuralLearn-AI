import { Badge } from "@/components/ui/badge";

export function PageHeader({ eyebrow, title, description, badge }) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0 space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-primary/80 sm:text-sm sm:tracking-[0.35em]">
          {eyebrow}
        </p>
        <h1 className="max-w-4xl text-2xl font-bold leading-[1.05] text-white sm:text-3xl lg:text-[2.9rem]">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base">{description}</p>
      </div>
      {badge ? (
        <Badge className="shrink-0 self-start xl:mb-1 xl:self-auto" variant="secondary">
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}
