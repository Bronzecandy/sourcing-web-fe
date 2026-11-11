import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ClipboardCheck, Mail, Plus, Search, Settings2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary } from "@/lib/button-classes";
import { testGameAdminApi } from "../api";
import { CAMPAIGN_STATUS_CLASS, CAMPAIGN_STATUS_HINT, CAMPAIGN_STATUS_LABEL, DECISION_CLASS, DECISION_LABEL, MAIL_LABEL, viDate } from "../labels";
import type { CampaignDetail, CampaignStatus, CampaignSummary } from "../types";
import CampaignFormDrawer from "./CampaignFormDrawer";

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Pending" },
  { key: "inviting", label: "Inviting" },
  { key: "testing", label: "Testing" },
  { key: "reporting", label: "Reporting" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Đã huỷ" },
  { key: "overdue", label: "Quá hạn report" },
];

const th = "whitespace-nowrap px-4 py-3 font-medium";

function MailCell({ c }: { c: CampaignSummary }) {
  const failed = Object.values(c.mails).reduce((s, m) => s + m.failed, 0);
  const sent = Object.values(c.mails).reduce((s, m) => s + m.sent, 0);
  return (
    <div className="space-y-0.5 text-xs">
      {c.nextMail ? (
        <p>
          <span className="font-medium">{c.nextMail.code}</span> <span className="text-muted-foreground">{MAIL_LABEL[c.nextMail.code]}</span>
          <span className="block text-muted-foreground">{viDate(c.nextMail.date)}</span>
        </p>
      ) : (
        <p className="text-muted-foreground">—</p>
      )}
      {(sent > 0 || failed > 0) && (
        <p className="text-muted-foreground">
          {sent} đã gửi
          {failed > 0 && <span className="font-medium text-destructive"> · {failed} lỗi</span>}
        </p>
      )}
    </div>
  );
}

export default function TestGameList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const genre = params.get("genre") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [debounced, setDebounced] = useState(q);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const meta = useQuery({ queryKey: ["testgame-meta"], queryFn: testGameAdminApi.meta, staleTime: 60_000 });
  const all = useQuery({ queryKey: ["testgame-campaigns", "all"], queryFn: () => testGameAdminApi.campaigns() });
  const list = useQuery({
    queryKey: ["testgame-campaigns", status, genre, debounced],
    queryFn: () => testGameAdminApi.campaigns({ status: status || undefined, genre: genre || undefined, q: debounced || undefined }),
    placeholderData: (prev) => prev,
  });

  const counts = useMemo(() => {
    const rows = all.data ?? [];
    const by: Record<string, number> = { "": rows.length, overdue: rows.filter((r) => r.overdue).length };
    for (const r of rows) by[r.status] = (by[r.status] ?? 0) + 1;
    return { by, pendingReview: rows.reduce((s, r) => s + r.counts.pendingReview, 0), failedMail: rows.filter((r) => Object.values(r.mails).some((m) => m.failed > 0)).length };
  }, [all.data]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const genreLabel = (key: string) => meta.data?.genres.find((g) => g.key === key)?.label ?? key;

  const onCreated = (c: CampaignDetail) => {
    setCreating(false);
    void queryClient.invalidateQueries({ queryKey: ["testgame-campaigns"] });
    navigate(`/admin/test-campaigns/${c.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Mỗi game test là một lần test: mời tester → mail tự động → questionnaire + ảnh bằng chứng → AI kiểm tra → duyệt → report & quyết định. Gắn TapTap ID để Radar tự
          cập nhật tình trạng test nội bộ.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/test-templates" className={cn(btnGhost, "px-3 py-2")}>
            <ListChecks className="h-4 w-4" /> Template
          </Link>
          <Link to="/admin/test-settings" className={cn(btnGhost, "px-3 py-2")}>
            <Settings2 className="h-4 w-4" /> Cấu hình & mẫu mail
          </Link>
          <button type="button" onClick={() => setCreating(true)} className={cn(btnPrimary, "px-4 py-2")}>
            <Plus className="h-4 w-4" /> Tạo game test
          </button>
        </div>
      </div>

      {meta.data && !meta.data.bot.transport && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Chưa kết nối tài khoản gửi mail testgame@garena.vn — lời mời và nhắc nhở sẽ không gửi được.
          <Link to="/admin/test-settings" className="font-medium underline">
            Xem hướng dẫn
          </Link>
        </div>
      )}

      {(counts.pendingReview > 0 || counts.by.overdue > 0 || counts.failedMail > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {counts.pendingReview > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm">
              <ClipboardCheck className="h-5 w-5 text-amber-700" />
              <span>
                <b className="tabular-nums">{counts.pendingReview}</b> bài nộp chờ duyệt
              </span>
            </div>
          )}
          {counts.by.overdue > 0 && (
            <button
              type="button"
              onClick={() => setFilter("status", "overdue")}
              className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-left text-sm hover:bg-rose-50"
            >
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              <span>
                <b className="tabular-nums">{counts.by.overdue}</b> game test quá hạn report
              </span>
            </button>
          )}
          {counts.failedMail > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm">
              <Mail className="h-5 w-5 text-rose-700" />
              <span>
                <b className="tabular-nums">{counts.failedMail}</b> game test có mail gửi lỗi
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter("status", f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                status === f.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                f.key === "overdue" && counts.by.overdue > 0 && status !== f.key && "text-destructive",
              )}
            >
              {f.label}
              {counts.by[f.key] ? <span className="ml-1 tabular-nums opacity-70">{counts.by[f.key]}</span> : null}
            </button>
          ))}
        </div>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={genre}
          onChange={(e) => setFilter("genre", e.target.value)}
        >
          <option value="">Mọi dòng game</option>
          {(meta.data?.genres ?? []).map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên game, tên gốc, thể loại…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (list.data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          {status || genre || debounced ? "Không có game test nào khớp bộ lọc." : "Chưa có game test nào — bấm “Tạo game test” để bắt đầu."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Game", "Tiến độ", "Thời gian", "Tester", "Mail kế tiếp", "Phụ trách"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data!.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/admin/test-campaigns/${c.id}`)} className="cursor-pointer transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.iconUrl ? (
                          <img src={c.iconUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-lg bg-muted object-cover" />
                        ) : (
                          <span className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/admin/test-campaigns/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-primary hover:underline"
                          >
                            {c.gameName}
                          </Link>
                          {c.testRound > 1 && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">Lần {c.testRound}</span>}
                          {c.noTest && (
                            <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
                              <Archive className="h-3 w-3" /> Không test
                            </span>
                          )}
                          <p className="truncate text-xs text-muted-foreground">
                            {[c.originalName, c.mainTags.map(genreLabel).join(", "), c.platforms.join("/")].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        title={CAMPAIGN_STATUS_HINT[c.status as CampaignStatus]}
                        className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", CAMPAIGN_STATUS_CLASS[c.status])}
                      >
                        {CAMPAIGN_STATUS_LABEL[c.status]}
                      </span>
                      {c.decision && (
                        <span className={cn("ml-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", DECISION_CLASS[c.decision])}>
                          {DECISION_LABEL[c.decision]}
                        </span>
                      )}
                      {c.reportStatus === "locked" && <p className="mt-1 text-xs text-muted-foreground">Report đã chốt</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      <p>
                        {viDate(c.startDate)} → {viDate(c.endDate)}
                      </p>
                      {c.reportDeadline && (
                        <p className={cn("text-muted-foreground", c.overdue && "font-medium text-destructive")}>
                          Report: {viDate(c.reportDeadline)}
                          {c.overdue && " · quá hạn"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.noTest ? (
                        "—"
                      ) : (
                        <>
                          <p className="tabular-nums">
                            <b>{c.counts.confirmed}</b>/{c.counts.invited || c.counts.total} xác nhận
                          </p>
                          <p className="tabular-nums text-muted-foreground">
                            {c.counts.submitted} nộp · {c.counts.approved} duyệt
                          </p>
                          {c.counts.pendingReview > 0 && (
                            <span className="mt-0.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              {c.counts.pendingReview} chờ duyệt
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">{c.noTest ? "—" : <MailCell c={c} />}</td>
                    <td className="px-4 py-3 text-xs">{c.coordinatorName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creating && <CampaignFormDrawer campaign={null} onClose={() => setCreating(false)} onSaved={onCreated} />}
    </div>
  );
}
