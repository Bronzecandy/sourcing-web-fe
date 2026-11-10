import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Globe, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary, btnSubtle } from "@/lib/button-classes";
import { saveMarketMapping, searchCandidates } from "./api";
import { compact, domainOf, mapMethodLabel, mapStatusLabel, usd } from "./format";
import type { Candidates, MappingChoice, MappingDto, MapStatus } from "./types";

type T = (vi: string, en: string) => string;

const STATUS_STYLE: Record<MapStatus, string> = {
  auto: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  none: "bg-muted text-muted-foreground",
  unmapped: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function StatusChip({ status, t }: { status: MapStatus; t: T }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", STATUS_STYLE[status])}>{mapStatusLabel(status, t)}</span>;
}

function Side({ title, status, children, action }: { title: string; status: ReactNode; children: ReactNode; action: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {title} {status}
        </div>
        {action}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function MappingPanel({
  appId,
  mapping,
  candidates,
  needsMapping,
  onSaved,
  t,
}: {
  appId: number;
  mapping: MappingDto;
  candidates: Candidates | null;
  needsMapping: boolean;
  onSaved: (m: MappingDto) => void;
  t: T;
}) {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const pickerOpen = needsMapping || editing;

  const search = useQuery({
    queryKey: ["deep-research", "candidates", appId, submitted ?? ""],
    queryFn: () => searchCandidates(appId, submitted ?? ""),
    enabled: pickerOpen && (submitted !== null || !candidates),
    staleTime: 10 * 60_000,
  });
  const list = submitted !== null || !candidates ? search.data : candidates;

  const save = useMutation({
    mutationFn: (choice: MappingChoice) => saveMarketMapping(appId, choice),
    onSuccess: (m) => {
      onSaved(m);
      if (m.st.status !== "unmapped") setEditing(false);
    },
  });

  const st = mapping.st;
  const steam = mapping.steam;
  const id = mapping.identity;

  return (
    <section className={cn("rounded-xl border bg-card p-5 space-y-4", needsMapping ? "border-amber-500/50" : "border-border")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{t("Ghép dữ liệu Sensor Tower / Steam", "Sensor Tower / Steam mapping")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {needsMapping
              ? t(
                  "Chưa tự ghép được game này. Chọn đúng game trên Sensor Tower (hoặc đánh dấu không có) để chạy tiếp phân tích.",
                  "This game could not be mapped automatically. Pick the matching Sensor Tower game (or mark it as not listed) to continue.",
                )
              : t("Mapping dùng chung cho mọi người; đổi xong hãy chạy lại Deep Research để cập nhật báo cáo.", "Mappings are shared; re-run Deep Research after changing one.")}
          </p>
        </div>
        {!needsMapping && (
          <button type="button" className={cn(btnGhost, "px-3 py-1.5 text-xs")} onClick={() => setEditing((v) => !v)}>
            {editing ? t("Đóng", "Close") : t("Đổi mapping", "Change mapping")}
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Side
          title="Sensor Tower"
          status={<StatusChip status={st.status} t={t} />}
          action={
            st.status !== "none" && (
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" disabled={save.isPending} onClick={() => save.mutate({ st: { none: true } })}>
                {t("Không có trên ST", "Not on ST")}
              </button>
            )
          }
        >
          {st.ref ? (
            <div className="flex items-center gap-2">
              {st.ref.iconUrl && <img src={st.ref.iconUrl} alt="" className="h-9 w-9 rounded-lg" referrerPolicy="no-referrer" />}
              <div className="min-w-0">
                <div className="font-medium truncate">{st.ref.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[st.ref.publisher, [st.ref.gameClass, st.ref.genre, st.ref.subgenre].filter(Boolean).join(" › ")].filter(Boolean).join(" · ")}
                </div>
                {st.method && <div className="text-[11px] text-muted-foreground">{mapMethodLabel(st.method, t)}</div>}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">{st.status === "none" ? t("Đã đánh dấu: không có trên Sensor Tower", "Marked as not on Sensor Tower") : t("Chưa ghép", "Not mapped")}</span>
          )}
        </Side>
        <Side
          title="Steam"
          status={<StatusChip status={steam.status} t={t} />}
          action={
            steam.status !== "none" && (
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" disabled={save.isPending} onClick={() => save.mutate({ steam: { none: true } })}>
                {t("Không có trên Steam", "Not on Steam")}
              </button>
            )
          }
        >
          {steam.ref ? (
            <div className="flex items-center gap-2">
              {steam.ref.headerImage && <img src={steam.ref.headerImage} alt="" className="h-9 w-20 rounded object-cover" referrerPolicy="no-referrer" />}
              <div className="min-w-0">
                <a
                  href={`https://store.steampowered.com/app/${steam.ref.steamAppId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium truncate hover:underline inline-flex items-center gap-1"
                >
                  {steam.ref.name} <ExternalLink className="h-3 w-3" />
                </a>
                <div className="text-xs text-muted-foreground truncate">{[...steam.ref.developers, steam.ref.releaseDate].filter(Boolean).join(" · ")}</div>
                {steam.method && <div className="text-[11px] text-muted-foreground">{mapMethodLabel(steam.method, t)}</div>}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {steam.status === "none" ? t("Đã đánh dấu: không có trên Steam", "Marked as not on Steam") : t("Chưa ghép (không bắt buộc)", "Not mapped (optional)")}
            </span>
          )}
        </Side>
      </div>

      {id && (
        <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-sm">
            <Globe className="h-4 w-4 text-primary" /> {t("Danh tính tìm qua web", "Identity from web search")}
            {!id.grounded && <span className="text-amber-600">({t("không có nguồn", "no sources")})</span>}
          </div>
          {id.internationalNames.length > 0 && (
            <div>
              <span className="text-muted-foreground">{t("Tên quốc tế:", "International:")}</span> {id.internationalNames.join(" · ")}
            </div>
          )}
          {id.otherNames.length > 0 && (
            <div>
              <span className="text-muted-foreground">{t("Tên khác:", "Other names:")}</span> {id.otherNames.join(" · ")}
            </div>
          )}
          {(id.developerEn || id.publisherEn) && (
            <div>
              <span className="text-muted-foreground">{t("NPT / NPH:", "Developer / publisher:")}</span> {[id.developerEn, id.publisherEn].filter(Boolean).join(" / ")}
            </div>
          )}
          {id.note && <div className="text-muted-foreground">{id.note}</div>}
          {id.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {id.sources.slice(0, 8).map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="rounded border border-border bg-background px-1.5 py-0.5 hover:bg-muted">
                  {domainOf(u)}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {pickerOpen && (
        <div className="space-y-4 border-t border-border pt-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(q.trim());
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("Tìm thêm theo tên (Trung / Anh)…", "Search by name (Chinese / English)…")}
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button type="submit" className={cn(btnPrimary, "px-4")} disabled={search.isFetching}>
              {t("Tìm", "Search")}
            </button>
          </form>
          {list?.searched && list.searched.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {t("Đã tìm:", "Searched:")} {list.searched.join(" · ")}
            </p>
          )}
          {search.isFetching && <p className="text-xs text-muted-foreground">{t("Đang tìm ứng viên…", "Searching candidates…")}</p>}
          {search.error && <p className="text-xs text-destructive">{(search.error as Error).message}</p>}
          {save.error && <p className="text-xs text-destructive">{(save.error as Error).message}</p>}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("Ứng viên Sensor Tower", "Sensor Tower candidates")}</h3>
              <button type="button" className={cn(btnGhost, "px-2.5 py-1 text-xs")} disabled={save.isPending} onClick={() => save.mutate({ st: { none: true } })}>
                <X className="h-3.5 w-3.5" /> {t("Không có trên Sensor Tower", "Not on Sensor Tower")}
              </button>
            </div>
            {list && list.st.length === 0 && <p className="text-xs text-muted-foreground">{t("Không tìm thấy ứng viên — thử tìm tên khác.", "No candidates — try another name.")}</p>}
            <div className="space-y-1.5">
              {list?.st.map((c) => {
                const current = st.ref?.unifiedId === c.unifiedId;
                return (
                  <div key={c.unifiedId} className={cn("flex items-center gap-3 rounded-lg border p-2", current ? "border-emerald-500/50 bg-emerald-500/5" : "border-border")}>
                    {c.iconUrl ? (
                      <img src={c.iconUrl} alt="" className="h-9 w-9 rounded-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {[c.publisher, c.subgenre ?? c.genre, c.releaseDate].filter(Boolean).join(" · ")}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.reasons.join(" · ")}</div>
                    </div>
                    <div className="hidden sm:block text-right text-[11px] text-muted-foreground whitespace-nowrap">
                      {c.lastMonth ? (
                        <>
                          <div>
                            {c.lastMonth.country} {usd(c.lastMonth.revenueUsd)}
                          </div>
                          <div>DAU {compact(c.lastMonth.avgDau)}</div>
                        </>
                      ) : (
                        t("chưa có số tháng", "no monthly data")
                      )}
                    </div>
                    <span className="w-10 text-right text-xs font-semibold">{Math.round(c.score * 100)}%</span>
                    <button
                      type="button"
                      className={cn(current ? btnGhost : btnSubtle, "px-2.5 py-1 text-xs")}
                      disabled={save.isPending || current}
                      onClick={() => save.mutate({ st: { unifiedId: c.unifiedId } })}
                    >
                      {current ? <Check className="h-3.5 w-3.5" /> : t("Chọn", "Pick")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("Ứng viên Steam (không bắt buộc)", "Steam candidates (optional)")}</h3>
              <button type="button" className={cn(btnGhost, "px-2.5 py-1 text-xs")} disabled={save.isPending} onClick={() => save.mutate({ steam: { none: true } })}>
                <X className="h-3.5 w-3.5" /> {t("Không có trên Steam", "Not on Steam")}
              </button>
            </div>
            {list && list.steam.length === 0 && <p className="text-xs text-muted-foreground">{t("Không có ứng viên Steam.", "No Steam candidates.")}</p>}
            <div className="space-y-1.5">
              {list?.steam.map((c) => {
                const current = steam.ref?.steamAppId === c.steamAppId;
                return (
                  <div key={c.steamAppId} className={cn("flex items-center gap-3 rounded-lg border p-2", current ? "border-emerald-500/50 bg-emerald-500/5" : "border-border")}>
                    {c.headerImage ? <img src={c.headerImage} alt="" className="h-9 w-20 rounded object-cover" referrerPolicy="no-referrer" /> : <div className="h-9 w-20 rounded bg-muted" />}
                    <div className="min-w-0 flex-1">
                      <a href={`https://store.steampowered.com/app/${c.steamAppId}`} target="_blank" rel="noreferrer" className="text-sm font-medium truncate hover:underline block">
                        {c.name}
                      </a>
                      <div className="text-[11px] text-muted-foreground truncate">{[...c.developers, c.releaseDate].filter(Boolean).join(" · ")}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.reasons.join(" · ")}</div>
                    </div>
                    <div className="hidden sm:block text-right text-[11px] text-muted-foreground whitespace-nowrap">
                      {c.reviews != null ? `${compact(c.reviews)} review` : "—"}
                      {c.positivePct != null && <div>{c.positivePct.toFixed(0)}% 👍</div>}
                    </div>
                    <span className="w-10 text-right text-xs font-semibold">{Math.round(c.score * 100)}%</span>
                    <button
                      type="button"
                      className={cn(current ? btnGhost : btnSubtle, "px-2.5 py-1 text-xs")}
                      disabled={save.isPending || current}
                      onClick={() => save.mutate({ steam: { steamAppId: c.steamAppId } })}
                    >
                      {current ? <Check className="h-3.5 w-3.5" /> : t("Chọn", "Pick")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
