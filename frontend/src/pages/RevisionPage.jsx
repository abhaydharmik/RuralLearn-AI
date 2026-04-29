import { LoaderCircle, RefreshCw, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { fetchProgress, fetchRevision } from "@/services/learningService";

export function RevisionPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [topic, setTopic] = useState("");
  const [weakTopics, setWeakTopics] = useState([]);
  const [revision, setRevision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setBootstrapping(true);
    fetchProgress()
      .then((progress) => {
        setWeakTopics(progress.weakTopics || []);
        const firstTopic = progress.weakTopics?.[0] || "";
        setTopic(firstTopic);
        return fetchRevision(firstTopic);
      })
      .then(setRevision)
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({ title: "Revision unavailable", description: fetchError.message, variant: "error" });
      })
      .finally(() => setBootstrapping(false));
  }, [showToast, user?.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchRevision(topic.trim());
      setRevision(response);
    } catch (revisionError) {
      setError(revisionError.message);
      showToast({ title: "Revision generation failed", description: revisionError.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (bootstrapping) return <DetailPageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revision Mode"
        title="Repair weak topics with guided practice"
        description="The system selects weak areas from quiz performance, creates simple notes, and gives short practice questions."
        badge={revision ? `Source: ${revision.source}` : "Personalized"}
      />

      {/* ── Topic input ── */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-slate-400">Topic to revise</label>
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Use a weak topic or type any topic"
            />
          </div>
          <Button className="w-full lg:w-auto" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Generate revision
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="p-4 text-[13px] text-rose-300/90">
            Revision could not load: {error}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">

        {/* ── Weak topic queue ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Weak-topic queue</CardTitle>
            <p className="text-[12px] text-slate-500">
              These topics come from quiz scores below 60%.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {weakTopics.length ? (
              weakTopics.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTopic(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.08]"
                >
                  <span className="text-[13px] font-medium text-white">{item}</span>
                  <Badge variant="warning">Revise</Badge>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                No weak topic yet. Submit a quiz and this queue will become personalized.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Revision plan ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{revision?.topic || "Revision plan"}</CardTitle>
                <p className="mt-1.5 text-[12px] text-slate-500">
                  Beginner-friendly notes, examples, and quick checks.
                </p>
              </div>
              {revision ? <Badge>{revision.difficulty}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {revision ? (
              <>
                {/* Summary */}
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.08] p-4">
                  <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <p className="text-[13px] leading-relaxed text-slate-200">{revision.summary}</p>
                  </div>
                </div>

                {/* Examples */}
                <div className="grid gap-2.5 md:grid-cols-2">
                  {revision.examples.map((example) => (
                    <div
                      key={example}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3.5 text-[13px] leading-relaxed text-slate-300"
                    >
                      {example}
                    </div>
                  ))}
                </div>

                {/* Practice questions */}
                <div className="space-y-2.5">
                  {revision.practiceQuestions.map((item, index) => (
                    <div
                      key={item.question}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4"
                    >
                      <p className="flex items-center gap-2 text-[13px] font-semibold text-white">
                        <Target className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                        {index + 1}. {item.question}
                      </p>
                      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                Loading revision plan...
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}