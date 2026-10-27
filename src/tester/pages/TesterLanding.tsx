import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, Gamepad2, Gift, LogIn, Plus, Sparkles, Target, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { testerApi } from "../api";
import type { TesterPublicInfo } from "../types";
import Reveal from "../components/Reveal";
import { revealProps, useReveal } from "../components/use-reveal";
import { Sparkle } from "../components/Sparkle";
import LoginButton from "../components/LoginButton";
import { ctaYellow } from "../components/styles";

const d = (ms: number) => ({ "--tp-delay": `${ms}ms` }) as CSSProperties;

const FALLBACK_GENRES = [
  "MOBA",
  "FPS / Bắn súng",
  "Battle Royale",
  "Auto Chess",
  "Card RPG / Idle RPG",
  "Action RPG",
  "MMORPG",
  "Thể thao / Đua xe",
  "Extraction",
  "Chiến thuật / SLG",
  "Mô phỏng / Nông trại",
  "Casual / Hypercasual",
  "Sandbox",
  "Party / Hội nhóm",
];

const GAME_NAMES: Record<string, string> = {
  AOV: "Liên Quân Mobile",
  FF: "Free Fire",
  FCO: "FC Online",
  FCM: "FC Mobile",
  DF: "Delta Force",
};

const DOT_COLORS = ["bg-brand-yellow", "bg-brand-cyan", "bg-brand-mint", "bg-brand-magenta", "bg-brand-lavender"];

function rewardText(s: string): string {
  return s.replace(/\s*--\s*/g, ", ").replace(/\s+HOẶC\s+/g, " hoặc ");
}

function PrimaryCta({ size = "lg" }: { size?: "md" | "lg" }) {
  const { user } = useAuth();
  if (user) {
    return (
      <Link
        to="/tester/profile"
        className={cn(ctaYellow, size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm")}
      >
        Vào hồ sơ của tôi
        <ArrowRight className="h-5 w-5" />
      </Link>
    );
  }
  return <LoginButton label="Đăng ký làm tester" size={size} />;
}

export default function TesterLanding() {
  const info = useQuery({ queryKey: ["tester-public"], queryFn: testerApi.publicInfo, staleTime: 5 * 60_000 });
  const [params] = useSearchParams();
  const location = useLocation();
  const needLogin = Boolean((location.state as { needLogin?: boolean } | null)?.needLogin);
  const domainError = params.get("error") === "domain";
  const data = info.data;
  const hoursPerBenefit = data?.benefitHoursPerUnit ?? 3;
  const genres = data?.genres.map((g) => g.label) ?? FALLBACK_GENRES;

  return (
    <>
      <Hero domainError={domainError} needLogin={needLogin} />
      <StatsBand data={data} genreCount={genres.length} hoursPerBenefit={hoursPerBenefit} />
      <ProgramSection hoursPerBenefit={hoursPerBenefit} />
      <StepsSection />
      <GenresSection genres={genres} />
      <RewardsSection data={data} hoursPerBenefit={hoursPerBenefit} />
      <FaqSection data={data} hoursPerBenefit={hoursPerBenefit} />
      <FinalCta />
    </>
  );
}

function Hero({ domainError, needLogin }: { domainError: boolean; needLogin: boolean }) {
  return (
    <section className="brand-hero relative isolate overflow-hidden text-white" aria-labelledby="tp-hero-title">
      <div aria-hidden className="tp-glow pointer-events-none absolute -left-40 top-24 h-[30rem] w-[30rem] rounded-full bg-brand-magenta/25 blur-3xl" />
      <div
        aria-hidden
        className="tp-glow pointer-events-none absolute -right-32 bottom-0 h-[32rem] w-[32rem] rounded-full bg-brand-cyan/20 blur-3xl"
        style={{ animationDelay: "-7s" }}
      />
      <div aria-hidden className="tp-dots pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-12 px-5 pb-24 pt-28 md:px-8 lg:grid-cols-[1.2fr_1fr] lg:gap-8">
        <div>
          <p className="tp-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-lavender">
            <Sparkles className="h-3.5 w-3.5 text-brand-yellow" />
            Team New Games
          </p>
          <h1
            id="tp-hero-title"
            className="tp-display tp-rise mt-6 text-[2.4rem] font-extrabold sm:text-6xl lg:text-[clamp(3.4rem,5vw,4.4rem)]"
            style={d(80)}
          >
            <span className="block">Chơi thử game mới</span>
            <span className="block text-brand-yellow">trước ngày ra mắt</span>
          </h1>
          <p className="tp-rise mt-6 max-w-xl text-lg leading-relaxed text-white/80" style={d(160)}>
            Nhận lời mời test đúng dòng game bạn giỏi, đổi giờ test lấy quà in-game.
          </p>
          <div className="tp-rise mt-9 flex flex-wrap items-center gap-3" style={d(240)}>
            <PrimaryCta />
            <a
              href="#cach-tham-gia"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Xem cách tham gia
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          {(domainError || needLogin) && (
            <p
              role="status"
              className={cn(
                "tp-rise mt-6 max-w-xl rounded-2xl border px-4 py-3 text-sm",
                domainError ? "border-brand-magenta/50 bg-brand-magenta/20" : "border-white/20 bg-white/10",
              )}
            >
              {domainError
                ? "Email này chưa được phép đăng ký Tester Program. Hãy đăng nhập bằng email công ty."
                : "Đăng nhập để xem hồ sơ và lời mời test của bạn."}
            </p>
          )}
        </div>

        <div className="tp-rise relative mx-auto w-full max-w-[34rem] lg:mr-0" style={d(200)}>
          <div
            aria-hidden
            className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-magenta/40 via-brand-violet/30 to-brand-cyan/40 blur-3xl"
          />
          <div className="tp-float relative">
            <img
              src="/tester/hero-1024.webp"
              srcSet="/tester/hero-640.webp 640w, /tester/hero-1024.webp 1024w"
              sizes="(min-width: 1024px) 34rem, 90vw"
              width={1024}
              height={1024}
              fetchPriority="high"
              alt="Ba đồng nghiệp hào hứng chơi thử game mới trên điện thoại, tay cầm và laptop"
              className="relative w-full rounded-[2.5rem] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.65)] ring-1 ring-white/20"
            />
            <FloatChip className="-left-3 top-8 sm:-left-10" icon={Gamepad2} title="Lời mời test mới" text="Action RPG · PC" />
            <FloatChip className="-right-2 bottom-10 sm:-right-8" icon={Gift} title="+1 benefit" text="3 giờ test hoàn thành" accent />
          </div>
          <Sparkle className="absolute -top-6 right-10 h-8 w-8 text-brand-yellow" />
          <Sparkle className="absolute -bottom-4 left-16 h-5 w-5 text-brand-cyan" delay={1200} />
        </div>
      </div>
    </section>
  );
}

function FloatChip({
  className,
  icon: Icon,
  title,
  text,
  accent,
}: {
  className?: string;
  icon: LucideIcon;
  title: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute z-10 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-brand-navy shadow-[0_18px_40px_-12px_rgb(9_2_107/0.55)] backdrop-blur",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl",
          accent ? "bg-brand-yellow text-brand-navy" : "bg-brand-violet text-white",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-brand-navy/60">{text}</span>
      </span>
    </div>
  );
}

function StatsBand({
  data,
  genreCount,
  hoursPerBenefit,
}: {
  data: TesterPublicInfo | undefined;
  genreCount: number;
  hoursPerBenefit: number;
}) {
  const items: Array<[string, string]> = [
    [data ? String(data.stats.testers) : "…", "tester đang tham gia"],
    [String(genreCount), "dòng game được chấm điểm"],
    [`${hoursPerBenefit} giờ`, "test đổi được 1 benefit"],
  ];
  return (
    <section className="relative z-10 -mt-14 px-5" aria-label="Con số chương trình">
      <div
        className="tp-rise mx-auto grid max-w-5xl grid-cols-1 divide-y divide-brand-navy/10 rounded-[1.75rem] bg-white shadow-[0_30px_60px_-30px_rgb(9_2_107/0.45)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        style={d(360)}
      >
        {items.map(([value, label]) => (
          <div key={label} className="px-6 py-6 text-center">
            <p className="tp-display text-4xl font-extrabold text-brand-violet tabular-nums">{value}</p>
            <p className="mt-1 text-sm text-brand-navy/65">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ id, title, children, light }: { id: string; title: ReactNode; children?: ReactNode; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className={cn("tp-display text-4xl font-extrabold md:text-5xl", light ? "text-white" : "text-brand-navy")}>
        {title}
      </h2>
      {children && <p className={cn("mt-4 text-lg leading-relaxed", light ? "text-white/75" : "text-brand-navy/70")}>{children}</p>}
    </div>
  );
}

function ProgramSection({ hoursPerBenefit }: { hoursPerBenefit: number }) {
  return (
    <section id="chuong-trinh" className="scroll-mt-20 px-5 py-24 md:px-8 md:py-32" aria-labelledby="tp-program-title">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading id="tp-program-title" title="Game mới cần người chơi thật trước khi ra mắt">
            Bạn chơi sớm và góp ý thật. Team New Games dùng phản hồi đó để chọn và chỉnh game trước khi phát hành tại Việt Nam.
          </SectionHeading>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:grid-rows-2">
          <Reveal className="overflow-hidden rounded-[2rem] bg-brand-lavender/60 lg:col-span-2 lg:row-span-2">
            <div className="flex h-full flex-col">
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src="/tester/playtest-1024.webp"
                  srcSet="/tester/playtest-640.webp 640w, /tester/playtest-1024.webp 1024w"
                  sizes="(min-width: 1024px) 56vw, 92vw"
                  width={1024}
                  height={768}
                  loading="lazy"
                  alt="Hai tester đang chơi thử game trên điện thoại và PC, xung quanh là các ghi chú góp ý"
                  className="h-full w-full object-cover object-[center_42%]"
                />
              </div>
              <div className="px-7 pb-8 pt-6">
                <h3 className="tp-display text-2xl font-bold text-brand-navy">Test sớm game chưa phát hành</h3>
                <p className="mt-2 max-w-xl text-brand-navy/70">
                  Game mới từ TapTap, Steam và các studio đối tác, trên cả di động lẫn PC. Bạn là một trong những người đầu tiên ở Việt Nam được chơi.
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120} className="flex flex-col rounded-[2rem] bg-brand-navy p-7 text-white">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-cyan">
              <Target className="h-6 w-6" />
            </span>
            <div className="mt-8 lg:mt-auto">
              <h3 className="tp-display text-2xl font-bold">Mời đúng sở trường</h3>
              <p className="mt-2 text-white/75">
                Mỗi dòng game có điểm hardcore riêng từ 0 đến 100, tính theo số giờ chơi và rank của bạn. Lời mời test luôn hợp gu.
              </p>
            </div>
          </Reveal>
          <Reveal delay={220} className="flex flex-col rounded-[2rem] bg-brand-yellow p-7 text-brand-navy">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy text-brand-yellow">
              <Gift className="h-6 w-6" />
            </span>
            <div className="mt-8 lg:mt-auto">
              <h3 className="tp-display text-2xl font-bold">Giờ test thành quà</h3>
              <p className="mt-2 text-brand-navy/75">
                Cứ {hoursPerBenefit} giờ test hoàn thành được 1 benefit, dùng để đổi skin, thẻ giảm giá và vật phẩm in-game.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const STEPS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: LogIn, title: "Đăng nhập bằng Google", text: "Dùng email công ty. Không cần tạo tài khoản hay mật khẩu mới." },
  {
    icon: ClipboardList,
    title: "Làm khảo sát hồ sơ",
    text: "Khoảng 10 phút với 3 phần: thông tin cơ bản, dòng game bạn chơi, thời gian có thể hỗ trợ test.",
  },
  { icon: Gamepad2, title: "Nhận lời mời test", text: "Team gợi ý tester theo điểm dòng game, nền tảng bạn chơi và thời gian rảnh." },
  { icon: Gift, title: "Test, góp ý và đổi quà", text: "Hoàn thành giờ test để tích benefit, theo dõi ngay trên trang Benefit của bạn." },
];

function StepsSection() {
  return (
    <section id="cach-tham-gia" className="scroll-mt-20 bg-white px-5 py-24 md:px-8 md:py-32" aria-labelledby="tp-steps-title">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <SectionHeading id="tp-steps-title" title="Bắt đầu trong 4 bước">
              Từ lúc đăng nhập tới lời mời test đầu tiên, mọi thứ nằm trên một trang hồ sơ.
            </SectionHeading>
          </Reveal>
          <Reveal delay={120} className="mt-10 hidden max-w-md lg:block">
            <img
              src="/tester/profile-640.webp"
              srcSet="/tester/profile-640.webp 640w, /tester/profile-1024.webp 1024w"
              sizes="28rem"
              width={640}
              height={640}
              loading="lazy"
              alt="Điện thoại hiển thị hồ sơ tester với biểu đồ điểm và huy hiệu dòng game"
              className="w-full rounded-[2rem] bg-[#eeedff]"
            />
          </Reveal>
        </div>

        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute bottom-10 left-[3.45rem] top-10 w-px bg-gradient-to-b from-brand-violet/40 via-brand-blue/30 to-transparent"
          />
          <ol className="relative space-y-6">
            {STEPS.map((s, i) => (
              <StepItem key={s.title} step={s} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StepItem({ step: s, index }: { step: (typeof STEPS)[number]; index: number }) {
  const { ref, shown } = useReveal<HTMLLIElement>();
  return (
    <li
      ref={ref}
      {...revealProps(
        shown,
        index * 110,
        "relative flex gap-5 rounded-[1.75rem] border border-brand-navy/10 bg-[#f8f7ff] p-6 hover:shadow-[0_20px_40px_-24px_rgb(9_2_107/0.45)]",
      )}
    >
      <span className="relative z-10 inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-brand-yellow">
        <s.icon className="h-7 w-7" />
        <span className="tp-display absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-yellow text-sm font-extrabold text-brand-navy">
          {index + 1}
        </span>
      </span>
      <div>
        <h3 className="tp-display text-2xl font-bold text-brand-navy">{s.title}</h3>
        <p className="mt-1.5 text-brand-navy/70">{s.text}</p>
      </div>
    </li>
  );
}

function GenreRow({ genres, reverse }: { genres: string[]; reverse?: boolean }) {
  const chips = (keyPrefix: string, hidden?: boolean) =>
    genres.map((g, i) => (
      <span
        key={`${keyPrefix}-${g}`}
        aria-hidden={hidden}
        className={cn(
          "inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-base font-medium text-white",
          hidden && "motion-reduce:hidden",
        )}
      >
        <span className={cn("h-2.5 w-2.5 rounded-full", DOT_COLORS[i % DOT_COLORS.length])} />
        {g}
      </span>
    ));
  return (
    <div className="tp-marquee-track overflow-hidden motion-reduce:overflow-visible">
      <div className={cn("tp-marquee flex w-max gap-3 motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center", reverse && "tp-marquee-reverse")}>
        {chips("a")}
        {chips("b", true)}
      </div>
    </div>
  );
}

function GenresSection({ genres }: { genres: string[] }) {
  const half = Math.ceil(genres.length / 2);
  return (
    <section id="dong-game" className="relative overflow-hidden bg-brand-navy py-24 md:py-28" aria-labelledby="tp-genres-title">
      <div aria-hidden className="tp-dots pointer-events-none absolute inset-0 opacity-40" />
      <Sparkle className="absolute left-[8%] top-16 h-6 w-6 text-brand-yellow" />
      <Sparkle className="absolute right-[10%] bottom-16 h-5 w-5 text-brand-magenta" delay={1500} />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <SectionHeading id="tp-genres-title" title="Bạn mạnh dòng game nào?" light>
            Hồ sơ của bạn được chấm điểm riêng cho từng dòng game, nên mỗi đợt test chỉ mời người chơi hợp nhất.
          </SectionHeading>
        </Reveal>
      </div>
      <div className="relative mt-12 space-y-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] motion-reduce:[mask-image:none] motion-reduce:px-5">
        <GenreRow genres={genres.slice(0, half)} />
        <GenreRow genres={genres.slice(half)} reverse />
      </div>
    </section>
  );
}

function RewardsSection({ data, hoursPerBenefit }: { data: TesterPublicInfo | undefined; hoursPerBenefit: number }) {
  const tiers = data?.rewards ?? [];
  return (
    <section id="quyen-loi" className="scroll-mt-20 px-5 py-24 md:px-8 md:py-32" aria-labelledby="tp-rewards-title">
      <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal className="relative lg:sticky lg:top-28">
          <img
            src="/tester/rewards-640.webp"
            srcSet="/tester/rewards-640.webp 640w, /tester/rewards-1024.webp 1024w"
            sizes="(min-width: 1024px) 34rem, 92vw"
            width={640}
            height={640}
            loading="lazy"
            alt="Rương báu mở ra với đá quý, xu, phiếu giảm giá và hộp quà"
            className="w-full rounded-[2.5rem] shadow-[0_40px_80px_-40px_rgb(9_2_107/0.7)]"
          />
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-yellow px-6 py-3 text-brand-navy shadow-[0_6px_0_rgb(9_2_107/0.35)]">
            <span className="tp-display text-xl font-extrabold">{hoursPerBenefit} giờ test = 1 benefit</span>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <SectionHeading id="tp-rewards-title" title="Giờ test đổi được gì?">
              Benefit dùng để đổi quà của các game đang phát hành. Test càng đều tay, quà càng lớn.
            </SectionHeading>
          </Reveal>
          <div className="mt-10 space-y-5">
            {tiers.length === 0 && (
              <p className="rounded-2xl border border-dashed border-brand-navy/20 p-6 text-brand-navy/60">
                Danh mục quà sẽ hiện ở đây.
              </p>
            )}
            {tiers.map((tier, i) => {
              const top = i === tiers.length - 1 && tiers.length > 1;
              return (
                <Reveal key={tier.condition} delay={i * 120}>
                  <div
                    className={cn(
                      "rounded-[1.75rem] p-6 md:p-7",
                      top ? "bg-brand-navy text-white" : "border border-brand-navy/10 bg-white",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="tp-display text-2xl font-bold">{top ? "Quà tester tích cực" : "Quà mỗi game test"}</h3>
                      {top && (
                        <span className="rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-navy">
                          Hạng cao
                        </span>
                      )}
                    </div>
                    <p className={cn("mt-1 text-sm", top ? "text-white/65" : "text-brand-navy/60")}>{tier.condition}</p>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                      {tier.items.map((it) => (
                        <li
                          key={it.game}
                          className={cn("rounded-2xl px-4 py-3", top ? "bg-white/10" : "bg-[#f5f4ff]")}
                        >
                          <p className={cn("text-xs font-semibold uppercase tracking-wide", top ? "text-brand-yellow" : "text-brand-violet")}>
                            {GAME_NAMES[it.game] ?? it.game}
                          </p>
                          <p className="mt-0.5 text-sm leading-snug">{rewardText(it.reward)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ data, hoursPerBenefit }: { data: TesterPublicInfo | undefined; hoursPerBenefit: number }) {
  const workload = data?.workload ?? [];
  const faqs: Array<{ q: string; a: ReactNode }> = [
    {
      q: "Ai có thể tham gia?",
      a: "Nhân viên và cộng tác viên có email công ty. Bạn chỉ cần đăng nhập Google bằng email đó rồi làm khảo sát hồ sơ.",
    },
    {
      q: "Khảo sát mất bao lâu, có sửa lại được không?",
      a: "Khoảng 10 phút. Bạn cập nhật lại bất cứ lúc nào ở trang Hồ sơ, điểm dòng game sẽ được chấm lại tự động.",
    },
    {
      q: "Một đợt test kéo dài bao lâu?",
      a:
        workload.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {workload.map((w) => (
              <li key={w.label}>
                <span className="font-semibold text-brand-navy">{w.label}:</span> khoảng {w.workloadHours} giờ trong {w.testDays} ngày
              </li>
            ))}
          </ul>
        ) : (
          "Tùy dòng game, thường từ 1,5 đến 4 giờ trong 1 đến 4 ngày."
        ),
    },
    {
      q: "Benefit được tính thế nào?",
      a: `Cứ ${hoursPerBenefit} giờ test hoàn thành được 1 benefit (làm tròn). Số benefit đã có, đã dùng và còn lại luôn hiện trên trang Benefit.`,
    },
    {
      q: "Tôi đang dùng web Sourcing, có làm tester được không?",
      a: "Được. Một tài khoản có thể vừa dùng Sourcing vừa là tester. Đăng nhập cùng email là thấy cả hai.",
    },
    {
      q: "Thông tin trong hồ sơ dùng để làm gì?",
      a: "Chỉ để chọn đúng người cho từng đợt test nội bộ. Điểm dòng game của bạn không hiển thị cho tester khác.",
    },
  ];

  return (
    <section id="hoi-dap" className="scroll-mt-20 bg-white px-5 py-24 md:px-8 md:py-32" aria-labelledby="tp-faq-title">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 id="tp-faq-title" className="tp-display text-center text-4xl font-extrabold text-brand-navy md:text-5xl">
            Câu hỏi thường gặp
          </h2>
        </Reveal>
        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="tp-faq group rounded-[1.5rem] border border-brand-navy/10 bg-[#f8f7ff] px-6 py-5 open:bg-white open:shadow-[0_20px_40px_-28px_rgb(9_2_107/0.5)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-brand-navy">
                  {f.q}
                  <span className="tp-faq-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-brand-yellow transition-transform duration-300">
                    <Plus className="h-5 w-5" />
                  </span>
                </summary>
                <div className="pt-3 leading-relaxed text-brand-navy/70">{f.a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="brand-hero relative overflow-hidden px-5 py-24 text-center text-white md:py-28" aria-labelledby="tp-cta-title">
      <div aria-hidden className="tp-dots pointer-events-none absolute inset-0 opacity-50" />
      <Sparkle className="absolute left-[14%] top-14 h-8 w-8 text-brand-yellow" />
      <Sparkle className="absolute right-[16%] top-24 h-5 w-5 text-brand-cyan" delay={800} />
      <Sparkle className="absolute bottom-14 left-[30%] h-4 w-4 text-brand-mint" delay={1600} />
      <Reveal className="relative mx-auto max-w-2xl">
        <h2 id="tp-cta-title" className="tp-display text-4xl font-extrabold md:text-6xl">
          Sẵn sàng chơi trước?
        </h2>
        <p className="mt-4 text-lg text-white/80">Đăng nhập và hoàn thành hồ sơ trong khoảng 10 phút.</p>
        <div className="mt-9 flex justify-center">
          <PrimaryCta />
        </div>
      </Reveal>
    </section>
  );
}
