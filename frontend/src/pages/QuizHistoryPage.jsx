import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { formatPercent } from "@/lib/utils";
import { fetchQuizHistory } from "@/services/learningService";

export function QuizHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchQuizHistory()
      .then((data) => setHistory(data.results || []))
      .catch((fetchError) => setError(fetchError.message));
  }, [user?.id]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quiz History"
        title="Review every submitted quiz"
        description="Students can revisit feedback, correct answers, explanations, and progress from previous practice sets."
        badge={`${history.length} submissions`}
      />

      {error ? (
        <Card>
          <CardContent className="p-5 text-sm text-rose-200">
            Quiz history could not load: {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {history.length ? (
          history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="break-words">{entry.topic}</CardTitle>
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                        <CalendarClock className="h-4 w-4" />
                        {new Date(entry.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={entry.score >= 75 ? "success" : entry.score < 50 ? "warning" : "secondary"}>
                        {formatPercent(entry.score)}
                      </Badge>
                      <Badge variant="secondary">{entry.difficulty}</Badge>
                      <Badge variant="secondary">
                        {entry.correctAnswers}/{entry.totalQuestions} correct
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={entry.score} />
                  <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    {entry.feedback || "No feedback was saved for this quiz."}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? "Hide answers" : "Review answers"}
                  </Button>

                  {isExpanded ? (
                    <div className="space-y-3">
                      {(entry.questionReview || []).map((item, index) => (
                        <div key={`${entry.id}-${item.question}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="font-semibold text-white">
                            {index + 1}. {item.question}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            Your answer: {item.selectedAnswer || "Not answered"}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Correct answer: {item.correctAnswer}
                          </p>
                          <p className="mt-2 text-sm text-slate-400">{item.explanation}</p>
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
            <CardContent className="p-6 text-sm text-slate-400">
              No quiz submissions yet. Complete a quiz to build this history.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
