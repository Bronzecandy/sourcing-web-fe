import type { ReactNode } from "react";
import type { RadarDigest, RadarDigestLine } from "@/types";
import { actionFill } from "@/lib/radar";

function GameName({ line }: { line: RadarDigestLine }) {
  return (
    <a
      href={line.card ? `#radar-game-${line.appId}` : line.url}
      className="font-semibold text-primary underline-offset-2 hover:underline"
    >
      {line.name}
    </a>
  );
}

function Group({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="font-semibold">
        {title}
        {count ? <span className="ml-1 font-normal text-muted-foreground">({count})</span> : null}
      </h3>
      {children}
    </div>
  );
}

/** Phần 1 báo cáo web: điểm đáng chú ý trong kỳ, mỗi game một dòng ở nhóm quan trọng nhất. */
export default function RadarExecutiveSummary({
  digest,
  periodCode,
  dateLabel,
  previousPeriodCode,
}: {
  digest: RadarDigest;
  periodCode: string;
  dateLabel: string;
  previousPeriodCode?: string | null;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">1. Executive Summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Điểm đáng chú ý kỳ {periodCode} ({dateLabel}){previousPeriodCode ? ` so với kỳ ${previousPeriodCode}` : ""}: game
          High Potential và game Mid/Medium mới vào radar hoặc có lịch mới.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {digest.stats.map((s) => (
          <div key={s.key} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-sm leading-6">
        {digest.internalTests.length > 0 && (
          <Group title="Đang test nội bộ" count={digest.internalTests.length}>
            <ul className="list-disc space-y-1 pl-5">
              {digest.internalTests.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Group>
        )}
        {digest.groups.map((group) => (
          <Group key={group.key} title={group.title} count={group.lines.length}>
            {group.lines.length === 0 ? (
              <p className="text-muted-foreground">{group.empty}</p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5">
                {group.lines.map((line) => (
                  <li key={line.appId}>
                    <GameName line={line} /> — {line.note}
                    {line.nextAction && (
                      <span
                        className="ml-2 whitespace-nowrap rounded px-1.5 py-0.5 text-xs"
                        style={{ backgroundColor: actionFill(line.nextAction) }}
                      >
                        {line.nextAction}
                      </span>
                    )}
                    {line.publisher && <span className="ml-2 text-xs text-muted-foreground">{line.publisher}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Group>
        ))}
        {digest.quiet.length > 0 && (
          <Group title="Theo dõi tiếp — High Potential chưa có biến động" count={digest.quiet.length}>
            <p>
              {digest.quiet.map((line, i) => (
                <span key={line.appId}>
                  {i > 0 && " · "}
                  <GameName line={line} /> <span className="text-muted-foreground">({line.note})</span>
                </span>
              ))}
            </p>
          </Group>
        )}
        {digest.others && (
          <p className="border-t border-border pt-3 text-muted-foreground">
            Ngoài ra: {digest.others} — xem Tổng quan kỳ và 3 bảng Recap bên dưới.
          </p>
        )}
      </div>
    </section>
  );
}
