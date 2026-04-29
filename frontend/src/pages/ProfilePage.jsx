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
          showToast({ title: "Profile data unavailable", description: fetchError.message, variant: "error" });
        }
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });
    return () => { mounted = false; };
  }, [showToast]);

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
        eyebrow="Profile"
        title={formState.fullName || "Student"}
        description="Manage account details, learning preferences, saved topics, security controls, and student support information from one place."
        badge={`${user?.isAdmin ? "Admin" : "Student"} account`}
      />

      {error ? (
        <Card>
          <CardContent className="p-4 text-[13px] text-rose-300/90">
            Profile data could not fully load: {error}
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
                  Profile card
                </p>
                <h2 className="mt-1.5 break-words text-xl font-semibold tracking-tight text-white">
                  {formState.fullName || "Student"}
                </h2>
                <p className="mt-1 break-words text-[13px] text-slate-500">{user?.email}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge>{user?.isAdmin ? "Admin access" : "Student access"}</Badge>
                  <Badge variant="secondary">{formState.school || "Rural Community School"}</Badge>
                  <Badge variant="secondary">{formState.language}</Badge>
                </div>
              </div>
            </div>

            {/* Upload */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">Upload profile photo</span>
                <Input accept="image/*" onChange={handleAvatarUpload} type="file" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                <Save className="h-3.5 w-3.5" />
                {savingProfile ? "Saving..." : "Save profile"}
              </Button>
              <Button onClick={handleDownloadReport} variant="outline">
                <Download className="h-3.5 w-3.5" />
                Download report
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
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Full name</span>
              <Input name="fullName" value={formState.fullName} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">School</span>
              <Input name="school" value={formState.school} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Class / Grade</span>
              <Input name="classGrade" value={formState.classGrade} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Preferred subject</span>
              <Input name="preferredSubject" value={formState.preferredSubject} onChange={handleChange} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-[13px] font-medium text-slate-400">Learning goal</span>
              <Textarea
                name="learningGoal"
                value={formState.learningGoal}
                onChange={handleChange}
                placeholder="Example: Improve algebra problem solving before exams."
              />
            </label>
          </CardContent>
        </Card>
      </section>

      {/* ── Stats ── */}
      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CircleGauge} label="Accuracy" value={formatPercent(progress?.accuracy || 0)} hint="Average score across completed quizzes" />
        <StatCard icon={BookOpenCheck} label="Completed quizzes" value={progress?.completedQuizzes || 0} hint="Saved practice submissions" />
        <StatCard icon={Sparkles} label="Current level" value={progress?.currentDifficulty || "Easy"} hint="Adaptive level used by the system" />
        <StatCard icon={Target} label="Tutor questions" value={studyMetrics.tutorQuestions} hint="Questions asked on the AI Tutor page" />
      </section>

      {/* ── Preferences + Academic ── */}
      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Learning preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <SelectField
              label="Preferred language"
              value={formState.language}
              options={languageOptions}
              onChange={(e) => handleChange({ target: { name: "language", value: e.target.value } })}
            />
            <SelectField
              label="Explanation style"
              value={formState.explanationStyle}
              options={explanationStyleOptions}
              onChange={(e) => handleChange({ target: { name: "explanationStyle", value: e.target.value } })}
            />
            <SelectField
              label="Quiz difficulty mode"
              value={formState.quizMode}
              options={quizModeOptions}
              onChange={(e) => handleChange({ target: { name: "quizMode", value: e.target.value } })}
            />
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Daily study reminder</span>
              <Input name="reminderTime" type="time" value={formState.reminderTime} onChange={handleChange} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Academic information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <SelectField
              label="Age group"
              value={formState.ageGroup || ageGroupOptions[0]}
              options={ageGroupOptions}
              onChange={(e) => handleChange({ target: { name: "ageGroup", value: e.target.value } })}
            />
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Target exam / focus</span>
              <Input name="targetExam" value={formState.targetExam} onChange={handleChange} />
            </label>
            <DetailRow
              icon={GraduationCap}
              label="Strongest topic"
              value={
                topicMetrics.strongestTopic
                  ? `${topicMetrics.strongestTopic.topic} (${Math.round(topicMetrics.strongestTopic.accuracy)}%)`
                  : "Not enough data yet"
              }
            />
            <DetailRow
              icon={Target}
              label="Weakest topic"
              value={
                topicMetrics.weakestTopic
                  ? `${topicMetrics.weakestTopic.topic} (${Math.round(topicMetrics.weakestTopic.accuracy)}%)`
                  : "Not enough data yet"
              }
            />
          </CardContent>
        </Card>
      </section>

      {/* ── Achievements + Study streak ── */}
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Achievements</CardTitle>
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
                Achievements will unlock as the student studies, asks questions, and completes quizzes.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Study streak</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <DetailRow icon={Flame} label="Current streak" value={`${studyMetrics.currentStreak} days`} />
            <DetailRow icon={BadgeCheck} label="Longest streak" value={`${studyMetrics.longestStreak} days`} />
            <DetailRow
              icon={Clock3}
              label="Last active"
              value={studyMetrics.lastActive ? new Date(studyMetrics.lastActive).toLocaleString() : "No activity yet"}
            />
            <DetailRow icon={BookOpenCheck} label="Total study sessions" value={`${studyMetrics.totalSessions}`} />
          </CardContent>
        </Card>
      </section>

      {/* ── Security + Saved topics ── */}
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Account security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow icon={ShieldCheck} label="Account role" value={user?.isAdmin ? "Admin" : "Student"} />
              <DetailRow icon={LockKeyhole} label="Login method" value={user?.loginMethod || "Email + Password"} />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">Current password</span>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((c) => ({ ...c, currentPassword: e.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">New password</span>
                <Input
                  type="password"
                  value={passwordForm.nextPassword}
                  onChange={(e) => setPasswordForm((c) => ({ ...c, nextPassword: e.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-medium text-slate-400">Confirm password</span>
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
                {changingPassword ? "Updating..." : "Change password"}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try { await logoutEverywhere(); }
                  catch (logoutError) { setSecurityState(logoutError.message); }
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Sign out all devices
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
            <CardTitle>Saved topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Input
                placeholder="Add a topic to revise later"
                value={savedTopicInput}
                onChange={(e) => setSavedTopicInput(e.target.value)}
              />
              <Button type="button" onClick={handleAddSavedTopic}>
                <Plus className="h-3.5 w-3.5" />
                Add
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
                  No saved topics yet. Add topics the student wants to revise again.
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
            <CardTitle>Parent / teacher contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Guardian name</span>
              <Input name="guardianName" value={formState.guardianName} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Teacher name</span>
              <Input name="teacherName" value={formState.teacherName} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">School contact</span>
              <Input name="schoolContact" value={formState.schoolContact} onChange={handleChange} />
            </label>
            <label className="space-y-2">
              <span className="text-[13px] font-medium text-slate-400">Emergency support contact</span>
              <Input name="emergencyContact" value={formState.emergencyContact} onChange={handleChange} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Profile overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <DetailRow icon={UserRound} label="Full name" value={formState.fullName} />
            <DetailRow icon={Mail} label="Email" value={user?.email || "Not available"} />
            <DetailRow icon={Languages} label="Language mode" value={formState.language} />
            <DetailRow icon={BellRing} label="Daily reminder" value={formState.reminderTime || "Not set"} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}