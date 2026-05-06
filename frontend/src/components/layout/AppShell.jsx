import {
  BookOpen,
  BrainCircuit,
  ChartColumnBig,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

const navigation = [
  { key: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { key: "chat", labelKey: "nav.aiTutor", icon: BrainCircuit, to: "/chat" },
  { key: "quiz", labelKey: "nav.quizLab", icon: BookOpen, to: "/quiz" },
  { key: "revision", labelKey: "nav.revision", icon: NotebookPen, to: "/revision" },
  { key: "history", labelKey: "nav.history", icon: History, to: "/history" },
  { key: "analytics", labelKey: "nav.analytics", icon: ChartColumnBig, to: "/analytics" },
  { key: "admin", labelKey: "nav.admin", icon: ShieldCheck, to: "/admin", adminOnly: true },
];

function SidebarContent({ user, onClose, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || user?.isAdmin);

  const activeLabel = useMemo(() => {
    if (location.pathname.startsWith("/profile")) return t("common.profile");
    const activeItem = navigation.find((item) => location.pathname.startsWith(item.to));
    return activeItem ? t(activeItem.labelKey) : t("nav.workspace");
  }, [location.pathname, t]);

  const handleOpenProfile = () => {
    navigate("/profile");
    onClose?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-3 sm:p-4">
      <div className="space-y-3">

        {/* ── Brand header ── */}
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-primary/60">
              RuralLearn AI
            </p>
            <h2 className="mt-1.5 text-base font-semibold leading-snug text-white sm:text-[17px]">
              {t("nav.brandTitle")}
            </h2>
          </div>
          <Button className="lg:hidden" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Focus today card ── */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.08] px-4 py-3.5">
          {/* subtle glow blob */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-primary/60">
            {t("nav.focusToday")}
          </p>
          <p className="mt-2 text-base font-semibold text-white">{activeLabel}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">
            {t("nav.focusDescription")}
          </p>
        </div>

        {/* ── Navigation ── */}
        <nav className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2 space-y-0.5">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-white text-slate-900 shadow-md shadow-black/20"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── User profile card ── */}
      <div
        className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 transition-all duration-150 hover:border-primary/25 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-primary/30 lg:mt-3"
        role="button"
        tabIndex={0}
        onClick={handleOpenProfile}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpenProfile();
          }
        }}
      >
        {/* Avatar row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar imageSrc={user?.avatarImage} name={user?.fullName} theme={user?.avatarTheme} />
            <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-[1.5px] ring-slate-900" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight text-slate-100">
              {user?.fullName || t("common.student")}
            </p>
            <p className="truncate text-[11px] text-slate-500 mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-white/[0.06]" />

        {/* School + profile link */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate max-w-[155px] rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary/80">
            {user?.school || "Rural Community School"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300">
            <Settings2 className="h-3 w-3" />
            {t("common.profile")}
          </span>
        </div>

        {/* Sign out */}
        <Button
          className="mt-3 w-full border-white/[0.07] bg-white/[0.04] text-slate-400 text-[13px] transition-all hover:border-red-500/20 hover:bg-red-500/[0.08] hover:text-red-400"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            onLogout();
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("common.signOut")}
        </Button>
      </div>
    </div>
  );
}

function MobileBottomNav({ user }) {
  const { t } = useI18n();
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || user?.isAdmin);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-slate-950/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2.5 backdrop-blur-md lg:hidden">
      <nav className="mx-auto flex max-w-md gap-1.5 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1.5">
        {visibleNavigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all duration-150",
                isActive
                  ? "bg-white text-slate-900 shadow-md shadow-black/20"
                  : "text-slate-500 hover:bg-white/[0.06] hover:text-white",
              )
            }
          >
              <item.icon className="h-4 w-4" />
            <span className="truncate">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppShell({ user, onLogout, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1600px] lg:h-screen">

        {/* ── Desktop sidebar ── */}
        <aside className="hidden border-r border-white/[0.07] bg-slate-950/80 lg:block lg:h-screen lg:w-[264px] lg:flex-shrink-0">
          <SidebarContent user={user} onLogout={onLogout} />
        </aside>

        {/* ── Mobile drawer ── */}
        {isOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-[min(82vw,288px)] border-r border-white/[0.07] bg-slate-950">
              <SidebarContent
                user={user}
                onLogout={onLogout}
                onClose={() => setIsOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        {/* ── Main area ── */}
        <main className="min-w-0 flex-1 lg:flex lg:h-screen lg:flex-col">

          {/* Top bar */}
          <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-slate-950/50 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-3.5 sm:px-6 xl:max-w-[1180px]">
              <div className="min-w-0 pr-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-primary/70 sm:tracking-[0.3em]">
                  {user?.isAdmin ? t("common.adminWorkspace") : t("common.studentWorkspace")}
                </p>
                <h1 className="mt-1 text-[15px] font-semibold text-white sm:text-base">
                  {t("common.personalizedLearningSuite")}
                </h1>
              </div>
              <Button
                className="lg:hidden border-white/[0.08] bg-white/[0.05]"
                size="icon"
                variant="secondary"
                onClick={() => setIsOpen(true)}
              >
                <Menu className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>

          {/* Page content */}
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div className="mx-auto w-full max-w-[1120px] px-4 py-6 pb-28 sm:px-6 sm:pb-8 lg:py-8 xl:max-w-[1180px]">
              {children}
            </div>
          </div>
        </main>
      </div>

      <MobileBottomNav user={user} />
    </div>
  );
}
