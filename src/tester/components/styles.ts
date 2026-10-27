const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export const TESTER_LOGIN_URL = `${apiBase}/auth/google?portal=tester`;

export const LANDING_ANCHORS = [
  { href: "#chuong-trinh", label: "Chương trình" },
  { href: "#cach-tham-gia", label: "Cách tham gia" },
  { href: "#quyen-loi", label: "Quyền lợi" },
  { href: "#hoi-dap", label: "Hỏi đáp" },
];

/** Nút vàng (accent) cho mọi CTA chính của Tester Program. */
export const ctaYellow =
  "inline-flex items-center justify-center gap-2 rounded-full bg-brand-yellow font-semibold text-brand-navy shadow-[0_6px_0_rgb(9_2_107/0.35)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_8px_0_rgb(9_2_107/0.35)] active:translate-y-0.5 active:shadow-[0_2px_0_rgb(9_2_107/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow/60 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy disabled:pointer-events-none disabled:opacity-60";

/** Nút viền trắng trên nền tối. */
export const ghostOnDark =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10";

/** Nút phụ trên nền sáng. */
export const ghostOnLight =
  "inline-flex items-center justify-center gap-2 rounded-full border border-brand-navy/15 bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-lavender/30 disabled:pointer-events-none disabled:opacity-40";

/** Thẻ nội dung chuẩn của các trang trong. */
export const card = "rounded-[1.75rem] border border-brand-navy/10 bg-white shadow-[0_24px_48px_-32px_rgb(9_2_107/0.45)]";
