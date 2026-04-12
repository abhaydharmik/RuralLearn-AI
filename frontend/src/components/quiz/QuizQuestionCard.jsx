import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function QuizQuestionCard({ question, index, selectedAnswer, onSelect }) {
  return (
    <Card className="animated-enter">
      <CardHeader>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle className="text-lg">{`Question ${index + 1}`}</CardTitle>
          {selectedAnswer ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Answer selected
            </span>
          ) : null}
        </div>
        <p className="break-words text-base text-slate-200">{question.question}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {question.options.map((option) => {
          const isActive = selectedAnswer === option;
          return (
            <button
              key={`${question.id}-${option}`}
              type="button"
              onClick={() => onSelect(question.id, option)}
              className={cn(
                "break-words rounded-2xl border px-4 py-3 text-left text-sm transition",
                isActive
                  ? "border-primary bg-primary/15 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-primary/35 hover:bg-white/10",
              )}
            >
              {option}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function QuizResultCard({ result }) {
  return (
    <Card className="animated-enter">
      <CardHeader>
        <CardTitle>Quiz feedback</CardTitle>
        <p className="text-sm text-slate-300">
          Score: <span className="font-semibold text-white">{Math.round(result.score)}%</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-slate-200">
          {result.feedback}
        </p>
        <div className="space-y-3">
          {result.questionReview.map((entry, index) => (
            <div key={entry.question} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="break-words font-medium text-white">{`${index + 1}. ${entry.question}`}</p>
              <p className="mt-2 text-sm text-slate-300">
                Your answer: {entry.selectedAnswer || "Not answered"}
              </p>
              <p className="mt-1 break-words text-sm text-emerald-300">
                Correct answer: {entry.correctAnswer}
              </p>
              <p className="mt-2 text-sm text-slate-400">{entry.explanation}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
