import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Library, RefreshCw, Save, Wand2, Code2, Loader2, ChevronDown, Plus } from "lucide-react";
import {
  fetchLibraryFileList,
  fetchLibraryJson,
  putLibraryJson,
  fetchLibraryPending,
  mergeLibraryPending,
  deleteLibraryPending,
} from "@/services/api";
import { cn } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { libraryFileLabel } from "@/lib/library-labels";
import type { LibraryPendingItem } from "@/types";
import LibraryTableEditor, { PendingMergeTable } from "@/components/library-editors/LibraryTableEditor";
import { tierScoreMap } from "@/lib/library-json";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import LibraryAddEntryModal from "@/components/libraries/LibraryAddEntryModal";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { btnGhost, btnPrimary } from "@/lib/button-classes";

const DOCUMENT_SLUGS = [
  "genre-tiers.json",
  "studio-tiers.json",
  "game-size-tiers.json",
  "update-cycle-tiers.json",
  "community-size-tiers.json",
  "ip-theme-tiers.json",
  "system-requirement-tiers.json",
  "art-style-keywords.json",
];

type ConfirmState =
  | { kind: "merge"; id: string; body: Parameters<typeof mergeLibraryPending>[1] }
  | { kind: "delete"; id: string }
  | null;

export default function LibrariesPage() {
  const { t, lang } = useUiCopy();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "libraries.write");
  const queryClient = useQueryClient();

  const [mainTab, setMainTab] = useState<"documents" | "pending">("documents");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [libraryData, setLibraryData] = useState<unknown | null>(null);
  const [dirty, setDirty] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [jsonRawOpen, setJsonRawOpen] = useState(false);
  const [jsonRaw, setJsonRaw] = useState("");
  const [editorMountKey, setEditorMountKey] = useState(0);
  const [pendingTypeFilter, setPendingTypeFilter] = useState<string>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const { data: fileIds = [], isPending: filesLoading } = useQuery({
    queryKey: ["library-files"],
    queryFn: fetchLibraryFileList,
    staleTime: 60_000,
  });

  const documentFiles = useMemo(
    () => fileIds.filter((id) => id !== "pending-additions.json" && DOCUMENT_SLUGS.includes(id)),
    [fileIds],
  );

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
  const genreTierKeys = useMemo(() => {
    const g = genreTiersQuery.data as { tiers?: Record<string, unknown> } | undefined;
    const keys = g?.tiers ? Object.keys(g.tiers).sort() : [];
    return keys.length ? keys : ["S", "A", "B", "C"];
  }, [genreTiersQuery.data]);

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
    if (!selectedId || mainTab !== "documents") return;
    let cancelled = false;
    loadSelectedFile(selectedId).catch((e) => {
      if (!cancelled) setParseError(String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadSelectedFile, mainTab]);

  useEffect(() => {
    if (!selectedId && documentFiles.length > 0 && mainTab === "documents") {
      setSelectedId(documentFiles[0]!);
    }
  }, [documentFiles, selectedId, mainTab]);

  const handleLibraryChange = useCallback(
    (next: unknown) => {
      if (!canWrite) return;
      setLibraryData(next);
      setDirty(true);
      setParseError(null);
    },
    [canWrite],
  );

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
      toast.success(t("Đã lưu thay đổi chỉnh sửa", "Edits saved"));
      queryClient.invalidateQueries({ queryKey: ["library-json", selectedId] });
      if (selectedId === "genre-tiers.json") {
        queryClient.invalidateQueries({ queryKey: ["library-json", "genre-tiers.json"] });
      }
    },
    onError: (e: Error) => {
      setParseError(e.message);
      toast.error(e.message);
    },
  });

  const mergeMutation = useMutation({
    mutationFn: (args: {
      id: string;
      body: Parameters<typeof mergeLibraryPending>[1];
    }) => mergeLibraryPending(args.id, args.body),
    onSuccess: () => {
      setParseError(null);
      setConfirm(null);
      toast.success(t("Đã merge vào thư viện", "Merged into library"));
      queryClient.invalidateQueries({ queryKey: ["library-pending"] });
      queryClient.invalidateQueries({ queryKey: ["library-json"] });
      if (selectedId) loadSelectedFile(selectedId).catch(() => undefined);
    },
    onError: (e: Error) => {
      setParseError(e.message);
      toast.error(e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLibraryPending,
    onSuccess: () => {
      setConfirm(null);
      toast.success(t("Đã xóa", "Deleted"));
      queryClient.invalidateQueries({ queryKey: ["library-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFormatRaw = () => {
    try {
      const o = JSON.parse(jsonRaw);
      setJsonRaw(JSON.stringify(o, null, 2));
      setParseError(null);
    } catch {
      setParseError(t("Không format được — JSON lỗi", "Cannot format — invalid JSON"));
    }
  };

  const applyJsonRaw = () => {
    if (!canWrite) return;
    try {
      const parsed = JSON.parse(jsonRaw);
      setLibraryData(parsed);
      setEditorMountKey((k) => k + 1);
      setDirty(true);
      setParseError(null);
    } catch (e) {
      setParseError(
        t("JSON không hợp lệ", "Invalid JSON") + ": " + (e instanceof Error ? e.message : ""),
      );
    }
  };

  const openJsonRaw = () => {
    if (libraryData === null || libraryData === undefined) return;
    setJsonRaw(JSON.stringify(libraryData, null, 2));
    setJsonRawOpen(true);
    setParseError(null);
  };

  const pending: LibraryPendingItem[] = pendingQuery.data ?? [];
  const pendingTypes = useMemo(() => {
    const types = new Set(pending.map((p) => p.type));
    return ["all", ...Array.from(types).sort()];
  }, [pending]);

  const filteredPending = useMemo(() => {
    if (pendingTypeFilter === "all") return pending;
    return pending.filter((p) => p.type === pendingTypeFilter);
  }, [pending, pendingTypeFilter]);

  const pendingCount = pending.length;
  const canAddEntry = canWrite && selectedId && selectedId !== "pending-additions.json";

  return (
    <div className="space-y-4 w-full min-h-[calc(100vh-8rem)]">
      <PageHeader
        icon={<Library className="w-8 h-8" />}
        title={t("Thư viện rubric", "Rubric libraries")}
        description={t(
          "Thêm mục mới qua modal (lưu ngay). Chỉnh sửa bảng bên dưới rồi bấm Lưu khi cần.",
          "Add items via modal (saved immediately). Edit the table below, then Save when needed.",
        )}
      />

      {!canWrite && (
        <p className="text-sm rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100 px-4 py-3">
          {t(
            "Chế độ chỉ xem — bạn không có quyền sửa Libraries.",
            "Read-only mode — you do not have permission to edit libraries.",
          )}
        </p>
      )}

      <Tabs
        active={mainTab}
        onChange={(id) => setMainTab(id as typeof mainTab)}
        tabs={[
          { id: "documents", label: t("Tài liệu", "Documents") },
          { id: "pending", label: t("Pending", "Pending"), badge: pendingCount },
        ]}
      />

      {mainTab === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,260px)_1fr] gap-4 pt-2 min-h-[calc(100vh-14rem)]">
          <nav className="bg-card rounded-xl border border-border p-3 flex flex-col max-h-[calc(100vh-14rem)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
              {t("Tài liệu", "Documents")}
            </p>
            {filesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm p-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("Đang tải…", "Loading…")}
              </div>
            ) : (
              <ul className="space-y-0.5 overflow-y-auto flex-1 min-h-0">
                {documentFiles.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => selectFile(id)}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg text-sm transition-all duration-150",
                        selectedId === id
                          ? "bg-primary/15 text-primary font-medium"
                          : "hover:bg-muted/80 hover:shadow-sm",
                      )}
                    >
                      <span className="block truncate">{libraryFileLabel(id, lang)}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                        {id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          <div className="flex flex-col min-h-0 rounded-xl border border-border bg-card overflow-hidden">
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <div className="flex-1 min-w-[10rem]">
                <p className="font-medium text-sm truncate">
                  {selectedId ? libraryFileLabel(selectedId, lang) : t("— Chọn tài liệu —", "— Select document —")}
                </p>
                {selectedId && (
                  <p className="text-xs font-mono text-muted-foreground truncate">{selectedId}</p>
                )}
              </div>
              {dirty && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">
                  {t("Chưa lưu", "Unsaved")}
                </span>
              )}
              {canAddEntry && (
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className={cn(btnPrimary, "px-3 py-1.5 text-sm")}
                >
                  <Plus className="w-4 h-4" />
                  {t("Thêm mới", "Add new")}
                </button>
              )}
              <button
                type="button"
                disabled={!selectedId}
                onClick={() => selectedId && loadSelectedFile(selectedId)}
                className={cn(btnGhost, "px-3 py-1.5 text-sm")}
              >
                <RefreshCw className="w-4 h-4" />
                {t("Tải lại", "Reload")}
              </button>
              <button
                type="button"
                disabled={!selectedId || libraryData === null}
                onClick={() => (jsonRawOpen ? setJsonRawOpen(false) : openJsonRaw())}
                className={cn(btnGhost, "px-3 py-1.5 text-sm")}
              >
                <Code2 className="w-4 h-4" />
                {jsonRawOpen ? t("Đóng JSON", "Close JSON") : "JSON"}
              </button>
              {canWrite && (
                <button
                  type="button"
                  disabled={!selectedId || saveMutation.isPending || libraryData === null || !dirty}
                  onClick={() => saveMutation.mutate()}
                  className={cn(btnPrimary, "px-3 py-1.5 text-sm")}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t("Lưu chỉnh sửa", "Save edits")}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {!selectedId ? (
                <p className="text-sm text-muted-foreground">{t("Chọn tài liệu bên trái…", "Select a document…")}</p>
              ) : libraryData === null ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Đang tải…", "Loading…")}
                </div>
              ) : (
                <div className={cn(!canWrite && "pointer-events-none opacity-80")}>
                  {canWrite && (
                    <p className="text-xs text-muted-foreground mb-4 rounded-lg bg-muted/40 border border-border px-3 py-2">
                      {t(
                        "Thêm dòng mới: nút «Thêm mới» (lưu ngay). Sửa/xóa trong bảng rồi «Lưu chỉnh sửa».",
                        "New rows: use «Add new» (saved immediately). Edit/delete in the table, then «Save edits».",
                      )}
                    </p>
                  )}
                  <LibraryTableEditor
                    key={editorMountKey}
                    fileId={selectedId}
                    data={libraryData}
                    onChange={handleLibraryChange}
                  />
                </div>
              )}

              {jsonRawOpen && (
                <details open className="mt-4 rounded-lg border border-border">
                  <summary className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer flex items-center gap-1 hover:bg-muted/50 rounded-t-lg transition-colors">
                    {t("JSON nâng cao", "Advanced JSON")}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </summary>
                  <div className="p-3 space-y-2 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={cn(btnGhost, "text-xs px-2 py-1")} onClick={handleFormatRaw}>
                        <Wand2 className="w-3 h-3 inline mr-1" />
                        Format
                      </button>
                      {canWrite && (
                        <>
                          <button
                            type="button"
                            className={cn(btnGhost, "text-xs px-2 py-1")}
                            onClick={() =>
                              libraryData !== null && setJsonRaw(JSON.stringify(libraryData, null, 2))
                            }
                          >
                            {t("Đồng bộ từ bảng", "Sync from table")}
                          </button>
                          <button type="button" className={cn(btnPrimary, "text-xs px-2 py-1")} onClick={applyJsonRaw}>
                            {t("Áp dụng", "Apply")}
                          </button>
                        </>
                      )}
                    </div>
                    <textarea
                      className="w-full min-h-[180px] font-mono text-xs p-3 rounded-lg border border-border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                      spellCheck={false}
                      readOnly={!canWrite}
                      value={jsonRaw}
                      onChange={(e) => setJsonRaw(e.target.value)}
                    />
                  </div>
                </details>
              )}
            </div>

            {parseError && (
              <p className="px-4 pb-3 text-sm text-destructive" role="alert">
                {parseError}
              </p>
            )}
          </div>
        </div>
      )}

      {mainTab === "pending" && (
        <div className="pt-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("Lọc loại", "Filter type")}:</span>
            {pendingTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPendingTypeFilter(type)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-all duration-150",
                  pendingTypeFilter === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted hover:shadow-sm",
                )}
              >
                {type === "all" ? t("Tất cả", "All") : type}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pendingQuery.refetch()}
              className={cn(btnGhost, "ml-auto text-xs px-2 py-1")}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", pendingQuery.isFetching && "animate-spin")} />
              {t("Làm mới", "Refresh")}
            </button>
          </div>
          {pendingQuery.isPending ? (
            <p className="text-sm text-muted-foreground">{t("Đang tải…", "Loading…")}</p>
          ) : filteredPending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("Không có pending", "No pending items")}
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 max-h-[70vh] overflow-y-auto">
              <PendingMergeTable
                pending={filteredPending}
                tierMap={tierMap}
                onMerge={(id, body) => {
                  if (!canWrite) return;
                  setConfirm({ kind: "merge", id, body });
                }}
                onDelete={(id) => {
                  if (!canWrite) return;
                  setConfirm({ kind: "delete", id });
                }}
                merging={mergeMutation.isPending}
                deleting={deleteMutation.isPending}
              />
            </div>
          )}
        </div>
      )}

      <LibraryAddEntryModal
        fileId={selectedId}
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        tierOptions={genreTierKeys}
        onSuccess={() => {
          toast.success(t("Đã thêm vào thư viện", "Added to library"));
          queryClient.invalidateQueries({ queryKey: ["library-json", selectedId] });
          if (selectedId) loadSelectedFile(selectedId).catch((e) => setParseError(String(e)));
        }}
      />

      <Modal
        open={confirm != null}
        onClose={() => setConfirm(null)}
        title={
          confirm?.kind === "merge"
            ? t("Xác nhận merge", "Confirm merge")
            : t("Xác nhận xóa", "Confirm delete")
        }
        description={
          confirm?.kind === "merge"
            ? t("Gộp gợi ý AI vào thư viện chính?", "Merge this AI suggestion into the main library?")
            : t("Xóa mục pending này?", "Delete this pending item?")
        }
        footer={
          confirm && (
            <ModalFooterActions
              onCancel={() => setConfirm(null)}
              onSubmit={() => {
                if (confirm.kind === "merge") {
                  mergeMutation.mutate({ id: confirm.id, body: confirm.body });
                } else {
                  deleteMutation.mutate(confirm.id);
                }
              }}
              cancelLabel={t("Huỷ", "Cancel")}
              submitLabel={confirm.kind === "merge" ? t("Merge", "Merge") : t("Xóa", "Delete")}
              submitting={mergeMutation.isPending || deleteMutation.isPending}
            />
          )
        }
      >
        <p className="text-sm text-muted-foreground">
          {t("Thao tác này ghi trực tiếp vào database.", "This writes directly to the database.")}
        </p>
      </Modal>
    </div>
  );
}
