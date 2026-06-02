import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ContentLangProvider } from "./lib/content-language";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { ProtectedAppRoute, PublicOnlyRoute, WaitingRoute } from "./components/ProtectedRoute";
import { queryClient } from "./lib/query-client";
import {
  fetchDashboard,
  fetchPotentialScores,
  fetchBreakoutGames,
} from "./services/api";
import { useAuth } from "./contexts/AuthContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Ranking = lazy(() => import("./pages/Ranking"));
const GameDetail = lazy(() => import("./pages/GameDetail"));
const Potential = lazy(() => import("./pages/Potential"));
const AIAnalysis = lazy(() => import("./pages/AIAnalysis"));
const Libraries = lazy(() => import("./pages/Libraries"));
const Login = lazy(() => import("./pages/Login"));
const Waiting = lazy(() => import("./pages/Waiting"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function PrefetchWhenAuthed() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.status !== "ACTIVE") return;
    queryClient.prefetchQuery({
      queryKey: ["dashboard"],
      queryFn: fetchDashboard,
    });
    if (user.isPanelAdmin || user.permissions["analytics.potential"]) {
      queryClient.prefetchQuery({
        queryKey: ["potential", 14, "combined"],
        queryFn: () => fetchPotentialScores(14, "combined"),
      });
      queryClient.prefetchQuery({
        queryKey: ["breakout", "combined"],
        queryFn: () => fetchBreakoutGames(7, 10, "combined"),
      });
    }
  }, [user]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ContentLangProvider>
        <AuthProvider>
          <ToastProvider>
          <PrefetchWhenAuthed />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
              </Route>
              <Route element={<WaitingRoute />}>
                <Route path="/waiting" element={<Waiting />} />
              </Route>
              <Route element={<ProtectedAppRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ranking" element={<Ranking />} />
                  <Route path="/game/:id" element={<GameDetail />} />
                  <Route path="/potential" element={<Potential />} />
                  <Route path="/ai-analysis" element={<AIAnalysis />} />
                  <Route path="/libraries" element={<Libraries />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ContentLangProvider>
    </BrowserRouter>
  );
}
