import { Fragment, useEffect, useEffectEvent, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, History, Loader2, Lock, PartyPopper, Save, Send, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { TesterApiError } from "@/tester/api";
import PageHero, { PageBody } from "@/tester/components/PageHero";
import Reveal from "@/tester/components/Reveal";
import { card, ctaYellow, ghostOnDark, ghostOnLight } from "@/tester/components/styles";
import { testGameApi } from "../api";
import { viDate } from "../labels";
import type { AnswerValue, Answers, TesterSurveyForm, TesterTestGame } from "../types";
import EvidenceUploader from "./EvidenceUploader";
import FootageUploader from "./FootageUploader";
import QuestionField from "./QuestionField";
import { LoadError, ReviewResult } from "./ui";
import { useUploadQueue } from "./useUploadQueue";
import {
  clearDraft,
  countdownText,
  errorIssues,
  errorText,
  evidenceAnchor,
  groupQuestions,
  isAnswered,
  isRequired,
  isVisible,
  readDraft,
  testPath,
  toPayload,
  viTime,
  writeDraft,
} from "./utils";

const AUTO_SAVE_MS = 60_000;
const EVIDENCE_ISSUE = "Ảnh bằng chứng: cần ít nhất 1 ảnh có UID và level / tiến trình";

export default function TesterTestSurvey() {
  const { id = "" } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["testgame-survey", id],
    queryFn: () => testGameApi.survey(id),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
    retry: (count, err) => !(err instanceof TesterApiError) && count < 2,
  });

  const back = (
    <Link to={testPath(id)} className={ghostOnDark}>
      <ArrowLeft className="h-4 w-4" /> Về đợt test
    </Link>
  );

  if (query.isLoading) {
    return (
      <PageHero title="Questionnaire" actions={back}>
        <Loader2 className="mt-6 h-6 w-6 animate-spin text-white/80" />
      </PageHero>
    );
  }
  const form = query.data;
  if (!form) {
    return (
      <>
        <PageHero title="Questionnaire" actions={back} />
        <PageBody>
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        </PageBody>
      </>
    );
  }

  const t = form.assignment;
  const c = t.campaign;
  const subtitle = [
    "Questionnaire đánh giá sau khi chơi",
    c.endDate ? `Hạn nộp ${viDate(c.endDate)}${form.editable ? ` (${countdownText(c.endDate)})` : ""}` : null,
    `Khối lượng ${t.hours} giờ`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHero title={c.gameName} subtitle={subtitle} actions={back} />
      <PageBody>
        {!form.open && t.status !== "submitted" ? <ClosedNotice t={t} locked={form.locked} /> : <SurveyEditor key={id} id={id} form={form} />}
      </PageBody>
    </>
  );
}

function ClosedNotice({ t, locked }: { t: TesterTestGame; locked: boolean }) {
  const { title, text } = locked
    ? { title: "Questionnaire đã đóng", text: "Report của đợt test đã chốt — không nhận bài nữa." }
    : t.status === "confirmed"
      ? {
          title: "Questionnaire chưa mở",
          text: `Questionnaire mở khi đợt test bắt đầu${t.campaign.startDate ? ` ngày ${viDate(t.campaign.startDate)}` : ""}. Trong lúc chờ, hãy cài game theo hướng dẫn.`,
        }
      : t.canRespond
        ? { title: "Bạn chưa xác nhận tham gia", text: "Xác nhận tham gia đợt test trước — questionnaire mở khi đợt test bắt đầu." }
        : t.nextAction.key === "closed"
          ? { title: "Đã đóng nhận bài", text: "Đợt test đã kết thúc nhận questionnaire." }
          : { title: "Questionnaire chưa mở", text: t.nextAction.label || "Questionnaire chưa mở cho bạn." };
  return (
    <div className={cn(card, "mx-auto max-w-2xl space-y-4 p-6 text-center sm:p-8")}>
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy text-brand-yellow">
        <Lock className="h-7 w-7" />
      </span>
      <h2 className="tp-display text-2xl font-bold text-brand-navy">{title}</h2>
      <p className="text-brand-navy/70">{text}</p>
      <Link to={testPath(t.id)} className={cn(ctaYellow, "px-6 py-2.5 text-sm")}>
        Về trang đợt test
      </Link>
    </div>
  );
}

function focusTarget(target: string) {
  const el = document.getElementById(`tq-${target}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.querySelector<HTMLElement>("input:not([type=file]), textarea, button")?.focus({ preventScroll: true });
}

function SurveyEditor({ id, form }: { id: string; form: TesterSurveyForm }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const t = form.assignment;
  const { questions, editable } = form;
  const surveyKey = ["testgame-survey", id];

  const [initial] = useState((): { answers: Answers; restoredAt: number | null } => {
    const local = editable ? readDraft(id) : null;
    const submittedAt = t.submittedAt ? Date.parse(t.submittedAt) : 0;
    if (local && local.savedAt > submittedAt) return { answers: local.answers, restoredAt: local.savedAt };
    return { answers: form.answers ?? {}, restoredAt: null };
  });
  const [answers, setAnswers] = useState<Answers>(initial.answers);
  const [restoredAt, setRestoredAt] = useState(initial.restoredAt);
  const [dirty, setDirty] = useState(initial.restoredAt != null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [autoSaveFailed, setAutoSaveFailed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; issues: string[] } | null>(null);
  const [done, setDone] = useState(false);
  const version = useRef(0);

  const patchForm = (fn: (f: TesterSurveyForm) => TesterSurveyForm) =>
    queryClient.setQueryData<TesterSurveyForm>(surveyKey, (old) => (old ? fn(old) : old));
  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: surveyKey });
    void queryClient.invalidateQueries({ queryKey: ["testgame-test", id] });
    void queryClient.invalidateQueries({ queryKey: ["testgame-tests"] });
  };

  const evidenceQueue = useUploadQueue(id, "evidence", (file) => {
    patchForm((old) => (old.evidence.some((f) => f.id === file.id) ? old : { ...old, evidence: [...old.evidence, file] }));
    refreshAll();
  });
  const footageQueue = useUploadQueue(id, "footage", (file) => {
    patchForm((old) => (old.footage.some((f) => f.id === file.id) ? old : { ...old, footage: [...old.footage, file] }));
    refreshAll();
  });
  const removeFile = useMutation({
    mutationFn: (fileId: string) => testGameApi.deleteFile(fileId),
    onSuccess: (_res, fileId) => {
      patchForm((old) => ({
        ...old,
        evidence: old.evidence.filter((f) => f.id !== fileId),
        footage: old.footage.filter((f) => f.id !== fileId),
      }));
      refreshAll();
    },
    onError: (err) => toast.error(errorText(err, "Không xoá được tệp")),
  });
  const deletingId = removeFile.isPending ? (removeFile.variables ?? null) : null;

  const saveDraft = useMutation({
    mutationFn: (v: { answers: Answers; version: number; auto: boolean }) =>
      testGameApi.saveSurvey(id, toPayload(questions, v.answers), false),
    onSuccess: (next, v) => {
      queryClient.setQueryData(surveyKey, next);
      setSavedAt(Date.now());
      setAutoSaveFailed(false);
      if (v.version === version.current) {
        setDirty(false);
        setRestoredAt(null);
        clearDraft(id);
      }
      if (!v.auto) toast.success("Đã lưu nháp");
    },
    onError: (err, v) => {
      if (v.auto) setAutoSaveFailed(true);
      else toast.error(errorText(err, "Không lưu được nháp"));
    },
  });

  const submit = useMutation({
    mutationFn: (v: { answers: Answers; version: number }) => testGameApi.saveSurvey(id, toPayload(questions, v.answers), true),
    onSuccess: (next, v) => {
      queryClient.setQueryData(surveyKey, next);
      if (v.version === version.current) {
        setDirty(false);
        clearDraft(id);
      }
      setRestoredAt(null);
      setSavedAt(Date.now());
      setShowErrors(false);
      setServerError(null);
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ["testgame-tests"] });
      void queryClient.invalidateQueries({ queryKey: ["testgame-test", id] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => setServerError({ message: errorText(err, "Không nộp được bài"), issues: errorIssues(err) }),
  });

  useEffect(() => {
    if (serverError) document.getElementById("survey-errors")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [serverError]);

  const setAnswer = (qid: string, value: AnswerValue) => {
    version.current += 1;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    setDirty(true);
  };

  const discardLocal = () => {
    version.current += 1;
    setAnswers(form.answers ?? {});
    clearDraft(id);
    setDirty(false);
    setRestoredAt(null);
  };

  useEffect(() => {
    if (!dirty || !editable) return;
    const timer = window.setTimeout(() => writeDraft(id, answers), 800);
    return () => window.clearTimeout(timer);
  }, [answers, dirty, editable, id]);

  const autoSave = useEffectEvent(() => {
    if (dirty && editable && !saveDraft.isPending && !submit.isPending) {
      saveDraft.mutate({ answers, version: version.current, auto: true });
    }
  });
  useEffect(() => {
    const timer = window.setInterval(() => autoSave(), AUTO_SAVE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const flushDraft = useEffectEvent(() => {
    if (dirty && editable) writeDraft(id, answers);
  });
  useEffect(() => () => flushDraft(), []);
  useEffect(() => {
    if (!dirty || !editable) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      flushDraft();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty, editable]);

  if (done) return <SubmittedScreen t={t} onReview={() => setDone(false)} />;

  const footageRequired = t.campaign.footageRequired;
  const visible = questions.filter((q) => isVisible(q, questions, answers));
  const groups = groupQuestions(visible, form.tags);
  const anchor = evidenceAnchor(visible);
  const footageHost = (visible.find((q) => q.key === "footage") ?? visible.find((q) => q.type === "file"))?.id ?? null;
  const hasEvidence = form.evidence.length > 0;

  const missing: Array<{ target: string; label: string }> = [];
  const evidenceMissing = { target: "evidence", label: EVIDENCE_ISSUE };
  if (anchor == null && !hasEvidence) missing.push(evidenceMissing);
  let requiredCount = 1;
  for (const q of visible) {
    if (isRequired(q, footageRequired)) {
      requiredCount += 1;
      if (!isAnswered(q, answers[q.id] ?? null, form.footage.length)) missing.push({ target: q.id, label: `${q.code}: ${q.text}` });
    }
    if (q.id === anchor && !hasEvidence) missing.push(evidenceMissing);
  }
  const missingIds = new Set(missing.map((m) => m.target));
  const answeredCount = requiredCount - missing.length;
  const pct = Math.round((answeredCount / requiredCount) * 100);
  const uploading = evidenceQueue.uploads.length + footageQueue.uploads.length > 0;
  const busy = saveDraft.isPending || submit.isPending;

  const saveNow = () => saveDraft.mutate({ answers, version: version.current, auto: false });
  const trySubmit = () => {
    setServerError(null);
    if (missing.length > 0) {
      setShowErrors(true);
      focusTarget(missing[0]!.target);
      return;
    }
    submit.mutate({ answers, version: version.current });
  };

  const saveLabel = uploading
    ? "Đang tải tệp lên…"
    : saveDraft.isPending
      ? "Đang lưu nháp…"
      : dirty
        ? autoSaveFailed
          ? "Lưu tự động lỗi — bấm Lưu nháp"
          : "Chưa lưu lên hệ thống · nháp vẫn giữ trên máy"
        : savedAt
          ? `Đã lưu lúc ${viTime(savedAt)}`
          : "Nháp tự lưu mỗi phút";

  const evidenceBlock = (
    <EvidenceUploader
      files={form.evidence}
      uploads={evidenceQueue.uploads}
      max={form.evidenceMax}
      editable={editable}
      invalid={showErrors && !hasEvidence}
      resetsReview={t.status === "submitted"}
      deletingId={deletingId}
      onAdd={evidenceQueue.enqueue}
      onDelete={(fileId) => removeFile.mutate(fileId)}
    />
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {t.status === "submitted" && <ReviewResult t={t} showLink={!editable} />}
      {!editable && t.reviewStatus !== "approved" && (
        <div className={cn(card, "flex items-start gap-3 p-5 text-sm text-brand-navy/75")}>
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brand-violet" />
          <p>
            {form.locked ? "Report của đợt test đã chốt" : "Đợt test đã đóng nhận bài"} — bạn chỉ xem lại được bài đã nộp, không sửa
            được nữa.
          </p>
        </div>
      )}
      {editable && t.status === "submitted" && t.reviewStatus !== "rejected" && (
        <p className="px-2 text-sm text-brand-navy/60">Bạn vẫn có thể sửa và nộp lại trước khi bài được duyệt.</p>
      )}
      {editable && t.status !== "submitted" && (
        <div className={cn(card, "p-5 text-sm text-brand-navy/75")}>
          Trả lời theo trải nghiệm thật sau khi chơi. Câu có dấu <span className="font-semibold text-brand-magenta">*</span> là bắt
          buộc. Nháp tự giữ trên máy này và lưu lên hệ thống mỗi phút.
        </div>
      )}

      {editable && restoredAt != null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-brand-lavender/45 px-5 py-4 text-sm text-brand-navy ring-1 ring-brand-lavender">
          <p className="flex items-center gap-2">
            <History className="h-4 w-4 shrink-0 text-brand-violet" />
            Đã khôi phục bản nháp lưu trên máy này lúc {viTime(restoredAt)} (chưa lưu lên hệ thống).
          </p>
          <button type="button" onClick={discardLocal} className={cn(ghostOnLight, "px-4 py-1.5 text-xs")}>
            Dùng bản trên hệ thống
          </button>
        </div>
      )}

      {anchor == null && <div className={cn(card, "p-2 sm:p-3")}>{evidenceBlock}</div>}

      {groups.map((g, gi) => (
        <section key={g.key} aria-labelledby={`sec-${g.key}`} className={cn(card, "p-2 sm:p-3")}>
          <header className="px-3 pb-1 pt-3 sm:px-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-violet">
              Phần {gi + 1}/{groups.length}
            </p>
            <h2 id={`sec-${g.key}`} className="tp-display text-2xl font-bold text-brand-navy">
              {g.title}
            </h2>
            {g.description && <p className="mt-1 text-sm text-brand-navy/55">{g.description}</p>}
          </header>
          <div className="divide-y divide-brand-navy/5">
            {g.questions.map((q) => (
              <Fragment key={q.id}>
                <QuestionField
                  q={q}
                  value={answers[q.id] ?? null}
                  onChange={(v) => setAnswer(q.id, v)}
                  required={isRequired(q, footageRequired)}
                  disabled={!editable}
                  invalid={showErrors && missingIds.has(q.id)}
                >
                  {q.id === footageHost && (
                    <FootageUploader
                      files={form.footage}
                      uploads={footageQueue.uploads}
                      maxMb={form.footageMaxMb}
                      editable={editable}
                      deletingId={deletingId}
                      onAdd={footageQueue.enqueue}
                      onDelete={(fileId) => removeFile.mutate(fileId)}
                    />
                  )}
                </QuestionField>
                {q.id === anchor && <div className="p-2 sm:p-3">{evidenceBlock}</div>}
              </Fragment>
            ))}
          </div>
        </section>
      ))}

      {showErrors && missing.length > 0 ? (
        <div id="survey-errors" role="alert" className="rounded-[1.75rem] border-2 border-brand-magenta/40 bg-white p-5 text-brand-navy">
          <p className="flex items-center gap-2 font-semibold text-brand-magenta">
            <TriangleAlert className="h-5 w-5 shrink-0" /> Còn {missing.length} mục bắt buộc chưa hoàn thành
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {missing.map((m) => (
              <li key={m.target}>
                <button
                  type="button"
                  onClick={() => focusTarget(m.target)}
                  className="text-left text-brand-navy/80 underline-offset-2 hover:text-brand-violet hover:underline"
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : serverError ? (
        <div id="survey-errors" role="alert" className="rounded-[1.75rem] border-2 border-brand-magenta/40 bg-white p-5 text-brand-navy">
          <p className="flex items-center gap-2 font-semibold text-brand-magenta">
            <TriangleAlert className="h-5 w-5 shrink-0" /> {serverError.message}
          </p>
          {serverError.issues.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-brand-navy/80">
              {serverError.issues.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {editable && (
        <div className="sticky bottom-0 z-30 -mx-5 border-t border-brand-navy/10 bg-white/95 px-5 py-3 backdrop-blur md:bottom-4 md:mx-0 md:rounded-full md:border md:px-6 md:shadow-[0_18px_40px_-20px_rgb(9_2_107/0.45)]">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-xs font-semibold text-brand-navy/70">
                <span className={cn("tabular-nums", showErrors && missing.length > 0 && "text-brand-magenta")}>
                  {answeredCount}/{requiredCount} mục bắt buộc
                </span>
                <span className="hidden truncate font-normal text-brand-navy/55 sm:inline" aria-live="polite">
                  {saveLabel}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Tiến độ trả lời câu bắt buộc"
                aria-valuemin={0}
                aria-valuemax={requiredCount}
                aria-valuenow={answeredCount}
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-navy/10"
              >
                <div
                  className={cn("h-full rounded-full transition-[width] duration-500", pct >= 100 ? "bg-brand-mint" : "bg-brand-violet")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 truncate text-[11px] text-brand-navy/55 sm:hidden">{saveLabel}</p>
            </div>
            <button type="button" onClick={saveNow} disabled={busy} aria-label="Lưu nháp" className={cn(ghostOnLight, "px-3 py-2 sm:px-4")}>
              {saveDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Lưu nháp</span>
            </button>
            <button
              type="button"
              onClick={trySubmit}
              disabled={busy || uploading}
              className={cn(ctaYellow, "shrink-0 px-4 py-2 text-sm sm:px-5")}
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t.status === "submitted" ? "Nộp lại" : "Nộp bài"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmittedScreen({ t, onReview }: { t: TesterTestGame; onReview: () => void }) {
  return (
    <Reveal className={cn(card, "mx-auto max-w-2xl space-y-5 p-6 text-center sm:p-10")}>
      <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-mint text-brand-navy">
        <PartyPopper className="h-8 w-8" />
      </span>
      <h2 className="tp-display text-3xl font-bold text-brand-navy">Đã nộp — đang chờ duyệt</h2>
      <p className="text-brand-navy/70">
        AI đang kiểm tra ảnh bằng chứng (trùng với người khác, ảnh cũ, tiến độ so với số giờ test), sau đó admin sẽ duyệt. Khi được
        duyệt, {t.hours} giờ test được cộng vào hồ sơ để đổi benefit.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to={testPath(t.id)} className={cn(ctaYellow, "px-6 py-2.5 text-sm")}>
          Về trang đợt test
        </Link>
        <button type="button" onClick={onReview} className={ghostOnLight}>
          Xem lại bài đã nộp
        </button>
      </div>
    </Reveal>
  );
}
