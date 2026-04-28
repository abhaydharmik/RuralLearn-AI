import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-2xl bg-white/10", className)} {...props} />;
}

function HeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-12 w-full max-w-xl" />
      <Skeleton className="h-5 w-full max-w-2xl" />
    </div>
  );
}

function StatGridSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-4 w-full max-w-[220px]" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <StatGridSkeleton />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-[280px] w-full rounded-3xl" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-[280px] w-full rounded-3xl" />
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-24 w-full rounded-3xl" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-[280px] w-full rounded-3xl" />
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full rounded-3xl" />
              <Skeleton className="h-20 w-full rounded-3xl" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function ChatPageSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-[360px] w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function QuizPageSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <Card>
        <CardContent className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-2xl xl:w-44" />
        </CardContent>
      </Card>
      <Card className="border-dashed">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-[28px] border border-white/10 p-5">
              <Skeleton className="h-5 w-4/5" />
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((__, optionIndex) => (
                  <Skeleton key={optionIndex} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-24 w-full rounded-3xl" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-3xl" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn("h-12 w-full", index === 4 && "sm:col-span-2 h-28 rounded-3xl")}
              />
            ))}
          </CardContent>
        </Card>
      </section>
      <StatGridSkeleton />
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-20 w-full rounded-3xl" />
              <Skeleton className="h-20 w-full rounded-3xl" />
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
