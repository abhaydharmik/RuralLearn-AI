import { BookOpenCheck, GraduationCap, TrendingUp, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatPercent } from "@/lib/utils";
import { fetchAdminDashboard } from "@/services/learningService";

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminDashboard()
      .then(setDashboard)
      .catch((fetchError) => setError(fetchError.message));
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-rose-200">
          Admin dashboard could not load: {error}
        </CardContent>
      </Card>
    );
  }

  if (!dashboard) {
    return <div className="text-sm text-slate-400">Loading admin dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Platform learning command center"
        description="Admins can monitor student progress, quiz completion, weak topics, and recent learning activity from one secure workspace."
        badge="Admin only"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersRound}
          label="Students"
          value={dashboard.totalStudents}
          hint="Learners with auth or quiz activity"
        />
        <StatCard
          icon={BookOpenCheck}
          label="Total quizzes"
          value={dashboard.totalQuizzes}
          hint="All submitted practice sets"
        />
        <StatCard
          icon={TrendingUp}
          label="Class accuracy"
          value={formatPercent(dashboard.averageAccuracy)}
          hint="Average accuracy across students"
        />
        <StatCard
          icon={GraduationCap}
          label="Weak topics"
          value={dashboard.weakTopicCounts.length}
          hint="Topics needing admin attention"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <Card>
          <CardHeader>
            <CardTitle>Class weak-topic map</CardTitle>
            <p className="text-sm text-slate-400">
              Most repeated weak areas across the class.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.weakTopicCounts.length ? (
              dashboard.weakTopicCounts.map((item) => (
                <div key={item.topic} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.topic}</p>
                    <Badge variant="warning">{item.count} students</Badge>
                  </div>
                  <Progress className="mt-3" value={Math.min(item.count * 20, 100)} />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                Weak-topic insights will appear after students submit quizzes.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student roster</CardTitle>
            <p className="text-sm text-slate-400">
              Accuracy, quiz count, adaptive level, and current support needs.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.students.length ? (
              dashboard.students.map((student) => (
                <div key={student.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {student.email || student.id}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {student.completedQuizzes} quizzes completed
                        {student.lastActive ? ` · Last active ${new Date(student.lastActive).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={student.accuracy >= 75 ? "success" : student.accuracy < 50 ? "warning" : "secondary"}>
                        {formatPercent(student.accuracy)}
                      </Badge>
                      <Badge variant="secondary">{student.currentDifficulty}</Badge>
                    </div>
                  </div>
                  <Progress className="mt-4" value={student.accuracy} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {student.weakTopics.length ? (
                      student.weakTopics.map((topic) => (
                        <Badge key={topic} variant="warning">
                          {topic}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="success">No weak topic</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                No students yet. Sign up and submit quizzes to populate this view.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent class submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.recentResults.length ? (
            dashboard.recentResults.map((entry) => (
              <div key={entry.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{entry.topic}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(entry.submittedAt).toLocaleString()}
                  </p>
                </div>
                <Badge variant="secondary">
                  {entry.correctAnswers}/{entry.totalQuestions}
                </Badge>
                <Badge variant={entry.score >= 75 ? "success" : entry.score < 50 ? "warning" : "secondary"}>
                  {formatPercent(entry.score)}
                </Badge>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
              Class submissions will appear here after quiz attempts.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
