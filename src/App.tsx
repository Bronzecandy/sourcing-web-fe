import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { ContentLangProvider } from "./lib/content-language";
import { queryClient } from "./lib/query-client";
import {
  fetchDashboard,
  fetchPotentialScores,
  fetchBreakoutGames,
} from "./services/api";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Ranking = lazy(() => import("./pages/Ranking"));
const GameDetail = lazy(() => import("./pages/GameDetail"));
const Potential = lazy(() => import("./pages/Potential"));
const AIAnalysis = lazy(() => import("./pages/AIAnalysis"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function usePrefetch() {
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["dashboard"],
      queryFn: fetchDashboard,
    });
    queryClient.prefetchQuery({
      queryKey: ["potential", 14, "combined"],
      queryFn: () => fetchPotentialScores(14, "combined"),
    });
    queryClient.prefetchQuery({
      queryKey: ["breakout", "combined"],
      queryFn: () => fetchBreakoutGames(7, 10, "combined"),
    });
  }, []);
}

export default function App() {
  usePrefetch();

  return (
    <BrowserRouter>
      <ContentLangProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/game/:id" element={<GameDetail />} />
              <Route path="/potential" element={<Potential />} />
              <Route path="/ai-analysis" element={<AIAnalysis />} />
            </Route>
          </Routes>
        </Suspense>
      </ContentLangProvider>
    </BrowserRouter>
  );
}
