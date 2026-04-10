import { useEffect, useState } from "react";

import {
  AccuracyGauge,
  AccuracyTrendChart,
  SkillRadarChart,
  TopicBarChart,
} from "@/components/dashboard/PerformanceChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { fetchProgress } from "@/services/learningService";

export function AnalyticsPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchProgress(user.id).then(setProgress);
  }, [user?.id]);

  if (!progress) {
    return <div className="text-sm text-slate-400">Loading analytics...</div>;
  }

  const hasResults = progress.completedQuizzes > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Learning performance insights"
        description="A deeper look at quiz accuracy, topic-level mastery, and the areas where the student needs extra support."
        badge={`${progress.completedQuizzes} quizzes analyzed`}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <AccuracyTrendChart weeklyAccuracy={progress.weeklyAccuracy} />
        <AccuracyGauge accuracy={progress.accuracy} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TopicBarChart topicBreakdown={progress.topicBreakdown} />
        <SkillRadarChart topicBreakdown={progress.topicBreakdown} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weak topic watchlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasResults ? (
              progress.weakTopics.map((topic, index) => (
                <div
                  key={topic}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-white">{topic}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Add guided tutoring prompts and one short revision quiz.
                    </p>
                  </div>
                  <Badge variant={index === 0 ? "warning" : "secondary"}>
                    {index === 0 ? "Priority" : "Review"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                No weak-topic data yet. Analytics will become personalized after the first submission.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {progress.recentResults.length ? (
              progress.recentResults.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="font-semibold text-white">{entry.topic}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Submitted on {new Date(entry.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{entry.correctAnswers} correct</Badge>
                  <Badge variant={entry.score >= 75 ? "success" : "secondary"}>
                    {Math.round(entry.score)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                No submissions yet. Run a few quizzes to unlock full analytics.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
