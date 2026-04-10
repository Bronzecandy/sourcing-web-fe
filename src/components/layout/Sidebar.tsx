import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Trophy,
  TrendingUp,
  Brain,
  Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/ranking", icon: Trophy, label: "Top 200 Ranking" },
  { to: "/potential", icon: TrendingUp, label: "Potential Analysis" },
  { to: "/ai-analysis", icon: Brain, label: "AI Review Analysis" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col z-50">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-accent">
        <Gamepad2 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-lg font-bold tracking-tight">Sourcing</h1>
          <p className="text-xs text-muted-foreground">Game Analytics</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-sidebar-accent text-xs text-sidebar-foreground/50">
        TapTap Game Sourcing v1.0
      </div>
    </aside>
  );
}
