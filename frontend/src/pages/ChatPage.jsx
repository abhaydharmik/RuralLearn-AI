import { LoaderCircle, SendHorizonal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ChatMessage } from "@/components/chat/ChatMessage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { fetchChatHistory, fetchProgress, sendChatMessage } from "@/services/learningService";

const promptSuggestions = [
  "Explain fractions with a real-life example.",
  "What is photosynthesis in simple words?",
  "Teach me algebra step by step.",
  "Explain nouns and verbs for beginners.",
];

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchChatHistory(user.id).then(setMessages);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchProgress(user.id).then((data) => setDifficulty(data.currentDifficulty));
  }, [user?.id]);

  const helperText = useMemo(() => {
    if (difficulty === "Hard") {
      return "The system is ready to challenge the student with deeper follow-up questions.";
    }

    if (difficulty === "Medium") {
      return "The system is balancing confidence-building with slightly tougher explanations.";
    }

    return "The system is keeping explanations short and beginner-friendly for confidence.";
  }, [difficulty]);

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

    try {
      const response = await sendChatMessage({
        question: userMessage.content,
        difficulty,
        userId: user?.id,
      });

      setMessages((current) => [...current, response]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Tutor"
        title="Conversational learning support"
        description="Students can ask questions in simple language and receive short, beginner-friendly explanations."
        badge={`Adaptive mode: ${difficulty}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="min-h-[72vh]">
          <CardContent className="flex h-full flex-col p-4 sm:p-6">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
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
                <p className="text-sm text-slate-400">{helperText}</p>
                <Button type="submit" disabled={sending}>
                  <SendHorizonal className="h-4 w-4" />
                  Send question
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
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
                <Badge>Short answers</Badge>
                <Badge variant="secondary">Beginner examples</Badge>
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
