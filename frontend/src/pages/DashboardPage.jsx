import { BookCheck, CircleGauge, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { AccuracyGauge, AccuracyTrendChart } from "@/components/dashboard/PerformanceChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatPercent } from "@/lib/utils";
import { fetchProgress } from "@/services/learningService";

export function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    setError("");
    fetchProgress(user.id)
      .then(setProgress)
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({ title: "Dashboard unavailable", description: fetchError.message, variant: "error" });
      });
  }, [showToast, user?.id]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-[13px] text-rose-300/90">
          Dashboard data could not load: {error}
        </CardContent>
      </Card>
    );
  }

  if (!progress) return <DashboardSkeleton />;

  const hasResults = progress.completedQuizzes > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Hello, ${user?.fullName?.split(" ")[0] || "Student"}`}
        description="A calm overview of how the student is learning, where support is needed, and what to focus on next."
        badge={`Current difficulty: ${progress.currentDifficulty}`}
      />

      {/* ── Stat cards ── */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleGauge}
          label="Accuracy"
          value={formatPercent(progress.accuracy)}
          hint="Average score across completed quizzes"
        />
        <StatCard
          icon={BookCheck}
          label="Completed quizzes"
          value={progress.completedQuizzes}
          hint="Every quiz improves the learning profile"
        />
        <StatCard
          icon={Target}
          label="Weak topics"
          value={progress.weakTopics.length}
          hint="Topics needing more revision right now"
        />
        <StatCard
          icon={TrendingUp}
          label="Adaptive level"
          value={progress.currentDifficulty}
          hint="Auto-adjusted using latest overall performance"
        />
      </section>

      {/* ── Charts ── */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <AccuracyTrendChart weeklyAccuracy={progress.weeklyAccuracy} />
        <AccuracyGauge accuracy={progress.accuracy} />
      </section>

      {/* ── Priority topics + Recent activity ── */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">

        {/* Priority learning areas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Priority learning areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasResults ? (
              progress.topicBreakdown
                .slice()
                .sort((l, r) => l.accuracy - r.accuracy)
                .slice(0, 3)
                .map((entry, index) => (
                  <div
                    key={entry.topic}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 transition-colors hover:border-white/[0.11]"
                  >
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white">{entry.topic}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                          Focus on short examples and one follow-up practice question.
                        </p>
                      </div>
                      <Badge
                        className="flex-shrink-0 self-start"
                        variant={index === 0 ? "warning" : "secondary"}
                      >
                        {index === 0 ? "Most urgent" : "Needs review"}
                      </Badge>
                    </div>
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Accuracy</span>
                        <span className="text-[11px] font-medium text-slate-300">
                          {Math.round(entry.accuracy)}%
                        </span>
                      </div>
                      <Progress value={entry.accuracy} />
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                No weak-topic insights yet. Complete the first quiz to generate personalized study priorities.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent quiz activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent quiz activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {progress.recentResults.length ? (
              progress.recentResults.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3.5 transition-colors hover:border-white/[0.11] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{entry.topic}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {new Date(entry.submittedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    className="flex-shrink-0 self-start sm:self-center"
                    variant={entry.score >= 75 ? "success" : "secondary"}
                  >
                    {Math.round(entry.score)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                No quizzes yet. Start from the quiz page to build the student profile.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}