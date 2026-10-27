import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { testerApi, TesterApiError } from "../api";
import type { SurveyAnswers, SurveyQuestion } from "../types";
import PageHero, { PageBody } from "../components/PageHero";
import { card, ctaYellow, ghostOnDark, ghostOnLight } from "../components/styles";
import {
  EMPTY_ROW,
  STEPS,
  parseRows,
  questionErrors,
  serializeRows,
  splitExample,
  stepOf,
  values,
  visibleNumbers,
  type GameRow,
} from "../survey-logic";

export default function TesterSurvey() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useQuery({ queryKey: ["tester-survey"], queryFn: testerApi.survey });
  const me = useQuery({ queryKey: ["tester-me"], queryFn: testerApi.me });
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [prefilled, setPrefilled] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prefilled || !form.data || !me.data) return;
    if (me.data.answers) {
      setAnswers(me.data.answers);
    } else {
      const nameQ = form.data.questions.find((q) => q.semanticKey === "name");
      if (nameQ && me.data.user.name) setAnswers({ [nameQ.code]: me.data.user.name });
    }
    setPrefilled(true);
  }, [form.data, me.data, prefilled]);

  const visible = useMemo(() => (form.data ? visibleNumbers(form.data, answers) : new Set<number>()), [form.data, answers]);
  const stepQuestions = useMemo(() => {
    const id = STEPS[step]!.id;
    return (form.data?.questions ?? []).filter((q) => stepOf(q) === id && visible.has(q.number));
  }, [form.data, step, visible]);

  const setAnswer = (code: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [code]: value }));
    setErrors((prev) => {
      if (!prev[code]) return prev;
      const next = { ...prev };
      delete next[code];
      return next;
    });
  };

  const goNext = () => {
    const errs = questionErrors(stepQuestions, answers, visible);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      document.getElementById(`q-${Object.keys(errs)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!form.data) return;
    const all = form.data.questions;
    const errs = questionErrors(all, answers, visible);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = all.find((q) => errs[q.code]);
      if (first) setStep(STEPS.findIndex((s) => s.id === stepOf(first)));
      toast.error("Còn câu bắt buộc chưa trả lời");
      return;
    }
    const payload: SurveyAnswers = {};
    for (const [key, value] of Object.entries(answers)) {
      const number = Number(key.match(/^Q(\d+)/)?.[1]);
      if (visible.has(number)) payload[key] = value;
    }
    setSubmitting(true);
    try {
      await testerApi.submitSurvey(payload, startedAt);
      await queryClient.invalidateQueries({ queryKey: ["tester-me"] });
      toast.success("Đã lưu hồ sơ. Hệ thống đang chấm điểm theo dòng game, vài phút sau sẽ có kết quả.");
      navigate("/tester/profile");
    } catch (err) {
      if (err instanceof TesterApiError && err.issues.length > 0) toast.error(err.issues.join(" · "));
      else toast.error(err instanceof Error ? err.message : "Không lưu được bảng hỏi");
    } finally {
      setSubmitting(false);
    }
  };

  const backToProfile = (
    <Link to="/tester/profile" className={ghostOnDark}>
      <ArrowLeft className="h-4 w-4" />
      Về hồ sơ
    </Link>
  );

  if (form.isLoading || me.isLoading) {
    return (
      <PageHero title="Khảo sát hồ sơ tester" actions={backToProfile}>
        <Loader2 className="mt-6 h-6 w-6 animate-spin text-white/80" />
      </PageHero>
    );
  }
  if (form.error || !form.data) {
    return (
      <>
        <PageHero title="Khảo sát hồ sơ tester" actions={backToProfile} />
        <PageBody>
          <p className={cn(card, "p-6 text-brand-magenta")}>Không tải được bảng hỏi. Thử tải lại trang.</p>
        </PageBody>
      </>
    );
  }

  const last = step === STEPS.length - 1;

  return (
    <>
      <PageHero title={form.data.title} subtitle={form.data.introduction} actions={backToProfile} />
      <PageBody>
        <div className="mx-auto max-w-3xl space-y-6">
          <ol className="grid grid-cols-3 gap-2 sm:gap-3">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "h-full w-full rounded-2xl border bg-white px-3 py-3 text-left text-sm transition-[box-shadow,border-color] sm:px-4",
                    i === step
                      ? "border-brand-violet shadow-[0_16px_32px_-20px_rgb(58_32_179/0.6)] ring-1 ring-brand-violet/30"
                      : "border-brand-navy/10",
                    i < step ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      i < step
                        ? "bg-brand-mint text-brand-navy"
                        : i === step
                          ? "bg-brand-navy text-brand-yellow"
                          : "bg-[#f5f4ff] text-brand-navy/50",
                    )}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="font-semibold text-brand-navy">{s.title}</span>
                  <span className="mt-1 hidden text-xs text-brand-navy/55 sm:block">{s.description}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="space-y-4">
            {stepQuestions.map((q) => (
              <QuestionCard key={q.code} q={q} answers={answers} error={errors[q.code]} onChange={setAnswer} />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={ghostOnLight}
            >
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
            {last ? (
              <button type="button" disabled={submitting} onClick={() => void submit()} className={cn(ctaYellow, "px-6 py-2.5 text-sm")}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Đang lưu…" : "Gửi khảo sát"}
              </button>
            ) : (
              <button type="button" onClick={goNext} className={cn(ctaYellow, "px-6 py-2.5 text-sm")}>
                Tiếp tục <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function QuestionCard({
  q,
  answers,
  error,
  onChange,
}: {
  q: SurveyQuestion;
  answers: SurveyAnswers;
  error?: string;
  onChange: (code: string, value: string | string[]) => void;
}) {
  const { title, example } = splitExample(q.text);
  const gameRows = q.semanticKey === "genre_detail" || q.semanticKey === "other_games";
  return (
    <section
      id={`q-${q.code}`}
      className={cn(card, "scroll-mt-24 p-5 sm:p-6", error && "border-brand-magenta/60 ring-1 ring-brand-magenta/30")}
    >
      <p className="font-semibold text-brand-navy">
        {title}
        {q.mustAnswer && <span className="text-destructive"> *</span>}
      </p>
      {example && <p className="mt-1 text-xs text-muted-foreground">Ví dụ: {example}</p>}
      <div className="mt-3">
        {gameRows ? (
          <GameRowsInput q={q} answers={answers} onChange={onChange} />
        ) : q.type === "single" || q.type === "multiple" ? (
          <ChoiceInput q={q} answers={answers} onChange={onChange} />
        ) : q.type === "text_multiple" ? (
          <textarea
            value={values(answers[q.code]).join("\n")}
            onChange={(e) => onChange(q.code, e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        ) : (
          <input
            type={q.type === "text_num" ? "number" : "text"}
            value={values(answers[q.code])[0] ?? ""}
            onChange={(e) => onChange(q.code, e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}

function ChoiceInput({
  q,
  answers,
  onChange,
}: {
  q: SurveyQuestion;
  answers: SurveyAnswers;
  onChange: (code: string, value: string | string[]) => void;
}) {
  const selected = values(answers[q.code]);
  const multiple = q.type === "multiple";
  const toggle = (value: string) => {
    if (!multiple) onChange(q.code, value);
    else onChange(q.code, selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };
  const otherSelected = q.options.some((o) => o.textInput && selected.includes(o.value));
  return (
    <div className="space-y-2">
      <div className={cn("grid gap-2", q.options.length > 6 ? "sm:grid-cols-2" : "")}>
        {q.options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.order}
              type="button"
              onClick={() => toggle(o.value)}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                on ? "border-brand-violet bg-brand-lavender/40" : "border-border hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center border",
                  multiple ? "rounded" : "rounded-full",
                  on ? "border-brand-violet bg-brand-violet text-white" : "border-muted-foreground/40",
                )}
              >
                {on && <Check className="h-3 w-3" />}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      {otherSelected && (
        <input
          type="text"
          placeholder="Ghi rõ lựa chọn khác"
          value={values(answers[`${q.code}__other`])[0] ?? ""}
          onChange={(e) => onChange(`${q.code}__other`, e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}

function GameRowsInput({
  q,
  answers,
  onChange,
}: {
  q: SurveyQuestion;
  answers: SurveyAnswers;
  onChange: (code: string, value: string | string[]) => void;
}) {
  const parsed = parseRows(answers[`${q.code}__rows`], answers[q.code]);
  const [freeText, setFreeText] = useState(parsed === null);
  const rows: GameRow[] = parsed && parsed.length > 0 ? parsed : [{ ...EMPTY_ROW }];

  const update = (next: GameRow[]) => {
    onChange(q.code, serializeRows(next));
    onChange(`${q.code}__rows`, JSON.stringify(next));
  };

  if (freeText) {
    return (
      <div className="space-y-2">
        <textarea
          value={values(answers[q.code]).join("\n")}
          onChange={(e) => {
            onChange(q.code, e.target.value);
            onChange(`${q.code}__rows`, "");
          }}
          rows={4}
          placeholder="- Tên game - 200 giờ - Rank"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button type="button" onClick={() => setFreeText(false)} className="text-xs text-brand-violet hover:underline">
          Nhập theo từng dòng
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <input
            value={row.game}
            onChange={(e) => update(rows.map((r, j) => (j === i ? { ...r, game: e.target.value } : r)))}
            placeholder="Tên game"
            className="col-span-12 rounded-lg border border-border px-3 py-2 text-sm sm:col-span-5"
          />
          <input
            value={row.amount}
            inputMode="numeric"
            onChange={(e) => update(rows.map((r, j) => (j === i ? { ...r, amount: e.target.value.replace(/[^\d]/g, "") } : r)))}
            placeholder="Số"
            className="col-span-4 rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={row.unit}
            onChange={(e) => update(rows.map((r, j) => (j === i ? { ...r, unit: e.target.value as GameRow["unit"] } : r)))}
            className="col-span-3 rounded-lg border border-border px-2 py-2 text-sm sm:col-span-2"
          >
            <option value="giờ">giờ</option>
            <option value="trận">trận</option>
          </select>
          <input
            value={row.rank}
            onChange={(e) => update(rows.map((r, j) => (j === i ? { ...r, rank: e.target.value } : r)))}
            placeholder="Rank / cấp độ (nếu có)"
            className="col-span-4 rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
          />
          <button
            type="button"
            aria-label="Xóa dòng"
            onClick={() => update(rows.filter((_, j) => j !== i))}
            className="col-span-1 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => update([...rows, { ...EMPTY_ROW }])}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-violet hover:underline"
        >
          <Plus className="h-4 w-4" /> Thêm game
        </button>
        <button type="button" onClick={() => setFreeText(true)} className="text-xs text-muted-foreground hover:underline">
          Nhập tự do
        </button>
      </div>
    </div>
  );
}
