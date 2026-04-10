import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Ranking from "./pages/Ranking";
import GameDetail from "./pages/GameDetail";
import Potential from "./pages/Potential";
import AIAnalysis from "./pages/AIAnalysis";
import { queryClient } from "./lib/query-client";
import {
  fetchDashboard,
  fetchPotentialScores,
  fetchBreakoutGames,
} from "./services/api";

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
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/potential" element={<Potential />} />
          <Route path="/ai-analysis" element={<AIAnalysis />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
