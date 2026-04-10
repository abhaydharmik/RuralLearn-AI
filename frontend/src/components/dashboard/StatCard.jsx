import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="animated-enter overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 break-words text-3xl font-bold text-white sm:text-[2.15rem]">{value}</p>
            <p className="mt-2 max-w-[24ch] text-sm leading-6 text-slate-400">{hint}</p>
          </div>
          <div className="w-fit rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
