import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { testGameApi } from "../api";
import type { TestFileDto } from "../types";
import { errorText } from "./utils";

export interface PendingUpload {
  key: number;
  name: string;
  size: number;
  pct: number;
  preview: string | null;
}

let seq = 0;

/** Tải lần lượt từng tệp: BE đếm giới hạn số tệp trước khi lưu nên gửi song song có thể vượt giới hạn. */
export function useUploadQueue(assignmentId: string, kind: "evidence" | "footage", onUploaded: (file: TestFileDto) => void) {
  const toast = useToast();
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const enqueue = (files: File[]) => {
    for (const file of files) {
      const item: PendingUpload = {
        key: ++seq,
        name: file.name,
        size: file.size,
        pct: 0,
        preview: kind === "evidence" ? URL.createObjectURL(file) : null,
      };
      setUploads((prev) => [...prev, item]);
      chain.current = chain.current.then(async () => {
        try {
          const saved = await testGameApi.uploadFile(assignmentId, kind, file, (pct) =>
            setUploads((prev) => prev.map((u) => (u.key === item.key ? { ...u, pct } : u))),
          );
          onUploaded(saved);
        } catch (err) {
          toast.error(`${file.name}: ${errorText(err, "Không tải lên được")}`);
        } finally {
          if (item.preview) URL.revokeObjectURL(item.preview);
          setUploads((prev) => prev.filter((u) => u.key !== item.key));
        }
      });
    }
  };

  return { uploads, enqueue };
}
