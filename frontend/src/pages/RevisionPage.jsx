import { LoaderCircle, RefreshCw, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { fetchProgress, fetchRevision } from "@/services/learningService";

export function RevisionPage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [weakTopics, setWeakTopics] = useState([]);
  const [revision, setRevision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchProgress()
      .then((progress) => {
        setWeakTopics(progress.weakTopics || []);
        const firstTopic = progress.weakTopics?.[0] || "";
        setTopic(firstTopic);
        return fetchRevision(firstTopic);
      })
      .then(setRevision)
      .catch((fetchError) => setError(fetchError.message));
  }, [user?.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchRevision(topic.trim());
      setRevision(response);
    } catch (revisionError) {
      setError(revisionError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revision Mode"
        title="Repair weak topics with guided practice"
        description="The system selects weak areas from quiz performance, creates simple notes, and gives short practice questions."
        badge={revision ? `Source: ${revision.source}` : "Personalized"}
      />

      <Card>
        <CardContent className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Topic to revise</label>
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Use a weak topic or type any topic"
            />
          </div>
          <Button className="w-full lg:w-auto" onClick={handleGenerate} disabled={loading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Generate revision
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="p-5 text-sm text-rose-200">
            Revision could not load: {error}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Weak-topic queue</CardTitle>
            <p className="text-sm text-slate-400">
              These topics come from quiz scores below 60%.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakTopics.length ? (
              weakTopics.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTopic(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                >
                  <span className="font-medium text-white">{item}</span>
                  <Badge variant="warning">Revise</Badge>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                No weak topic yet. Submit a quiz and this queue will become personalized.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{revision?.topic || "Revision plan"}</CardTitle>
                <p className="mt-2 text-sm text-slate-400">
                  Beginner-friendly notes, examples, and quick checks.
                </p>
              </div>
              {revision ? <Badge>{revision.difficulty}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {revision ? (
              <>
                <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <p className="text-sm leading-6 text-slate-100">{revision.summary}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {revision.examples.map((example) => (
                    <div key={example} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      {example}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {revision.practiceQuestions.map((item, index) => (
                    <div key={item.question} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="flex items-center gap-2 font-semibold text-white">
                        <Target className="h-4 w-4 text-primary" />
                        {index + 1}. {item.question}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                Loading revision plan...
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
