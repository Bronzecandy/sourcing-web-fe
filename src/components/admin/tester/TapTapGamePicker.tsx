import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/lib/button-classes";
import { testerApi } from "@/tester/api";
import type { CampaignGameOption } from "@/tester/types";

const PLATFORM_LABEL: Record<string, string> = { android: "Android", ios: "iOS", pc: "PC" };

function compact(n: number | null): string | null {
  if (n == null || n <= 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function looksLikeId(q: string): boolean {
  return /^\d+$/.test(q) || /\/app\/\d+/.test(q);
}

function GameIcon({ url, className }: { url: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" loading="lazy" className={cn("shrink-0 rounded-lg bg-muted object-cover", className)} />
  ) : (
    <span className={cn("shrink-0 rounded-lg bg-muted", className)} />
  );
}

function OptionMeta({ g }: { g: CampaignGameOption }) {
  const stats = [
    compact(g.reserveCount) ? `${compact(g.reserveCount)} đặt trước` : null,
    compact(g.downloads) ? `${compact(g.downloads)} lượt tải` : null,
    g.rating && g.rating !== "0" ? `★ ${g.rating}` : null,
  ].filter(Boolean);
  return (
    <span className="block text-xs text-muted-foreground">
      {[g.developer, g.platforms.map((p) => PLATFORM_LABEL[p] ?? p).join("/"), ...stats].filter(Boolean).join(" · ")}
    </span>
  );
}

/** Ô chọn game trên TapTap (theo tên, link hoặc TapTap ID) cho form đợt test. */
export default function TapTapGamePicker({
  selected,
  onPick,
  onClear,
}: {
  selected: { appId: string; title: string; iconUrl: string } | null;
  onPick: (game: CampaignGameOption) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debounced.length >= 2 || looksLikeId(debounced);
  const search = useQuery({
    queryKey: ["tester-admin-taptap-search", debounced],
    queryFn: () => testerApi.adminTapTapSearch(debounced),
    enabled,
    staleTime: 5 * 60_000,
  });

  if (selected && !open) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
        <GameIcon url={selected.iconUrl || null} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{selected.title}</p>
          <a
            href={`https://www.taptap.cn/app/${selected.appId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            TapTap {selected.appId} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={cn(btnGhost, "px-3 py-1.5 text-xs")}>
          Đổi game
        </button>
        <button type="button" aria-label="Bỏ chọn game" onClick={onClear} className={cn(btnGhost, "p-1.5")}>
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const results = search.data ?? [];
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus={open}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm game trên TapTap: tên game, link hoặc TapTap ID"
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm"
        />
        {search.isFetching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {enabled && (
        <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-card">
          {search.error ? (
            <p className="px-3 py-3 text-sm text-destructive">
              {search.error instanceof Error ? search.error.message : "Không tìm được trên TapTap"}
            </p>
          ) : !search.isFetching && results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Không thấy game phù hợp trên TapTap.</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(g);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <GameIcon url={g.iconUrl} className="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {g.title}
                        {g.titleEn && <span className="text-muted-foreground"> · {g.titleEn}</span>}
                      </span>
                      <OptionMeta g={g} />
                      {g.tagsEn.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {g.tagsEn.slice(0, 4).map((t) => (
                            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {t}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{g.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {selected && (
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:underline">
          Giữ game đang chọn
        </button>
      )}
    </div>
  );
}
