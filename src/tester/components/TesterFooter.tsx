import { Link } from "react-router-dom";
import BrandLogo from "@/components/brand/BrandLogo";
import { LANDING_ANCHORS } from "./styles";

export default function TesterFooter() {
  return (
    <footer className="relative overflow-hidden bg-brand-navy text-white">
      <div className="tp-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div className="space-y-4">
          <BrandLogo brand="tester" size="md" />
          <p className="max-w-sm text-sm leading-relaxed text-white/70">
            Chương trình tester nội bộ của team New Games. Chơi thử game trước ngày ra mắt, góp ý thật, nhận quà in-game.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Khám phá</p>
          <ul className="space-y-2 text-sm text-white/75">
            {LANDING_ANCHORS.map((a) => (
              <li key={a.href}>
                <a href={`/tester${a.href}`} className="hover:text-white">
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-lavender">Tài khoản</p>
          <ul className="space-y-2 text-sm text-white/75">
            <li>
              <Link to="/tester/profile" className="hover:text-white">
                Hồ sơ tester
              </Link>
            </li>
            <li>
              <Link to="/tester/tests" className="hover:text-white">
                Test của tôi
              </Link>
            </li>
            <li>
              <Link to="/tester/benefits" className="hover:text-white">
                Benefit
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-xs text-white/50 md:px-8">
          <span>© 2026 Tester Program · team New Games</span>
          <span>Powered by Garena</span>
        </div>
      </div>
    </footer>
  );
}
