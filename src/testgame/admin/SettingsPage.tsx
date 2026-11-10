import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck, CircleX, Clock, Cpu, ExternalLink, Info, Loader2, Play, RefreshCw, Save, Send, Undo2 } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary, btnSubtle } from "@/lib/button-classes";
import { TesterApiError } from "@/tester/api";
import { testGameAdminApi } from "../api";
import { viDate, viDateTime } from "../labels";
import type { BotStatus, ConfigLibraryRow, SchedulerRun, TestGameSettings } from "../types";
import MailTemplatesSection from "./settings-mail";
import {
  RANGES,
  SETTING_LABEL,
  changedSettings,
  driveFolderId,
  hourLabel,
  toDraft,
  toSettings,
  validateSettings,
  type NumKey,
  type SettingsDraft,
} from "./settings-model";
import { useUnsavedWarning } from "./templates-model";

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm";

const errorText = (err: unknown, fallback: string) => {
  if (err instanceof TesterApiError && err.issues.length > 0) return `${err.message}: ${err.issues.join(" · ")}`;
  return err instanceof Error && err.message ? err.message : fallback;
};

type SettingsData = Awaited<ReturnType<typeof testGameAdminApi.settings>>;
type Tab = "config" | "mail";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("config");
  const settings = useQuery({
    queryKey: ["testgame-settings"],
    queryFn: testGameAdminApi.settings,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const mails = useQuery({ queryKey: ["testgame-mail-templates"], queryFn: testGameAdminApi.mailTemplates });

  return (
    <div className="space-y-4">
      <Link to="/admin/test-campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Danh sách game test
      </Link>
      <Tabs
        tabs={[
          { id: "config", label: "Cấu hình" },
          { id: "mail", label: "Mẫu mail", badge: mails.data?.length },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />
      <div className={cn(tab !== "config" && "hidden")}>
        {settings.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : settings.error || !settings.data ? (
          <p className="text-sm text-destructive">{errorText(settings.error, "Không tải được cấu hình Test Game.")}</p>
        ) : (
          <SettingsForm data={settings.data} checking={settings.isFetching} onRecheck={() => void settings.refetch()} />
        )}
      </div>
      {tab === "mail" && <MailTemplatesSection settings={settings.data?.settings} />}
    </div>
  );
}

function Card({
  icon,
  title,
  description,
  actions,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="text-primary">{icon}</span>
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </label>
  );
}

function NumberInput({ value, range, error, suffix, onChange }: { value: string; range: [number, number]; error?: string; suffix?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={range[0]}
        max={range[1]}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(input, "w-24 tabular-nums", error && "border-destructive")}
      />
      {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function SettingsForm({ data, checking, onRecheck }: { data: SettingsData; checking: boolean; onRecheck: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => toDraft(data.settings));
  const [baseline, setBaseline] = useState(() => toSettings(toDraft(data.settings)));
  const [fromLink, setFromLink] = useState(false);

  const changes = changedSettings(toSettings(draft), baseline);
  const changedKeys = Object.keys(changes) as Array<keyof TestGameSettings>;
  const dirty = changedKeys.length > 0;
  const errors = validateSettings(draft);
  const errorCount = Object.keys(errors).length;
  const scheduleDirty = changedKeys.some((k) => ["sendHour", "remindAfterDays", "responseDays", "remindBeforeDays"].includes(k));
  useUnsavedWarning(dirty);

  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const num = (k: NumKey) => ({ value: draft[k], range: RANGES[k], error: errors[k], onChange: (v: string) => set(k, v) });
  const setLibrary = (index: number, field: keyof Omit<ConfigLibraryRow, "level">, value: string) =>
    set(
      "configLibrary",
      draft.configLibrary.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );

  const save = useMutation({
    mutationFn: testGameAdminApi.saveSettings,
    onSuccess: (s) => {
      const d = toDraft(s);
      setDraft(d);
      setBaseline(toSettings(d));
      setFromLink(false);
      queryClient.setQueryData<SettingsData>(["testgame-settings"], (old) => (old ? { ...old, settings: s } : old));
      toast.success("Đã lưu cấu hình Test Game");
    },
    onError: (err) => toast.error(errorText(err, "Không lưu được cấu hình")),
  });

  const run = useMutation({
    mutationFn: testGameAdminApi.runScheduler,
    onSuccess: (r) => {
      queryClient.setQueryData<SettingsData>(["testgame-settings"], (old) => (old ? { ...old, scheduler: r } : old));
      const sent = Object.values(r.mails).reduce((s, n) => s + n, 0);
      toast.success(`Đã chạy lịch: ${r.campaigns} game test, gửi ${sent} mail${r.failed > 0 ? `, ${r.failed} mail lỗi` : ""}`);
    },
    onError: (err) => toast.error(errorText(err, "Không chạy được lịch")),
  });

  const runNow = () => {
    const ok = window.confirm(
      "Chạy lịch ngay: gửi mail các mốc đến hạn hôm nay và cập nhật trạng thái game test. Lần chạy này tính là lần chạy của hôm nay nên lịch tự động sẽ không chạy lại trong ngày. Tiếp tục?",
    );
    if (ok) run.mutate();
  };

  const driveId = draft.driveRootFolderId.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <BotStatusCard bot={data.bot} checking={checking} onRecheck={onRecheck} />

        <Card
          icon={<Clock className="h-4 w-4" />}
          title="Lịch gửi tự động"
          description="BE kiểm tra mỗi giờ; tới giờ gửi thì chạy một lần trong ngày (lỡ giờ thì chạy bù)."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Giờ gửi (giờ Việt Nam)" error={errors.sendHour}>
              <select className={cn(input, "w-32")} value={draft.sendHour} onChange={(e) => set("sendHour", e.target.value)}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={String(h)}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nhắc phản hồi (M2) sau" error={errors.remindAfterDays} hint="Tính từ ngày mời, nếu tester chưa xác nhận / từ chối.">
              <NumberInput {...num("remindAfterDays")} suffix="ngày" />
            </Field>
            <Field
              label="Hạn phản hồi lời mời"
              error={errors.responseDays}
              hint="Mời trước đợt test thì hạn không quá ngày trước ngày bắt đầu; quá hạn chuyển Không phản hồi."
            >
              <NumberInput {...num("responseDays")} suffix="ngày sau khi mời" />
            </Field>
            <Field label="Nhắc trước hạn test (M5)" error={errors.remindBeforeDays} hint="Gửi cho tester chưa nộp questionnaire.">
              <NumberInput {...num("remindBeforeDays")} suffix="ngày" />
            </Field>
          </div>
          <SchedulerPanel run={data.scheduler} running={run.isPending} scheduleDirty={scheduleDirty} onRun={runNow} />
        </Card>
      </div>

      <Card icon={<Info className="h-4 w-4" />} title="Thông tin chung">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên người gửi" hint="Tên hiển thị trong hộp thư của tester.">
            <input className={input} value={draft.senderName} maxLength={80} onChange={(e) => set("senderName", e.target.value)} />
          </Field>
          <Field
            label="Email liên hệ"
            error={errors.senderEmail}
            hint={`Hiện trong chữ ký mail khi game test chưa có email người phụ trách. Mail thực tế gửi từ ${data.bot.account ?? "tài khoản bot"}.`}
          >
            <input
              type="email"
              className={cn(input, errors.senderEmail && "border-destructive")}
              value={draft.senderEmail}
              onChange={(e) => set("senderEmail", e.target.value)}
            />
          </Field>
          <Field
            label="Group SeaTalk vận hành"
            hint="Group ID nhận thông báo khi Initiate game test. Để trống thì dùng env SEATALK_TESTGAME_GROUP_ID (nếu có)."
          >
            <input className={cn(input, "font-mono")} value={draft.seatalkGroupId} onChange={(e) => set("seatalkGroupId", e.target.value)} />
          </Field>
          <Field
            label="Folder Drive gốc"
            error={errors.driveRootFolderId}
            hint={
              <>
                {fromLink && <span className="font-medium text-emerald-700">Đã lấy ID từ link. </span>}
                Folder cho từng game test được tạo tự động trong folder này và chia sẻ cho tester đã xác nhận. Folder cần thuộc
                testgame@garena.vn hoặc được chia sẻ quyền chỉnh sửa. Để trống thì dùng env TESTGAME_DRIVE_ROOT_FOLDER_ID.
              </>
            }
          >
            <div className="flex items-center gap-2">
              <input
                className={cn(input, "font-mono", errors.driveRootFolderId && "border-destructive")}
                value={draft.driveRootFolderId}
                placeholder="Dán link folder Drive hoặc ID"
                onChange={(e) => {
                  const id = driveFolderId(e.target.value);
                  set("driveRootFolderId", id);
                  setFromLink(id !== e.target.value.trim());
                }}
              />
              {driveId && !errors.driveRootFolderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${encodeURIComponent(driveId)}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Mở folder"
                  className={cn(btnGhost, "shrink-0 px-2.5 py-2")}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </Field>
          <Field label="Số ảnh bằng chứng tối đa" error={errors.evidenceMax} hint="Ảnh UID + level tester nộp kèm questionnaire.">
            <NumberInput {...num("evidenceMax")} suffix="ảnh / tester" />
          </Field>
          <Field label="Dung lượng footage tối đa" error={errors.footageMaxMb} hint="Áp dụng cho footage của tester và tệp hướng dẫn.">
            <NumberInput {...num("footageMaxMb")} suffix="MB / tệp" />
          </Field>
        </div>
      </Card>

      <Card
        icon={<Cpu className="h-4 w-4" />}
        title="Library cấu hình thiết bị"
        description="AI đối chiếu cấu hình tối thiểu / đề nghị của game với bảng này để xếp mức yêu cầu thiết bị (Rất cao → Rất thấp)."
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                {["Mức", "Android", "iOS", "PC"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {draft.configLibrary.map((r, i) => (
                <tr key={r.level} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{r.level}</td>
                  {(["android", "ios", "pc"] as const).map((f) => (
                    <td key={f} className="min-w-[14rem] px-2 py-2">
                      <textarea
                        rows={3}
                        className={cn(input, "resize-y text-xs leading-relaxed")}
                        value={r[f]}
                        onChange={(e) => setLibrary(i, f, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Ghi chip / dòng máy tiêu biểu, ngăn cách bằng dấu phẩy. Mức để trống cả ba cột sẽ bị bỏ khỏi library khi lưu.
        </p>
      </Card>

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className="min-w-0 text-sm">
          {dirty ? (
            <>
              <span className="font-medium text-amber-700">{changedKeys.length} mục chưa lưu</span>
              <span className="text-muted-foreground"> · {changedKeys.map((k) => SETTING_LABEL[k]).join(", ")}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Không có thay đổi chưa lưu</span>
          )}
          {errorCount > 0 && <span className="ml-2 font-medium text-destructive">{errorCount} ô chưa hợp lệ</span>}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => {
              setDraft(toDraft(baseline));
              setFromLink(false);
            }}
            className={cn(btnGhost, "px-3 py-2")}
          >
            <Undo2 className="h-4 w-4" /> Hoàn tác
          </button>
          <button
            type="button"
            disabled={!dirty || errorCount > 0 || save.isPending}
            onClick={() => save.mutate(changes)}
            className={cn(btnPrimary, "px-4 py-2")}
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
}

const TRANSPORT_LABEL: Record<NonNullable<BotStatus["transport"]>, string> = {
  apps_script: "Apps Script (Gmail của bot)",
  smtp: "Gmail SMTP (App Password)",
};

function StatusLine({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function BotStatusCard({ bot, checking, onRecheck }: { bot: BotStatus; checking: boolean; onRecheck: () => void }) {
  const mailOk = bot.transport != null && !(bot.transport === "apps_script" && bot.error);
  const driveOk = bot.drive;
  return (
    <Card
      icon={<Send className="h-4 w-4" />}
      title="Kết nối gửi mail & Drive"
      description="Mail tự động và folder cài đặt game do bot dưới tài khoản testgame@garena.vn xử lý."
      actions={
        <button type="button" disabled={checking} onClick={onRecheck} className={cn(btnGhost, "px-3 py-1.5 text-xs")}>
          <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} /> Kiểm tra lại
        </button>
      }
    >
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <StatusLine ok={mailOk} label="Gửi mail" value={bot.transport ? TRANSPORT_LABEL[bot.transport] : "Chưa cấu hình"} />
        <StatusLine
          ok={driveOk}
          label="Google Drive"
          value={driveOk ? "Tạo và chia sẻ folder được" : bot.transport === "smtp" ? "Không có (SMTP chỉ gửi mail)" : "Chưa kết nối"}
        />
        <div>
          <p className="text-xs text-muted-foreground">Tài khoản bot</p>
          <p className="font-medium">{bot.account ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Quota mail còn lại hôm nay</p>
          <p className="font-medium tabular-nums">{bot.quota ?? "—"}</p>
        </div>
      </div>
      {bot.error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Lỗi khi gọi Apps Script: {bot.error}
        </p>
      )}
      {(!mailOk || !driveOk) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm">
          <p className="font-medium">Cài bot Apps Script</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs">
            <li>
              Đăng nhập <span className="font-medium">testgame@garena.vn</span> → script.google.com → New project → dán toàn bộ file{" "}
              <code>be/scripts/apps-script/testgame-bot.gs</code>.
            </li>
            <li>
              Project Settings → Script Properties → thêm <code>SECRET</code> = chuỗi ngẫu nhiên dài (≥ 32 ký tự).
            </li>
            <li>
              Deploy → New deployment → Web app: Execute as <span className="font-medium">Me</span>, Who has access{" "}
              <span className="font-medium">Anyone</span>. Lần đầu chạy, cho phép quyền Gmail + Drive.
            </li>
            <li>
              Trên server BE đặt env <code>TESTGAME_APPS_SCRIPT_URL</code> = URL kết thúc bằng <code>/exec</code> và{" "}
              <code>TESTGAME_APPS_SCRIPT_SECRET</code> = SECRET ở bước 2, rồi khởi động lại BE.
            </li>
            <li>Sửa code script sau này: Deploy → Manage deployments → Edit → Version: New version (giữ nguyên URL).</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            Cách khác, chỉ gửi mail (không tạo / chia sẻ folder Drive): đặt <code>TESTGAME_SMTP_USER</code> và{" "}
            <code>TESTGAME_SMTP_PASS</code> = Gmail App Password của testgame@garena.vn (tài khoản bật 2FA nên mật khẩu thường không
            dùng được).
          </p>
        </div>
      )}
    </Card>
  );
}

function SchedulerPanel({
  run,
  running,
  scheduleDirty,
  onRun,
}: {
  run: SchedulerRun | null;
  running: boolean;
  scheduleDirty: boolean;
  onRun: () => void;
}) {
  const codes = run ? Object.keys(run.mails).sort() : [];
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Lần chạy gần nhất</p>
        <button type="button" disabled={running} onClick={onRun} className={cn(btnSubtle, "px-3 py-1.5 text-xs")}>
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Đang chạy…" : "Chạy ngay"}
        </button>
      </div>
      {run ? (
        <>
          <p className="text-xs text-muted-foreground">
            Ngày {viDate(run.date)} · chạy lúc {viDateTime(run.at)} · {run.campaigns} game test được xét
          </p>
          <div className="flex flex-wrap gap-1.5">
            {codes.length === 0 ? (
              <span className="text-xs text-muted-foreground">Không có mail nào được gửi</span>
            ) : (
              codes.map((c) => (
                <span key={c} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs tabular-nums">
                  <span className="font-mono font-semibold">{c}</span> · {run.mails[c]} mail
                </span>
              ))
            )}
            {run.failed > 0 && (
              <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                {run.failed} mail lỗi (tự thử lại lần chạy sau, tối đa 3 lần)
              </span>
            )}
          </div>
          {run.transitions.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs">
              {run.transitions.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Chưa chạy lần nào.</p>
      )}
      {scheduleDirty && <p className="text-xs text-amber-700">Lịch chạy theo cấu hình đã lưu — lưu trước nếu muốn áp dụng thay đổi.</p>}
    </div>
  );
}
