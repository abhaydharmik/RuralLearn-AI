import { Badge } from "@/components/ui/badge";

export function PageHeader({ eyebrow, title, description, badge }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.35em] text-primary/80">{eyebrow}</p>
        <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm text-slate-300 md:text-base">{description}</p>
      </div>
      {badge ? <Badge variant="secondary">{badge}</Badge> : null}
    </div>
  );
}
