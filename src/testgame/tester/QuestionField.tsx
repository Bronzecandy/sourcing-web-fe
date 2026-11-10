import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { Check, ExternalLink, Link2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnswerValue, TemplateQuestion } from "../types";
import { fieldClass, isLink, linkRows } from "./utils";

interface InputProps {
  q: TemplateQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  disabled: boolean;
  invalid: boolean;
  labelId: string;
  helpId?: string;
}

/** Một câu trong questionnaire; `children` hiện dưới ô trả lời (vd ô tải footage). */
export default function QuestionField({
  q,
  value,
  onChange,
  required,
  disabled,
  invalid,
  children,
}: {
  q: TemplateQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  required: boolean;
  disabled: boolean;
  invalid: boolean;
  children?: ReactNode;
}) {
  const uid = useId();
  const labelId = `${uid}-label`;
  const helpId = q.help ? `${uid}-help` : undefined;
  const props: InputProps = { q, value, onChange, disabled, invalid, labelId, helpId };

  return (
    <div
      id={`tq-${q.id}`}
      className={cn(
        "scroll-mt-28 rounded-2xl p-4 transition-[background-color,box-shadow] sm:p-5",
        invalid && "bg-brand-magenta/5 ring-2 ring-brand-magenta/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex shrink-0 rounded-lg bg-brand-navy px-2 py-0.5 text-xs font-bold tabular-nums text-brand-yellow">
          {q.code}
        </span>
        <div className="min-w-0 flex-1">
          <p id={labelId} className="font-semibold text-brand-navy">
            {q.text}
            {required && (
              <>
                <span className="text-brand-magenta" aria-hidden>
                  {" "}
                  *
                </span>
                <span className="sr-only"> (bắt buộc)</span>
              </>
            )}
          </p>
          {q.help && (
            <p id={helpId} className="mt-1 text-xs text-brand-navy/55">
              {q.help}
            </p>
          )}
          <div className="mt-3">
            <AnswerInput {...props} />
          </div>
          {children}
          {invalid && <p className="mt-2 text-xs font-semibold text-brand-magenta">Câu này bắt buộc — trả lời trước khi nộp.</p>}
        </div>
      </div>
    </div>
  );
}

function AnswerInput(props: InputProps) {
  const { q, value, onChange, disabled, invalid, labelId, helpId } = props;
  switch (q.type) {
    case "number":
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={value == null ? "" : String(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="0"
            aria-labelledby={labelId}
            aria-describedby={helpId}
            aria-invalid={invalid || undefined}
            className={cn(fieldClass, "w-36 tabular-nums")}
          />
          {q.key === "play_hours" && <span className="text-sm text-brand-navy/60">giờ</span>}
        </div>
      );
    case "short_text":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          maxLength={4000}
          onChange={(e) => onChange(e.target.value)}
          aria-labelledby={labelId}
          aria-describedby={helpId}
          aria-invalid={invalid || undefined}
          className={fieldClass}
        />
      );
    case "long_text":
      return <AutoTextarea {...props} />;
    case "scale":
      return <ScaleInput {...props} />;
    case "yes_no":
      return (
        <div role="radiogroup" aria-labelledby={labelId} aria-describedby={helpId} className="grid grid-cols-2 gap-2 sm:max-w-xs">
          {(
            [
              ["yes", "Có", Check],
              ["no", "Không", X],
            ] as const
          ).map(([v, label, Icon]) => {
            const on = value === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onChange(v)}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
                  on
                    ? "border-brand-navy bg-brand-navy text-brand-yellow"
                    : "border-brand-navy/15 bg-white text-brand-navy enabled:hover:border-brand-violet enabled:hover:bg-brand-lavender/30",
                  disabled && !on && "opacity-50",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>
      );
    case "single":
    case "multiple":
      return <ChoiceList {...props} />;
    case "file":
      return <LinkList {...props} />;
    default:
      return null;
  }
}

function AutoTextarea({ value, onChange, disabled, invalid, labelId, helpId }: InputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = typeof value === "string" ? value : "";
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);
  return (
    <textarea
      ref={ref}
      rows={3}
      value={text}
      disabled={disabled}
      maxLength={4000}
      onChange={(e) => onChange(e.target.value)}
      aria-labelledby={labelId}
      aria-describedby={helpId}
      aria-invalid={invalid || undefined}
      className={cn(fieldClass, "min-h-24 resize-none overflow-hidden")}
    />
  );
}

function ScaleInput({ q, value, onChange, disabled, labelId, helpId }: InputProps) {
  const min = q.scaleMin ?? 1;
  const max = Math.max(min, q.scaleMax ?? 5);
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const selected = value == null || value === "" ? null : Number(value);
  return (
    <div className="w-full sm:inline-block sm:w-auto">
      <div role="radiogroup" aria-labelledby={labelId} aria-describedby={helpId} className="flex gap-1.5 sm:gap-2">
        {nums.map((n) => {
          const on = selected === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${n}${n === min && q.minLabel ? ` – ${q.minLabel}` : ""}${n === max && q.maxLabel ? ` – ${q.maxLabel}` : ""}`}
              disabled={disabled}
              onClick={() => onChange(n)}
              className={cn(
                "h-11 min-w-0 flex-1 rounded-xl border text-base font-bold tabular-nums transition-colors sm:w-14 sm:flex-none",
                on
                  ? "border-brand-navy bg-brand-navy text-brand-yellow"
                  : "border-brand-navy/15 bg-white text-brand-navy enabled:hover:border-brand-violet enabled:hover:bg-brand-lavender/30",
                disabled && !on && "opacity-50",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(q.minLabel || q.maxLabel) && (
        <div className="mt-1.5 flex justify-between gap-4 text-xs text-brand-navy/55" aria-hidden>
          <span>{q.minLabel}</span>
          <span className="text-right">{q.maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function ChoiceList({ q, value, onChange, disabled, labelId, helpId }: InputProps) {
  const multiple = q.type === "multiple";
  const options = q.options ?? [];
  const selected = multiple ? (Array.isArray(value) ? value : []) : typeof value === "string" ? [value] : [];
  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-labelledby={labelId}
      aria-describedby={helpId}
      className={cn("grid gap-2", options.length > 6 && "sm:grid-cols-2")}
    >
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            disabled={disabled}
            onClick={() => {
              if (!multiple) onChange(o);
              else onChange(on ? selected.filter((x) => x !== o) : [...selected, o]);
            }}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
              on ? "border-brand-violet bg-brand-lavender/40" : "border-brand-navy/12 bg-white enabled:hover:bg-[#f5f4ff]",
              disabled && !on && "opacity-50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center border",
                multiple ? "rounded" : "rounded-full",
                on ? "border-brand-violet bg-brand-violet text-white" : "border-brand-navy/30",
              )}
            >
              {on && <Check className="h-3 w-3" />}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function LinkList({ value, onChange, disabled, labelId }: InputProps) {
  const rows = linkRows(value);
  if (disabled) {
    const links = rows.map((s) => s.trim()).filter(Boolean);
    if (links.length === 0) return <p className="text-sm text-brand-navy/50">Không có link.</p>;
    return (
      <ul className="space-y-1.5 text-sm">
        {links.map((l, i) => (
          <li key={i} className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 shrink-0 text-brand-violet" />
            <a href={l} target="_blank" rel="noreferrer" className="break-all text-brand-violet underline underline-offset-2">
              {l}
            </a>
          </li>
        ))}
      </ul>
    );
  }
  const list = rows.length > 0 ? rows : [""];
  return (
    <div className="space-y-2">
      {list.map((v, i) => (
        <div key={i}>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0 text-brand-navy/40" />
            <input
              type="url"
              inputMode="url"
              value={v}
              onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="https://drive.google.com/… hoặc https://youtu.be/…"
              aria-labelledby={labelId}
              className={fieldClass}
            />
            {(list.length > 1 || v) && (
              <button
                type="button"
                aria-label="Xoá link"
                onClick={() => onChange(list.filter((_, j) => j !== i))}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-navy/50 transition-colors hover:bg-brand-magenta/10 hover:text-brand-magenta"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          {v.trim() && !isLink(v) && <p className="ml-6 mt-1 text-xs text-brand-magenta">Link cần bắt đầu bằng http:// hoặc https://</p>}
        </div>
      ))}
      {list.length < 10 && (
        <button
          type="button"
          onClick={() => onChange([...list, ""])}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-violet hover:underline"
        >
          <Plus className="h-4 w-4" /> Thêm link
        </button>
      )}
    </div>
  );
}
