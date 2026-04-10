import { BookOpen, BrainCircuit, ChartColumnBig, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
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
  { label: "Analytics", icon: ChartColumnBig, to: "/analytics" },
];

function SidebarContent({ user, onClose, onLogout }) {
  const location = useLocation();

  const activeLabel = useMemo(() => {
    return navigation.find((item) => location.pathname.startsWith(item.to))?.label || "Workspace";
  }, [location.pathname]);

  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary/70">RuralLearn AI</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Learning OS</h2>
          </div>
          <Button className="lg:hidden" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="rounded-[28px] border border-primary/20 bg-primary/10 p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-primary/70">Focus today</p>
          <p className="mt-3 text-lg font-semibold text-white">{activeLabel}</p>
          <p className="mt-2 text-sm text-slate-300">
            Keep explanations simple, practice regularly, and grow with each quiz.
          </p>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-white text-slate-950"
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

      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
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

export function AppShell({ user, onLogout, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[320px] border-r border-white/10 bg-slate-950/70 lg:block">
          <SidebarContent user={user} onLogout={onLogout} />
        </aside>

        {isOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/80" onClick={() => setIsOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-[300px] border-r border-white/10 bg-slate-950">
              <SidebarContent
                user={user}
                onLogout={onLogout}
                onClose={() => setIsOpen(false)}
              />
            </aside>
          </div>
        ) : null}

        <main className="flex-1">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Student Workspace</p>
                <h1 className="mt-1 text-lg font-semibold text-white">Personalized Learning Suite</h1>
              </div>
              <Button className="lg:hidden" size="icon" variant="secondary" onClick={() => setIsOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
