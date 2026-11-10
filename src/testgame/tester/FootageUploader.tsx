import { useRef } from "react";
import { Film, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { ghostOnLight } from "@/tester/components/styles";
import { testFileUrl } from "../api";
import { formatBytes } from "../labels";
import type { TestFileDto } from "../types";
import type { PendingUpload } from "./useUploadQueue";

const MAX_FILES = 10;

export default function FootageUploader({
  files,
  uploads,
  maxMb,
  editable,
  deletingId,
  onAdd,
  onDelete,
}: {
  files: TestFileDto[];
  uploads: PendingUpload[];
  maxMb: number;
  editable: boolean;
  deletingId: string | null;
  onAdd: (files: File[]) => void;
  onDelete: (fileId: string) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: File[]) => {
    const media = list.filter((f) => f.type.startsWith("video/") || f.type.startsWith("image/"));
    if (media.length < list.length) toast.error("Footage phải là video hoặc ảnh");
    const ok = media.filter((f) => f.size <= maxMb * 1024 * 1024);
    if (ok.length < media.length) toast.error(`Tệp lớn hơn ${maxMb} MB — hãy tải lên Drive/YouTube rồi dán link`);
    const room = Math.max(0, MAX_FILES - files.length - uploads.length);
    if (ok.length > room) toast.error(`Tối đa ${MAX_FILES} tệp footage`);
    if (room > 0 && ok.length > 0) onAdd(ok.slice(0, room));
  };

  if (!editable && files.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl bg-[#f5f4ff] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-brand-navy">{editable ? "Hoặc tải tệp lên" : "Tệp footage"}</p>
        {editable && (
          <button type="button" onClick={() => inputRef.current?.click()} className={cn(ghostOnLight, "px-4 py-2")}>
            <Upload className="h-4 w-4" /> Chọn video / ảnh
          </button>
        )}
      </div>
      {editable && (
        <p className="mt-1 text-xs text-brand-navy/55">
          Tối đa {maxMb} MB mỗi tệp, {MAX_FILES} tệp. Video dài hơn hãy tải lên Drive/YouTube rồi dán link ở trên.
        </p>
      )}
      {(files.length > 0 || uploads.length > 0) && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => {
            const Icon = f.mime.startsWith("video/") ? Film : ImageIcon;
            return (
              <li key={f.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
                <Icon className="h-4 w-4 shrink-0 text-brand-violet" />
                <a
                  href={testFileUrl(f.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm font-medium text-brand-navy hover:text-brand-violet hover:underline"
                >
                  {f.fileName}
                </a>
                <span className="shrink-0 text-xs tabular-nums text-brand-navy/50">{formatBytes(f.size)}</span>
                {editable && (
                  <button
                    type="button"
                    aria-label={`Xoá ${f.fileName}`}
                    disabled={deletingId === f.id}
                    onClick={() => onDelete(f.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-navy/50 transition-colors hover:bg-brand-magenta/10 hover:text-brand-magenta disabled:opacity-60"
                  >
                    {deletingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                )}
              </li>
            );
          })}
          {uploads.map((u) => (
            <li key={u.key} className="rounded-xl bg-white px-3 py-2" aria-busy>
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-violet" />
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-brand-navy/50">{u.pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-navy/10">
                <div className="h-full rounded-full bg-brand-violet transition-[width]" style={{ width: `${u.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        aria-label="Chọn tệp footage"
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
