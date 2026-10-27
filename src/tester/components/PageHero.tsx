import type { CSSProperties, ReactNode } from "react";
import { Sparkle } from "./Sparkle";

const delay = (ms: number) => ({ "--tp-delay": `${ms}ms` }) as CSSProperties;

/** Dải tiêu đề cho các trang trong (cùng nền gradient với hero của landing). */
export default function PageHero({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="brand-hero relative overflow-hidden pt-16 text-white">
      <div className="tp-dots pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <Sparkle className="absolute right-[12%] top-24 h-6 w-6 text-brand-yellow" delay={0} />
      <Sparkle className="absolute right-[24%] top-40 h-4 w-4 text-brand-cyan" delay={900} />
      <Sparkle className="absolute right-[6%] bottom-14 h-5 w-5 text-brand-lavender" delay={1700} />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-10 md:px-8 md:pb-20 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            <h1 className="tp-display tp-rise text-4xl font-extrabold md:text-5xl">{title}</h1>
            {subtitle && (
              <div className="tp-rise mt-3 text-base text-white/75" style={delay(80)}>
                {subtitle}
              </div>
            )}
          </div>
          {actions && (
            <div className="tp-rise flex flex-wrap gap-3" style={delay(160)}>
              {actions}
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Nội dung trang trong: kéo lên đè mép dưới của PageHero. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="relative mx-auto -mt-10 max-w-6xl px-5 pb-20 md:px-8">{children}</div>;
}
