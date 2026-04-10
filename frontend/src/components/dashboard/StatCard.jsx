import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="animated-enter overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            <p className="mt-2 text-sm text-slate-400">{hint}</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
