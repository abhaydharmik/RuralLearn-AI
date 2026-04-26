import {
  BookOpen,
  BrainCircuit,
  ChartColumnBig,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  ShieldCheck,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "AI Tutor", icon: BrainCircuit, to: "/chat" },
  { label: "Quiz Lab", icon: BookOpen, to: "/quiz" },
  { label: "Revision", icon: NotebookPen, to: "/revision" },
  { label: "History", icon: History, to: "/history" },
  { label: "Analytics", icon: ChartColumnBig, to: "/analytics" },
  { label: "Admin", icon: ShieldCheck, to: "/admin", adminOnly: true },
];

function SidebarContent({ user, onClose, onLogout }) {
  const location = useLocation();
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || user?.isAdmin);

  const activeLabel = useMemo(() => {
    return navigation.find((item) => location.pathname.startsWith(item.to))?.label || "Workspace";
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4 sm:p-5">
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary/70 sm:text-xs sm:tracking-[0.3em]">
              RuralLearn AI
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">Your Smart Learning Companion</h2>
          </div>
          <Button className="lg:hidden" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="rounded-[28px] border border-primary/20 bg-primary/10 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/70">Focus today</p>
          <p className="mt-3 text-lg font-semibold text-white">{activeLabel}</p>
          <p className="mt-2 text-xs text-slate-300">
            Keep explanations simple, practice regularly, and grow with each quiz.
          </p>
        </div>

        <nav className="space-y-2 rounded-[28px] border border-white/10 bg-white/[0.03] p-3">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-white text-slate-950 shadow-lg shadow-white/5"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className=" rounded-[28px] border border-white/10 bg-white/5 p-4 mt-4 lg:mt-4">
        <div className="flex items-center gap-3">
          <Avatar name={user?.fullName} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{user?.fullName || "Student"}</p>
            <p className="truncate text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>
        <Badge className="mt-4" variant="secondary">
          {user?.school || "Rural Community School"}
        </Badge>
        <Button className="mt-4 w-full" variant="secondary" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function MobileBottomNav({ user }) {
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || user?.isAdmin);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/90 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-3 backdrop-blur lg:hidden">
      <nav className="mx-auto flex max-w-md gap-2 overflow-x-auto rounded-[24px] border border-white/10 bg-white/[0.03] p-2">
        {visibleNavigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppShell({ user, onLogout, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1600px] lg:h-screen">
        <aside className="hidden border-r border-white/10 bg-slate-950/70 lg:block lg:h-screen lg:w-[272px] lg:flex-shrink-0">
          <SidebarContent user={user} onLogout={onLogout} />
        </aside>

        {isOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/80" onClick={() => setIsOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-[min(85vw,300px)] border-r border-white/10 bg-slate-950">
              <SidebarContent
                user={user}
                onLogout={onLogout}
                onClose={() => setIsOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 lg:flex lg:h-screen lg:flex-col">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-4 py-4 sm:px-6 xl:max-w-[1180px]">
              <div className="min-w-0 pr-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80 sm:text-xs sm:tracking-[0.3em]">
                  {user?.isAdmin ? "Admin Workspace" : "Student Workspace"}
                </p>
                <h1 className="mt-1 text-base font-semibold text-white sm:text-lg">
                  Personalized Learning Suite
                </h1>
              </div>
              <Button className="lg:hidden" size="icon" variant="secondary" onClick={() => setIsOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

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
