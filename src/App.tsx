import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ContentLangProvider } from "./lib/content-language";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { ProtectedAppRoute, PublicOnlyRoute, WaitingRoute } from "./components/ProtectedRoute";
import { TesterAuthRoute, TesterLoginRedirect } from "./tester/TesterGuards";
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
const AnalysisDetail = lazy(() => import("./pages/AnalysisDetail"));
const Libraries = lazy(() => import("./pages/Libraries"));
const Login = lazy(() => import("./pages/Login"));
const Waiting = lazy(() => import("./pages/Waiting"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminTesters = lazy(() => import("./pages/admin/AdminTesters"));
const AdminTestCampaigns = lazy(() => import("./pages/admin/AdminTestCampaigns"));
const AdminTestCampaignDetail = lazy(() => import("./pages/admin/AdminTestCampaignDetail"));
const AdminTesterBenefits = lazy(() => import("./pages/admin/AdminTesterBenefits"));
const AdminTesterSurvey = lazy(() => import("./pages/admin/AdminTesterSurvey"));
const Distribution = lazy(() => import("./pages/Distribution"));
const RadarRecap = lazy(() => import("./pages/RadarRecap"));
const Compare = lazy(() => import("./pages/Compare"));
const TesterShell = lazy(() => import("./tester/TesterShell"));
const TesterLanding = lazy(() => import("./tester/pages/TesterLanding"));
const TesterProfile = lazy(() => import("./tester/pages/TesterProfile"));
const TesterSurvey = lazy(() => import("./tester/pages/TesterSurvey"));
const TesterTests = lazy(() => import("./tester/pages/TesterTests"));
const TesterBenefits = lazy(() => import("./tester/pages/TesterBenefits"));

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
    if (!user || user.status !== "ACTIVE" || user.role === "TESTER") return;
    if (window.location.pathname.startsWith("/tester")) return;
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
              <Route path="/tester" element={<TesterShell />}>
                <Route index element={<TesterLanding />} />
                <Route path="login" element={<TesterLoginRedirect />} />
                <Route path="admin/*" element={<Navigate to="/admin/users?role=tester" replace />} />
                <Route element={<TesterAuthRoute />}>
                  <Route path="profile" element={<TesterProfile />} />
                  <Route path="survey" element={<TesterSurvey />} />
                  <Route path="tests" element={<TesterTests />} />
                  <Route path="benefits" element={<TesterBenefits />} />
                </Route>
                <Route path="*" element={<Navigate to="/tester" replace />} />
              </Route>
              <Route element={<ProtectedAppRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ranking" element={<Ranking />} />
                  <Route path="/game/:id" element={<GameDetail />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/potential" element={<Potential />} />
                  <Route path="/radar" element={<RadarRecap />} />
                  <Route path="/distribution" element={<Distribution />} />
                  {/* More specific path first; parent Outlet renders nested child */}
                  <Route path="/ai-analysis" element={<Outlet />}>
                    <Route path="a/:analysisId" element={<AnalysisDetail />} />
                    <Route index element={<AIAnalysis />} />
                  </Route>
                  <Route path="/libraries" element={<Libraries />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/users" replace />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="testers" element={<AdminTesters />} />
                    <Route path="test-campaigns" element={<AdminTestCampaigns />} />
                    <Route path="test-campaigns/:id" element={<AdminTestCampaignDetail />} />
                    <Route path="tester-benefits" element={<AdminTesterBenefits />} />
                    <Route path="tester-survey" element={<AdminTesterSurvey />} />
                  </Route>
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
