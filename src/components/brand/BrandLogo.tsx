import { BRANDS, type BrandId } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { icon: "h-9 w-9", word: "text-[1.4rem]", tag: "text-[0.6rem]" },
  md: { icon: "h-12 w-12", word: "text-3xl", tag: "text-xs" },
  lg: { icon: "h-20 w-20", word: "text-6xl", tag: "text-lg" },
} as const;

export default function BrandLogo({
  brand,
  size = "md",
  iconOnly = false,
  className,
}: {
  brand: BrandId;
  size?: keyof typeof SIZES;
  iconOnly?: boolean;
  className?: string;
}) {
  const b = BRANDS[brand];
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-3", className)} role="img" aria-label={b.title}>
      <img src={b.icon} alt="" className={cn(s.icon, "shrink-0")} />
      {!iconOnly && (
        <span className="inline-flex flex-col leading-none" aria-hidden>
          <span className={cn("brand-word", s.word)}>{b.word}</span>
          <span className={cn("brand-tag -mt-1 self-end", s.tag)}>{b.tag}</span>
        </span>
      )}
    </span>
  );
}
