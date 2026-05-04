import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Library, RefreshCw, Save, Wand2, BookOpen, Loader2, Code2 } from "lucide-react";
import {
  fetchLibraryFileList,
  fetchLibraryJson,
  putLibraryJson,
  fetchLibraryPending,
  mergeLibraryPending,
  deleteLibraryPending,
  appendLibraryStudio,
} from "@/services/api";
import { cn } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";
import type { LibraryPendingItem } from "@/types";
import LibraryTableEditor, { PendingMergeTable } from "@/components/library-editors/LibraryTableEditor";
import { tierScoreMap } from "@/lib/library-json";

export default function LibrariesPage() {
  const { t, lang } = useUiCopy();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [libraryData, setLibraryData] = useState<unknown | null>(null);
  const [dirty, setDirty] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [jsonRawOpen, setJsonRawOpen] = useState(false);
  const [jsonRaw, setJsonRaw] = useState("");
  /** Remount bảng chỉnh sửa khi load file / áp JSON — tránh lệch state cục bộ (genre từng dòng). */
  const [editorMountKey, setEditorMountKey] = useState(0);

  const [studioNames, setStudioNames] = useState("");
  const [studioScore, setStudioScore] = useState("55");
  const [studioTier, setStudioTier] = useState("");

  const { data: fileIds = [], isPending: filesLoading } = useQuery({
    queryKey: ["library-files"],
    queryFn: fetchLibraryFileList,
    staleTime: 60_000,
  });

  const pendingQuery = useQuery({
    queryKey: ["library-pending"],
    queryFn: fetchLibraryPending,
    staleTime: 15_000,
  });

  const genreTiersQuery = useQuery({
    queryKey: ["library-json", "genre-tiers.json"],
    queryFn: () => fetchLibraryJson("genre-tiers.json"),
    staleTime: 120_000,
  });

  const tierMap = useMemo(() => tierScoreMap(genreTiersQuery.data), [genreTiersQuery.data]);

  const loadSelectedFile = useCallback(async (id: string) => {
    const json = await fetchLibraryJson(id);
    setLibraryData(json);
    setEditorMountKey((k) => k + 1);
    setDirty(false);
    setParseError(null);
    setJsonRawOpen(false);
    setJsonRaw("");
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    loadSelectedFile(selectedId).catch((e) => {
      if (!cancelled) setParseError(String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadSelectedFile]);

  const handleLibraryChange = useCallback((next: unknown) => {
    setLibraryData(next);
    setDirty(true);
    setParseError(null);
  }, []);

  const selectFile = (id: string) => {
    if (id === selectedId) return;
    if (dirty) {
      const ok = window.confirm(
        t("Bạn chưa lưu thay đổi. Chuyển file và bỏ qua?", "You have unsaved changes. Switch file and discard them?"),
      );
      if (!ok) return;
    }
    setSelectedId(id);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || libraryData == null) return;
      await putLibraryJson(selectedId, libraryData);
    },
    onSuccess: () => {
      setDirty(false);
      setParseError(null);
      queryClient.invalidateQueries({ queryKey: ["library-file-meta", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["library-json", selectedId] });
      if (selectedId === "genre-tiers.json") {
        queryClient.invalidateQueries({ queryKey: ["library-json", "genre-tiers.json"] });
      }
    },
    onError: (e: Error) => setParseError(e.message),
  });

  const mergeMutation = useMutation({
    mutationFn: (args: {
      id: string;
      body: {
        score?: number;
        tier?: string;
        keywordsEn?: string;
        maxMb?: number;
        maxDaysSinceUpdate?: number;
        minFans?: number;
      };
    }) => mergeLibraryPending(args.id, args.body),
    onSuccess: () => {
      setParseError(null);
      queryClient.invalidateQueries({ queryKey: ["library-pending"] });
      queryClient.invalidateQueries({ queryKey: ["library-json"] });
      queryClient.invalidateQueries({ queryKey: ["library-files"] });
    },
    onError: (e: Error) => setParseError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLibraryPending,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library-pending"] }),
  });

  const studioMutation = useMutation({
    mutationFn: () => {
      const names = studioNames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const score = parseFloat(studioScore);
      if (names.length === 0 || !Number.isFinite(score)) {
        throw new Error(t("Cần ít nhất một tên studio và điểm hợp lệ", "Enter at least one studio name and a valid score"));
      }
      return appendLibraryStudio({
        names,
        score,
        tier: studioTier.trim() || undefined,
      });
    },
    onSuccess: () => {
      setStudioNames("");
      queryClient.invalidateQueries({ queryKey: ["library-json", "studio-tiers.json"] });
      if (selectedId === "studio-tiers.json") {
        loadSelectedFile("studio-tiers.json").catch((e) => setParseError(String(e)));
      }
    },
    onError: (e: Error) => setParseError(e.message),
  });

  const handleFormatRaw = () => {
    try {
      const o = JSON.parse(jsonRaw);
      setJsonRaw(JSON.stringify(o, null, 2));
      setParseError(null);
    } catch (e) {
      setParseError(t("Không format được — JSON lỗi", "Cannot format — invalid JSON"));
    }
  };

  const applyJsonRaw = () => {
    try {
      const parsed = JSON.parse(jsonRaw);
      setLibraryData(parsed);
      setEditorMountKey((k) => k + 1);
      setDirty(true);
      setParseError(null);
    } catch (e) {
      setParseError(t("JSON không hợp lệ", "Invalid JSON") + ": " + (e instanceof Error ? e.message : ""));
    }
  };

  const openJsonRaw = () => {
    if (libraryData === null || libraryData === undefined) return;
    setJsonRaw(JSON.stringify(libraryData, null, 2));
    setJsonRawOpen(true);
    setParseError(null);
  };

  const pending: LibraryPendingItem[] = pendingQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Library className="w-7 h-7 text-primary" />
          {t("Thư viện rubric", "Rubric libraries")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
          {t(
            "Chỉnh thư viện dạng bảng; backend vẫn là JSON trong data/libraries. Proxy dev: /api → cổng backend (vite.config).",
            "Edit libraries as tables; backend files remain JSON under data/libraries. Dev proxy maps /api to the backend port (see vite.config).",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <div className="bg-card rounded-xl border border-border p-4 h-fit max-h-[70vh] flex flex-col">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {t("File", "Files")}
          </h2>
          {filesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("Đang tải…", "Loading…")}
            </div>
          ) : (
            <ul className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1">
              {fileIds.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => selectFile(id)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono transition-colors",
                      selectedId === id
                        ? "bg-primary/15 text-primary border border-primary/40"
                        : "hover:bg-muted/80 text-foreground/90",
                    )}
                  >
                    {id}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 flex flex-col min-h-[420px]">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-mono text-muted-foreground flex-1 min-w-[12rem]">
              {selectedId ?? t("— Chọn file —", "— Pick a file —")}
            </span>
            <button
              type="button"
              disabled={!selectedId || saveMutation.isPending}
              onClick={() => selectedId && loadSelectedFile(selectedId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              {t("Tải lại", "Reload")}
            </button>
            <button
              type="button"
              disabled={!selectedId || !jsonRawOpen}
              onClick={handleFormatRaw}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50"
              title={t("Format vùng JSON thô (khi đã mở)", "Format raw JSON (when open)")}
            >
              <Wand2 className="w-4 h-4" />
              {t("Format JSON", "Format JSON")}
            </button>
            <button
              type="button"
              disabled={!selectedId || libraryData === null}
              onClick={() => (jsonRawOpen ? setJsonRawOpen(false) : openJsonRaw())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50"
            >
              <Code2 className="w-4 h-4" />
              {jsonRawOpen ? t("Đóng JSON thô", "Close raw JSON") : t("JSON thô", "Raw JSON")}
            </button>
            <button
              type="button"
              disabled={!selectedId || saveMutation.isPending || libraryData === null}
              onClick={() => saveMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("Lưu", "Save")}
            </button>
          </div>

          {!selectedId ? (
            <p className="text-sm text-muted-foreground">{t("Chọn file bên trái…", "Select a file on the left…")}</p>
          ) : libraryData === null ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("Đang tải…", "Loading…")}
            </div>
          ) : (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="overflow-y-auto max-h-[min(70vh,560px)] pr-1">
                <LibraryTableEditor
                  key={editorMountKey}
                  fileId={selectedId}
                  data={libraryData}
                  onChange={handleLibraryChange}
                />
              </div>
              {jsonRawOpen && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{t("JSON thô (nâng cao)", "Raw JSON (advanced)")}</span>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                      onClick={() => libraryData !== null && setJsonRaw(JSON.stringify(libraryData, null, 2))}
                    >
                      {t("Đồng bộ từ bảng", "Sync from table")}
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={applyJsonRaw}
                    >
                      {t("Áp dụng JSON", "Apply JSON")}
                    </button>
                  </div>
                  <textarea
                    className="w-full min-h-[200px] font-mono text-xs leading-relaxed p-3 rounded-lg border border-border bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                    spellCheck={false}
                    value={jsonRaw}
                    onChange={(e) => setJsonRaw(e.target.value)}
                    placeholder="{}"
                  />
                </div>
              )}
            </div>
          )}
          {parseError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {parseError}
            </p>
          )}
          {dirty && selectedId && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t("Có thay đổi chưa lưu.", "Unsaved changes.")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold">{t("Merge request (pending)", "Merge requests (pending)")}</h2>
            <button
              type="button"
              onClick={() => pendingQuery.refetch()}
              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-muted"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", pendingQuery.isFetching && "animate-spin")} />
              {t("Làm mới", "Refresh")}
            </button>
          </div>
          {pendingQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{t("Đang tải…", "Loading…")}</p>
          ) : (
            <div className="max-h-[min(70vh,520px)] overflow-y-auto">
              <PendingMergeTable
                pending={pending}
                tierMap={tierMap}
                onMerge={(id, body) => mergeMutation.mutate({ id, body })}
                onDelete={(id) => deleteMutation.mutate(id)}
                merging={mergeMutation.isPending}
                deleting={deleteMutation.isPending}
              />
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-1">{t("Thêm nhanh studio", "Quick-add studio")}</h2>
          <p className="text-xs text-muted-foreground mb-3">
            {t(
              "Append vào studio-tiers.json — có thể chỉnh lại điểm trong bảng studio.",
              "Appends to studio-tiers.json — adjust scores in the studio table if needed.",
            )}
          </p>
          <div className="space-y-2">
            <input
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
              placeholder={t("Tên studio (phân tách bởi dấu phẩy)", "Studio names (comma-separated)")}
              value={studioNames}
              onChange={(e) => setStudioNames(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                placeholder={t("Điểm", "Score")}
                value={studioScore}
                onChange={(e) => setStudioScore(e.target.value)}
              />
              <input
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                placeholder={t("Tier (tuỳ chọn)", "Tier (optional)")}
                value={studioTier}
                onChange={(e) => setStudioTier(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={studioMutation.isPending}
              onClick={() => studioMutation.mutate()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {studioMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("Thêm entry", "Add entry")}
            </button>
          </div>
        </div>
      </div>

      {lang === "en" && (
        <p className="text-xs text-muted-foreground">
          Tip: production builds should set{" "}
          <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> if the API is not same-origin.
        </p>
      )}
    </div>
  );
}
