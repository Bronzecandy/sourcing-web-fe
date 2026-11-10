import { useState, type ComponentType, type ReactNode } from "react";
import {
  ChartBar,
  ChevronDown,
  Cpu,
  ExternalLink,
  FileText,
  FileVideoCamera,
  Film,
  Gamepad2,
  Info,
  Link2,
  Lock,
  Pencil,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import {
  DECISION_CLASS,
  DECISION_LABEL,
  REVIEW_STATUS_CLASS,
  REVIEW_STATUS_LABEL,
  formatBytes,
  viDate,
  viDateTime,
} from "../labels";
import type { ConfigLevel, ConfigRequirement, Decision, PlatformSpec, ReportSection, TestReport } from "../types";

export type ReportLang = "vi" | "en";
export type GeneralField = "usp" | "pros" | "cons" | "conclusion";

export interface ReportViewProps {
  report: TestReport;
  lang: ReportLang;
  fileUrl: (fileId: string) => string;
  editable?: boolean;
  onEditSection?: (tag: string) => void;
  /** Bọc khối hiển thị một mục phần chung (admin: nút sửa / textarea). */
  renderGeneralField?: (field: GeneralField, view: ReactNode, label: string) => ReactNode;
  /** Thay badge Decision ở phần chung (admin: bộ chọn Decision). */
  decisionSlot?: ReactNode;
}

type Icon = ComponentType<{ className?: string }>;

const badge = "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium";
const card = "rounded-xl border border-border bg-card";

const GENERAL_FIELDS: Array<{ key: GeneralField; label: string }> = [
  { key: "usp", label: "USP" },
  { key: "pros", label: "Pros" },
  { key: "cons", label: "Cons" },
  { key: "conclusion", label: "Conclusion" },
];

function scoreTone(score: number | null) {
  if (score == null) return { text: "text-muted-foreground", bar: "bg-muted-foreground/30", chip: "bg-muted text-muted-foreground border-border" };
  if (score >= 4) return { text: "text-emerald-600", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 3) return { text: "text-amber-600", bar: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" };
  return { text: "text-rose-600", bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-200" };
}

function fmtScore(score: number | null): string {
  return score == null ? "-" : score.toFixed(1);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Văn bản AI: dòng bắt đầu bằng "- " thành danh sách, dòng khác thành đoạn. */
export function BulletText({ text, empty = "Chưa có", className }: { text: string | null | undefined; empty?: string; className?: string }) {
  const lines = (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return <p className={cn("text-sm italic text-muted-foreground", className)}>{empty}</p>;
  const blocks: Array<{ list: true; items: string[] } | { list: false; text: string }> = [];
  for (const line of lines) {
    const item = line.match(/^[-•*]\s+(.*)$/)?.[1];
    const last = blocks[blocks.length - 1];
    if (item == null) blocks.push({ list: false, text: line });
    else if (last?.list) last.items.push(item);
    else blocks.push({ list: true, items: [item] });
  }
  return (
    <div className={cn("space-y-1.5 text-sm leading-relaxed", className)}>
      {blocks.map((b, i) =>
        b.list ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
            {b.items.map((it, j) => (
              <li key={j} className={cn(/^red flag/i.test(it) && "font-medium text-rose-700")}>
                {it}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}

export function LangToggle({ value, onChange, className }: { value: ReportLang; onChange: (lang: ReportLang) => void; className?: string }) {
  return (
    <div role="group" aria-label="Ngôn ngữ tổng kết" className={cn("inline-flex rounded-lg border border-border bg-background p-0.5 text-xs font-semibold", className)}>
      {(["vi", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={value === l}
          onClick={() => onChange(l)}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            value === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function DecisionBadge({ decision, className }: { decision: Decision | null; className?: string }) {
  if (!decision) return <span className={cn(badge, "border-dashed border-border text-muted-foreground", className)}>Chưa có decision</span>;
  return <span className={cn(badge, DECISION_CLASS[decision], className)}>{DECISION_LABEL[decision]}</span>;
}

export function ReportStatusBadge({ status }: { status: TestReport["status"] }) {
  return status === "locked" ? (
    <span className={cn(badge, "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      <Lock className="h-3 w-3" /> Đã chốt
    </span>
  ) : (
    <span className={cn(badge, "border-amber-200 bg-amber-50 text-amber-800")}>Đang cập nhật</span>
  );
}

function SectionTitle({ icon: I, title, extra }: { icon: Icon; title: string; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-semibold">
        <I className="h-4 w-4 text-primary" /> {title}
      </h2>
      {extra}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex print:hidden" tabIndex={0} aria-label={text}>
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg group-hover:block group-focus:block"
      >
        {text}
      </span>
    </span>
  );
}

function Chips({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((t) => (
        <span
          key={t}
          className={cn(
            "rounded-md px-2 py-0.5 text-xs",
            muted ? "border border-border text-muted-foreground" : "bg-primary/10 font-medium text-primary",
          )}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 text-primary hover:underline", className)}>
      {children}
      <ExternalLink className="h-3 w-3 shrink-0 print:hidden" />
    </a>
  );
}

export default function ReportView({ report, lang, fileUrl, editable, onEditSection, renderGeneralField, decisionSlot }: ReportViewProps) {
  return (
    <div className="space-y-6 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      <ReportHeader report={report} />
      <GameInfo report={report} />
      <ScoreOverview report={report} />

      <section>
        <SectionTitle icon={ChartBar} title={`Kết quả theo section (${report.sections.length})`} />
        {report.sections.length === 0 ? (
          <p className={cn(card, "p-5 text-sm text-muted-foreground")}>Game test chưa có template hoặc template không có section.</p>
        ) : (
          <div className="space-y-3">
            {report.sections.map((s) => (
              <SectionCard key={s.tag} s={s} lang={lang} onEdit={editable && onEditSection ? () => onEditSection(s.tag) : undefined} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle icon={Trophy} title="Đánh giá chung" />
        <div className="grid gap-3 md:grid-cols-2">
          {GENERAL_FIELDS.map((g) => {
            const view = <BulletText text={report.general[g.key]} />;
            return (
              <div key={g.key} className={cn(card, "break-inside-avoid p-4", g.key === "conclusion" && "md:col-span-2")}>
                <h3 className="mb-2 text-sm font-semibold">{g.label}</h3>
                {renderGeneralField ? renderGeneralField(g.key, view, g.label) : view}
              </div>
            );
          })}
          <div className={cn(card, "flex flex-wrap items-center justify-between gap-3 p-4 md:col-span-2")}>
            <h3 className="text-sm font-semibold">Decision</h3>
            {decisionSlot ?? <DecisionBadge decision={report.general.decision} className="px-3 py-1 text-sm" />}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          icon={Cpu}
          title="Cấu hình"
          extra={report.config.updatedAt && <span className="text-xs text-muted-foreground">Cập nhật {viDateTime(report.config.updatedAt)}</span>}
        />
        <ConfigView requirement={report.config.requirement} level={report.config.level} />
      </section>

      <FootageSection report={report} fileUrl={fileUrl} />
      <TestersSection report={report} />
    </div>
  );
}

function ReportHeader({ report }: { report: TestReport }) {
  return (
    <header className={cn(card, "flex flex-wrap items-start gap-4 p-5")}>
      {report.info.iconUrl ? (
        <img src={report.info.iconUrl} alt="" referrerPolicy="no-referrer" className="h-16 w-16 shrink-0 rounded-2xl bg-muted object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gamepad2 className="h-8 w-8" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-xl font-semibold leading-tight">{report.name}</h1>
        <p className="text-sm text-muted-foreground">
          {report.template ? `Template: ${report.template.name} · v${report.template.version}` : "Chưa có template"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ReportStatusBadge status={report.status} />
          <DecisionBadge decision={report.general.decision} />
          {report.status === "locked" && report.lockedAt && (
            <span className="text-xs text-muted-foreground">
              Chốt {viDateTime(report.lockedAt)}
              {report.lockedBy ? ` · ${report.lockedBy}` : ""}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

function GameInfo({ report }: { report: TestReport }) {
  const i = report.info;
  const stores = [
    i.taptapUrl && { label: "TapTap", url: i.taptapUrl },
    i.googlePlayUrl && { label: "Google Play", url: i.googlePlayUrl },
    i.steamUrl && { label: "Steam", url: i.steamUrl },
  ].filter((x): x is { label: string; url: string } => Boolean(x));
  const rows: Array<{ label: string; value: ReactNode; wide?: boolean }> = [
    {
      label: "Tên game",
      value: (
        <>
          {i.gameName}
          {i.originalName && <span className="text-muted-foreground"> · {i.originalName}</span>}
        </>
      ),
    },
    { label: "Lần test", value: `Lần ${i.testRound}` },
    { label: "Thể loại", value: i.genre },
    {
      label: "Dòng game",
      value:
        i.mainTags.length + i.secondaryTags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            <Chips items={i.mainTags} />
            <Chips items={i.secondaryTags} muted />
          </span>
        ) : null,
    },
    { label: "Platform", value: i.platforms.length ? <Chips items={i.platforms} muted /> : null },
    { label: "Developer", value: i.developer },
    { label: "IP", value: i.ipName },
    { label: "Giai đoạn phát triển", value: i.devStage },
    {
      label: "Store",
      value: stores.length ? (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {stores.map((s) => (
            <ExtLink key={s.label} href={s.url}>
              {s.label}
            </ExtLink>
          ))}
        </span>
      ) : null,
    },
    { label: "Thời gian test", value: i.startDate || i.endDate ? `${viDate(i.startDate)} – ${viDate(i.endDate)}` : null },
    { label: "Hạn report", value: i.reportDeadline ? viDate(i.reportDeadline) : null },
    {
      label: "Tester nộp bài",
      value: (
        <span className="tabular-nums">
          <span className="font-semibold">{i.submitted}</span>/{i.invited} tester được mời
        </span>
      ),
    },
  ];
  if (i.aiScreening) {
    rows.push({
      label: "AI screening",
      value: (
        <span className="flex flex-wrap items-center gap-x-2">
          <ExtLink href={i.aiScreening.url}>
            <Sparkles className="h-3.5 w-3.5" /> Xem phân tích AI
          </ExtLink>
          <span className="text-xs text-muted-foreground">{viDate(i.aiScreening.analyzedAt)}</span>
        </span>
      ),
    });
  }
  return (
    <section className={cn(card, "p-5")}>
      <SectionTitle icon={Gamepad2} title="Thông tin game" />
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{r.label}</dt>
            <dd className="mt-0.5 break-words">{r.value ?? <span className="text-muted-foreground">—</span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ScoreOverview({ report }: { report: TestReport }) {
  const scored = report.sections.filter((s) => s.scored);
  const withScore = scored.filter((s) => s.score != null).length;
  const tone = scoreTone(report.overall);
  return (
    <section className={cn(card, "grid gap-5 break-inside-avoid p-5 md:grid-cols-[200px_minmax(0,1fr)]")}>
      <div className="flex flex-col items-center justify-center rounded-xl bg-muted p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Điểm tổng</p>
        <p className={cn("mt-1 text-5xl font-bold tabular-nums", tone.text)}>{fmtScore(report.overall)}</p>
        <p className="text-sm text-muted-foreground">/ 5</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Trung bình có trọng số · {withScore}/{scored.length} section có điểm
        </p>
      </div>
      <div className="min-w-0">
        {scored.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có section chấm điểm.</p>
        ) : (
          <div className="space-y-2">
            {scored.map((s) => {
              const t = scoreTone(s.score);
              return (
                <div key={s.tag} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5" title={s.tag}>
                    <span className="truncate">{s.tag}</span>
                    {s.weight != null && s.weight !== 1 && <span className="shrink-0 text-xs text-muted-foreground">×{s.weight}</span>}
                  </span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    {s.score != null && <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${(s.score / 5) * 100}%` }} />}
                  </div>
                  <span className={cn("text-right font-semibold tabular-nums", t.text)}>{fmtScore(s.score)}</span>
                </div>
              );
            })}
            <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] gap-3 pt-1 text-[10px] text-muted-foreground">
              <span />
              <span className="flex justify-between tabular-nums">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
              <span />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SectionCard({ s, lang, onEdit }: { s: ReportSection; lang: ReportLang; onEdit?: () => void }) {
  const [open, setOpen] = useState(false);
  const tone = scoreTone(s.score);
  const other: ReportLang = lang === "vi" ? "en" : "vi";
  const main = s.summary?.[lang]?.trim() ?? "";
  const fallback = main ? "" : s.summary?.[other]?.trim() ?? "";
  const condQ = s.questions.find((q) => q.role === "condition");
  const rows = s.scored ? s.details : s.details.filter((d) => d.reasons.length > 0);
  return (
    <article className={cn(card, "break-inside-avoid")}>
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s.tag}</h3>
            {s.description && <Tip text={s.description} />}
            {!s.scored && <span className={cn(badge, "border-border bg-muted text-muted-foreground")}>Không chấm điểm</span>}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {s.scored && <span>Trọng số ×{s.weight ?? 1}</span>}
            {s.scored && <span>{s.answered} tester chấm</span>}
            {s.condition && (
              <span title={condQ?.text}>
                Có {s.tag}: {s.condition.yes}/{s.condition.total} tester
              </span>
            )}
          </div>
        </div>
        {s.scored && (
          <div
            className={cn("rounded-lg border px-3 py-1 text-lg font-bold tabular-nums", tone.chip)}
            title={s.score == null && s.condition?.yes === 0 ? `Không tester nào xác nhận có ${s.tag}` : undefined}
          >
            {fmtScore(s.score)}
            <span className="text-xs font-normal opacity-70">/5</span>
          </div>
        )}
      </div>
      <div className="border-t border-border px-4 py-3">
        {fallback && (
          <p className="mb-1.5 text-xs text-amber-700">
            Chưa có bản {lang.toUpperCase()} — đang hiển thị bản {other.toUpperCase()}
          </p>
        )}
        <BulletText text={main || fallback} empty="Chưa có tổng kết" />
        {onEdit && (
          <button type="button" onClick={onEdit} className={cn(btnGhost, "mt-3 px-2.5 py-1 text-xs print:hidden")}>
            <Pencil className="h-3.5 w-3.5" /> Sửa tổng kết
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <div className="border-t border-border print:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            {open ? "Ẩn" : "Xem"} chi tiết từng tester ({rows.length})
          </button>
          {open && <SectionDetails s={s} rows={rows} />}
        </div>
      )}
    </article>
  );
}

function SectionDetails({ s, rows }: { s: ReportSection; rows: ReportSection["details"] }) {
  const th = "py-2 pr-4 font-medium";
  return (
    <div className="overflow-x-auto px-4 pb-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className={th}>Tester</th>
            {s.condition && <th className={th}>Có {s.tag}?</th>}
            {s.scored && <th className={th}>Điểm</th>}
            <th className={th}>Lý do</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((d) => (
            <tr key={d.tester} className={cn("align-top", !d.counted && "text-muted-foreground")}>
              <td className="whitespace-nowrap py-2 pr-4 font-medium">{d.name}</td>
              {s.condition && <td className="whitespace-nowrap py-2 pr-4">{d.condition === "yes" ? "Có" : d.condition === "no" ? "Không" : "—"}</td>}
              {s.scored && (
                <td className="py-2 pr-4">
                  {!d.counted ? (
                    <span className="text-xs">Không tính</span>
                  ) : d.scores.length === 0 ? (
                    "—"
                  ) : (
                    <span className="flex gap-1">
                      {d.scores.map((v, i) => (
                        <span
                          key={i}
                          className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1 text-xs font-semibold tabular-nums", scoreTone(v).chip)}
                        >
                          {v}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
              )}
              <td className="py-2">
                {d.reasons.length === 0 ? (
                  "—"
                ) : (
                  <ul className="space-y-1">
                    {d.reasons.map((r, i) => (
                      <li key={i} className="whitespace-pre-line">
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LEVEL_CLASS: Array<[RegExp, string]> = [
  [/^rất cao/i, "bg-rose-50 text-rose-700 border-rose-200"],
  [/^cao/i, "bg-orange-50 text-orange-700 border-orange-200"],
  [/^trung bình/i, "bg-amber-50 text-amber-800 border-amber-200"],
  [/^rất thấp/i, "bg-emerald-50 text-emerald-700 border-emerald-200"],
  [/^thấp/i, "bg-lime-50 text-lime-700 border-lime-200"],
];

function LevelBadge({ level, className }: { level: string | null | undefined; className?: string }) {
  const text = level?.trim() || "Không rõ";
  const cls = LEVEL_CLASS.find(([re]) => re.test(text))?.[1] ?? "bg-muted text-muted-foreground border-border";
  return <span className={cn(badge, cls, className)}>{text}</span>;
}

const METHOD: Record<ConfigLevel["method"], { label: string; className: string; hint: string }> = {
  library: { label: "Theo library", className: "bg-indigo-50 text-indigo-700 border-indigo-200", hint: "Chip / GPU có trong Config library" },
  ai: { label: "AI ước lượng", className: "bg-violet-50 text-violet-700 border-violet-200", hint: "AI so với mức gần nhất trong Config library" },
  unknown: { label: "Không rõ", className: "bg-muted text-muted-foreground border-border", hint: "Không tìm thấy đủ thông số để xếp mức" },
};

const SPEC_ROWS: Array<[keyof PlatformSpec, string]> = [
  ["os", "Hệ điều hành"],
  ["cpu_chip", "CPU / Chip"],
  ["ram", "RAM"],
  ["gpu", "GPU"],
  ["storage", "Dung lượng"],
];

function SpecValue({ value }: { value: string | undefined }) {
  const v = value?.trim();
  if (!v || /^(không rõ|unknown|n\/a|-)$/i.test(v)) return <span className="text-muted-foreground">Không rõ</span>;
  return <>{v}</>;
}

function SourceLinks({ urls }: { urls: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {urls.map((u) => (
        <li key={u} className="min-w-0">
          <ExtLink href={u} className="max-w-[16rem]">
            <span className="truncate" title={u}>
              {hostOf(u)}
            </span>
          </ExtLink>
        </li>
      ))}
    </ul>
  );
}

/** Bảng cấu hình theo platform + mức cấu hình (dùng cả cho xem trước bản chạy cấu hình). */
export function ConfigView({ requirement, level }: { requirement: ConfigRequirement | null; level: ConfigLevel | null }) {
  if (!requirement && !level) {
    return <p className={cn(card, "p-5 text-sm text-muted-foreground")}>Chưa cập nhật cấu hình.</p>;
  }
  const platforms = requirement?.platforms ?? [];
  const listed = new Set(platforms.flatMap((p) => p.sources ?? []));
  const extraSources = (requirement?.sources ?? []).filter((u) => !listed.has(u));
  const method = level ? METHOD[level.method] ?? METHOD.unknown : null;
  return (
    <div className="space-y-3">
      <div className={cn(card, "flex flex-wrap items-center gap-2 p-4 text-sm")}>
        <span className="font-medium">Mức cấu hình:</span>
        <LevelBadge level={level?.overall} className="px-3 py-1 text-sm" />
        {method && (
          <span className={cn(badge, method.className)} title={method.hint}>
            {method.label}
          </span>
        )}
        {requirement && !requirement.grounded && (
          <span className="text-xs text-muted-foreground">Không tìm thấy nguồn chính thức về cấu hình.</span>
        )}
      </div>
      {platforms.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {platforms.map((p) => {
            const lv = level?.byPlatform.find((b) => b.platform.toLowerCase() === p.platform.toLowerCase());
            return (
              <div key={p.platform} className={cn(card, "break-inside-avoid space-y-3 p-4")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{p.platform}</h3>
                  {lv && (
                    <span className="flex items-center gap-1.5">
                      <LevelBadge level={lv.level} />
                      {!lv.inLibrary && <span className="text-[11px] text-muted-foreground">ước lượng</span>}
                    </span>
                  )}
                </div>
                {lv?.reason && <p className="text-xs text-muted-foreground">{lv.reason}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium" />
                        <th className="py-1.5 pr-3 font-medium">Tối thiểu</th>
                        <th className="py-1.5 font-medium">Đề xuất</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {SPEC_ROWS.map(([k, label]) => (
                        <tr key={k} className="align-top">
                          <td className="whitespace-nowrap py-1.5 pr-3 text-xs text-muted-foreground">{label}</td>
                          <td className="py-1.5 pr-3">
                            <SpecValue value={p.minimum?.[k]} />
                          </td>
                          <td className="py-1.5">
                            <SpecValue value={p.recommended?.[k]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {p.note && <p className="text-xs italic text-muted-foreground">{p.note}</p>}
                {(p.sources ?? []).length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Nguồn</p>
                    <SourceLinks urls={p.sources} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Không có nguồn xác minh.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {level && level.byPlatform.length > 0 && platforms.length === 0 && (
        <ul className={cn(card, "space-y-2 p-4 text-sm")}>
          {level.byPlatform.map((b) => (
            <li key={b.platform} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{b.platform}</span>
              <LevelBadge level={b.level} />
              <span className="text-xs text-muted-foreground">{b.reason}</span>
            </li>
          ))}
        </ul>
      )}
      {extraSources.length > 0 && (
        <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Nguồn tìm kiếm khác ({extraSources.length})</summary>
          <div className="mt-2">
            <SourceLinks urls={extraSources} />
          </div>
        </details>
      )}
    </div>
  );
}

function FootageSection({ report, fileUrl }: { report: TestReport; fileUrl: (fileId: string) => string }) {
  const images = report.footage.filter((f) => f.mime.startsWith("image/"));
  const others = report.footage.filter((f) => !f.mime.startsWith("image/"));
  const total = report.footage.length + report.footageLinks.length;
  return (
    <section>
      <SectionTitle icon={Film} title={`Footage (${total})`} />
      {total === 0 ? (
        <p className={cn(card, "p-5 text-sm text-muted-foreground")}>Chưa có footage.</p>
      ) : (
        <div className={cn(card, "space-y-4 p-4")}>
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((f) => (
                <a
                  key={f.id}
                  href={fileUrl(f.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-lg border border-border transition-colors hover:border-primary/50"
                >
                  <img src={fileUrl(f.id)} alt={f.fileName} loading="lazy" className="aspect-video w-full bg-muted object-cover" />
                  <div className="p-2 text-xs">
                    <p className="truncate font-medium group-hover:text-primary" title={f.fileName}>
                      {f.fileName}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {f.tester} · {formatBytes(f.size)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
          {(others.length > 0 || report.footageLinks.length > 0) && (
            <ul className="divide-y divide-border text-sm">
              {others.map((f) => {
                const FileIcon = f.mime.startsWith("video/") ? FileVideoCamera : FileText;
                return (
                  <li key={f.id} className="flex items-center gap-3 py-2">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a href={fileUrl(f.id)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-primary hover:underline" title={f.fileName}>
                      {f.fileName}
                    </a>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {f.tester} · {formatBytes(f.size)}
                    </span>
                  </li>
                );
              })}
              {report.footageLinks.map((l, i) => (
                <li key={`${l.url}-${i}`} className="flex items-center gap-3 py-2">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-primary hover:underline" title={l.url}>
                    {l.url}
                  </a>
                  <span className="shrink-0 text-xs text-muted-foreground">{l.tester}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function TestersSection({ report }: { report: TestReport }) {
  const showEmail = report.testers.some((t) => t.email);
  const showReview = report.testers.some((t) => t.reviewStatus !== undefined);
  const th = "whitespace-nowrap px-4 py-2.5 font-medium";
  return (
    <section className="break-inside-avoid">
      <SectionTitle icon={Users} title={`Tester đã nộp (${report.testers.length})`} />
      {report.testers.length === 0 ? (
        <p className={cn(card, "p-5 text-sm text-muted-foreground")}>Chưa có tester nộp questionnaire.</p>
      ) : (
        <div className={cn(card, "overflow-x-auto")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className={cn(th, "w-12")}>#</th>
                <th className={th}>Tester</th>
                <th className={th}>Nộp lúc</th>
                {showReview && <th className={th}>Duyệt</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.testers.map((t) => (
                <tr key={t.index}>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{t.index}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{t.name}</p>
                    {showEmail && t.email && <p className="text-xs text-muted-foreground">{t.email}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{viDateTime(t.submittedAt)}</td>
                  {showReview && (
                    <td className="px-4 py-2.5">
                      {t.reviewStatus ? (
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", REVIEW_STATUS_CLASS[t.reviewStatus])}>
                          {REVIEW_STATUS_LABEL[t.reviewStatus]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
