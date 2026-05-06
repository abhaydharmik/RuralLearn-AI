import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useToast } from "@/context/ToastContext";
import { hasSupabaseConfig } from "@/lib/supabase";
import { isPasswordRecoveryRoute } from "@/services/authService";

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completePasswordRecovery, login, requestPasswordReset, signup, user } = useAuth();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({
    fullName: "",
    school: "Rural Community School",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [completingRecovery, setCompletingRecovery] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [recoveryForm, setRecoveryForm] = useState({
    nextPassword: "",
    confirmPassword: "",
  });

  const isSignup = mode === "signup";
  const isRecoveryMode = useMemo(() => isPasswordRecoveryRoute(location), [location]);
  const recoveryReady = hasSupabaseConfig && Boolean(user);
  const recoveryBlockedMessage = !hasSupabaseConfig
    ? t("auth.recoveryUnavailable")
    : t("auth.recoveryExpired");
  const highlights = [
    {
      icon: BrainCircuit,
      title: t("auth.highlightTutorTitle"),
      description: t("auth.highlightTutorDescription"),
    },
    {
      icon: BookOpenCheck,
      title: t("auth.highlightQuizTitle"),
      description: t("auth.highlightQuizDescription"),
    },
    {
      icon: ChartNoAxesCombined,
      title: t("auth.highlightAnalyticsTitle"),
      description: t("auth.highlightAnalyticsDescription"),
    },
  ];
  const trustPoints = [
    {
      icon: ShieldCheck,
      label: t("auth.secureAuthentication"),
    },
    {
      icon: BookOpenCheck,
      label: t("auth.progressSavedAutomatically"),
    },
    {
      icon: Wifi,
      label: t("auth.lowBandwidthFriendly"),
    },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    if (isRecoveryMode) {
      setMode("login");
      setError("");
    }
  }, [isRecoveryMode]);

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
      showToast({
        title: isSignup ? "Account created" : "Welcome back",
        description: isSignup
          ? "Your learning account is ready to use."
          : "You have signed in successfully.",
        variant: "success",
      });
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
      showToast({
        title: isSignup ? "Signup failed" : "Login failed",
        description: submitError.message,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setSendingReset(true);
    setError("");

    try {
      await requestPasswordReset(formState.email);
      showToast({
        title: "Reset link sent",
        description: "Check your email for password reset instructions.",
        variant: "success",
      });
    } catch (resetError) {
      setError(resetError.message);
      showToast({
        title: "Reset failed",
        description: resetError.message,
        variant: "error",
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleRecoveryChange = (event) => {
    const { name, value } = event.target;
    setRecoveryForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handlePasswordRecovery = async (event) => {
    event.preventDefault();
    setError("");

    if (!recoveryForm.nextPassword || recoveryForm.nextPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (recoveryForm.nextPassword !== recoveryForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setCompletingRecovery(true);

    try {
      await completePasswordRecovery(recoveryForm.nextPassword);
      showToast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
        variant: "success",
      });
      navigate("/dashboard", { replace: true });
    } catch (recoveryError) {
      setError(recoveryError.message);
      showToast({
        title: "Password reset failed",
        description: recoveryError.message,
        variant: "error",
      });
    } finally {
      setCompletingRecovery(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.14),transparent_22%),radial-gradient(circle_at_82%_0%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[length:auto,auto,34px_34px,34px_34px]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.1),rgba(2,6,23,0.6)_60%,transparent_72%)] lg:block" />
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
        <section className="animated-enter space-y-6 sm:space-y-8">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs text-primary sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_rgba(16,185,129,0.75)]" />
            {t("auth.sdgBadge")}
          </div>

          <div className="space-y-4 sm:space-y-5">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              {t("auth.heroTitle")}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              {t("auth.heroDescription")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <Card className="animated-enter overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9)),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_36%)] shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
          <CardContent className="p-0">
            <div className="border-b border-white/10 bg-white/[0.045] p-4 sm:p-6">
              {isRecoveryMode ? (
                <div className="rounded-[20px] border border-primary/20 bg-primary/10 px-4 py-3">
                  <p className="text-sm font-medium text-primary">{t("auth.passwordRecovery")}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {t("auth.recoveryDescription")}
                  </p>
                </div>
              ) : (
                <div className="relative grid grid-cols-2 rounded-[20px] border border-white/10 bg-slate-950/60 p-1">
                  <div
                    className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-2xl bg-white shadow-[0_14px_30px_rgba(255,255,255,0.08)] transition-transform duration-300 ${
                      isSignup ? "translate-x-full" : "translate-x-0"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`relative z-10 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      !isSignup ? "text-slate-950" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {t("auth.login")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`relative z-10 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isSignup ? "text-slate-950" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {t("auth.signup")}
                  </button>
                </div>
              )}
            </div>

            <form className="space-y-5 p-4 sm:p-6" onSubmit={isRecoveryMode ? handlePasswordRecovery : handleSubmit}>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-primary/70">
                  {isRecoveryMode ? t("auth.resetPassword") : isSignup ? t("auth.createAccount") : t("auth.welcomeBack")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {isRecoveryMode
                    ? t("auth.setNewPassword")
                    : isSignup
                      ? t("auth.startLearningJourney")
                      : t("auth.continueLearning")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {isRecoveryMode
                    ? t("auth.resetLead")
                    : isSignup
                      ? t("auth.signupLead")
                      : t("auth.loginLead")}
                </p>
              </div>

              {isRecoveryMode ? (
                <>
                  {!recoveryReady ? (
                    <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-red-200">
                      {recoveryBlockedMessage}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">{t("auth.newPassword")}</label>
                    <div className="relative">
                      <Input
                        name="nextPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("auth.createNewPassword")}
                        value={recoveryForm.nextPassword}
                        onChange={handleRecoveryChange}
                        className="pr-14"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-white"
                        aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">{t("auth.confirmNewPassword")}</label>
                    <Input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.confirmPasswordPlaceholder")}
                      value={recoveryForm.confirmPassword}
                      onChange={handleRecoveryChange}
                      required
                    />
                  </div>
                </>
              ) : isSignup ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">{t("auth.fullName")}</label>
                    <Input
                      name="fullName"
                      placeholder={t("auth.fullNamePlaceholder")}
                      value={formState.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">{t("auth.school")}</label>
                    <Input
                      name="school"
                      placeholder={t("auth.schoolPlaceholder")}
                      value={formState.school}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </>
              ) : null}

              {!isRecoveryMode ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">{t("auth.email")}</label>
                    <Input
                      name="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={formState.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">{t("auth.password")}</label>
                    <div className="relative">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("auth.passwordPlaceholder")}
                        value={formState.password}
                        onChange={handleChange}
                        className="pr-14"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-white"
                        aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {!isRecoveryMode && !isSignup ? (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={sendingReset}
                    className="text-sm text-slate-400 transition hover:text-white disabled:opacity-50"
                  >
                    {sendingReset ? t("auth.sendingResetLink") : t("auth.forgotPassword")}
                  </button>
                </div>
              ) : null}

              <Button
                className="w-full"
                size="lg"
                type="submit"
                disabled={
                  isRecoveryMode ? completingRecovery || !recoveryReady : submitting
                }
              >
                {isRecoveryMode
                  ? completingRecovery
                    ? t("auth.updatingPassword")
                    : t("auth.saveNewPassword")
                  : submitting
                    ? t("auth.pleaseWait")
                    : isSignup
                      ? t("auth.createAccount")
                      : t("auth.login")}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {trustPoints.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-slate-300">
                      <item.icon className="h-4 w-4 text-primary" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
