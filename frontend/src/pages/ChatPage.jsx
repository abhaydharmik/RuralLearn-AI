import { LoaderCircle, SendHorizonal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChatPageSkeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useToast } from "@/context/ToastContext";
import { fetchChatHistory, fetchProgress, sendChatMessage } from "@/services/learningService";

export function ChatPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setError("");
    setLoadingPage(true);
    Promise.all([fetchChatHistory(user.id), fetchProgress(user.id)])
      .then(([chatHistory, progress]) => {
        const translatedHistory =
          chatHistory.length === 1 &&
          chatHistory[0]?.role === "assistant" &&
          String(chatHistory[0]?.content || "").startsWith("Hello! I am your AI tutor")
            ? [{ ...chatHistory[0], content: t("chat.initialWelcome") }]
            : chatHistory;
        setMessages(translatedHistory);
        setDifficulty(progress.currentDifficulty);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({ title: t("chat.tutorUnavailable"), description: fetchError.message, variant: "error" });
      })
      .finally(() => setLoadingPage(false));
  }, [showToast, t, user?.id]);

  const promptSuggestions = [
    t("chat.prompt1"),
    t("chat.prompt2"),
    t("chat.prompt3"),
    t("chat.prompt4"),
  ];

  const helperText = useMemo(() => {
    const styleLead =
      user?.explanationStyle === "Detailed"
        ? t("chat.helperDetailed")
        : user?.explanationStyle === "Normal"
          ? t("chat.helperNormal")
          : t("chat.helperShort");
    const languageLead =
      user?.language && user.language !== "English"
        ? ` ${t("chat.helperLanguage", { language: user.language })}`
        : "";
    if (difficulty === "Hard")
      return `${styleLead} ${t("chat.helperHard")}${languageLead}`;
    if (difficulty === "Medium")
      return `${styleLead} ${t("chat.helperMedium")}${languageLead}`;
    return `${styleLead} ${t("chat.helperEasy")}${languageLead}`;
  }, [difficulty, t, user?.explanationStyle, user?.language]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setSending(true);
    setError("");
    try {
      const response = await sendChatMessage({
        question: userMessage.content,
        difficulty,
        userId: user?.id,
        language: user?.language || "English",
      });
      setMessages((current) => [...current, response]);
    } catch (sendError) {
      setError(sendError.message);
      showToast({ title: t("chat.tutorUnavailable"), description: sendError.message, variant: "error" });
    } finally {
      setSending(false);
    }
  };

  if (loadingPage) return <ChatPageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("chat.eyebrow")}
        title={t("chat.title")}
        description={t("chat.description")}
        badge={t("chat.adaptiveMode", { difficulty })}
      />

      {error ? (
        <Card>
          <CardContent className="p-4 text-[13px] text-rose-300/90">
            {t("chat.tutorCouldNotConnect", { error })}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">

        {/* ── Chat window ── */}
        <Card className="min-h-[58vh] lg:min-h-[62vh] xl:min-h-[68vh]">
          <CardContent className="flex h-full flex-col p-4 sm:p-5">
            <div className="h-[400px] space-y-3 overflow-y-scroll p-1">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {sending ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-[13px] text-slate-400">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
                  {t("chat.thinking")}
                </div>
              ) : null}
            </div>

            <form
              className="mt-5 space-y-3.5 border-t border-white/[0.07] pt-4"
              onSubmit={handleSend}
            >
              <Textarea
                placeholder={t("chat.placeholder")}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-[12px] leading-relaxed text-slate-500">{helperText}</p>
                <Button className="w-full sm:w-auto" type="submit" disabled={sending}>
                  <SendHorizonal className="h-3.5 w-3.5" />
                  {t("chat.sendQuestion")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Sidebar ── */}
        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">

          {/* Prompt ideas */}
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-white">{t("chat.promptIdeas")}</h2>
                  <p className="text-[11px] text-slate-500">{t("chat.helpfulStarters")}</p>
                </div>
              </div>
              <div className="space-y-2">
                {promptSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuestion(item)}
                    className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5 text-left text-[12px] leading-relaxed text-slate-400 transition hover:border-primary/30 hover:bg-primary/[0.08] hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tutor behavior */}
          <Card>
            <CardContent className="space-y-3.5 p-4">
              <h2 className="text-[13px] font-semibold text-white">{t("chat.tutorBehavior")}</h2>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{user?.explanationStyle || "Very simple"}</Badge>
                <Badge variant="secondary">{user?.language || "English"}</Badge>
                <Badge variant="secondary">{t("common.lowBandwidthFriendly")}</Badge>
              </div>
              <p className="text-[12px] leading-relaxed text-slate-500">
                {t("chat.tutorBehaviorDescription")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
