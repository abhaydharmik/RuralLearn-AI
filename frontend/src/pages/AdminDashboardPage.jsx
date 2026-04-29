import { BookOpenCheck, GraduationCap, TrendingUp, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/ToastContext";
import { formatPercent } from "@/lib/utils";
import { fetchAdminDashboard } from "@/services/learningService";

export function AdminDashboardPage() {
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminDashboard()
      .then(setDashboard)
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({ title: "Admin dashboard unavailable", description: fetchError.message, variant: "error" });
      });
  }, [showToast]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-[13px] text-rose-300/90">
          Admin dashboard could not load: {error}
        </CardContent>
      </Card>
    );
  }

  if (!dashboard) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Platform learning command center"
        description="Admins can monitor student progress, quiz completion, weak topics, and recent learning activity from one secure workspace."
        badge="Admin only"
      />

      {/* ── Stat cards ── */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} label="Students" value={dashboard.totalStudents} hint="Learners with auth or quiz activity" />
        <StatCard icon={BookOpenCheck} label="Total quizzes" value={dashboard.totalQuizzes} hint="All submitted practice sets" />
        <StatCard icon={TrendingUp} label="Class accuracy" value={formatPercent(dashboard.averageAccuracy)} hint="Average accuracy across students" />
        <StatCard icon={GraduationCap} label="Weak topics" value={dashboard.weakTopicCounts.length} hint="Topics needing admin attention" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">

        {/* Weak topic map */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Class weak-topic map</CardTitle>
            <p className="text-[12px] text-slate-500">
              Most repeated weak areas across the class.
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {dashboard.weakTopicCounts.length ? (
              dashboard.weakTopicCounts.map((item) => (
                <div
                  key={item.topic}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-white">{item.topic}</p>
                    <Badge variant="warning">{item.count} students</Badge>
                  </div>
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Frequency</span>
                      <span className="text-[11px] font-medium text-slate-400">{Math.min(item.count * 20, 100)}%</span>
                    </div>
                    <Progress value={Math.min(item.count * 20, 100)} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                Weak-topic insights will appear after students submit quizzes.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student roster */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Student roster</CardTitle>
            <p className="text-[12px] text-slate-500">
              Accuracy, quiz count, adaptive level, and current support needs.
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {dashboard.students.length ? (
              dashboard.students.map((student) => (
                <div
                  key={student.id}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 transition hover:border-white/[0.11]"
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {student.email || student.id}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {student.completedQuizzes} quizzes
                        {student.lastActive
                          ? ` · Last active ${new Date(student.lastActive).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={student.accuracy >= 75 ? "success" : student.accuracy < 50 ? "warning" : "secondary"}>
                        {formatPercent(student.accuracy)}
                      </Badge>
                      <Badge variant="secondary">{student.currentDifficulty}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Accuracy</span>
                      <span className="text-[11px] font-medium text-slate-400">{formatPercent(student.accuracy)}</span>
                    </div>
                    <Progress value={student.accuracy} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {student.weakTopics.length ? (
                      student.weakTopics.map((topic) => (
                        <Badge key={topic} variant="warning">{topic}</Badge>
                      ))
                    ) : (
                      <Badge variant="success">No weak topic</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                No students yet. Sign up and submit quizzes to populate this view.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Recent class submissions ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recent class submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {dashboard.recentResults.length ? (
            dashboard.recentResults.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 transition hover:border-white/[0.11] md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white">{entry.topic}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {new Date(entry.submittedAt).toLocaleDateString(undefined, {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge className="self-start md:self-center" variant="secondary">
                  {entry.correctAnswers}/{entry.totalQuestions}
                </Badge>
                <Badge
                  className="self-start md:self-center"
                  variant={entry.score >= 75 ? "success" : entry.score < 50 ? "warning" : "secondary"}
                >
                  {formatPercent(entry.score)}
                </Badge>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
              Class submissions will appear here after quiz attempts.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}