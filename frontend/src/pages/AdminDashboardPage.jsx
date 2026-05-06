import {
  Activity,
  BookOpenCheck,
  Download,
  GraduationCap,
  History,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/ToastContext";
import { formatPercent } from "@/lib/utils";
import {
  exportAdminReport,
  fetchAdminAIUsage,
  fetchAdminDashboard,
  fetchAdminLogs,
  fetchAdminPermissions,
  fetchAdminSettings,
  fetchAdminUsers,
  updateAdminSettings,
  updateAdminUser,
} from "@/services/learningService";

const tabs = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "users", label: "User Management", icon: UserCog },
  { id: "reports", label: "Reports Export", icon: Download },
  { id: "permissions", label: "Role Permissions", icon: ShieldCheck },
  { id: "logs", label: "Audit Logs", icon: History },
  { id: "settings", label: "System Settings", icon: Settings2 },
  { id: "ai", label: "AI Usage", icon: Sparkles },
];

const reportOptions = [
  {
    key: "users",
    title: "User roster report",
    description: "Download user identities, roles, statuses, schools, and activity metrics.",
  },
  {
    key: "performance",
    title: "Performance report",
    description: "Export student accuracy, completed quizzes, and weak-topic snapshots.",
  },
  {
    key: "ai-usage",
    title: "AI usage report",
    description: "Export AI tutor, quiz generation, revision, and request monitoring data.",
  },
  {
    key: "audit-logs",
    title: "Audit log report",
    description: "Download key administrative actions and system-level changes.",
  },
  {
    key: "settings",
    title: "System settings report",
    description: "Capture the current configuration values for the platform.",
  },
];

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

function getSettingValue(draft, key, fallback) {
  return Object.prototype.hasOwnProperty.call(draft, key) ? draft[key] : fallback;
}

export function AdminDashboardPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [logsData, setLogsData] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState({});
  const [aiUsage, setAiUsage] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [savingUserId, setSavingUserId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [exportingType, setExportingType] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetchAdminDashboard(),
      fetchAdminUsers(),
      fetchAdminPermissions(),
      fetchAdminLogs(),
      fetchAdminSettings(),
      fetchAdminAIUsage(),
    ])
      .then(([dashboardPayload, usersPayload, permissionsPayload, logsPayload, settingsPayload, aiPayload]) => {
        setDashboard(dashboardPayload);
        setUsersData(usersPayload);
        setPermissions(permissionsPayload);
        setLogsData(logsPayload);
        setSettingsData(settingsPayload);
        setSettingsDraft(
          (settingsPayload.settings || []).reduce((accumulator, item) => {
            accumulator[item.key] = item.value;
            return accumulator;
          }, {}),
        );
        setAiUsage(aiPayload);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        showToast({
          title: "Admin workspace unavailable",
          description: fetchError.message,
          variant: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showToast]);

  const filteredUsers = useMemo(() => {
    const users = usersData?.users || [];
    const query = userSearch.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [user.fullName, user.email, user.school, user.role, user.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [userSearch, usersData?.users]);

  const topFeature = useMemo(() => {
    if (!aiUsage?.metrics?.length) {
      return null;
    }
    return [...aiUsage.metrics].sort((left, right) => right.totalRequests - left.totalRequests)[0];
  }, [aiUsage]);

  const handleUserFieldChange = (userId, field, value) => {
    setUsersData((current) => ({
      ...current,
      users: (current?.users || []).map((user) =>
        user.id === userId ? { ...user, [field]: value, isAdmin: field === "role" ? value === "admin" : user.isAdmin } : user,
      ),
    }));
  };

  const handleSaveUser = async (user) => {
    setSavingUserId(user.id);
    try {
      const updatedUser = await updateAdminUser(user.id, {
        fullName: user.fullName,
        school: user.school,
        classGrade: user.classGrade,
        role: user.role,
        status: user.status,
      });
      setUsersData((current) => ({
        ...current,
        users: (current?.users || []).map((item) => (item.id === user.id ? updatedUser : item)),
      }));
      setLogsData(await fetchAdminLogs());
      showToast({
        title: "User updated",
        description: `${updatedUser.fullName} was saved successfully.`,
        variant: "success",
      });
    } catch (updateError) {
      showToast({
        title: "User update failed",
        description: updateError.message,
        variant: "error",
      });
    } finally {
      setSavingUserId("");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await updateAdminSettings(settingsDraft);
      setSettingsData(response);
      setSettingsDraft(
        (response.settings || []).reduce((accumulator, item) => {
          accumulator[item.key] = item.value;
          return accumulator;
        }, {}),
      );
      setLogsData(await fetchAdminLogs());
      showToast({
        title: "Settings saved",
        description: "System settings were updated successfully.",
        variant: "success",
      });
    } catch (settingsError) {
      showToast({
        title: "Settings update failed",
        description: settingsError.message,
        variant: "error",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportReport = async (reportType) => {
    setExportingType(reportType);
    try {
      const report = await exportAdminReport(reportType);
      const blob = new Blob([report.content], { type: report.mimeType || "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = report.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setLogsData(await fetchAdminLogs());
      showToast({
        title: "Report exported",
        description: `${report.fileName} downloaded successfully.`,
        variant: "success",
      });
    } catch (reportError) {
      showToast({
        title: "Export failed",
        description: reportError.message,
        variant: "error",
      });
    } finally {
      setExportingType("");
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-rose-300">
          Admin module could not load: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Control Center"
        title="Manage platform operations and learning system controls"
        description="Monitor the platform, manage users, export reports, control permissions, review system logs, configure settings, and track AI usage from one workspace."
        badge="Admin only"
      />

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} label="Managed users" value={usersData?.total || 0} hint="Students, teachers, and admin accounts" />
        <StatCard icon={BookOpenCheck} label="Total quizzes" value={dashboard?.totalQuizzes || 0} hint="Submitted practice sets across the platform" />
        <StatCard icon={TrendingUp} label="Average accuracy" value={formatPercent(dashboard?.averageAccuracy || 0)} hint="Overall learner performance snapshot" />
        <StatCard icon={Sparkles} label="AI requests" value={aiUsage?.totalRequests || 0} hint="Tutor, quiz, revision, and feedback usage" />
      </section>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-white text-slate-950 shadow-md shadow-black/20"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Class weak-topic map</CardTitle>
                <p className="text-xs text-slate-500">Most repeated weak areas across learners.</p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {dashboard?.weakTopicCounts?.length ? (
                  dashboard.weakTopicCounts.map((item) => (
                    <div key={item.topic} className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{item.topic}</p>
                        <Badge variant="warning">{item.count} learners</Badge>
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Frequency</span>
                          <span className="text-xs font-medium text-slate-400">{Math.min(item.count * 20, 100)}%</span>
                        </div>
                        <Progress value={Math.min(item.count * 20, 100)} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-slate-500">
                    Weak-topic insights will appear after learners submit quizzes.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Student performance watchlist</CardTitle>
                <p className="text-xs text-slate-500">Accuracy, difficulty level, and current support needs.</p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {(dashboard?.students || []).length ? (
                  dashboard.students.map((student) => (
                    <div key={student.id} className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4">
                      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{student.email || student.id}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {student.completedQuizzes} quizzes
                            {student.lastActive ? ` · Last active ${new Date(student.lastActive).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={student.accuracy >= 75 ? "success" : student.accuracy < 50 ? "warning" : "secondary"}>
                            {formatPercent(student.accuracy)}
                          </Badge>
                          <Badge variant="secondary">{student.currentDifficulty}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Accuracy</span>
                          <span className="text-xs font-medium text-slate-400">{formatPercent(student.accuracy)}</span>
                        </div>
                        <Progress value={student.accuracy} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {student.weakTopics?.length ? (
                          student.weakTopics.map((topic) => (
                            <Badge key={topic} variant="warning">{topic}</Badge>
                          ))
                        ) : (
                          <Badge variant="success">No weak topic</Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-slate-500">
                    No student performance data is available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent class submissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(dashboard?.recentResults || []).length ? (
                dashboard.recentResults.map((entry) => (
                  <div key={entry.id} className="grid gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{entry.topic}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(entry.submittedAt)}</p>
                    </div>
                    <Badge variant="secondary">{entry.correctAnswers}/{entry.totalQuestions}</Badge>
                    <Badge variant={entry.score >= 75 ? "success" : entry.score < 50 ? "warning" : "secondary"}>
                      {formatPercent(entry.score)}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-slate-500">
                  Recent submissions will appear here after learners attempt quizzes.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "users" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>User management</CardTitle>
            <p className="text-xs text-slate-500">Search users, adjust role and status, and keep school details current.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by name, email, school, role, or status"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
            <div className="space-y-3">
              {filteredUsers.length ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm text-slate-300">Full name</span>
                          <Input value={user.fullName} onChange={(event) => handleUserFieldChange(user.id, "fullName", event.target.value)} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm text-slate-300">School</span>
                          <Input value={user.school || ""} onChange={(event) => handleUserFieldChange(user.id, "school", event.target.value)} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm text-slate-300">Class / Grade</span>
                          <Input value={user.classGrade || ""} onChange={(event) => handleUserFieldChange(user.id, "classGrade", event.target.value)} />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-sm text-slate-300">Role</span>
                            <select
                              className="h-12 w-full rounded-2xl border border-border bg-white/5 px-4 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                              value={user.role}
                              onChange={(event) => handleUserFieldChange(user.id, "role", event.target.value)}
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm text-slate-300">Status</span>
                            <select
                              className="h-12 w-full rounded-2xl border border-border bg-white/5 px-4 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                              value={user.status}
                              onChange={(event) => handleUserFieldChange(user.id, "status", event.target.value)}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </label>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={user.role === "admin" ? "default" : user.role === "teacher" ? "secondary" : "success"}>
                            {user.role}
                          </Badge>
                          <Badge variant={user.status === "active" ? "success" : "warning"}>
                            {user.status}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">{user.email || user.id}</p>
                        <p className="mt-1 text-sm text-slate-400">Accuracy: {formatPercent(user.accuracy)}</p>
                        <p className="mt-1 text-sm text-slate-400">Completed quizzes: {user.completedQuizzes}</p>
                        <p className="mt-1 text-sm text-slate-400">Last login: {formatDate(user.lastLogin)}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(user.weakTopics || []).length ? (
                            user.weakTopics.map((topic) => (
                              <Badge key={topic} variant="warning">{topic}</Badge>
                            ))
                          ) : (
                            <Badge variant="success">No weak topic</Badge>
                          )}
                        </div>
                        <Button className="mt-4 w-full" onClick={() => handleSaveUser(user)} disabled={savingUserId === user.id}>
                          <Save className="h-4 w-4" />
                          {savingUserId === user.id ? "Saving..." : "Save user changes"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-slate-500">
                  No users matched the current search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "reports" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Reports export</CardTitle>
            <p className="text-xs text-slate-500">Download CSV reports for operations, learning performance, and system monitoring.</p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reportOptions.map((report) => (
              <div key={report.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-base font-semibold text-white">{report.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{report.description}</p>
                <Button className="mt-4 w-full" variant="outline" onClick={() => handleExportReport(report.key)} disabled={exportingType === report.key}>
                  <Download className="h-4 w-4" />
                  {exportingType === report.key ? "Preparing..." : "Export CSV"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "permissions" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Role-based permissions</CardTitle>
            <p className="text-xs text-slate-500">Current access model used to separate student, teacher, and administrator responsibilities.</p>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {(permissions?.roles || []).map((role) => (
              <div key={role.role} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-white">{role.label}</p>
                  <Badge variant={role.role === "admin" ? "default" : role.role === "teacher" ? "secondary" : "success"}>
                    {role.role}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {role.permissions.map((permission) => (
                    <div key={permission} className="rounded-xl border border-white/8 bg-slate-950/30 px-3 py-2 text-sm text-slate-300">
                      {permission}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "logs" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Audit logs</CardTitle>
            <p className="text-xs text-slate-500">Recent administrative and platform actions for accountability and system review.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(logsData?.entries || []).length ? (
              logsData.entries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{entry.action}</Badge>
                    <Badge variant="secondary">{entry.targetType}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">{entry.summary}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {entry.actorEmail || entry.actorUserId} · {formatDate(entry.createdAt)}
                  </p>
                  {entry.metadata && Object.keys(entry.metadata).length ? (
                    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/8 bg-slate-950/40 p-3 text-xs text-slate-300">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-slate-500">
                Audit entries will appear after admin or learner actions are recorded.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "settings" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>System settings</CardTitle>
            <p className="text-xs text-slate-500">Control platform-wide behavior such as maintenance mode, AI response style, and quiz defaults.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(settingsData?.settings || []).map((setting) => {
              const draftValue = getSettingValue(settingsDraft, setting.key, setting.value);
              return (
                <div key={setting.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-center">
                    <div>
                      <p className="text-base font-semibold text-white">{setting.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{setting.description}</p>
                    </div>
                    <div>
                      {setting.inputType === "boolean" ? (
                        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-200">
                          <span>{draftValue ? "Enabled" : "Disabled"}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(draftValue)}
                            onChange={(event) =>
                              setSettingsDraft((current) => ({ ...current, [setting.key]: event.target.checked }))
                            }
                          />
                        </label>
                      ) : setting.inputType === "number" ? (
                        <Input
                          type="number"
                          value={draftValue}
                          onChange={(event) =>
                            setSettingsDraft((current) => ({ ...current, [setting.key]: Number(event.target.value) }))
                          }
                        />
                      ) : setting.inputType === "select" ? (
                        <select
                          className="h-12 w-full rounded-2xl border border-border bg-white/5 px-4 text-sm text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                          value={draftValue}
                          onChange={(event) =>
                            setSettingsDraft((current) => ({ ...current, [setting.key]: event.target.value }))
                          }
                        >
                          {setting.key === "default_quiz_difficulty" ? (
                            <>
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </>
                          ) : (
                            <>
                              <option value="short">Short</option>
                              <option value="balanced">Balanced</option>
                              <option value="detailed">Detailed</option>
                            </>
                          )}
                        </select>
                      ) : (
                        <Input
                          value={draftValue}
                          onChange={(event) =>
                            setSettingsDraft((current) => ({ ...current, [setting.key]: event.target.value }))
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                <Save className="h-4 w-4" />
                {savingSettings ? "Saving settings..." : "Save system settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "ai" ? (
        <div className="space-y-6">
          <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Sparkles} label="AI provider" value={aiUsage?.provider || "mock"} hint="Current backend model provider" />
            <StatCard icon={Activity} label="Total requests" value={aiUsage?.totalRequests || 0} hint="Tutor, revision, and quiz interactions" />
            <StatCard icon={BookOpenCheck} label="Tracked features" value={aiUsage?.metrics?.length || 0} hint="Distinct AI-assisted workflows monitored" />
            <StatCard icon={GraduationCap} label="Top feature" value={topFeature?.feature || "N/A"} hint="Highest traffic feature right now" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Feature usage</CardTitle>
                <p className="text-xs text-slate-500">Track how often tutor, revision, and quiz AI features are used.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(aiUsage?.metrics || []).map((metric) => (
                  <div key={metric.feature} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{metric.feature.replaceAll("_", " ")}</p>
                      <Badge variant="secondary">{metric.totalRequests} requests</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/8 bg-slate-950/30 px-3 py-2 text-sm text-slate-300">
                        Success: {metric.successCount}
                      </div>
                      <div className="rounded-xl border border-white/8 bg-slate-950/30 px-3 py-2 text-sm text-slate-300">
                        Failed: {metric.failureCount}
                      </div>
                      <div className="rounded-xl border border-white/8 bg-slate-950/30 px-3 py-2 text-sm text-slate-300">
                        Last used: {metric.lastUsedAt ? new Date(metric.lastUsedAt).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>User AI activity</CardTitle>
                <p className="text-xs text-slate-500">Identify who is using the AI tutoring system most frequently.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(aiUsage?.userActivity || []).length ? (
                  aiUsage.userActivity.map((entry) => (
                    <div key={entry.userId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{entry.email || entry.userId}</p>
                          <p className="mt-1 text-xs text-slate-500">Last activity: {formatDate(entry.lastActivity)}</p>
                        </div>
                        <Badge variant="success">{entry.totalRequests} requests</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-slate-500">
                    AI activity will appear after learners use the tutor, quiz generator, or revision tools.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      ) : null}
    </div>
  );
}
