import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles, X } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { fetchRankings } from "@/services/api";
import type { GameListItem } from "@/types";
import { cn } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";

const MAX_GAMES = 4;
const SUGGESTION_LIMIT = 6;

type SeedGame = { appId: number; title: string; iconUrl: string | null };

type CompareGamePickerProps = {
  open: boolean;
  onClose: () => void;
  seedAppIds?: number[];
  seedGames?: SeedGame[];
  /** Thể loại của game gốc — dùng để gợi ý game cùng tag. */
  seedTags?: string[];
};

const EMPTY_SEEDS: SeedGame[] = [];
const EMPTY_IDS: number[] = [];
const EMPTY_TAGS: string[] = [];

function GamePickRow({
  item,
  active,
  disabled,
  onToggle,
}: {
  item: GameListItem | { appId: number; title: string; iconUrl: string | null };
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {item.iconUrl ? (
        <img src={item.iconUrl} alt="" className="w-8 h-8 rounded-lg shrink-0" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {item.title.charAt(0)}
        </div>
      )}
      <span className="truncate font-medium">{item.title}</span>
    </button>
  );
}

export default function CompareGamePicker({
  open,
  onClose,
  seedAppIds = EMPTY_IDS,
  seedGames = EMPTY_SEEDS,
  seedTags = EMPTY_TAGS,
}: CompareGamePickerProps) {
  const navigate = useNavigate();
  const { t } = useUiCopy();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Array<{ appId: number; title: string; iconUrl: string | null }>>([]);
  const wasOpenRef = useRef(false);
  const seedSnapshotRef = useRef({ seedGames, seedAppIds });
  seedSnapshotRef.current = { seedGames, seedAppIds };

  const primaryTag = seedTags[0] ?? null;
  const isSearching = debounced.length >= 2;

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(tmr);
  }, [search]);

  // Chỉ reset khi modal vừa mở — tránh loop vì seedGames/seedAppIds là mảng mới mỗi render.
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const { seedGames: games, seedAppIds: ids } = seedSnapshotRef.current;
    const seeds = games.length
      ? games
      : ids.map((id) => ({ appId: id, title: `#${id}`, iconUrl: null }));
    setSelected(seeds.slice(0, MAX_GAMES));
    setSearch("");
    setDebounced("");
  }, [open]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.appId)), [selected]);

  const { data: searchResult, isFetching: searchFetching } = useQuery({
    queryKey: ["compare-picker-search", debounced],
    queryFn: () => fetchRankings({ search: debounced, limit: 20, page: 1 }),
    enabled: open && isSearching,
  });

  const { data: suggestionResult, isFetching: suggestionsFetching } = useQuery({
    queryKey: ["compare-picker-suggestions", primaryTag],
    queryFn: () => fetchRankings({ tag: primaryTag!, limit: 16, page: 1 }),
    enabled: open && !!primaryTag,
  });

  const searchResults = searchResult?.data ?? [];

  const suggestions = useMemo(() => {
    if (!primaryTag) return [];
    return (suggestionResult?.data ?? [])
      .filter((item) => !selectedIds.has(item.appId))
      .slice(0, SUGGESTION_LIMIT);
  }, [primaryTag, suggestionResult, selectedIds]);

  const toggle = (item: GameListItem) => {
    setSelected((prev) => {
      const exists = prev.some((p) => p.appId === item.appId);
      if (exists) return prev.filter((p) => p.appId !== item.appId);
      if (prev.length >= MAX_GAMES) return prev;
      return [...prev, { appId: item.appId, title: item.title, iconUrl: item.iconUrl }];
    });
  };

  const remove = (appId: number) => {
    setSelected((prev) => prev.filter((p) => p.appId !== appId));
  };

  const canSubmit = selected.length >= 2;

  const onSubmit = () => {
    if (!canSubmit) return;
    const ids = selected.map((s) => s.appId).join(",");
    navigate(`/compare?ids=${ids}`);
    onClose();
  };

  const renderListItem = (item: GameListItem) => {
    const active = selectedIds.has(item.appId);
    const disabled = !active && selected.length >= MAX_GAMES;
    return (
      <GamePickRow
        key={item.appId}
        item={item}
        active={active}
        disabled={disabled}
        onToggle={() => toggle(item)}
      />
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Chọn game để so sánh", "Select games to compare")}
      description={t(
        `Chọn 2–${MAX_GAMES} game. Game đầu tiên thường là game bạn đang xem.`,
        `Pick 2–${MAX_GAMES} games. The first is usually the game you're viewing.`,
      )}
      className="max-w-lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          onSubmit={onSubmit}
          cancelLabel={t("Hủy", "Cancel")}
          submitLabel={t("So sánh", "Compare")}
          submitDisabled={!canSubmit}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {selected.map((g) => (
            <span
              key={g.appId}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
            >
              {g.iconUrl ? (
                <img src={g.iconUrl} alt="" className="w-4 h-4 rounded" referrerPolicy="no-referrer" />
              ) : null}
              <span className="max-w-[120px] truncate">{g.title}</span>
              <button type="button" onClick={() => remove(g.appId)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selected.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("Chưa chọn game", "No games selected")}</p>
          )}
        </div>

        {!isSearching && primaryTag && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {t(`Đề xuất cùng thể loại · ${primaryTag}`, `Same genre · ${primaryTag}`)}
            </div>
            <div className="space-y-1">
              {suggestionsFetching ? (
                <p className="text-xs text-muted-foreground py-2 text-center">{t("Đang tải đề xuất…", "Loading suggestions…")}</p>
              ) : suggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {t("Không có game tương tự trong bảng xếp hạng", "No similar games in ranking")}
                </p>
              ) : (
                suggestions.map((item) => renderListItem(item))
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Tìm theo tên game…", "Search by game name…")}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {!isSearching ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {primaryTag
                ? t("Hoặc tìm theo tên ở trên", "Or search by name above")
                : t("Nhập ít nhất 2 ký tự để tìm", "Type at least 2 characters to search")}
            </p>
          ) : searchFetching ? (
            <p className="text-xs text-muted-foreground py-4 text-center">{t("Đang tìm…", "Searching…")}</p>
          ) : searchResults.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">{t("Không có kết quả", "No results")}</p>
          ) : (
            searchResults.map((item) => renderListItem(item))
          )}
        </div>
      </div>
    </Modal>
  );
}
