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
import { AnalyticsSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useToast } from "@/context/ToastContext";
import { fetchProgress } from "@/services/learningService";

export function AnalyticsPage() {
  const { user } = useAuth();
  const { t, formatDate } = useI18n();
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
        showToast({ title: t("analytics.analyticsUnavailable"), description: fetchError.message, variant: "error" });
      });
  }, [showToast, t, user?.id]);

  if (error) {
    return (
        <Card>
        <CardContent className="p-4 text-[13px] text-rose-300/90">
          {t("analytics.analyticsCouldNotLoad", { error })}
        </CardContent>
      </Card>
    );
  }

  if (!progress) return <AnalyticsSkeleton />;

  const hasResults = progress.completedQuizzes > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("analytics.eyebrow")}
        title={t("analytics.title")}
        description={t("analytics.description")}
        badge={t("analytics.quizzesAnalyzed", { count: progress.completedQuizzes })}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <AccuracyTrendChart weeklyAccuracy={progress.weeklyAccuracy} />
        <AccuracyGauge accuracy={progress.accuracy} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <TopicBarChart topicBreakdown={progress.topicBreakdown} />
        <SkillRadarChart topicBreakdown={progress.topicBreakdown} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">

        {/* Weak topic watchlist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("analytics.weakTopicWatchlist")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasResults ? (
              progress.weakTopics.map((topic, index) => (
                <div
                  key={topic}
                  className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 transition hover:border-white/[0.11] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{topic}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {t("analytics.weakTopicHint")}
                    </p>
                  </div>
                  <Badge className="flex-shrink-0 self-start sm:self-center" variant={index === 0 ? "warning" : "secondary"}>
                    {index === 0 ? t("analytics.priority") : t("analytics.review")}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                {t("analytics.noWeakData")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent submissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("analytics.recentSubmissions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {progress.recentResults.length ? (
              progress.recentResults.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 transition hover:border-white/[0.11] md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{entry.topic}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatDate(entry.submittedAt)}
                    </p>
                  </div>
                  <Badge className="self-start md:self-center" variant="secondary">
                    {t("analytics.correctCount", { count: entry.correctAnswers })}
                  </Badge>
                  <Badge
                    className="self-start md:self-center"
                    variant={entry.score >= 75 ? "success" : "secondary"}
                  >
                    {Math.round(entry.score)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                {t("analytics.noSubmissions")}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
