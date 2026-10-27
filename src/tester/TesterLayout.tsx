import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ClipboardList, Gift, Gamepad2, LayoutGrid, LogOut, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDocumentBrand } from "@/lib/brand";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/brand/BrandLogo";

const NAV = [
  { to: "/tester", label: "Hồ sơ", icon: LayoutGrid, end: true },
  { to: "/tester/survey", label: "Bảng hỏi", icon: ClipboardList },
  { to: "/tester/tests", label: "Test của tôi", icon: Gamepad2 },
  { to: "/tester/benefits", label: "Benefit", icon: Gift },
];

export default function TesterLayout() {
  useDocumentBrand("tester");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManage = hasPermission(user, "tester.manage");
  const items = canManage ? [...NAV, { to: "/tester/admin", label: "Quản lý", icon: Settings2, end: false }] : NAV;

  return (
    <div className="min-h-screen bg-[#F3F2FF]">
      <header className="brand-hero text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <NavLink to="/tester" aria-label="Tester Program">
            <BrandLogo brand="tester" size="sm" />
          </NavLink>
          <div className="flex items-center gap-3 text-sm">
            {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-white/40" />}
            <span className="hidden text-white/80 sm:inline">{user?.email}</span>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => navigate("/tester/login"));
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-white/90 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-[#F3F2FF] text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
