import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Bật cờ `shown` khi phần tử cuộn tới (IntersectionObserver, chạy 1 lần). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, shown };
}

export function revealProps(shown: boolean, delay = 0, className?: string) {
  return {
    "data-shown": shown,
    className: cn("tp-reveal", className),
    style: { "--tp-delay": `${delay}ms` } as CSSProperties,
  };
}
