import { cn } from "@/lib/utils";

export type LaunchBoardTag = { board: "pop" | "hot" | "new"; rank: number | null };

const BOARD_STYLE: Record<LaunchBoardTag["board"], string> = {
  pop: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  hot: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  new: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

const BOARD_LABEL: Record<LaunchBoardTag["board"], string> = {
  pop: "Pop",
  hot: "Hot",
  new: "New",
};

export function LaunchBoardTags({
  tags,
  className,
}: {
  tags?: LaunchBoardTag[] | null;
  className?: string;
}) {
  if (!tags?.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((t) => (
        <span
          key={t.board}
          className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap", BOARD_STYLE[t.board])}
        >
          {BOARD_LABEL[t.board]}
          {t.rank != null ? ` #${t.rank}` : ""}
        </span>
      ))}
    </div>
  );
}
