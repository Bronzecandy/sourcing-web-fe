import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Ngôi sao 4 cánh trong banner Game Jam (trang trí, nhấp nháy nhẹ). */
export function Sparkle({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("tp-twinkle pointer-events-none", className)}
      style={{ "--tp-delay": `${delay}ms` } as CSSProperties}
    >
      <path fill="currentColor" d="M12 0c.9 6.4 4.6 10.6 12 12-7.4 1.4-11.1 5.6-12 12-.9-6.4-4.6-10.6-12-12C7.4 10.6 11.1 6.4 12 0Z" />
    </svg>
  );
}
