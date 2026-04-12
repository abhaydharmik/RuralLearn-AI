import { BrainCircuit, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  QuizQuestionCard,
  QuizResultCard,
} from "@/components/quiz/QuizQuestionCard";
import { useAuth } from "@/context/AuthContext";
import {
  createQuiz,
  fetchProgress,
  submitQuiz,
} from "@/services/learningService";

export function QuizPage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("Fractions");
  const [difficulty, setDifficulty] = useState("Easy");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchProgress(user.id).then((data) =>
      setDifficulty(data.currentDifficulty),
    );
  }, [user?.id]);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    setResult(null);

    try {
      const generatedQuiz = await createQuiz({ topic, difficulty, userId: user?.id });

      if (!generatedQuiz?.questions || generatedQuiz.questions.length !== 5) {
        console.warn("Invalid quiz received");
        setQuiz(null);
        return;
      }

      setQuiz(generatedQuiz);
      setAnswers({});
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId, answer) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) {
      return;
    }

    setLoading(true);
    try {
      const submission = await submitQuiz({
        topic: quiz.topic,
        questions: quiz.questions,
        answers,
        userId: user?.id,
      });

      setResult(submission);
      const updatedProgress = await fetchProgress(user?.id);
      setDifficulty(updatedProgress.currentDifficulty);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quiz Lab"
        title="Generate adaptive practice sets"
        description="Create 5-question MCQ quizzes, submit answers instantly, and let the system adjust difficulty based on performance."
        badge={`Suggested level: ${difficulty}`}
      />

      <Card>
        <CardContent className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Topic</label>
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Enter a topic like fractions or photosynthesis"
            />
          </div>
          <Button
            className="w-full xl:w-auto"
            onClick={handleGenerateQuiz}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate 5 MCQs
          </Button>
        </CardContent>
      </Card>

      {!quiz ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-6 text-center sm:min-h-[320px] sm:p-8">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <BrainCircuit className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Start a personalized quiz
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                The generator creates five MCQs with answers and explanations,
                tuned to the student&apos;s current performance level.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="break-words">{`${quiz.topic} quiz`}</CardTitle>
              <p className="text-sm text-slate-400">
                Difficulty: {quiz.difficulty}. Answer all questions, then submit
                for feedback.
              </p>
            </CardHeader>
          </Card>

          {quiz?.questions?.length > 0 ? (
            quiz.questions.map((question, index) => (
              <QuizQuestionCard
                key={question.id}
                index={index}
                question={question}
                selectedAnswer={answers[question.id]}
                onSelect={handleSelectAnswer}
              />
            ))
          ) : (
            <p className="text-center text-slate-400">
              No questions generated. Try again.
            </p>
          )}

          <div className="flex justify-stretch sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit quiz"}
            </Button>
          </div>

          {result ? <QuizResultCard result={result} /> : null}
        </div>
      )}
    </div>
  );
}
