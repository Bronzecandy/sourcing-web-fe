import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Trophy,
  TrendingUp,
  Brain,
  Library,
  Shield,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/types/auth";
import { hasAnyPermission } from "@/lib/permissions";

const NAV_ITEMS: Array<{
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  permissions: PermissionKey[];
  end?: boolean;
}> = [
  {
    to: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
    permissions: ["crawl.dashboard"],
    end: true,
  },
  {
    to: "/ranking",
    icon: Trophy,
    label: "Top Ranking",
    permissions: ["crawl.ranking", "crawl.game"],
  },
  {
    to: "/potential",
    icon: TrendingUp,
    label: "Potential Analysis",
    permissions: ["analytics.potential"],
  },
  {
    to: "/ai-analysis",
    icon: Brain,
    label: "AI Review Analysis",
    permissions: ["ai.read", "ai.run"],
  },
  {
    to: "/libraries",
    icon: Library,
    label: "Rubric Libraries",
    permissions: ["libraries.read", "libraries.write"],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const visibleNav = NAV_ITEMS.filter((item) => hasAnyPermission(user, item.permissions));

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col z-50">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-accent">
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          S
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight truncate">Sourcing</h1>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white",
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
        {user?.isPanelAdmin && (
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white",
              )
            }
          >
            <Shield className="w-5 h-5 shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-accent space-y-2">
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
        <p className="px-3 text-xs text-sidebar-foreground/50">TapTap Game Sourcing v1.0</p>
      </div>
    </aside>
  );
}
