import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Pencil, RotateCcw, Save, TriangleAlert } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary } from "@/lib/button-classes";
import { testGameAdminApi } from "../api";
import { MAIL_LABEL, viDateTime } from "../labels";
import type { KeyLabel, MailTemplate, TestGameSettings } from "../types";
import { useUnsavedWarning } from "./templates-model";
import { hourLabel, mailTiming } from "./settings-model";

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm";
const th = "whitespace-nowrap px-4 py-3 font-medium";

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export default function MailTemplatesSection({ settings }: { settings: TestGameSettings | undefined }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const mails = useQuery({ queryKey: ["testgame-mail-templates"], queryFn: testGameAdminApi.mailTemplates });
  const meta = useQuery({ queryKey: ["testgame-meta"], queryFn: testGameAdminApi.meta });
  const [editing, setEditing] = useState<MailTemplate | null>(null);

  const toggle = useMutation({
    mutationFn: (v: { code: string; enabled: boolean }) => testGameAdminApi.saveMailTemplate(v.code, { enabled: v.enabled }),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: ["testgame-mail-templates"] });
      const prev = queryClient.getQueryData<MailTemplate[]>(["testgame-mail-templates"]);
      queryClient.setQueryData<MailTemplate[]>(["testgame-mail-templates"], (old) =>
        old?.map((m) => (m.code === v.code ? { ...m, enabled: v.enabled } : m)),
      );
      return { prev };
    },
    onSuccess: (m) => toast.success(`${m.code} ${m.enabled ? "đã bật" : "đã tắt — mốc này sẽ không được gửi"}`),
    onError: (err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["testgame-mail-templates"], ctx.prev);
      toast.error(errorText(err, "Không cập nhật được mẫu mail"));
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["testgame-mail-templates"] }),
  });

  const list = mails.data ?? [];

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Bot gửi mail tự động mỗi ngày lúc {hourLabel(settings?.sendHour ?? 9)} (giờ Việt Nam). Tắt một mẫu thì mốc đó không được gửi, kể
        cả khi bấm gửi lại. Sửa mẫu áp dụng cho các lần gửi sau.
      </p>
      <div className="overflow-hidden rounded-xl border border-border">
        {mails.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : mails.error ? (
          <p className="py-12 text-center text-sm text-destructive">{errorText(mails.error, "Không tải được mẫu mail")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {["Mốc", "Mẫu mail", "Thời điểm gửi", "Bật", "Phiên bản", "Cập nhật", ""].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((m) => (
                  <tr key={m.code} className={cn("align-top transition-colors hover:bg-muted/30", !m.enabled && "text-muted-foreground")}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{m.code}</td>
                    <td className="max-w-sm px-4 py-3">
                      <p className="font-medium">{m.name || MAIL_LABEL[m.code]}</p>
                      <p className="truncate text-xs text-muted-foreground" title={m.subject}>
                        {m.subject}
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs">{mailTiming(m.code, settings)}</td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={m.enabled}
                        disabled={toggle.isPending && toggle.variables?.code === m.code}
                        label={`Bật ${m.code}`}
                        onChange={(enabled) => toggle.mutate({ code: m.code, enabled })}
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums">v{m.version}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      <p>{m.updatedBy ?? "—"}</p>
                      <p>{viDateTime(m.updatedAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setEditing(m)} className={cn(btnGhost, "px-3 py-1.5 text-xs")}>
                        <Pencil className="h-3.5 w-3.5" /> Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <MailEditor
          key={editing.code}
          mail={editing}
          params={meta.data?.mailParams ?? []}
          settings={settings}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

const PLACEHOLDER_RE = /\{\{([^}]*)\}\}/g;

function MailEditor({
  mail,
  params,
  settings,
  onClose,
}: {
  mail: MailTemplate;
  params: KeyLabel[];
  settings: TestGameSettings | undefined;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(mail);
  const [subject, setSubject] = useState(mail.subject);
  const [body, setBody] = useState(mail.body);
  const [target, setTarget] = useState<"subject" | "body">("body");
  const [debounced, setDebounced] = useState({ subject: mail.subject, body: mail.body });
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ subject, body }), 500);
    return () => clearTimeout(t);
  }, [subject, body]);

  const preview = useQuery({
    queryKey: ["testgame-mail-preview", mail.code, debounced.subject, debounced.body],
    queryFn: () => testGameAdminApi.mailPreview({ code: mail.code, subject: debounced.subject, body: debounced.body }),
    enabled: Boolean(debounced.subject.trim() && debounced.body.trim()),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const dirty = subject !== saved.subject || body !== saved.body;
  const empty = !subject.trim() || !body.trim();
  useUnsavedWarning(dirty);

  const known = new Set(params.map((p) => p.key));
  const unknown = [
    ...new Set(
      [...`${subject}\n${body}`.matchAll(PLACEHOLDER_RE)].map((m) => m[1].trim()).filter((k) => !/^[A-Z_]+$/.test(k) || !known.has(k)),
    ),
  ];

  const save = useMutation({
    mutationFn: (b: { subject?: string; body?: string; reset?: boolean }) => testGameAdminApi.saveMailTemplate(mail.code, b),
    onSuccess: (m, v) => {
      setSaved(m);
      setSubject(m.subject);
      setBody(m.body);
      void queryClient.invalidateQueries({ queryKey: ["testgame-mail-templates"] });
      toast.success(v.reset ? `Đã khôi phục ${m.code} về mặc định — v${m.version}` : `Đã lưu ${m.code} — v${m.version}`);
    },
    onError: (err) => toast.error(errorText(err, "Không lưu được mẫu mail")),
  });

  const insert = (key: string) => {
    const token = `{{ ${key} }}`;
    const el = target === "subject" ? subjectRef.current : bodyRef.current;
    const value = target === "subject" ? subject : body;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    if (target === "subject") setSubject(next);
    else setBody(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const reset = () => {
    if (!window.confirm(`Khôi phục tiêu đề và nội dung mặc định của ${mail.code}? Nội dung đang sửa sẽ mất.`)) return;
    save.mutate({ reset: true });
  };

  const close = () => {
    if (dirty && !window.confirm("Mẫu mail có thay đổi chưa lưu. Đóng và bỏ thay đổi?")) return;
    onClose();
  };

  return (
    <Drawer
      open
      onClose={close}
      size="wide"
      className="xl:max-w-6xl"
      title={`${mail.code} · ${mail.name || MAIL_LABEL[mail.code]}`}
      subtitle={`Gửi: ${mailTiming(mail.code, settings)}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            v{saved.version} · {saved.updatedBy ?? "—"} · {viDateTime(saved.updatedAt)}
            {dirty && <span className="ml-2 font-medium text-amber-700">● Có thay đổi chưa lưu</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={save.isPending} onClick={reset} className={cn(btnGhost, "px-3 py-2")}>
              <RotateCcw className="h-4 w-4" /> Khôi phục mặc định
            </button>
            <button type="button" onClick={close} className={cn(btnGhost, "px-4 py-2")}>
              Đóng
            </button>
            <button
              type="button"
              disabled={!dirty || empty || save.isPending}
              onClick={() => save.mutate({ subject, body })}
              className={cn(btnPrimary, "px-4 py-2")}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu mẫu
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-4 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">Tiêu đề *</span>
            <input
              ref={subjectRef}
              className={cn(input, !subject.trim() && "border-destructive")}
              value={subject}
              onFocus={() => setTarget("subject")}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Bấm tham số để chèn vào <span className="font-medium text-foreground">{target === "subject" ? "tiêu đề" : "nội dung"}</span>{" "}
              tại con trỏ:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {params.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(p.key)}
                  className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/15"
                >
                  {p.key}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1">
            <span className="font-medium">Nội dung *</span>
            <textarea
              ref={bodyRef}
              rows={20}
              spellCheck={false}
              className={cn(input, "resize-y font-mono text-xs leading-relaxed", !body.trim() && "border-destructive")}
              value={body}
              onFocus={() => setTarget("body")}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            <li>
              <code>**chữ đậm**</code>; dòng chỉ có <code>**Tiêu đề**</code> thành tiêu đề mục.
            </li>
            <li>
              Dòng bắt đầu bằng <code>- </code> thành gạch đầu dòng; link http(s) tự thành liên kết.
            </li>
            <li>Dòng có tham số trống (vd chưa có link cài đặt) tự bị bỏ; tiêu đề mục không còn nội dung bên dưới cũng bị bỏ.</li>
          </ul>
          {unknown.length > 0 && (
            <p className="flex gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Tham số không hỗ trợ: {unknown.map((k) => `{{ ${k} }}`).join(", ")}. Tham số phải viết hoa đúng tên trong danh sách; tham số
              lạ coi như trống nên dòng chứa nó bị bỏ khi gửi.
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-primary" /> Xem trước
            </h3>
            <span className="text-xs text-muted-foreground">
              {preview.isFetching ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : preview.data?.sample ? "Dữ liệu mẫu" : ""}
            </span>
          </div>
          {preview.error ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorText(preview.error, "Không xem trước được")}
            </p>
          ) : preview.data ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <p className="border-b border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Tiêu đề: </span>
                <span className="font-medium">{preview.data.subject}</span>
              </p>
              <iframe
                title={`Xem trước ${mail.code}`}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                srcDoc={`<base target="_blank">${preview.data.html}`}
                className="h-[32rem] w-full bg-white"
              />
            </div>
          ) : (
            <div className="flex justify-center rounded-lg border border-border py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
