import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { isVisibleIn, parseOptions, type DraftQuestion } from "./templates-model";

const field = "w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground";

export default function TemplatePreview({
  questions,
  answers,
  onAnswer,
}: {
  questions: DraftQuestion[];
  answers: Record<string, "yes" | "no">;
  onAnswer: (uid: string, value: "yes" | "no") => void;
}) {
  const visible = questions.filter((q) => isVisibleIn(q, questions, answers));
  const hidden = questions.length - visible.length;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Bấm Có / Không ở câu Điều kiện để xem câu nào bị ẩn. Q1 (thông tin tester) lấy từ tài khoản đăng nhập.
        {hidden > 0 && <span className="font-medium text-amber-700"> Đang ẩn {hidden} câu.</span>}
      </p>
      {visible.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Chưa có câu hỏi.</p>
      ) : (
        visible.map((q) => (
          <div key={q.uid} className="space-y-1.5 rounded-lg border border-border bg-background p-3">
            <p className="font-medium leading-snug">
              <span className="mr-1.5 font-mono text-xs text-muted-foreground">{q.code || "?"}</span>
              {q.text || <span className="italic text-muted-foreground">(chưa có nội dung)</span>}
              {q.required && <span className="text-destructive"> *</span>}
            </p>
            {q.help.trim() && <p className="text-xs text-muted-foreground">{q.help}</p>}
            <PreviewInput q={q} answer={answers[q.uid] ?? "yes"} onAnswer={(v) => onAnswer(q.uid, v)} />
          </div>
        ))
      )}
    </div>
  );
}

function PreviewInput({ q, answer, onAnswer }: { q: DraftQuestion; answer: "yes" | "no"; onAnswer: (v: "yes" | "no") => void }) {
  if (q.type === "scale") {
    const min = Number(q.scaleMin);
    const max = Number(q.scaleMax);
    const steps = Number.isInteger(min) && Number.isInteger(max) && max > min && max - min <= 10 ? max - min + 1 : 0;
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-xs tabular-nums">
              {min + i}
            </span>
          ))}
        </div>
        <div className="flex justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{q.minLabel}</span>
          <span>{q.maxLabel}</span>
        </div>
      </div>
    );
  }
  if (q.type === "yes_no") {
    const interactive = q.role === "condition";
    return (
      <div className="flex gap-1.5">
        {(["yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            disabled={!interactive}
            onClick={() => onAnswer(v)}
            className={cn(
              "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
              interactive && answer === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
              interactive ? "hover:bg-muted" : "cursor-default",
            )}
          >
            {v === "yes" ? "Có" : "Không"}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "single" || q.type === "multiple") {
    const options = parseOptions(q.optionsText);
    return (
      <div className="space-y-1">
        {options.map((o, i) => (
          <label key={i} className="flex items-center gap-2 text-xs">
            <input type={q.type === "single" ? "radio" : "checkbox"} disabled />
            {o}
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "file") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
        <Upload className="h-4 w-4" /> Tải ảnh / video hoặc dán link Drive, YouTube
      </div>
    );
  }
  if (q.type === "long_text") return <div className={cn(field, "h-14")} />;
  return <div className={cn(field, "h-9", q.type === "number" && "max-w-[10rem]")} />;
}
