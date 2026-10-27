import type { ReactNode } from "react";
import { revealProps, useReveal } from "./use-reveal";

/** Hiện dần khi cuộn tới. Tắt chuyển động khi prefers-reduced-motion (CSS). */
export default function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} {...revealProps(shown, delay, className)}>
      {children}
    </div>
  );
}
