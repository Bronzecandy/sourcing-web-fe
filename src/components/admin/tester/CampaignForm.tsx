import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { testerApi } from "@/tester/api";
import type { CampaignGameOption, TestCampaign } from "@/tester/types";
import TapTapGamePicker from "./TapTapGamePicker";

export type CampaignDraft = {
  gameName: string;
  appId: string;
  iconUrl: string;
  genre: string;
  platform: string;
  mainTags: string[];
  secondaryTags: string[];
  workloadHours: string;
  startDate: string;
  endDate: string;
  team: string;
  status: TestCampaign["status"];
  result: string;
  resultNote: string;
};

export const CAMPAIGN_STATUS: Record<string, string> = {
  planned: "Lên plan",
  running: "Đang test",
  done: "Đã test xong",
  cancelled: "Hủy",
};

export function draftFrom(c?: TestCampaign | null): CampaignDraft {
  return {
    gameName: c?.gameName ?? "",
    appId: c?.appId != null ? String(c.appId) : "",
    iconUrl: c?.iconUrl ?? "",
    genre: c?.genre ?? "",
    platform: c?.platform ?? "",
    mainTags: c?.mainTags ?? [],
    secondaryTags: c?.secondaryTags ?? [],
    workloadHours: c ? String(c.workloadHours) : "",
    startDate: c?.startDate ?? "",
    endDate: c?.endDate ?? "",
    team: c?.team ?? "",
    status: c?.status ?? "planned",
    result: c?.result ?? "",
    resultNote: c?.resultNote ?? "",
  };
}

export function draftPayload(d: CampaignDraft): Partial<TestCampaign> & Record<string, unknown> {
  return {
    gameName: d.gameName.trim(),
    appId: d.appId.trim() || null,
    iconUrl: d.iconUrl.trim() || null,
    genre: d.genre.trim() || null,
    platform: d.platform || null,
    mainTags: d.mainTags,
    secondaryTags: d.secondaryTags,
    workloadHours: d.workloadHours === "" ? undefined : Number(d.workloadHours),
    startDate: d.startDate || null,
    endDate: d.endDate || null,
    team: d.team.trim() || null,
    status: d.status,
    result: d.result || null,
    resultNote: d.resultNote.trim() || null,
  } as Partial<TestCampaign> & Record<string, unknown>;
}

const input = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm";

export default function CampaignForm({ value, onChange }: { value: CampaignDraft; onChange: (next: CampaignDraft) => void }) {
  const meta = useQuery({ queryKey: ["tester-admin-meta"], queryFn: testerApi.adminMeta });
  const [touchedWorkload, setTouchedWorkload] = useState(value.workloadHours !== "");
  const set = <K extends keyof CampaignDraft>(key: K, v: CampaignDraft[K]) => onChange({ ...value, [key]: v });

  useEffect(() => {
    if (touchedWorkload || !meta.data || value.mainTags.length === 0) return;
    const group = meta.data.genres.find((g) => g.key === value.mainTags[0])?.workloadGroup;
    const w = meta.data.workload.find((x) => x.key === group);
    if (w && value.workloadHours !== String(w.workloadHours)) onChange({ ...value, workloadHours: String(w.workloadHours) });
  }, [meta.data, value, touchedWorkload, onChange]);

  const toggleTag = (field: "mainTags" | "secondaryTags", key: string) => {
    const list = value[field];
    set(field, list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  const pickGame = (g: CampaignGameOption) => {
    const s = g.suggestion;
    setTouchedWorkload(false);
    onChange({
      ...value,
      gameName: s.gameName,
      appId: String(g.id),
      iconUrl: g.iconUrl ?? "",
      genre: s.genre,
      platform: s.platform ?? value.platform,
      mainTags: s.mainTags,
      secondaryTags: s.secondaryTags,
      workloadHours: "",
    });
  };

  const pickedId = value.appId.match(/\d+/)?.[0] ?? "";
  const picked = pickedId ? { appId: pickedId, title: value.gameName || `TapTap ${pickedId}`, iconUrl: value.iconUrl } : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">Game trên TapTap</span>
        <TapTapGamePicker
          selected={picked}
          onPick={pickGame}
          onClear={() => onChange({ ...value, appId: "", iconUrl: "" })}
        />
        <p className="text-xs text-muted-foreground">
          Chọn game để tự điền tên, TapTap ID, genre, platform, tag và khối lượng — vẫn sửa tay được bên dưới.
        </p>
      </div>
      <label className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">Tên game *</span>
        <input className={input} value={value.gameName} onChange={(e) => set("gameName", e.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">TapTap ID hoặc link</span>
        <input
          className={input}
          value={value.appId}
          placeholder="vd 593829 hoặc taptap.cn/app/593829"
          onChange={(e) => onChange({ ...value, appId: e.target.value, iconUrl: "" })}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Genre (mô tả)</span>
        <input className={input} value={value.genre} onChange={(e) => set("genre", e.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Platform</span>
        <select className={input} value={value.platform} onChange={(e) => set("platform", e.target.value)}>
          <option value="">Không giới hạn</option>
          {(meta.data?.platforms ?? []).map((p) => (
            <option key={p.key} value={p.key}>
              {p.key} · {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Team yêu cầu</span>
        <input className={input} value={value.team} placeholder="vd GnG/New Games" onChange={(e) => set("team", e.target.value)} />
      </label>
      <div className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">Main tags (trọng số 1.0)</span>
        <TagPicker genres={meta.data?.genres ?? []} selected={value.mainTags} onToggle={(k) => toggleTag("mainTags", k)} />
      </div>
      <div className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">Secondary tags (trọng số 0.5)</span>
        <TagPicker genres={meta.data?.genres ?? []} selected={value.secondaryTags} onToggle={(k) => toggleTag("secondaryTags", k)} />
      </div>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Khối lượng (giờ / tester)</span>
        <input
          className={input}
          type="number"
          min={0}
          step={0.5}
          value={value.workloadHours}
          onChange={(e) => {
            setTouchedWorkload(true);
            set("workloadHours", e.target.value);
          }}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Trạng thái</span>
        <select className={input} value={value.status} onChange={(e) => set("status", e.target.value as CampaignDraft["status"])}>
          {Object.entries(CAMPAIGN_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Bắt đầu</span>
        <input className={input} type="date" value={value.startDate} onChange={(e) => set("startDate", e.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Kết thúc</span>
        <input className={input} type="date" value={value.endDate} onChange={(e) => set("endDate", e.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Kết quả test</span>
        <select className={input} value={value.result} onChange={(e) => set("result", e.target.value)}>
          <option value="">Chưa có</option>
          <option value="suitable">Phù hợp</option>
          <option value="unsuitable">Không phù hợp (Radar tự Drop)</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Ghi chú kết quả</span>
        <input className={input} value={value.resultNote} onChange={(e) => set("resultNote", e.target.value)} />
      </label>
    </div>
  );
}

function TagPicker({
  genres,
  selected,
  onToggle,
}: {
  genres: Array<{ key: string; label: string }>;
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {genres.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => onToggle(g.key)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            selected.includes(g.key)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
