import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useDocumentBrand } from "@/lib/brand";
import TesterHeader from "./components/TesterHeader";
import TesterFooter from "./components/TesterFooter";

/** Khung chung Tester Program: landing (/tester) và các trang sau đăng nhập dùng cùng header/footer. */
export default function TesterShell() {
  useDocumentBrand("tester");
  const { pathname, hash } = useLocation();
  const landing = pathname === "/tester" || pathname === "/tester/";
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  return (
    <div className="tp-root flex min-h-[100dvh] flex-col">
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6" />
      <TesterHeader solid={!landing || scrolled} landing={landing} />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="brand-hero flex min-h-[60dvh] items-center justify-center pt-16">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <TesterFooter />
    </div>
  );
}
