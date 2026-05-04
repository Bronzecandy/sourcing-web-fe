import { useState, useMemo, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiCopy } from "@/lib/use-ui-copy";
import type { LibraryPendingItem } from "@/types";
import {
  type GenreTiersJson,
  type StudioTiersJson,
  type KeywordLibJson,
  type CommunityLibJson,
  type PendingFileJson,
  type FlatGenreKeywordRow,
  type FlatKeywordScoreRow,
  type FlatStudioNameRow,
  ensureArray,
  tierScoreMap,
  flattenGenreTagPatterns,
  groupFlatToTagPatterns,
  flattenKeywordScoreRows,
  groupFlatToKeywordPatterns,
  flattenStudioNameRows,
  groupFlatToStudioEntries,
} from "@/lib/library-json";

const inputCls =
  "w-full px-2 py-1.5 rounded-md border border-border bg-background text-sm font-mono";

function numOr(v: string, d: number): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
}

/** ---- Genre tiers ---- */
function GenreEditor({ value, onChange }: { value: GenreTiersJson; onChange: (v: GenreTiersJson) => void }) {
  const { t } = useUiCopy();
  const tiers = value.tiers ?? {};
  const tierKeys = Object.keys(tiers).sort();
  const tierOptions = tierKeys.length ? tierKeys : ["S", "A", "B", "C"];

  const [flatRows, setFlatRows] = useState<FlatGenreKeywordRow[]>(() =>
    flattenGenreTagPatterns(value.tagPatterns),
  );

  const commitFlat = (next: FlatGenreKeywordRow[]) => {
    setFlatRows(next);
    onChange({ ...value, tagPatterns: groupFlatToTagPatterns(next) });
  };

  const updateTier = (key: string, field: "label" | "score", fieldVal: string | number) => {
    const next = { ...value, tiers: { ...tiers } };
    const row = { ...(next.tiers![key] ?? { label: "", score: 50 }) };
    if (field === "label") row.label = String(fieldVal);
    else row.score = typeof fieldVal === "number" ? fieldVal : numOr(String(fieldVal), 50);
    next.tiers![key] = row;
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">{t("version", "version")}</span>
          <input
            type="number"
            className={inputCls}
            value={value.version ?? ""}
            onChange={(e) => onChange({ ...value, version: numOr(e.target.value, 1) })}
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">{t("defaultScore", "defaultScore")}</span>
          <input
            type="number"
            className={inputCls}
            value={value.defaultScore ?? ""}
            onChange={(e) => onChange({ ...value, defaultScore: numOr(e.target.value, 50) })}
          />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="text-muted-foreground">notesEditor</span>
        <textarea
          className={cn(inputCls, "min-h-[72px]")}
          value={value.notesEditor ?? ""}
          onChange={(e) => onChange({ ...value, notesEditor: e.target.value })}
        />
      </label>

      <div>
        <h4 className="text-xs font-semibold mb-2">{t("Bậc tiers (S/A/B/C…)", "Tier bands")}</h4>
        <p className="text-xs text-muted-foreground mb-2">
          {t(
            "Điểm từng tier dùng để map khi chọn tier cho genre/từ khóa bên dưới.",
            "Scores here define the mapping when you assign a tier to each genre keyword below.",
          )}
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-medium">{t("Key", "Key")}</th>
                <th className="text-left p-2 font-medium">label</th>
                <th className="text-left p-2 font-medium w-24">{t("Điểm", "Score")}</th>
              </tr>
            </thead>
            <tbody>
              {tierKeys.map((k) => (
                <tr key={k} className="border-b border-border/60">
                  <td className="p-2 font-mono font-medium">{k}</td>
                  <td className="p-2">
                    <input
                      className={cn(inputCls, "font-sans")}
                      value={tiers[k]?.label ?? ""}
                      onChange={(e) => updateTier(k, "label", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputCls}
                      value={tiers[k]?.score ?? ""}
                      onChange={(e) => updateTier(k, "score", numOr(e.target.value, 0))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-semibold">{t("Genre / từ khóa (EN)", "Genre keywords (EN)")}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Mỗi dòng là một từ khóa; chọn Tier → điểm lấy theo bảng tier phía trên. Trùng từ khóa: dòng sau ghi đè tier.",
                "One row per keyword; pick a tier → score comes from the tier table above. Duplicate keyword: the lower row wins.",
              )}
            </p>
          </div>
          <button
            type="button"
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground shrink-0"
            onClick={() =>
              commitFlat([
                ...flatRows,
                { keyword: "", tier: (tierOptions[0] ?? "B") as string },
              ])
            }
          >
            <Plus className="w-3.5 h-3.5" /> {t("Thêm genre", "Add row")}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-medium">{t("Từ khóa (genre)", "Keyword")}</th>
                <th className="text-left p-2 font-medium w-28">{t("Tier", "Tier")}</th>
                <th className="text-left p-2 font-medium w-20 tabular-nums">{t("Điểm (map)", "Score")}</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {flatRows.map((row, i) => {
                const mapped = tiers[row.tier]?.score;
                return (
                  <tr key={`${i}-${row.keyword}`} className="border-b border-border/60">
                    <td className="p-2">
                      <input
                        className={cn(inputCls, "font-sans")}
                        value={row.keyword}
                        onChange={(e) => {
                          const next = [...flatRows];
                          next[i] = { ...row, keyword: e.target.value };
                          commitFlat(next);
                        }}
                        placeholder="card rpg, fps, …"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className={inputCls}
                        value={row.tier}
                        onChange={(e) => {
                          const next = [...flatRows];
                          next[i] = { ...row, tier: e.target.value };
                          commitFlat(next);
                        }}
                      >
                        {!tierOptions.includes(row.tier) && row.tier ? (
                          <option value={row.tier}>{row.tier}</option>
                        ) : null}
                        {tierOptions.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 tabular-nums text-muted-foreground">
                      {typeof mapped === "number" ? mapped : "—"}
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-destructive/10 text-destructive"
                        onClick={() => commitFlat(flatRows.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** ---- Studio ---- */
function StudioEditor({ value, onChange }: { value: StudioTiersJson; onChange: (v: StudioTiersJson) => void }) {
  const { t } = useUiCopy();
  const [flatRows, setFlatRows] = useState<FlatStudioNameRow[]>(() => flattenStudioNameRows(value.entries));

  const commitFlat = (next: FlatStudioNameRow[]) => {
    setFlatRows(next);
    onChange({ ...value, entries: groupFlatToStudioEntries(next) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">version</span>
          <input
            type="number"
            className={inputCls}
            value={value.version ?? ""}
            onChange={(e) => onChange({ ...value, version: numOr(e.target.value, 1) })}
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">neutralScore</span>
          <input
            type="number"
            className={inputCls}
            value={value.neutralScore ?? ""}
            onChange={(e) => onChange({ ...value, neutralScore: numOr(e.target.value, 55) })}
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div>
            <h4 className="text-xs font-semibold">{t("Studio / nhà phát triển", "Studios / developers")}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Mỗi dòng là một tên (hoặc alias). Cùng điểm + tier + roles được gộp khi lưu. Trùng tên: dòng sau ghi đè.",
                "One row per studio name or alias. Same score + tier + roles merge on save. Duplicate name: lower row wins.",
              )}
            </p>
          </div>
          <button
            type="button"
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground shrink-0"
            onClick={() => commitFlat([...flatRows, { name: "", score: 55, tier: "custom", roles: "developer" }])}
          >
            <Plus className="w-3.5 h-3.5" /> {t("Thêm dòng", "Add row")}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-medium">{t("Tên studio", "Studio name")}</th>
                <th className="text-left p-2 font-medium w-24">tier</th>
                <th className="text-left p-2 font-medium w-20">{t("Điểm", "Score")}</th>
                <th className="text-left p-2 font-medium min-w-[100px]">roles</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {flatRows.map((row, i) => (
                <tr key={`${i}-${row.name}`} className="border-b border-border/60">
                  <td className="p-2">
                    <input
                      className={cn(inputCls, "font-sans")}
                      value={row.name}
                      onChange={(e) => {
                        const next = [...flatRows];
                        next[i] = { ...row, name: e.target.value };
                        commitFlat(next);
                      }}
                      placeholder="Studio …"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={inputCls}
                      value={row.tier}
                      onChange={(e) => {
                        const next = [...flatRows];
                        next[i] = { ...row, tier: e.target.value };
                        commitFlat(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputCls}
                      value={row.score}
                      onChange={(e) => {
                        const next = [...flatRows];
                        next[i] = { ...row, score: numOr(e.target.value, 0) };
                        commitFlat(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={cn(inputCls, "font-sans")}
                      value={row.roles}
                      onChange={(e) => {
                        const next = [...flatRows];
                        next[i] = { ...row, roles: e.target.value };
                        commitFlat(next);
                      }}
                      placeholder="developer, publisher"
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={() => commitFlat(flatRows.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** ---- keywordPatterns libs ---- */
function KeywordPatternsEditor({
  value,
  onChange,
  title,
}: {
  value: KeywordLibJson;
  onChange: (v: KeywordLibJson) => void;
  title: string;
}) {
  const { t } = useUiCopy();
  const [flatRows, setFlatRows] = useState<FlatKeywordScoreRow[]>(() =>
    flattenKeywordScoreRows(value.keywordPatterns),
  );

  const commitFlat = (next: FlatKeywordScoreRow[]) => {
    setFlatRows(next);
    onChange({ ...value, keywordPatterns: groupFlatToKeywordPatterns(next) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "Mỗi dòng một từ khóa (EN); các từ khóa cùng điểm được gộp trong JSON. Trùng từ khóa: dòng sau ghi đè điểm.",
            "One keyword per row (English); keywords with the same score merge in JSON. Duplicate keyword: lower row wins.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">version</span>
          <input
            type="number"
            className={inputCls}
            value={value.version ?? ""}
            onChange={(e) => onChange({ ...value, version: numOr(e.target.value, 1) })}
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">neutralScore</span>
          <input
            type="number"
            className={inputCls}
            value={value.neutralScore ?? ""}
            onChange={(e) => onChange({ ...value, neutralScore: numOr(e.target.value, 55) })}
          />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="text-muted-foreground">notes</span>
        <textarea className={cn(inputCls, "min-h-[72px]")} value={value.notes ?? ""} onChange={(e) => onChange({ ...value, notes: e.target.value })} />
      </label>

      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <h4 className="text-xs font-semibold">{t("Từ khóa", "Keywords")}</h4>
          <button
            type="button"
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground shrink-0"
            onClick={() => commitFlat([...flatRows, { keyword: "", score: 70 }])}
          >
            <Plus className="w-3.5 h-3.5" /> {t("Thêm dòng", "Add row")}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-medium">{t("Từ khóa", "Keyword")}</th>
                <th className="text-left p-2 font-medium w-24">{t("Điểm", "Score")}</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {flatRows.map((row, i) => (
                <tr key={`${i}-${row.keyword}`} className="border-b border-border/60">
                  <td className="p-2">
                    <input
                      className={cn(inputCls, "font-sans")}
                      value={row.keyword}
                      onChange={(e) => {
                        const next = [...flatRows];
                        next[i] = { ...row, keyword: e.target.value };
                        commitFlat(next);
                      }}
                      placeholder="major ip, anime, …"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputCls}
                      value={row.score}
                      onChange={(e) => {
                        const next = [...flatRows];
                        next[i] = { ...row, score: numOr(e.target.value, 0) };
                        commitFlat(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={() => commitFlat(flatRows.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** ---- rules: game size / update cycle ---- */
function RulesRowsEditor({
  value,
  onChange,
  variant,
}: {
  value: KeywordLibJson & { maxMbGood?: number; rules?: Array<Record<string, unknown>> };
  onChange: (v: typeof value) => void;
  variant: "mb" | "days";
}) {
  const { t } = useUiCopy();
  const rules = ensureArray<Record<string, unknown>>(value.rules);

  const setRules = (rows: typeof rules) => onChange({ ...value, rules: rows });

  const addRow = () => {
    if (variant === "mb") {
      setRules([...rules, { maxMb: 1000, score: 70, label: "" }]);
    } else {
      setRules([...rules, { maxDaysSinceUpdate: 30, score: 70, label: "" }]);
    }
  };

  const thresholdTitle =
    variant === "mb"
      ? t("Ngưỡng dung lượng gói (MB)", "Install size thresholds (MB)")
      : t("Ngưỡng ngày từ lần cập nhật", "Days since update thresholds");

  const thresholdHint =
    variant === "mb"
      ? t(
          "Một rule = một ngưỡng tối đa; game có size ≤ maxMb thì nhận điểm của rule đó (logic backend giữ nguyên).",
          "Each rule is a maximum threshold; scores map by smallest matching bucket (backend logic unchanged).",
        )
      : t(
          "Một rule = số ngày kể từ bản cập nhật cuối; game trong ngưỡng nhận điểm tương ứng.",
          "Each rule caps days since last update; scoring follows backend ordering.",
        );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">version</span>
          <input
            type="number"
            className={inputCls}
            value={value.version ?? ""}
            onChange={(e) => onChange({ ...value, version: numOr(e.target.value, 1) })}
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">neutralScore</span>
          <input
            type="number"
            className={inputCls}
            value={value.neutralScore ?? ""}
            onChange={(e) => onChange({ ...value, neutralScore: numOr(e.target.value, 55) })}
          />
        </label>
        {variant === "mb" && (
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">maxMbGood</span>
            <input
              type="number"
              className={inputCls}
              value={(value as { maxMbGood?: number }).maxMbGood ?? ""}
              onChange={(e) => onChange({ ...value, maxMbGood: numOr(e.target.value, 3500) })}
            />
          </label>
        )}
      </div>
      <label className="text-xs space-y-1 block">
        <span className="text-muted-foreground">notes</span>
        <textarea className={cn(inputCls, "min-h-[72px]")} value={value.notes ?? ""} onChange={(e) => onChange({ ...value, notes: e.target.value })} />
      </label>

      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div>
            <h4 className="text-xs font-semibold">{thresholdTitle}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{thresholdHint}</p>
          </div>
          <button type="button" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground shrink-0" onClick={addRow}>
            <Plus className="w-3.5 h-3.5" /> {t("Thêm rule", "Add row")}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-medium">
                  {variant === "mb" ? "maxMb" : "maxDaysSinceUpdate"}
                </th>
                <th className="text-left p-2 font-medium w-24">{t("Điểm", "Score")}</th>
                <th className="text-left p-2 font-medium">label</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {rules.map((row, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputCls}
                      value={variant === "mb" ? Number(row.maxMb ?? 0) : Number(row.maxDaysSinceUpdate ?? 0)}
                      onChange={(e) => {
                        const next = [...rules];
                        const n = numOr(e.target.value, 0);
                        next[i] = variant === "mb" ? { ...row, maxMb: n } : { ...row, maxDaysSinceUpdate: n };
                        setRules(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputCls}
                      value={Number(row.score ?? 0)}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...row, score: numOr(e.target.value, 0) };
                        setRules(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={cn(inputCls, "font-sans")}
                      value={String(row.label ?? "")}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...row, label: e.target.value };
                        setRules(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={() => setRules(rules.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** ---- community ---- */
function CommunityEditor({ value, onChange }: { value: CommunityLibJson; onChange: (v: CommunityLibJson) => void }) {
  const { t } = useUiCopy();
  const fanTierRules = ensureArray<{ minFans: number; score: number }>(value.fanTierRules);

  const setFan = (rows: typeof fanTierRules) => onChange({ ...value, fanTierRules: rows });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">version</span>
          <input
            type="number"
            className={inputCls}
            value={value.version ?? ""}
            onChange={(e) => onChange({ ...value, version: numOr(e.target.value, 1) })}
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">neutralScore</span>
          <input
            type="number"
            className={inputCls}
            value={value.neutralScore ?? ""}
            onChange={(e) => onChange({ ...value, neutralScore: numOr(e.target.value, 55) })}
          />
        </label>
      </div>
      <label className="text-xs space-y-1 block">
        <span className="text-muted-foreground">notes</span>
        <textarea className={cn(inputCls, "min-h-[72px]")} value={value.notes ?? ""} onChange={(e) => onChange({ ...value, notes: e.target.value })} />
      </label>

      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div>
            <h4 className="text-xs font-semibold">{t("Bậc theo số fans / community", "Fan count tiers")}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Mỗi dòng: ngưỡng tối thiểu fans và điểm tương ứng (logic backend sort theo minFans).",
                "Each row: minimum fans threshold and score (backend picks highest matching tier).",
              )}
            </p>
          </div>
          <button
            type="button"
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground shrink-0"
            onClick={() => setFan([...fanTierRules, { minFans: 0, score: 55 }])}
          >
            <Plus className="w-3.5 h-3.5" /> {t("Thêm dòng", "Add row")}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-medium">minFans</th>
                <th className="text-left p-2 font-medium w-24">{t("Điểm", "Score")}</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {fanTierRules.map((row, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputCls}
                      value={row.minFans}
                      onChange={(e) => {
                        const next = [...fanTierRules];
                        next[i] = { ...row, minFans: numOr(e.target.value, 0) };
                        setFan(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className={inputCls}
                      value={row.score}
                      onChange={(e) => {
                        const next = [...fanTierRules];
                        next[i] = { ...row, score: numOr(e.target.value, 0) };
                        setFan(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      onClick={() => setFan(fanTierRules.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** pending-additions.json full file editor (includes merged) */
function PendingFileEditor({ value }: { value: PendingFileJson }) {
  const { t } = useUiCopy();
  const items = ensureArray<Record<string, unknown>>(value.items);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold">
          {t("pending-additions.json", "pending-additions.json")}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "Nên xử lý hàng pending ở bảng Merge request bên dưới; bảng này chỉ xem nhanh toàn bộ dòng trong file.",
            "Prefer the Merge request table below for pending rows; this is a quick view of all rows in the file.",
          )}
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border max-h-[480px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/90">
            <tr className="border-b border-border">
              <th className="text-left p-2">type</th>
              <th className="text-left p-2">label</th>
              <th className="text-left p-2">status</th>
              <th className="text-left p-2">appId</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="p-2 font-mono">{String(row.type ?? "")}</td>
                <td className="p-2 max-w-[200px] truncate">{String(row.label ?? "")}</td>
                <td className="p-2">{String(row.status ?? "")}</td>
                <td className="p-2">{String(row.appId ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-amber-600">
        {t("Chỉnh sửa hàng loạt: dùng JSON thô trên trang.", "Bulk edit: use raw JSON on this page.")}
      </p>
    </div>
  );
}

export function formatPendingSuggestion(p: LibraryPendingItem, tierMap: Record<string, number>): string {
  const j = p.jsonSuggestion ?? {};
  if (p.type === "game_size" && typeof j.maxMb === "number") {
    return `≤${j.maxMb} MB (add score to merge)`;
  }
  if (p.type === "update_signal" && typeof j.maxDaysSinceUpdate === "number") {
    return `≤${j.maxDaysSinceUpdate}d (add score to merge)`;
  }
  if (p.type === "community_signal" && typeof j.minFans === "number") {
    return `minFans ${j.minFans} (add score to merge)`;
  }
  if (p.type === "studio" && typeof j.score === "number") {
    return `${j.score}${typeof j.tier === "string" ? ` · tier ${j.tier}` : ""}`;
  }
  const ex = (j.example ?? j.exampleRow) as { tier?: string; score?: number; match?: string[] } | undefined;
  if (ex?.score != null && typeof ex.score === "number") return String(ex.score);
  if (ex?.tier && tierMap[ex.tier] != null) return `${ex.tier} → ${tierMap[ex.tier]}`;
  if (ex?.tier) return `tier ${ex.tier}`;
  if (typeof j.score === "number") return String(j.score);
  return "—";
}

function typesNeedKeywordsEn(t: string): boolean {
  return t === "genre_tags" || t === "ip_theme" || t === "system_spec" || t === "art_style";
}

function mergeRequiresScoreInput(p: LibraryPendingItem): boolean {
  const j = p.jsonSuggestion ?? {};
  if (typeof j.score === "number") return false;
  if (p.type === "genre_tags") {
    const ex = j.exampleRow as { tier?: string } | undefined;
    if (ex?.tier) return false;
  }
  return true;
}

function canExecuteMerge(
  p: LibraryPendingItem,
  tierMap: Record<string, number>,
  scoreStr: string,
  kwStr: string,
): boolean {
  if (typesNeedKeywordsEn(p.type) && !kwStr.trim()) return false;
  if (mergeRequiresScoreInput(p)) {
    const n = parseFloat(scoreStr);
    if (!Number.isFinite(n)) return false;
  }
  return true;
}

function buildMergeBody(
  p: LibraryPendingItem,
  scoreStr: string,
  kwStr: string,
  tierStr: string,
): {
  score?: number;
  tier?: string;
  keywordsEn?: string;
  maxMb?: number;
  maxDaysSinceUpdate?: number;
  minFans?: number;
} {
  const j = p.jsonSuggestion ?? {};
  const out: {
    score?: number;
    tier?: string;
    keywordsEn?: string;
    maxMb?: number;
    maxDaysSinceUpdate?: number;
    minFans?: number;
  } = {};
  const sn = parseFloat(scoreStr);
  if (Number.isFinite(sn)) out.score = sn;
  if (tierStr.trim()) out.tier = tierStr.trim();
  if (kwStr.trim()) out.keywordsEn = kwStr.trim();
  if (typeof j.maxMb === "number") out.maxMb = j.maxMb;
  if (typeof j.maxDaysSinceUpdate === "number") out.maxDaysSinceUpdate = j.maxDaysSinceUpdate;
  if (typeof j.minFans === "number") out.minFans = j.minFans;
  return out;
}

export function PendingMergeTable({
  pending,
  tierMap,
  onMerge,
  onDelete,
  merging,
  deleting,
}: {
  pending: LibraryPendingItem[];
  tierMap: Record<string, number>;
  onMerge: (
    id: string,
    body: {
      score?: number;
      tier?: string;
      keywordsEn?: string;
      maxMb?: number;
      maxDaysSinceUpdate?: number;
      minFans?: number;
    },
  ) => void;
  onDelete: (id: string) => void;
  merging: boolean;
  deleting: boolean;
}) {
  const { t } = useUiCopy();
  const [scoreById, setScoreById] = useState<Record<string, string>>({});
  const [kwById, setKwById] = useState<Record<string, string>>({});
  const [tierById, setTierById] = useState<Record<string, string>>({});

  const setScore = useCallback((id: string, v: string) => {
    setScoreById((m) => ({ ...m, [id]: v }));
  }, []);
  const setKw = useCallback((id: string, v: string) => {
    setKwById((m) => ({ ...m, [id]: v }));
  }, []);
  const setTier = useCallback((id: string, v: string) => {
    setTierById((m) => ({ ...m, [id]: v }));
  }, []);

  if (pending.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("Không có pending.", "No pending items.")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            <th className="text-left p-2 font-medium">{t("Loại", "Type")}</th>
            <th className="text-left p-2 font-medium">{t("Nhãn / pattern", "Label")}</th>
            <th className="text-left p-2 font-medium">{t("Game", "Game")}</th>
            <th className="text-left p-2 font-medium w-16">appId</th>
            <th className="text-left p-2 font-medium">{t("Đề xuất điểm / tier", "Suggested score")}</th>
            <th className="text-left p-2 font-medium min-w-[160px]">{t("Chi tiết", "Detail")}</th>
            <th className="text-left p-2 font-medium w-20">{t("Điểm nhập", "Score")}</th>
            <th className="text-left p-2 font-medium min-w-[120px]">{t("Từ khóa EN", "EN keywords")}</th>
            <th className="text-left p-2 font-medium w-14">{t("Tier", "Tier")}</th>
            <th className="text-right p-2 font-medium min-w-[140px]">{t("Thao tác", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {pending.map((p) => {
            const scoreStr = scoreById[p.id] ?? "";
            const kwStr = kwById[p.id] ?? "";
            const tierStr = tierById[p.id] ?? "";
            const ok = canExecuteMerge(p, tierMap, scoreStr, kwStr);
            const body = buildMergeBody(p, scoreStr, kwStr, tierStr);
            return (
              <tr key={p.id} className="border-b border-border/60 align-top hover:bg-muted/20">
                <td className="p-2 font-mono whitespace-nowrap">{p.type}</td>
                <td className="p-2 max-w-[140px] break-words">{p.label}</td>
                <td className="p-2 max-w-[120px] truncate" title={p.gameName}>
                  {p.gameName}
                </td>
                <td className="p-2 tabular-nums">{p.appId}</td>
                <td className="p-2 font-semibold text-primary whitespace-nowrap">{formatPendingSuggestion(p, tierMap)}</td>
                <td className="p-2 text-muted-foreground leading-snug">{p.detailVi}</td>
                <td className="p-2 align-top">
                  {mergeRequiresScoreInput(p) ? (
                    <input
                      type="number"
                      className={cn(inputCls, "w-full min-w-[4rem]")}
                      placeholder="0–100"
                      value={scoreStr}
                      onChange={(e) => setScore(p.id, e.target.value)}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-2 align-top">
                  {typesNeedKeywordsEn(p.type) ? (
                    <input
                      className={cn(inputCls, "font-sans w-full min-w-[8rem]")}
                      placeholder={t("keyword, …", "keyword, …")}
                      value={kwStr}
                      onChange={(e) => setKw(p.id, e.target.value)}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-2 align-top">
                  <input
                    className={cn(inputCls, "w-full")}
                    placeholder={t("tuỳ chọn", "opt.")}
                    value={tierStr}
                    onChange={(e) => setTier(p.id, e.target.value)}
                  />
                </td>
                <td className="p-2 text-right space-x-1 whitespace-nowrap align-top">
                  <button
                    type="button"
                    disabled={merging || !ok}
                    title={
                      ok
                        ? undefined
                        : t("Nhập đủ điểm / từ khóa EN (nếu cần)", "Fill score / EN keywords as required")
                    }
                    onClick={() => onMerge(p.id, body)}
                    className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40"
                  >
                    {t("Merge → JSON", "Merge → JSON")}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      if (!window.confirm(t("Xóa dòng pending này?", "Delete this pending row?"))) return;
                      onDelete(p.id);
                    }}
                    className="px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {t("Xóa", "Delete")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  fileId: string;
  data: unknown;
  onChange: (next: unknown) => void;
};

export default function LibraryTableEditor({ fileId, data, onChange }: Props) {
  const { t } = useUiCopy();

  const node = useMemo(() => {
    if (!data || typeof data !== "object") {
      return <p className="text-sm text-destructive">{t("Dữ liệu không phải object JSON.", "Data is not a JSON object.")}</p>;
    }

    switch (fileId) {
      case "genre-tiers.json":
        return <GenreEditor value={data as GenreTiersJson} onChange={onChange} />;
      case "studio-tiers.json":
        return <StudioEditor value={data as StudioTiersJson} onChange={onChange} />;
      case "game-size-tiers.json":
        return (
          <RulesRowsEditor
            value={data as Parameters<typeof RulesRowsEditor>[0]["value"]}
            onChange={onChange}
            variant="mb"
          />
        );
      case "update-cycle-tiers.json":
        return (
          <RulesRowsEditor
            value={data as Parameters<typeof RulesRowsEditor>[0]["value"]}
            onChange={onChange}
            variant="days"
          />
        );
      case "community-size-tiers.json":
        return <CommunityEditor value={data as CommunityLibJson} onChange={onChange} />;
      case "ip-theme-tiers.json":
        return (
          <KeywordPatternsEditor
            value={data as KeywordLibJson}
            onChange={onChange}
            title={t("keywordPatterns — IP / theme (EN)", "keywordPatterns — IP/theme (EN)")}
          />
        );
      case "system-requirement-tiers.json":
        return (
          <KeywordPatternsEditor
            value={data as KeywordLibJson}
            onChange={onChange}
            title={t("keywordPatterns — System spec", "keywordPatterns — system requirement")}
          />
        );
      case "art-style-keywords.json":
        return (
          <KeywordPatternsEditor
            value={data as KeywordLibJson}
            onChange={onChange}
            title={t("keywordPatterns — Art style", "keywordPatterns — art style")}
          />
        );
      case "pending-additions.json":
        return <PendingFileEditor value={data as PendingFileJson} />;
      default:
        return null;
    }
  }, [fileId, data, onChange, t]);

  return <div className="library-table-editor">{node}</div>;
}
