import { BrainCircuit, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QuizPageSkeleton } from "@/components/ui/skeleton";
import { QuizQuestionCard, QuizResultCard } from "@/components/quiz/QuizQuestionCard";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useToast } from "@/context/ToastContext";
import { createQuiz, fetchProgress, submitQuiz } from "@/services/learningService";

export function QuizPage() {
  const { user } = useAuth();
  const { t } = useI18n();
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
    if (!user?.id) { setLoadingPage(false); return; }
    setError("");
    setLoadingPage(true);
    fetchProgress(user.id)
      .then((data) =>
        setDifficulty(user?.quizMode && user.quizMode !== "Auto" ? user.quizMode : data.currentDifficulty),
      )
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({ title: t("quiz.quizSettingsUnavailable"), description: fetchError.message, variant: "error" });
      })
      .finally(() => setLoadingPage(false));
  }, [showToast, t, user?.id, user?.quizMode]);

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setError("");
    try {
      const generatedQuiz = await createQuiz({
        topic,
        difficulty,
        userId: user?.id,
        language: user?.language || "English",
      });
      if (!generatedQuiz?.questions || generatedQuiz.questions.length !== 5) {
        console.warn("Invalid quiz received");
        setQuiz(null);
        return;
      }
      setQuiz(generatedQuiz);
      setAnswers({});
      showToast({
        title: t("quiz.generate"),
        description: `${generatedQuiz.topic}: 5 MCQs`,
        variant: "success",
      });
    } catch (generateError) {
      setError(generateError.message);
      showToast({ title: t("quiz.quizActionFailed", { error: "" }).replace(": ", ""), description: generateError.message, variant: "error" });
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSelectAnswer = (questionId, answer) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmittingQuiz(true);
    setError("");
    try {
      const submission = await submitQuiz({
        topic: quiz.topic,
        questions: quiz.questions,
        answers,
        userId: user?.id,
        language: user?.language || "English",
      });
      setResult(submission);
      const updatedProgress = await fetchProgress(user?.id);
      setDifficulty(user?.quizMode && user.quizMode !== "Auto" ? user.quizMode : updatedProgress.currentDifficulty);
      showToast({ title: t("quiz.submitQuiz"), description: `${t("common.score")}: ${Math.round(submission.score)}%`, variant: "success" });
    } catch (submitError) {
      setError(submitError.message);
      showToast({ title: t("quiz.submitQuiz"), description: submitError.message, variant: "error" });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loadingPage || generatingQuiz) return <QuizPageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("quiz.eyebrow")}
        title={t("quiz.title")}
        description={t("quiz.description")}
        badge={t("quiz.suggestedLevel", { difficulty })}
      />

      {/* ── Topic input ── */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-400">{t("quiz.topic")}</label>
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder={t("quiz.topicPlaceholder")}
            />
          </div>
          <Button
            className="w-full xl:w-auto"
            onClick={handleGenerateQuiz}
            disabled={generatingQuiz || submittingQuiz}
          >
            {generatingQuiz ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {t("quiz.generate")}
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="p-4 text-[13px] text-rose-300/90">
            {t("quiz.quizActionFailed", { error })}
          </CardContent>
        </Card>
      ) : null}

      {/* ── Empty state ── */}
      {!quiz ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-5 p-6 text-center sm:min-h-[320px] sm:p-8">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
              <BrainCircuit className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                {t("quiz.startQuiz")}
              </h2>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-500">
                {t("quiz.generatorDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Quiz header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="break-words">{t("quiz.quizSuffix", { topic: quiz.topic })}</CardTitle>
              <p className="text-[13px] text-slate-500">
                {t("quiz.difficultyLine", { difficulty: quiz.difficulty })}
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
            <p className="text-center text-[13px] text-slate-500">
              {t("quiz.noQuestionsGenerated")}
            </p>
          )}

          <div className="flex justify-stretch sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={submittingQuiz || generatingQuiz}
            >
              {submittingQuiz ? t("quiz.submitting") : t("quiz.submitQuiz")}
            </Button>
          </div>

          {result ? <QuizResultCard result={result} /> : null}
        </div>
      )}
    </div>
  );
}
