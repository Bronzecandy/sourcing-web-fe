import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ExternalLink, Gamepad2, Gift, LayoutGrid, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/brand/BrandLogo";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import LoginButton from "./LoginButton";
import { ctaYellow, LANDING_ANCHORS } from "./styles";

const APP_NAV = [
  { to: "/tester/profile", label: "Hồ sơ", icon: LayoutGrid },
  { to: "/tester/tests", label: "Test của tôi", icon: Gamepad2 },
  { to: "/tester/benefits", label: "Benefit", icon: Gift },
];

function isNavActive(pathname: string, to: string): boolean {
  if (to === "/tester/profile") return pathname.startsWith("/tester/profile") || pathname.startsWith("/tester/survey");
  return pathname.startsWith(to);
}

const linkCls = (active: boolean) =>
  cn(
    "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
    active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
  );

export default function TesterHeader({ solid, landing }: { solid: boolean; landing: boolean }) {
  const { user } = useAuth();
  const { pathname, hash } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname, hash]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300",
        solid || mobileOpen
          ? "bg-brand-navy/90 shadow-[0_12px_32px_-16px_rgb(9_2_107/0.7)] backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 md:px-8">
        <Link to="/tester" aria-label="Tester Program, trang chủ" className="shrink-0">
          <BrandLogo brand="tester" size="sm" />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
          {landing || !user
            ? LANDING_ANCHORS.map((a) => (
                <a key={a.href} href={landing ? a.href : `/tester${a.href}`} className={linkCls(false)}>
                  {a.label}
                </a>
              ))
            : APP_NAV.map((n) => (
                <Link key={n.to} to={n.to} className={linkCls(isNavActive(pathname, n.to))}>
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {landing && (
                <Link to="/tester/profile" className={cn(ctaYellow, "hidden px-4 py-2 text-sm sm:inline-flex")}>
                  Hồ sơ của tôi
                </Link>
              )}
              <UserMenu />
            </>
          ) : (
            <LoginButton size="sm" className="hidden sm:inline-flex" />
          )}
          <button
            type="button"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 px-5 pb-6 pt-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Điều hướng di động">
            {user &&
              APP_NAV.map((n) => (
                <Link key={n.to} to={n.to} className={cn(linkCls(isNavActive(pathname, n.to)), "py-3")}>
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              ))}
            {(landing || !user) &&
              LANDING_ANCHORS.map((a) => (
                <a key={a.href} href={landing ? a.href : `/tester${a.href}`} className={cn(linkCls(false), "py-3")}>
                  {a.label}
                </a>
              ))}
          </nav>
          {!user && <LoginButton size="md" className="mt-4 w-full" />}
        </div>
      )}
    </header>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const hasSourcing = user.role !== "TESTER" && user.status === "ACTIVE";
  const displayName = user.name?.trim() || user.email;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-sm font-medium text-white hover:bg-white/10"
      >
        <UserAvatar src={user.avatarUrl} name={user.name} email={user.email} className="h-8 w-8 ring-2 ring-white/30" />
        <span className="hidden max-w-[11rem] truncate lg:inline">{displayName}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="tp-rise absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 text-brand-navy shadow-[0_24px_48px_-12px_rgb(9_2_107/0.35)] ring-1 ring-brand-navy/5"
        >
          <div className="px-3 py-2">
            <p className="truncate font-semibold">{user.name ?? user.email}</p>
            <p className="truncate text-xs text-brand-navy/60">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-brand-navy/10" />
          {APP_NAV.map((n) => (
            <Link
              key={n.to}
              role="menuitem"
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-brand-lavender/40"
            >
              <n.icon className="h-4 w-4 text-brand-violet" />
              {n.label}
            </Link>
          ))}
          {hasSourcing && (
            <a role="menuitem" href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-brand-lavender/40">
              <ExternalLink className="h-4 w-4 text-brand-violet" />
              Vào Sourcing
            </a>
          )}
          <div className="my-1 h-px bg-brand-navy/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout().then(() => navigate("/tester"));
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-magenta hover:bg-brand-magenta/10"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
