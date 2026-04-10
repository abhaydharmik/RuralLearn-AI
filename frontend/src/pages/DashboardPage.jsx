import { BookCheck, CircleGauge, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { AccuracyGauge, AccuracyTrendChart } from "@/components/dashboard/PerformanceChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { formatPercent } from "@/lib/utils";
import { fetchProgress } from "@/services/learningService";

export function DashboardPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchProgress(user.id).then(setProgress);
  }, [user?.id]);

  if (!progress) {
    return <div className="text-sm text-slate-400">Loading dashboard...</div>;
  }

  const hasResults = progress.completedQuizzes > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title={`Hello, ${user?.fullName?.split(" ")[0] || "Student"}`}
        description="A calm overview of how the student is learning, where support is needed, and what to focus on next."
        badge={`Current difficulty: ${progress.currentDifficulty}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AccuracyTrendChart weeklyAccuracy={progress.weeklyAccuracy} />
        <AccuracyGauge accuracy={progress.accuracy} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Priority learning areas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasResults ? (
              progress.topicBreakdown
                .slice()
                .sort((left, right) => left.accuracy - right.accuracy)
                .slice(0, 3)
                .map((entry, index) => (
                  <div key={entry.topic} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{entry.topic}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Focus on short examples and one follow-up practice question.
                        </p>
                      </div>
                      <Badge variant={index === 0 ? "warning" : "secondary"}>
                        {index === 0 ? "Most urgent" : "Needs review"}
                      </Badge>
                    </div>
                    <Progress className="mt-4" value={entry.accuracy} />
                  </div>
                ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                No weak-topic insights yet. Complete the first quiz to generate personalized study priorities.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent quiz activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.recentResults.length ? (
              progress.recentResults.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="font-semibold text-white">{entry.topic}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {new Date(entry.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={entry.score >= 75 ? "success" : "secondary"}>
                    {Math.round(entry.score)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                No quizzes yet. Start from the quiz page to build the student profile.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
