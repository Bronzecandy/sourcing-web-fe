import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Trophy,
  TrendingUp,
  BarChart3,
  Radar,
  Brain,
  Library,
  Shield,
  LogOut,
  Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/brand/BrandLogo";
import type { PermissionKey } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

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
    to: "/radar",
    icon: Radar,
    label: "Game Radar",
    permissions: ["analytics.potential"],
  },
  {
    to: "/distribution",
    icon: BarChart3,
    label: "Distribution",
    permissions: ["analytics.distribution"],
  },
  {
    to: "/ai-analysis",
    icon: Brain,
    label: "AI Review Analysis",
    permissions: ["ai.read", "ai.run"],
    end: true,
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
  const { pathname } = useLocation();

  const visibleNav = NAV_ITEMS.filter((item) => hasAnyPermission(user, item.permissions));
  const showAdmin = Boolean(user?.isPanelAdmin || hasPermission(user, "tester.manage"));
  const adminActive = pathname.startsWith("/admin");

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col z-50">
      <div className="px-5 pt-5 pb-4 border-b border-sidebar-accent">
        <BrandLogo brand="sourcing" size="sm" />
        <p className="mt-2 text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
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
        {showAdmin && (
          <Link
            to={user?.isPanelAdmin ? "/admin/users" : "/admin/testers"}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              adminActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white",
            )}
          >
            <Shield className="w-5 h-5 shrink-0" />
            Admin
          </Link>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-accent space-y-2">
        {user?.isTester && (
          <Link
            to="/tester/profile"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
          >
            <Gamepad2 className="w-5 h-5" />
            Tester Program
          </Link>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
        <p className="px-3 text-xs text-sidebar-foreground/50">Sourcing-Game v1.0</p>
      </div>
    </aside>
  );
}
