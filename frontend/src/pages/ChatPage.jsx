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
    if (!user?.id) {
      return;
    }

    setError("");
    setLoadingPage(true);
    Promise.all([fetchChatHistory(user.id), fetchProgress(user.id)])
      .then(([chatHistory, progress]) => {
        setMessages(chatHistory);
        setDifficulty(progress.currentDifficulty);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({
          title: "Tutor unavailable",
          description: fetchError.message,
          variant: "error",
        });
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

    if (difficulty === "Hard") {
      return `${styleLead} The system is ready to challenge the student with deeper follow-up questions.${languageLead}`;
    }

    if (difficulty === "Medium") {
      return `${styleLead} The system is balancing confidence-building with slightly tougher explanations.${languageLead}`;
    }

    return `${styleLead} The system is keeping explanations short and beginner-friendly for confidence.${languageLead}`;
  }, [difficulty, user?.explanationStyle, user?.language]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }

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
      });

      setMessages((current) => [...current, response]);
    } catch (sendError) {
      setError(sendError.message);
      showToast({
        title: "Message failed",
        description: sendError.message,
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  if (loadingPage) {
    return <ChatPageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Tutor"
        title="Conversational learning support"
        description="Students can ask questions in simple language and receive short, beginner-friendly explanations."
        badge={`Adaptive mode: ${difficulty}`}
      />

      {error ? (
        <Card>
          <CardContent className="p-5 text-sm text-rose-200">
            AI Tutor could not connect: {error}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <Card className="min-h-[58vh] lg:min-h-[62vh] xl:min-h-[68vh]">
          <CardContent className="flex h-full flex-col p-4 sm:p-6">
            <div className="h-[400px] space-y-4 overflow-y-scroll p-2">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {sending ? (
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  Thinking of a simple explanation...
                </div>
              ) : null}
            </div>

            <form className="mt-6 space-y-4 border-t border-white/10 pt-5" onSubmit={handleSend}>
              <Textarea
                placeholder="Ask any question. Example: Explain gravity in simple words."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-6 text-slate-400">{helperText}</p>
                <Button className="w-full sm:w-auto" type="submit" disabled={sending}>
                  <SendHorizonal className="h-4 w-4" />
                  Send question
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">Prompt ideas</h2>
                  <p className="text-sm text-slate-400">Helpful starters for rural learners</p>
                </div>
              </div>
              <div className="space-y-3">
                {promptSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuestion(item)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-primary/35 hover:bg-primary/10 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="font-semibold text-white">Tutor behavior</h2>
              <div className="flex flex-wrap gap-2">
                <Badge>{user?.explanationStyle || "Very simple"}</Badge>
                <Badge variant="secondary">{user?.language || "English"}</Badge>
                <Badge variant="secondary">Low-bandwidth friendly</Badge>
              </div>
              <p className="text-sm text-slate-400">
                The tutor is designed to keep responses clear, supportive, and easy to read on small devices.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
