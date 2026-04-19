import { LoaderCircle } from "lucide-react";
import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { AuthPage } from "@/pages/AuthPage";

const AnalyticsPage = lazy(() =>
  import("@/pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })),
);
const ChatPage = lazy(() =>
  import("@/pages/ChatPage").then((module) => ({ default: module.ChatPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const QuizPage = lazy(() =>
  import("@/pages/QuizPage").then((module) => ({ default: module.QuizPage })),
);
const QuizHistoryPage = lazy(() =>
  import("@/pages/QuizHistoryPage").then((module) => ({ default: module.QuizHistoryPage })),
);
const RevisionPage = lazy(() =>
  import("@/pages/RevisionPage").then((module) => ({ default: module.RevisionPage })),
);
const AdminDashboardPage = lazy(() =>
  import("@/pages/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4 text-sm text-slate-300">
        <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
        Loading learning workspace...
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate replace to="/auth" />;
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <Outlet />
    </AppShell>
  );
}

function AdminRoute() {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <Navigate replace to="/dashboard" />;
  }

  return <AdminDashboardPage />;
}

function PublicRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return <AuthPage />;
}

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <AppLoader />;
  }

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/auth" element={<PublicRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/revision" element={<RevisionPage />} />
          <Route path="/history" element={<QuizHistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Route>
        <Route
          path="*"
          element={<Navigate replace to={isAuthenticated ? "/dashboard" : "/auth"} />}
        />
      </Routes>
    </Suspense>
  );
}
