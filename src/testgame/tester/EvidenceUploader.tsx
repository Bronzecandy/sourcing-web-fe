import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ImagePlus, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { testFileUrl } from "../api";
import { formatBytes } from "../labels";
import type { TestFileDto } from "../types";
import type { PendingUpload } from "./useUploadQueue";

const MAX_BYTES = 12 * 1024 * 1024;

function isImage(f: File): boolean {
  return f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
}

export default function EvidenceUploader({
  files,
  uploads,
  max,
  editable,
  invalid,
  resetsReview,
  deletingId,
  onAdd,
  onDelete,
}: {
  files: TestFileDto[];
  uploads: PendingUpload[];
  max: number;
  editable: boolean;
  invalid: boolean;
  /** Bài đã nộp: tải ảnh mới đưa bài về chờ duyệt. */
  resetsReview: boolean;
  deletingId: string | null;
  onAdd: (files: File[]) => void;
  onDelete: (fileId: string) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const room = Math.max(0, max - files.length - uploads.length);

  const add = (list: File[]) => {
    if (!editable || list.length === 0) return;
    const images = list.filter(isImage);
    if (images.length < list.length) toast.error("Ảnh bằng chứng chỉ nhận tệp ảnh (JPG, PNG, WEBP, HEIC)");
    const ok = images.filter((f) => f.size <= MAX_BYTES);
    if (ok.length < images.length) toast.error("Ảnh bằng chứng tối đa 12 MB mỗi ảnh");
    if (ok.length === 0) return;
    if (room === 0) {
      toast.error(`Tối đa ${max} ảnh bằng chứng — xoá bớt ảnh cũ trước khi thêm`);
      return;
    }
    if (ok.length > room) toast.error(`Tối đa ${max} ảnh bằng chứng — đã bỏ qua ${ok.length - room} ảnh`);
    onAdd(ok.slice(0, room));
  };

  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    const pasted = Array.from(e.clipboardData?.files ?? []).filter(isImage);
    if (!editable || pasted.length === 0) return;
    e.preventDefault();
    add(pasted);
  });
  useEffect(() => {
    const handler = (e: ClipboardEvent) => onPaste(e);
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, []);

  return (
    <section
      id="tq-evidence"
      aria-labelledby="evidence-title"
      onDragOver={(e) => {
        if (!editable) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!editable) return;
        e.preventDefault();
        setDragging(false);
        add(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "scroll-mt-28 rounded-[1.5rem] border-2 p-4 transition-colors sm:p-5",
        invalid ? "border-brand-magenta/60 bg-brand-magenta/5" : "border-brand-yellow bg-brand-yellow/15",
        dragging && "border-dashed border-brand-violet bg-brand-lavender/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id="evidence-title" className="flex items-center gap-2 font-semibold text-brand-navy">
          <ShieldCheck className="h-5 w-5 text-brand-violet" /> Ảnh bằng chứng (bắt buộc)
        </h3>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold tabular-nums text-brand-navy ring-1 ring-brand-navy/10">
          {files.length}/{max}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-brand-navy/75">
        1–{max} ảnh chụp màn hình trong game có UID và level / tiến trình nhân vật. AI sẽ kiểm tra ảnh trùng với người khác, ảnh cũ
        và tiến độ so với số giờ test.
      </p>
      {editable && resetsReview && (
        <p className="mt-1 text-xs text-brand-navy/60">Tải ảnh mới sau khi đã nộp sẽ đưa bài về trạng thái chờ duyệt.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((f, i) => (
          <figure key={f.id} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-brand-navy/10">
            <a href={testFileUrl(f.id)} target="_blank" rel="noreferrer" className="block" title="Xem ảnh gốc">
              <img src={testFileUrl(f.id)} alt={`Ảnh bằng chứng ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full bg-[#f5f4ff] object-cover" />
            </a>
            <figcaption className="truncate px-3 py-1.5 text-xs text-brand-navy/60">
              {formatBytes(f.size)}
              {f.width && f.height ? ` · ${f.width}×${f.height}` : ""}
            </figcaption>
            {editable && (
              <button
                type="button"
                aria-label={`Xoá ảnh bằng chứng ${i + 1}`}
                disabled={deletingId === f.id}
                onClick={() => onDelete(f.id)}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-magenta shadow transition-colors hover:bg-white disabled:opacity-60"
              >
                {deletingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            )}
          </figure>
        ))}
        {uploads.map((u) => (
          <figure key={u.key} className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-navy/10" aria-busy>
            <div className="relative">
              {u.preview ? (
                <img src={u.preview} alt="" className="aspect-[4/3] w-full object-cover opacity-50" />
              ) : (
                <div className="aspect-[4/3] w-full bg-[#f5f4ff]" />
              )}
              <div className="absolute inset-x-3 bottom-3 h-2 overflow-hidden rounded-full bg-white/90">
                <div className="h-full rounded-full bg-brand-violet transition-[width]" style={{ width: `${u.pct}%` }} />
              </div>
            </div>
            <figcaption className="flex items-center gap-1.5 truncate px-3 py-1.5 text-xs text-brand-navy/60">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> Đang tải {u.pct}%
            </figcaption>
          </figure>
        ))}
        {editable && room > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-32 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand-navy/20 bg-white/70 p-3 text-center text-sm font-semibold text-brand-navy/70 transition-colors hover:border-brand-violet hover:text-brand-violet"
          >
            <ImagePlus className="h-6 w-6" /> Thêm ảnh
            <span className="text-[11px] font-normal text-brand-navy/50">Chọn ảnh, kéo thả hoặc dán (Ctrl+V)</span>
          </button>
        )}
      </div>
      {!editable && files.length === 0 && <p className="mt-2 text-sm text-brand-navy/55">Chưa có ảnh bằng chứng.</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Chọn ảnh bằng chứng"
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </section>
  );
}
