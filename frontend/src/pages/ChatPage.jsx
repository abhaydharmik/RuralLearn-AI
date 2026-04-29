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
import { useToast } from "@/context/ToastContext";
import { fetchChatHistory, fetchProgress, sendChatMessage } from "@/services/learningService";

const promptSuggestions = [
  "Explain fractions with a real-life example.",
  "What is photosynthesis in simple words?",
  "Teach me algebra step by step.",
  "Explain nouns and verbs for beginners.",
];

export function ChatPage() {
  const { user } = useAuth();
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
        setMessages(chatHistory);
        setDifficulty(progress.currentDifficulty);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({ title: "Tutor unavailable", description: fetchError.message, variant: "error" });
      })
      .finally(() => setLoadingPage(false));
  }, [showToast, user?.id]);

  const helperText = useMemo(() => {
    const styleLead =
      user?.explanationStyle === "Detailed"
        ? "The tutor will try to give fuller step-by-step guidance."
        : user?.explanationStyle === "Normal"
          ? "The tutor will balance clarity with a little more detail."
          : "The tutor will keep explanations very short and simple.";
    const languageLead =
      user?.language && user.language !== "English"
        ? ` Preferred language mode is ${user.language}.`
        : "";
    if (difficulty === "Hard")
      return `${styleLead} The system is ready to challenge the student with deeper follow-up questions.${languageLead}`;
    if (difficulty === "Medium")
      return `${styleLead} The system is balancing confidence-building with slightly tougher explanations.${languageLead}`;
    return `${styleLead} The system is keeping explanations short and beginner-friendly for confidence.${languageLead}`;
  }, [difficulty, user?.explanationStyle, user?.language]);

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
      const response = await sendChatMessage({ question: userMessage.content, difficulty, userId: user?.id });
      setMessages((current) => [...current, response]);
    } catch (sendError) {
      setError(sendError.message);
      showToast({ title: "Message failed", description: sendError.message, variant: "error" });
    } finally {
      setSending(false);
    }
  };

  if (loadingPage) return <ChatPageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Tutor"
        title="Conversational learning support"
        description="Students can ask questions in simple language and receive short, beginner-friendly explanations."
        badge={`Adaptive mode: ${difficulty}`}
      />

      {error ? (
        <Card>
          <CardContent className="p-4 text-[13px] text-rose-300/90">
            AI Tutor could not connect: {error}
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
                  Thinking of a simple explanation...
                </div>
              ) : null}
            </div>

            <form
              className="mt-5 space-y-3.5 border-t border-white/[0.07] pt-4"
              onSubmit={handleSend}
            >
              <Textarea
                placeholder="Ask any question. Example: Explain gravity in simple words."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-[12px] leading-relaxed text-slate-500">{helperText}</p>
                <Button className="w-full sm:w-auto" type="submit" disabled={sending}>
                  <SendHorizonal className="h-3.5 w-3.5" />
                  Send question
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
                  <h2 className="text-[13px] font-semibold text-white">Prompt ideas</h2>
                  <p className="text-[11px] text-slate-500">Helpful starters for rural learners</p>
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
              <h2 className="text-[13px] font-semibold text-white">Tutor behavior</h2>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{user?.explanationStyle || "Very simple"}</Badge>
                <Badge variant="secondary">{user?.language || "English"}</Badge>
                <Badge variant="secondary">Low-bandwidth friendly</Badge>
              </div>
              <p className="text-[12px] leading-relaxed text-slate-500">
                The tutor is designed to keep responses clear, supportive, and easy to read on small devices.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}