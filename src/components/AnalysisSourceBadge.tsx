import type { AiAnalysis } from "@/types";
import { useUiCopy } from "@/lib/use-ui-copy";
import { cn } from "@/lib/utils";

export function sourceLabel(
  source: AiAnalysis["source"] | undefined,
  t: (vi: string, en: string) => string,
): string | null {
  if (source === "database") return t("CSDL", "Database");
  if (source === "external") return t("TapTap", "TapTap");
  if (source === "steam") return "Steam";
  if (source === "csv-upload") return t("CSV", "CSV");
  return null;
}

const SOURCE_STYLES: Record<NonNullable<AiAnalysis["source"]>, string> = {
  database: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/25",
  external: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25",
  steam: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/25",
  "csv-upload": "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
};

export default function AnalysisSourceBadge({
  source,
  className,
  size = "md",
}: {
  source: AiAnalysis["source"] | undefined;
  className?: string;
  /** md = modal/header; sm = compact list cards */
  size?: "sm" | "md";
}) {
  const { t } = useUiCopy();
  const label = sourceLabel(source, t);
  if (!label || !source) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold border shrink-0",
        size === "sm"
          ? "px-1.5 py-px rounded text-[9px] leading-none"
          : "px-2 py-0.5 rounded-md text-[10px]",
        SOURCE_STYLES[source],
        className,
      )}
    >
      {label}
    </span>
  );
}
