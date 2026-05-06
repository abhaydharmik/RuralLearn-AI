import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useToast } from "@/context/ToastContext";
import { formatPercent } from "@/lib/utils";
import { fetchQuizHistory } from "@/services/learningService";

export function QuizHistoryPage() {
  const { user } = useAuth();
  const { t, formatDateTime } = useI18n();
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchQuizHistory()
      .then((data) => setHistory(data.results || []))
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({ title: t("history.historyUnavailable"), description: fetchError.message, variant: "error" });
      })
      .finally(() => setLoading(false));
  }, [showToast, t, user?.id]);

  if (loading) return <DetailPageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("history.eyebrow")}
        title={t("history.title")}
        description={t("history.description")}
        badge={t("history.submissions", { count: history.length })}
      />

      {error ? (
        <Card>
          <CardContent className="p-4 text-[13px] text-rose-300/90">
            {t("history.historyCouldNotLoad", { error })}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3.5">
        {history.length ? (
          history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="break-words">{entry.topic}</CardTitle>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-500">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDateTime(entry.submittedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={entry.score >= 75 ? "success" : entry.score < 50 ? "warning" : "secondary"}>
                        {formatPercent(entry.score)}
                      </Badge>
                      <Badge variant="secondary">{entry.difficulty}</Badge>
                      <Badge variant="secondary">
                        {t("history.correctSummary", {
                          correct: entry.correctAnswers,
                          total: entry.totalQuestions,
                        })}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Score</span>
                      <span className="text-[11px] font-medium text-slate-300">{formatPercent(entry.score)}</span>
                    </div>
                    <Progress value={entry.score} />
                  </div>

                  <p className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-[13px] leading-relaxed text-slate-300">
                    {entry.feedback || t("history.noFeedback")}
                  </p>

                  <Button
                    variant="secondary"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {isExpanded ? t("history.hideAnswers") : t("history.reviewAnswers")}
                  </Button>

                  {isExpanded ? (
                    <div className="space-y-2.5">
                      {(entry.questionReview || []).map((item, index) => (
                        <div
                          key={`${entry.id}-${item.question}`}
                          className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4"
                        >
                          <p className="text-[13px] font-semibold text-white">
                            {index + 1}. {item.question}
                          </p>
                          <p className="mt-2 text-[12px] text-slate-400">
                            {t("history.yourAnswer", {
                              answer: item.selectedAnswer || t("history.notAnswered"),
                            })}
                          </p>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                            {t("history.correctAnswer", { answer: item.correctAnswer })}
                          </p>
                          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{item.explanation}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-6 text-[13px] leading-relaxed text-slate-500">
              {t("history.noHistory")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
