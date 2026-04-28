import { BrainCircuit, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuizPageSkeleton } from "@/components/ui/skeleton";
import {
  QuizQuestionCard,
  QuizResultCard,
} from "@/components/quiz/QuizQuestionCard";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  createQuiz,
  fetchProgress,
  submitQuiz,
} from "@/services/learningService";

export function QuizPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [topic, setTopic] = useState("Fractions");
  const [difficulty, setDifficulty] = useState("Easy");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setLoadingPage(false);
      return;
    }

    setError("");
    setLoadingPage(true);
    fetchProgress(user.id)
      .then((data) =>
        setDifficulty(user?.quizMode && user.quizMode !== "Auto" ? user.quizMode : data.currentDifficulty),
      )
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({
          title: "Quiz settings unavailable",
          description: fetchError.message,
          variant: "error",
        });
      })
      .finally(() => {
        setLoadingPage(false);
      });
  }, [showToast, user?.id, user?.quizMode]);

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setError("");

    try {
      const generatedQuiz = await createQuiz({ topic, difficulty, userId: user?.id });

      if (!generatedQuiz?.questions || generatedQuiz.questions.length !== 5) {
        console.warn("Invalid quiz received");
        setQuiz(null);
        return;
      }

      setQuiz(generatedQuiz);
      setAnswers({});
      showToast({
        title: "Quiz ready",
        description: `Generated 5 questions for ${generatedQuiz.topic}.`,
        variant: "success",
      });
    } catch (generateError) {
      setError(generateError.message);
      showToast({
        title: "Quiz generation failed",
        description: generateError.message,
        variant: "error",
      });
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSelectAnswer = (questionId, answer) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) {
      return;
    }

    setSubmittingQuiz(true);
    setError("");
    try {
      const submission = await submitQuiz({
        topic: quiz.topic,
        questions: quiz.questions,
        answers,
        userId: user?.id,
      });

      setResult(submission);
      const updatedProgress = await fetchProgress(user?.id);
      setDifficulty(
        user?.quizMode && user.quizMode !== "Auto" ? user.quizMode : updatedProgress.currentDifficulty,
      );
      showToast({
        title: "Quiz submitted",
        description: `Score saved successfully: ${Math.round(submission.score)}%.`,
        variant: "success",
      });
    } catch (submitError) {
      setError(submitError.message);
      showToast({
        title: "Quiz submission failed",
        description: submitError.message,
        variant: "error",
      });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loadingPage || generatingQuiz) {
    return <QuizPageSkeleton />;
  }

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
            disabled={generatingQuiz || submittingQuiz}
          >
            {generatingQuiz ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate 5 MCQs
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="p-5 text-sm text-rose-200">
            Quiz action failed: {error}
          </CardContent>
        </Card>
      ) : null}

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
              disabled={submittingQuiz || generatingQuiz}
            >
              {submittingQuiz ? "Submitting..." : "Submit quiz"}
            </Button>
          </div>

          {result ? <QuizResultCard result={result} /> : null}
        </div>
      )}
    </div>
  );
}
