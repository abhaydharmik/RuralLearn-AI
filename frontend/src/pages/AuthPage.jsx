import { ArrowRight, BookOpenCheck, BrainCircuit, ChartNoAxesCombined } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

const highlights = [
  {
    icon: BrainCircuit,
    title: "AI tutor support",
    description: "Explain difficult ideas in simple language with beginner-friendly examples.",
  },
  {
    icon: BookOpenCheck,
    title: "Smart quizzes",
    description: "Generate topic-based MCQs and get instant feedback after submission.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Progress tracking",
    description: "Watch accuracy improve with clean charts and weak-topic alerts.",
  },
];

export function AuthPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({
    fullName: "",
    school: "Rural Community School",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (isSignup) {
        await signup(formState);
      } else {
        await login({ email: formState.email, password: formState.password });
      }
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.1),transparent_24%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.12),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="animated-enter space-y-8">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_rgba(16,185,129,0.75)]" />
            SDG 4 Learning Platform
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Personalized AI learning for students who need clarity, confidence, and momentum.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              RuralLearn AI blends tutoring, quizzes, revision support, and analytics into a polished learning workspace designed for real educational impact.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {highlights.map((item) => (
              <Card key={item.title} className="border-white/10 bg-white/5">
                <CardContent className="space-y-4 p-5">
                  <div className="mt-2 inline-flex rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="animated-enter overflow-hidden border-white/10">
          <CardContent className="p-0">
            <div className="border-b border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="flex rounded-2xl bg-slate-950/60 p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    !isSignup ? "bg-white text-slate-950 shadow-lg shadow-black/10" : "text-slate-300"
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isSignup ? "bg-white text-slate-950 shadow-lg shadow-black/10" : "text-slate-300"
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>

            <form className="space-y-5 p-4 sm:p-6" onSubmit={handleSubmit}>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-primary/70">
                  {isSignup ? "Create account" : "Welcome back"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {isSignup ? "Start the learning journey" : "Continue learning"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {isSignup
                    ? "Create a student account to save quizzes, revision plans, and learning analytics."
                    : "Sign in to continue with your tutor, quiz history, revision mode, and dashboards."}
                </p>
              </div>

              {isSignup ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Full name</label>
                    <Input
                      name="fullName"
                      placeholder="Asha Kumari"
                      value={formState.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">School</label>
                    <Input
                      name="school"
                      placeholder="Village Public School"
                      value={formState.school}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Email</label>
                <Input
                  name="email"
                  type="email"
                  placeholder="student@example.com"
                  value={formState.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Password</label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={formState.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <Button className="w-full" size="lg" type="submit" disabled={submitting}>
                {submitting ? "Please wait..." : isSignup ? "Create account" : "Log in"}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="text-sm leading-6 text-slate-400">
                {isSignup
                  ? "Supabase authentication is active when environment variables are configured."
                  : "Your session, JWT access, progress, and admin checks are handled automatically after sign in."}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
