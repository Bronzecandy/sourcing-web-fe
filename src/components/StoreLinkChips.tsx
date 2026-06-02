import { ExternalLink } from "lucide-react";
import type { StoreLink } from "@/lib/store-links";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";

const CHIP: Record<StoreLink["platform"], string> = {
  taptap: "border-amber-500/35 text-amber-800 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20",
  steam: "border-indigo-500/35 text-indigo-800 dark:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20",
};

type Props = {
  links: StoreLink[];
  size?: "xs" | "sm";
  className?: string;
  /** Stop row click when used inside clickable table rows */
  stopPropagation?: boolean;
};

export default function StoreLinkChips({
  links,
  size = "sm",
  className,
  stopPropagation = true,
}: Props) {
  const { lang } = useUiCopy();

  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}>
      {links.map((link) => (
        <a
          key={`${link.platform}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={lang === "vi" ? `Mở trên ${link.labelVi}` : `Open on ${link.labelEn}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border font-medium transition-colors duration-150",
            size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
            CHIP[link.platform],
          )}
          onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
        >
          {lang === "vi" ? link.labelVi : link.labelEn}
          <ExternalLink className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} aria-hidden />
        </a>
      ))}
    </div>
  );
}
