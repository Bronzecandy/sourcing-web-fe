import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, History, Loader2, Search, X } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { btnGhost, btnPrimary } from "@/lib/button-classes";
import TapTapGamePicker from "@/components/admin/tester/TapTapGamePicker";
import type { CampaignGameOption } from "@/tester/types";
import { TesterApiError } from "@/tester/api";
import { testGameAdminApi } from "../api";
import { CAMPAIGN_STATUS_LABEL, viDate } from "../labels";
import type { CampaignDetail, CampaignInput, CampaignOption, TestGameMeta } from "../types";

type Draft = {
  gameName: string;
  originalName: string;
  appId: string;
  iconUrl: string;
  genre: string;
  platforms: string[];
  mainTags: string[];
  secondaryTags: string[];
  developer: string;
  ipName: string;
  devStage: string;
  taptapUrl: string;
  googlePlayUrl: string;
  steamUrl: string;
  background: string;
  source: string;
  requester: string;
  sourceDetail: string;
  securityLevel: string;
  noTest: boolean;
  templateId: string;
  evalFormat: string;
  hoursPerDay: string;
  testDays: string;
  focusedAt: string;
  focusedPlace: string;
  guide: string;
  installUrl: string;
  testerNote: string;
  accessInfo: string;
  footageRequired: boolean;
  workloadHours: string;
  startDate: string;
  endDate: string;
  reportDeadline: string;
  coordinatorName: string;
  coordinatorEmail: string;
  team: string;
};

const TEXT_KEYS = [
  "gameName",
  "originalName",
  "genre",
  "developer",
  "ipName",
  "devStage",
  "taptapUrl",
  "googlePlayUrl",
  "steamUrl",
  "background",
  "source",
  "requester",
  "sourceDetail",
  "evalFormat",
  "focusedPlace",
  "guide",
  "installUrl",
  "testerNote",
  "accessInfo",
  "startDate",
  "endDate",
  "reportDeadline",
  "coordinatorName",
  "coordinatorEmail",
  "team",
  "iconUrl",
] as const;

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function draftFrom(c: Partial<CampaignDetail> | null, me: { name?: string | null; email?: string } | null): Draft {
  return {
    gameName: c?.gameName ?? "",
    originalName: c?.originalName ?? "",
    appId: c?.appId != null ? String(c.appId) : "",
    iconUrl: c?.iconUrl ?? "",
    genre: c?.genre ?? "",
    platforms: c?.platforms ?? [],
    mainTags: c?.mainTags ?? [],
    secondaryTags: c?.secondaryTags ?? [],
    developer: c?.developer ?? "",
    ipName: c?.ipName ?? "",
    devStage: c?.devStage ?? "",
    taptapUrl: c?.taptapUrl ?? "",
    googlePlayUrl: c?.googlePlayUrl ?? "",
    steamUrl: c?.steamUrl ?? "",
    background: c?.background ?? "",
    source: c?.source ?? "",
    requester: c?.requester ?? "",
    sourceDetail: c?.sourceDetail ?? "",
    securityLevel: c?.securityLevel ?? "normal",
    noTest: c?.noTest ?? false,
    templateId: c?.templateId ?? "",
    evalFormat: c?.evalFormat ?? "",
    hoursPerDay: c?.hoursPerDay != null ? String(c.hoursPerDay) : "",
    testDays: c?.testDays != null ? String(c.testDays) : "",
    focusedAt: toLocalInput(c?.focusedAt ?? null),
    focusedPlace: c?.focusedPlace ?? "",
    guide: c?.guide ?? "",
    installUrl: c?.installUrl ?? "",
    testerNote: c?.testerNote ?? "",
    accessInfo: c?.accessInfo ?? "",
    footageRequired: c?.footageRequired ?? false,
    workloadHours: c?.workloadHours != null ? String(c.workloadHours) : "",
    startDate: c?.startDate ?? "",
    endDate: c?.endDate ?? "",
    reportDeadline: c?.reportDeadline ?? "",
    coordinatorName: c?.coordinatorName ?? me?.name ?? "",
    coordinatorEmail: c?.coordinatorEmail ?? me?.email ?? "",
    team: c?.team ?? "",
  };
}

function toInput(d: Draft): CampaignInput {
  const out: Record<string, unknown> = {};
  for (const k of TEXT_KEYS) out[k] = d[k].trim() || null;
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    ...out,
    gameName: d.gameName.trim(),
    appId: d.appId.trim() || null,
    platforms: d.platforms,
    mainTags: d.mainTags,
    secondaryTags: d.secondaryTags,
    securityLevel: d.securityLevel,
    noTest: d.noTest,
    templateId: d.noTest ? null : d.templateId || null,
    hoursPerDay: num(d.hoursPerDay),
    testDays: num(d.testDays),
    focusedAt: d.focusedAt ? new Date(d.focusedAt).toISOString() : null,
    footageRequired: d.footageRequired,
    workloadHours: num(d.workloadHours),
  } as CampaignInput;
}

/** Chỉ gửi trường đổi so với bản đang lưu (template đã chốt sau Initiate không được gửi lại). */
function diffInput(next: CampaignInput, base: CampaignInput): CampaignInput {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    if (JSON.stringify(v ?? null) !== JSON.stringify((base as Record<string, unknown>)[k] ?? null)) out[k] = v;
  }
  return out as CampaignInput;
}

/** Template sẽ được gắn khi để "Tự chọn": dòng chính đầu tiên có template đang dùng, không có thì Khung cơ bản. */
function autoTemplate(meta: TestGameMeta | undefined, mainTags: string[]) {
  const active = (meta?.templates ?? []).filter((t) => t.status === "active");
  for (const tag of mainTags) {
    const hit = active.find((t) => !t.isBase && t.genres.includes(tag));
    if (hit) return hit;
  }
  return active.find((t) => t.isBase) ?? null;
}

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, required, hint, className, children }: { label: string; required?: boolean; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block space-y-1 text-sm", className)}>
      <span className="font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Chips({ options, selected, onToggle, disabled }: { options: Array<{ key: string; label: string }>; selected: string[]; onToggle: (key: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          disabled={disabled}
          onClick={() => onToggle(o.key)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            selected.includes(o.key) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PreviousPicker({ onPick }: { onPick: (c: CampaignOption) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const options = useQuery({ queryKey: ["testgame-campaign-options", debounced], queryFn: () => testGameAdminApi.campaignOptions(debounced) });
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className={cn(input, "pl-9")} value={q} placeholder="Tìm game đã test…" onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {options.isLoading ? (
          <li className="flex justify-center p-3">
            <Loader2 className="h-4 w-4 animate-spin" />
          </li>
        ) : (options.data ?? []).length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">Không có game test nào khớp.</li>
        ) : (
          options.data!.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                {c.iconUrl ? <img src={c.iconUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-lg object-cover" /> : <span className="h-8 w-8 rounded-lg bg-muted" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {c.gameName} <span className="text-muted-foreground">· Lần {c.testRound}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {CAMPAIGN_STATUS_LABEL[c.status]} · {viDate(c.startDate)}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

/** Mount khi mở (state khởi tạo một lần, refetch bên ngoài không ghi đè bản đang sửa). */
export default function CampaignFormDrawer({
  onClose,
  campaign,
  onSaved,
}: {
  onClose: () => void;
  /** null = tạo mới */
  campaign: CampaignDetail | null;
  onSaved: (c: CampaignDetail) => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const meta = useQuery({ queryKey: ["testgame-meta"], queryFn: testGameAdminApi.meta, staleTime: 60_000 });
  const me = useMemo(() => (user ? { name: user.name, email: user.email } : null), [user]);
  const [initial] = useState(() => draftFrom(campaign, me));
  const [draft, setDraft] = useState<Draft>(initial);
  const [from, setFrom] = useState<CampaignOption | null>(null);
  const [pickingPrevious, setPickingPrevious] = useState(false);
  const [touchedWorkload, setTouchedWorkload] = useState(Boolean(campaign));
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const set = <K extends keyof Draft>(key: K, v: Draft[K]) => setDraft((d) => ({ ...d, [key]: v }));
  const toggle = (key: "platforms" | "mainTags" | "secondaryTags", v: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v] }));

  const m = meta.data;
  const initiated = Boolean(campaign?.initiatedAt);
  const templateLocked = Boolean(campaign?.template?.locked);

  useEffect(() => {
    if (touchedWorkload || !m) return;
    let hours: number | null = null;
    if (draft.evalFormat === "daily" && Number(draft.hoursPerDay) > 0 && Number(draft.testDays) > 0) hours = Number(draft.hoursPerDay) * Number(draft.testDays);
    else if (draft.mainTags[0]) {
      const group = m.genres.find((g) => g.key === draft.mainTags[0])?.workloadGroup;
      hours = m.workload.find((w) => w.key === group)?.workloadHours ?? null;
    }
    if (hours != null && String(hours) !== draft.workloadHours) setDraft((d) => ({ ...d, workloadHours: String(hours) }));
  }, [m, draft.evalFormat, draft.hoursPerDay, draft.testDays, draft.mainTags, draft.workloadHours, touchedWorkload]);

  const pickGame = (g: CampaignGameOption) => {
    const platforms = [
      ...(g.platforms.includes("android") ? ["Android"] : []),
      ...(g.platforms.includes("ios") ? ["iOS"] : []),
      ...(g.platforms.includes("pc") ? ["PC"] : []),
      ...(g.console ? ["Console"] : []),
    ];
    setTouchedWorkload(false);
    setDraft((d) => ({
      ...d,
      gameName: g.suggestion.gameName || d.gameName,
      originalName: g.title !== g.suggestion.gameName ? g.title : d.originalName,
      appId: String(g.id),
      iconUrl: g.iconUrl ?? "",
      genre: g.suggestion.genre || d.genre,
      platforms: platforms.length ? platforms : d.platforms,
      mainTags: g.suggestion.mainTags.length ? g.suggestion.mainTags : d.mainTags,
      secondaryTags: g.suggestion.secondaryTags,
      developer: g.developer ?? d.developer,
      taptapUrl: `https://www.taptap.cn/app/${g.id}`,
    }));
  };

  const pickPrevious = async (opt: CampaignOption) => {
    try {
      const prev = await testGameAdminApi.campaign(opt.id);
      const base = draftFrom(prev, me);
      setDraft({
        ...base,
        startDate: "",
        endDate: "",
        reportDeadline: "",
        focusedAt: "",
        accessInfo: "",
        testerNote: "",
        templateId: "",
        noTest: false,
      });
      setFrom(opt);
      setPickingPrevious(false);
      setTouchedWorkload(true);
    } catch {
      toast.error("Không tải được game test cũ");
    }
  };

  const setEndDate = (v: string) =>
    setDraft((d) => ({ ...d, endDate: v, reportDeadline: !d.reportDeadline && v ? addDaysIso(v, 3) : d.reportDeadline }));

  const auto = autoTemplate(m, draft.mainTags);
  const pickedId = draft.appId.match(/\d+/)?.[0] ?? "";
  const picked = pickedId ? { appId: pickedId, title: draft.gameName || `TapTap ${pickedId}`, iconUrl: draft.iconUrl } : null;
  const dateIssues = [
    draft.startDate && draft.endDate && draft.endDate < draft.startDate ? "Hạn test phải sau ngày bắt đầu" : null,
    draft.endDate && draft.reportDeadline && draft.reportDeadline < draft.endDate ? "Hạn nộp report phải sau hạn test" : null,
  ].filter((x): x is string => Boolean(x));

  const save = async () => {
    if (!draft.gameName.trim()) {
      toast.error("Cần tên game");
      return;
    }
    if (dateIssues.length) {
      toast.error(dateIssues[0]);
      return;
    }
    setSaving(true);
    setIssues([]);
    try {
      const next = toInput(draft);
      let saved: CampaignDetail;
      if (campaign) {
        const body = diffInput(next, toInput(initial));
        if (templateLocked) delete body.templateId;
        saved = Object.keys(body).length ? await testGameAdminApi.updateCampaign(campaign.id, body) : campaign;
      } else {
        saved = await testGameAdminApi.createCampaign({ ...next, ...(from ? { fromId: from.id } : {}) });
      }
      toast.success(campaign ? "Đã lưu game test" : "Đã tạo game test");
      onSaved(saved);
    } catch (err) {
      if (err instanceof TesterApiError && err.issues.length) setIssues(err.issues);
      toast.error(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      size="full"
      title={campaign ? `Sửa game test · ${campaign.gameName}` : "Tạo game test"}
      subtitle={
        campaign
          ? initiated
            ? "Đã Initiate: template đã chốt; đổi ngày / hướng dẫn sẽ áp dụng cho các mail sau"
            : "Chưa Initiate — sửa thoải mái"
          : "Chọn game trên TapTap để tự điền; bắt buộc (*) là các trường cần trước khi Initiate"
      }
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dateIssues.length > 0 && (
            <span className="mr-auto flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {dateIssues[0]}
            </span>
          )}
          <button type="button" onClick={onClose} className={cn(btnGhost, "px-4 py-2")}>
            Huỷ
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} className={cn(btnPrimary, "px-4 py-2")}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {campaign ? "Lưu thay đổi" : from ? `Tạo lần test ${from.testRound + 1}` : "Tạo game test"}
          </button>
        </div>
      }
    >
      {!m ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {issues.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <ul className="list-disc pl-5">
                {issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}

          {!campaign && (
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
              {from ? (
                <div className="flex flex-wrap items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <span>
                    Test lại <b>{from.gameName}</b> — tạo <b>lần {from.testRound + 1}</b>, đã chép thông tin game, nguồn, hướng dẫn từ lần {from.testRound}. Nhập
                    lại thời gian test.
                  </span>
                  <button type="button" className={cn(btnGhost, "ml-auto px-2 py-1 text-xs")} onClick={() => setFrom(null)}>
                    <X className="h-3.5 w-3.5" /> Bỏ chọn
                  </button>
                </div>
              ) : pickingPrevious ? (
                <PreviousPicker onPick={(c) => void pickPrevious(c)} />
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Game đã từng test?</span>
                  <button type="button" className={cn(btnGhost, "px-3 py-1.5 text-xs")} onClick={() => setPickingPrevious(true)}>
                    <History className="h-3.5 w-3.5" /> Test lại game cũ (Lần test +1)
                  </button>
                </div>
              )}
            </div>
          )}

          <Section title="Thông tin game">
            <div className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">Game trên TapTap</span>
              <TapTapGamePicker selected={picked} onPick={pickGame} onClear={() => setDraft((d) => ({ ...d, appId: "", iconUrl: "" }))} />
            </div>
            <Field label="Tên game" required>
              <input className={input} value={draft.gameName} onChange={(e) => set("gameName", e.target.value)} />
            </Field>
            <Field label="Tên gốc (CN / KR…)">
              <input className={input} value={draft.originalName} onChange={(e) => set("originalName", e.target.value)} />
            </Field>
            <Field label="Thể loại" required hint='Mô tả tự do, vd "Roguelike Platformer"'>
              <input className={input} value={draft.genre} onChange={(e) => set("genre", e.target.value)} />
            </Field>
            <Field label="TapTap ID hoặc link">
              <input className={input} value={draft.appId} onChange={(e) => setDraft((d) => ({ ...d, appId: e.target.value, iconUrl: "" }))} />
            </Field>
            <div className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">
                Dòng game chính <span className="text-destructive">*</span>
              </span>
              <Chips options={m.genres} selected={draft.mainTags} onToggle={(k) => toggle("mainTags", k)} />
              <span className="block text-xs text-muted-foreground">Quyết định template questionnaire và gợi ý tester (điểm ×1).</span>
            </div>
            <div className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">Dòng game phụ</span>
              <Chips options={m.genres.filter((g) => !draft.mainTags.includes(g.key))} selected={draft.secondaryTags} onToggle={(k) => toggle("secondaryTags", k)} />
            </div>
            <div className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">
                Platform <span className="text-destructive">*</span>
              </span>
              <Chips options={m.platforms.map((p) => ({ key: p, label: p }))} selected={draft.platforms} onToggle={(k) => toggle("platforms", k)} />
            </div>
            <Field label="Developer">
              <input className={input} value={draft.developer} onChange={(e) => set("developer", e.target.value)} />
            </Field>
            <Field label="IP">
              <input className={input} value={draft.ipName} onChange={(e) => set("ipName", e.target.value)} />
            </Field>
            <Field label="Giai đoạn phát triển" hint="Developing, Closed Beta, Released…">
              <input className={input} list="tg-dev-stage" value={draft.devStage} onChange={(e) => set("devStage", e.target.value)} />
              <datalist id="tg-dev-stage">
                {["Developing", "Closed Beta", "Open Beta", "Released"].map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Link TapTap">
              <input className={input} value={draft.taptapUrl} onChange={(e) => set("taptapUrl", e.target.value)} />
            </Field>
            <Field label="Link Google Play">
              <input className={input} value={draft.googlePlayUrl} onChange={(e) => set("googlePlayUrl", e.target.value)} />
            </Field>
            <Field label="Link Steam">
              <input className={input} value={draft.steamUrl} onChange={(e) => set("steamUrl", e.target.value)} />
            </Field>
            <Field label="Thông tin nền" className="sm:col-span-2" hint="Giới thiệu game, video, ghi chú — tester xem được trên trang lời mời">
              <textarea className={cn(input, "min-h-20")} value={draft.background} onChange={(e) => set("background", e.target.value)} />
            </Field>
          </Section>

          <Section title="Nguồn và bảo mật">
            <Field label="Nguồn" required>
              <select className={input} value={draft.source} onChange={(e) => set("source", e.target.value)}>
                <option value="">— Chọn —</option>
                {m.sources.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Người yêu cầu">
              <input className={input} value={draft.requester} onChange={(e) => set("requester", e.target.value)} />
            </Field>
            <Field label="Chi tiết nguồn" className="sm:col-span-2" hint="Link SeaTalk hoặc tiêu đề mail gốc">
              <input className={input} value={draft.sourceDetail} onChange={(e) => set("sourceDetail", e.target.value)} />
            </Field>
            <div className="space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">
                Mức bảo mật <span className="text-destructive">*</span>
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {m.securityLevels.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => set("securityLevel", s.key)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      draft.securityLevel === s.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="block font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.noTest}
                disabled={Boolean(campaign && campaign.status !== "pending")}
                onChange={(e) => set("noTest", e.target.checked)}
              />
              <span>
                <span className="font-medium">Không test</span>
                <span className="block text-xs text-muted-foreground">
                  Chỉ nhập để lưu trữ: không Initiate, không mail, không questionnaire, không report. Điền Quyết định rồi chuyển Done ở trang chi tiết.
                </span>
              </span>
            </label>
          </Section>

          {!draft.noTest && (
            <>
              <Section title="Thiết lập test">
                <Field
                  label="Template questionnaire"
                  required
                  hint={
                    templateLocked
                      ? `Đã chốt lúc Initiate: ${campaign?.template?.name} v${campaign?.template?.version}`
                      : draft.templateId
                        ? undefined
                        : auto
                          ? `Tự chọn theo dòng game chính: ${auto.name} (v${auto.version})`
                          : "Chưa có template đang dùng"
                  }
                >
                  <select className={input} value={draft.templateId} disabled={templateLocked} onChange={(e) => set("templateId", e.target.value)}>
                    <option value="">Tự chọn theo dòng game chính</option>
                    {m.templates
                      .filter((t) => t.status === "active" || t.id === draft.templateId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · v{t.version}
                          {t.isBase ? " (Khung cơ bản)" : ""}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Hình thức đánh giá" required>
                  <select className={input} value={draft.evalFormat} onChange={(e) => set("evalFormat", e.target.value)}>
                    <option value="">— Chọn —</option>
                    {m.evalFormats.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {draft.evalFormat === "daily" && (
                  <>
                    <Field label="Số giờ / ngày" required>
                      <input className={input} type="number" min={0} step={0.5} value={draft.hoursPerDay} onChange={(e) => set("hoursPerDay", e.target.value)} />
                    </Field>
                    <Field label="Số ngày" required>
                      <input className={input} type="number" min={1} step={1} value={draft.testDays} onChange={(e) => set("testDays", e.target.value)} />
                    </Field>
                  </>
                )}
                {draft.evalFormat === "focused" && (
                  <>
                    <Field label="Giờ test tập trung" required>
                      <input className={input} type="datetime-local" value={draft.focusedAt} onChange={(e) => set("focusedAt", e.target.value)} />
                    </Field>
                    <Field label="Phòng / link họp" required>
                      <input className={input} value={draft.focusedPlace} onChange={(e) => set("focusedPlace", e.target.value)} />
                    </Field>
                  </>
                )}
                <Field label="Workload (giờ / tester)" hint="Tự tính theo hình thức hoặc dòng game chính; giờ được cộng vào hồ sơ tester khi Admin duyệt bài nộp">
                  <input
                    className={input}
                    type="number"
                    min={0}
                    step={0.5}
                    value={draft.workloadHours}
                    onChange={(e) => {
                      setTouchedWorkload(true);
                      set("workloadHours", e.target.value);
                    }}
                  />
                </Field>
                <label className="flex items-start gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" className="mt-0.5" checked={draft.footageRequired} onChange={(e) => set("footageRequired", e.target.checked)} />
                  <span>
                    <span className="font-medium">Bắt buộc footage</span>
                    <span className="block text-xs text-muted-foreground">Câu upload footage trong questionnaire thành bắt buộc</span>
                  </span>
                </label>
              </Section>

              <Section title="Thời gian">
                <Field label="Ngày bắt đầu test" required hint="Mốc gửi M4">
                  <input className={input} type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </Field>
                <Field label="Hạn test" required hint="Cũng là hạn nộp questionnaire; mốc M5, M6, M7">
                  <input className={input} type="date" value={draft.endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
                <Field label="Hạn nộp report" required hint="Admin chốt report trước ngày này; quá hạn sẽ được đánh dấu">
                  <input className={input} type="date" value={draft.reportDeadline} onChange={(e) => set("reportDeadline", e.target.value)} />
                </Field>
              </Section>

              <Section
                title="File cài, hướng dẫn và ghi chú"
                description="Hướng dẫn, link cài và thông tin truy cập chỉ hiện cho tester đã xác nhận tham gia, và được chèn vào mail M3 / M4."
              >
                <Field label="Hướng dẫn tải / cài đặt" required className="sm:col-span-2">
                  <textarea
                    className={cn(input, "min-h-24")}
                    value={draft.guide}
                    placeholder={"vd:\n1. Tải APK trong folder Drive bên dưới\n2. Cài đặt, đăng nhập bằng tài khoản Google công ty"}
                    onChange={(e) => set("guide", e.target.value)}
                  />
                </Field>
                <Field
                  label="Link cài đặt khác (tuỳ chọn)"
                  hint="TestFlight, link tải của studio, Steam key page… File APK thì bỏ vào folder Drive hệ thống tự tạo"
                  className="sm:col-span-2"
                >
                  <input className={input} value={draft.installUrl} placeholder="https://…" onChange={(e) => set("installUrl", e.target.value)} />
                </Field>
                <Field label="Ghi chú cho tester" className="sm:col-span-2" hint="Nội dung cần tập trung test, lưu ý đặc biệt của đợt này — hiện trên trang test và trong M3 / M4">
                  <textarea
                    className={cn(input, "min-h-20")}
                    value={draft.testerNote}
                    placeholder="vd: Tập trung đánh giá PvP xếp hạng và hệ thống gacha; chơi tới ít nhất chương 3"
                    onChange={(e) => set("testerNote", e.target.value)}
                  />
                </Field>
                <Field label="Thông tin truy cập (nhạy cảm)" className="sm:col-span-2" hint="Steam key, tài khoản test… chỉ gửi trong M3 cho tester đã xác nhận">
                  <textarea className={cn(input, "min-h-16 font-mono")} value={draft.accessInfo} onChange={(e) => set("accessInfo", e.target.value)} />
                </Field>
                {!campaign && (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Sau khi tạo, hệ thống tạo folder Drive "[Confidential] MM.yyyy | Tên game" để bạn bỏ APK vào, và bạn có thể đính kèm tệp hướng dẫn (PDF, ảnh) gửi
                    kèm M3 / M4 ở trang chi tiết.
                  </p>
                )}
              </Section>
            </>
          )}

          <Section title="Người phụ trách">
            <Field label="Tên" required hint="Hiện trong chữ ký mail">
              <input className={input} value={draft.coordinatorName} onChange={(e) => set("coordinatorName", e.target.value)} />
            </Field>
            <Field label="Email" required hint="Tester trả lời mail sẽ gửi về email này">
              <input className={input} type="email" value={draft.coordinatorEmail} onChange={(e) => set("coordinatorEmail", e.target.value)} />
            </Field>
            <Field label="Team yêu cầu">
              <input className={input} value={draft.team} placeholder="vd GnG / New Games" onChange={(e) => set("team", e.target.value)} />
            </Field>
          </Section>
        </div>
      )}
    </Drawer>
  );
}
