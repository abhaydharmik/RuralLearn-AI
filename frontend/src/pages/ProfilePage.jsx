import {
  BadgeCheck,
  BellRing,
  BookMarked,
  BookOpenCheck,
  CircleGauge,
  Clock3,
  Download,
  Flame,
  GraduationCap,
  Languages,
  LockKeyhole,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProfileSkeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useToast } from "@/context/ToastContext";
import { formatPercent } from "@/lib/utils";
import { fetchChatHistory, fetchProgress, fetchQuizHistory } from "@/services/learningService";
import {
  ageGroupOptions,
  buildAchievements,
  buildStudyMetrics,
  downloadProfileReport,
  explanationStyleOptions,
  languageOptions,
  normalizeProfileFields,
  quizModeOptions,
} from "@/services/profileService";

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3.5">
      <div className="mt-0.5 flex-shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-1.5 break-words text-[13px] font-medium text-slate-100">{value || "—"}</p>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-[13px] font-medium text-slate-400">{label}</span>
      <select
        className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-slate-100 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildInitialState(user) {
  return normalizeProfileFields(user || {});
}

export function ProfilePage() {
  const { user, updateProfile, changePassword, logoutEverywhere } = useAuth();
  const { t, formatDateTime } = useI18n();
  const { showToast } = useToast();
  const [formState, setFormState] = useState(() => buildInitialState(user));
  const [progress, setProgress] = useState(null);
  const [history, setHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("");
  const [securityState, setSecurityState] = useState("");
  const [savedTopicInput, setSavedTopicInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setFormState(buildInitialState(user));
  }, [user]);

  useEffect(() => {
    let mounted = true;
    setLoadingProfile(true);
    Promise.all([fetchProgress(), fetchQuizHistory(), fetchChatHistory()])
      .then(([progressData, historyData, chatData]) => {
        if (!mounted) return;
        setProgress(progressData);
        setHistory(historyData.results || []);
        setChatMessages(chatData || []);
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(fetchError.message);
          showToast({ title: t("profile.profileDataUnavailable"), description: fetchError.message, variant: "error" });
        }
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });
    return () => { mounted = false; };
  }, [showToast, t]);

  const topicMetrics = useMemo(() => {
    const sorted = [...(progress?.topicBreakdown || [])].sort((l, r) => r.accuracy - l.accuracy);
    return { strongestTopic: sorted[0] || null, weakestTopic: sorted[sorted.length - 1] || null };
  }, [progress?.topicBreakdown]);

  const studyMetrics = useMemo(() => buildStudyMetrics(history, chatMessages), [history, chatMessages]);

  const achievements = useMemo(
    () => buildAchievements({ profile: formState, progress, history, chatMessages, studyMetrics, strongestTopic: topicMetrics.strongestTopic }),
    [chatMessages, formState, history, progress, studyMetrics, topicMetrics.strongestTopic],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
    setSaveState("");
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveState("Profile image is too large. Please choose an image under 2MB.");
      showToast({ title: "Image too large", description: "Please choose an image smaller than 2MB.", variant: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((current) => ({ ...current, avatarImage: String(reader.result || "") }));
      setSaveState("");
    };
    reader.readAsDataURL(file);
  };

  const handleAddSavedTopic = () => {
    const topic = savedTopicInput.trim();
    if (!topic) return;
    setFormState((current) => {
      const nextTopics = new Set(current.savedTopics);
      nextTopics.add(topic);
      return { ...current, savedTopics: [...nextTopics] };
    });
    setSavedTopicInput("");
    setSaveState("");
  };

  const handleRemoveSavedTopic = (topicToRemove) => {
    setFormState((current) => ({
      ...current,
      savedTopics: current.savedTopics.filter((topic) => topic !== topicToRemove),
    }));
    setSaveState("");
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setSaveState("");
    setError("");
    try {
      await updateProfile(formState);
      setSaveState("Profile updated successfully.");
      showToast({ title: "Profile updated", description: "Your account details and preferences were saved.", variant: "success" });
    } catch (updateError) {
      setSaveState(updateError.message);
      showToast({ title: "Profile update failed", description: updateError.message, variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.nextPassword || passwordForm.nextPassword.length < 6) {
      setSecurityState("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setSecurityState("New password and confirm password do not match.");
      return;
    }
    setChangingPassword(true);
    setSecurityState("");
    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, nextPassword: passwordForm.nextPassword });
      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
      setSecurityState("Password updated successfully.");
      showToast({ title: "Password updated", description: "Your password has been changed successfully.", variant: "success" });
    } catch (passwordError) {
      setSecurityState(passwordError.message);
      showToast({ title: "Password change failed", description: passwordError.message, variant: "error" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDownloadReport = () => {
    downloadProfileReport({
      profile: { ...formState, email: user?.email, isAdmin: user?.isAdmin },
      progress,
      studyMetrics,
      strongestTopic: topicMetrics.strongestTopic,
      weakestTopic: topicMetrics.weakestTopic,
      achievements,
    });
    showToast({ title: "Report downloaded", description: "Your learning profile report was generated successfully.", variant: "success" });
  };

  if (loadingProfile) return <ProfileSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("profile.eyebrow")}
        title={formState.fullName || t("common.student")}
        description={t("profile.description")}
        badge={t("profile.accountBadge", { role: user?.isAdmin ? t("common.admin") : t("common.student") })}
      />

      {error ? (
        <Card>
          <CardContent className="p-4 text-[13px] text-rose-300/90">
            {t("profile.profileCouldNotLoad", { error })}
          </CardContent>
        </Card>
      ) : null}

      {/* ── Profile card + Edit ── */}
      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">

        {/* Identity card */}
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-shrink-0">
                <Avatar
                  className="h-[72px] w-[72px] text-lg"
                  imageSrc={formState.avatarImage}
                  name={formState.fullName}
                  theme={formState.avatarTheme}
                />
                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-primary/60">
                  {t("profile.profileCard")}
                </p>
                <h2 className="mt-1.5 break-words text-xl font-semibold tracking-tight text-white">
                  {formState.fullName || t("common.student")}
                </h2>
                <p className="mt-1 break-words text-[13px] text-slate-500">{user?.email}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge>{user?.isAdmin ? t("profile.adminAccess") : t("profile.studentAccess")}</Badge>
                  <Badge variant="secondary">{formState.school || "Rural Community School"}</Badge>
                  <Badge variant="secondary">{formState.language}</Badge>
                </div>
              </div>
            </div>

            {/* Upload */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">{t("profile.uploadPhoto")}</span>
                <Input accept="image/*" onChange={handleAvatarUpload} type="file" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                <Save className="h-3.5 w-3.5" />
                {savingProfile ? `${t("common.save")}...` : t("common.saveProfile")}
              </Button>
              <Button onClick={handleDownloadReport} variant="outline">
                <Download className="h-3.5 w-3.5" />
                {t("common.downloadReport")}
              </Button>
            </div>

            {saveState ? (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-[13px] text-slate-300">
                {saveState}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.editProfile")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.fullName")}</span>
              <Input name="fullName" value={formState.fullName} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.school")}</span>
              <Input name="school" value={formState.school} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.classGrade")}</span>
              <Input name="classGrade" value={formState.classGrade} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.preferredSubject")}</span>
              <Input name="preferredSubject" value={formState.preferredSubject} onChange={handleChange} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.learningGoal")}</span>
              <Textarea
                name="learningGoal"
                value={formState.learningGoal}
                onChange={handleChange}
                placeholder={t("profile.learningGoalPlaceholder")}
              />
            </label>
          </CardContent>
        </Card>
      </section>

      {/* ── Stats ── */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CircleGauge} label={t("dashboard.accuracy")} value={formatPercent(progress?.accuracy || 0)} hint={t("dashboard.accuracyHint")} />
        <StatCard icon={BookOpenCheck} label={t("dashboard.completedQuizzes")} value={progress?.completedQuizzes || 0} hint="Saved practice submissions" />
        <StatCard icon={Sparkles} label={t("profile.currentLevel")} value={progress?.currentDifficulty || "Easy"} hint={t("profile.currentLevelHint")} />
        <StatCard icon={Target} label={t("profile.tutorQuestions")} value={studyMetrics.tutorQuestions} hint={t("profile.tutorQuestionsHint")} />
      </section>

      {/* ── Preferences + Academic ── */}
      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.learningPreferences")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <SelectField
              label={t("profile.preferredLanguage")}
              value={formState.language}
              options={languageOptions}
              onChange={(e) => handleChange({ target: { name: "language", value: e.target.value } })}
            />
            <SelectField
              label={t("profile.explanationStyle")}
              value={formState.explanationStyle}
              options={explanationStyleOptions}
              onChange={(e) => handleChange({ target: { name: "explanationStyle", value: e.target.value } })}
            />
            <SelectField
              label={t("profile.quizDifficultyMode")}
              value={formState.quizMode}
              options={quizModeOptions}
              onChange={(e) => handleChange({ target: { name: "quizMode", value: e.target.value } })}
            />
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.dailyReminder")}</span>
              <Input name="reminderTime" type="time" value={formState.reminderTime} onChange={handleChange} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.academicInformation")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <SelectField
              label={t("profile.ageGroup")}
              value={formState.ageGroup || ageGroupOptions[0]}
              options={ageGroupOptions}
              onChange={(e) => handleChange({ target: { name: "ageGroup", value: e.target.value } })}
            />
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.targetExam")}</span>
              <Input name="targetExam" value={formState.targetExam} onChange={handleChange} />
            </label>
            <DetailRow
              icon={GraduationCap}
              label={t("profile.strongestTopic")}
              value={
                topicMetrics.strongestTopic
                  ? `${topicMetrics.strongestTopic.topic} (${Math.round(topicMetrics.strongestTopic.accuracy)}%)`
                  : t("profile.notEnoughDataYet")
              }
            />
            <DetailRow
              icon={Target}
              label={t("profile.weakestTopic")}
              value={
                topicMetrics.weakestTopic
                  ? `${topicMetrics.weakestTopic.topic} (${Math.round(topicMetrics.weakestTopic.accuracy)}%)`
                  : t("profile.notEnoughDataYet")
              }
            />
          </CardContent>
        </Card>
      </section>

      {/* ── Achievements + Study streak ── */}
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.achievements")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {achievements.length ? (
              achievements.map((achievement) => (
                <div
                  key={achievement.title}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3.5 transition-colors hover:border-primary/20 hover:bg-primary/[0.04]"
                >
                  <div className="mt-0.5 flex-shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{achievement.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{achievement.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                {t("profile.achievementsEmpty")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.studyStreak")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <DetailRow icon={Flame} label={t("profile.currentStreak")} value={t("profile.days", { count: studyMetrics.currentStreak })} />
            <DetailRow icon={BadgeCheck} label={t("profile.longestStreak")} value={t("profile.days", { count: studyMetrics.longestStreak })} />
            <DetailRow
              icon={Clock3}
              label={t("profile.lastActive")}
              value={studyMetrics.lastActive ? formatDateTime(studyMetrics.lastActive) : t("profile.noActivityYet")}
            />
            <DetailRow icon={BookOpenCheck} label={t("profile.totalStudySessions")} value={t("profile.sessions", { count: studyMetrics.totalSessions })} />
          </CardContent>
        </Card>
      </section>

      {/* ── Security + Saved topics ── */}
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.accountSecurity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow icon={ShieldCheck} label={t("profile.accountRole")} value={user?.isAdmin ? t("common.admin") : t("common.student")} />
              <DetailRow icon={LockKeyhole} label={t("profile.loginMethod")} value={user?.loginMethod || "Email + Password"} />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">{t("profile.currentPassword")}</span>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((c) => ({ ...c, currentPassword: e.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">{t("profile.newPassword")}</span>
                <Input
                  type="password"
                  value={passwordForm.nextPassword}
                  onChange={(e) => setPasswordForm((c) => ({ ...c, nextPassword: e.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">{t("profile.confirmPassword")}</span>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((c) => ({ ...c, confirmPassword: e.target.value }))}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                <LockKeyhole className="h-3.5 w-3.5" />
                {changingPassword ? t("profile.updating") : t("profile.changePassword")}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try { await logoutEverywhere(); }
                  catch (logoutError) { setSecurityState(logoutError.message); }
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("profile.signOutAllDevices")}
              </Button>
            </div>

            {securityState ? (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-[13px] text-slate-300">
                {securityState}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.savedTopics")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Input
                placeholder={t("profile.addTopicPlaceholder")}
                value={savedTopicInput}
                onChange={(e) => setSavedTopicInput(e.target.value)}
              />
              <Button type="button" onClick={handleAddSavedTopic}>
                <Plus className="h-3.5 w-3.5" />
                {t("profile.add")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formState.savedTopics.length ? (
                formState.savedTopics.map((topic) => (
                  <div
                    key={topic}
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-slate-300 transition-colors hover:border-white/[0.12]"
                  >
                    <BookMarked className="h-3.5 w-3.5 text-primary/70" />
                    <span>{topic}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSavedTopic(topic)}
                      className="rounded-full p-0.5 transition-colors hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3 w-3 text-slate-500 transition hover:text-rose-400" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-[13px] leading-relaxed text-slate-500">
                  {t("profile.noSavedTopics")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Contact + Overview ── */}
      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.parentTeacherContact")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.guardianName")}</span>
              <Input name="guardianName" value={formState.guardianName} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.teacherName")}</span>
              <Input name="teacherName" value={formState.teacherName} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.schoolContact")}</span>
              <Input name="schoolContact" value={formState.schoolContact} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">{t("profile.emergencySupportContact")}</span>
              <Input name="emergencyContact" value={formState.emergencyContact} onChange={handleChange} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("profile.profileOverview")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <DetailRow icon={UserRound} label={t("profile.fullName")} value={formState.fullName} />
            <DetailRow icon={Mail} label={t("profile.email")} value={user?.email || t("profile.notAvailable")} />
            <DetailRow icon={Languages} label={t("profile.languageMode")} value={formState.language} />
            <DetailRow icon={BellRing} label={t("profile.dailyReminder")} value={formState.reminderTime || t("profile.notSet")} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
