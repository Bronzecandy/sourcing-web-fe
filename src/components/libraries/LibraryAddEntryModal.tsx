import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import Modal, { ModalFooterActions } from "@/components/ui/Modal";
import { postLibraryEntry } from "@/services/api";
import { useUiCopy } from "@/lib/use-ui-copy";
import { libraryFileLabel } from "@/lib/library-labels";
const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

type Props = {
  fileId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tierOptions?: string[];
};

export default function LibraryAddEntryModal({
  fileId,
  open,
  onClose,
  onSuccess,
  tierOptions = ["S", "A", "B", "C"],
}: Props) {
  const { t, lang } = useUiCopy();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [tier, setTier] = useState(tierOptions[0] ?? "B");
  const [score, setScore] = useState("70");
  const [studioName, setStudioName] = useState("");
  const [studioTier, setStudioTier] = useState("custom");
  const [studioRoles, setStudioRoles] = useState("developer");
  const [maxMb, setMaxMb] = useState("1000");
  const [maxDays, setMaxDays] = useState("30");
  const [minFans, setMinFans] = useState("10000");
  const [ruleLabel, setRuleLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setKeyword("");
    setTier(tierOptions[0] ?? "B");
    setScore("70");
    setStudioName("");
    setStudioTier("custom");
    setStudioRoles("developer");
    setMaxMb("1000");
    setMaxDays("30");
    setMinFans("10000");
    setRuleLabel("");
  }, [open, fileId, tierOptions]);

  if (!fileId || fileId === "pending-additions.json") return null;

  const label = libraryFileLabel(fileId, lang);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      switch (fileId) {
        case "genre-tiers.json":
          if (!keyword.trim()) throw new Error(t("Nhập từ khóa genre", "Enter a genre keyword"));
          body.keyword = keyword.trim();
          body.tier = tier;
          break;
        case "studio-tiers.json": {
          if (!studioName.trim()) throw new Error(t("Nhập tên studio", "Enter studio name"));
          const s = parseFloat(score);
          if (!Number.isFinite(s)) throw new Error(t("Điểm không hợp lệ", "Invalid score"));
          body.names = studioName.split(",").map((n) => n.trim()).filter(Boolean);
          body.score = s;
          body.tier = studioTier.trim() || "custom";
          body.roles = studioRoles;
          break;
        }
        case "ip-theme-tiers.json":
        case "system-requirement-tiers.json":
        case "art-style-keywords.json": {
          if (!keyword.trim()) throw new Error(t("Nhập từ khóa", "Enter keyword"));
          const s = parseFloat(score);
          if (!Number.isFinite(s)) throw new Error(t("Điểm không hợp lệ", "Invalid score"));
          body.keyword = keyword.trim();
          body.score = s;
          break;
        }
        case "game-size-tiers.json": {
          const mb = parseFloat(maxMb);
          const s = parseFloat(score);
          if (!Number.isFinite(mb) || !Number.isFinite(s)) {
            throw new Error(t("maxMb và điểm phải là số", "maxMb and score must be numbers"));
          }
          body.maxMb = mb;
          body.score = s;
          if (ruleLabel.trim()) body.label = ruleLabel.trim();
          break;
        }
        case "update-cycle-tiers.json": {
          const days = parseFloat(maxDays);
          const s = parseFloat(score);
          if (!Number.isFinite(days) || !Number.isFinite(s)) {
            throw new Error(t("Số ngày và điểm phải là số", "Days and score must be numbers"));
          }
          body.maxDaysSinceUpdate = days;
          body.score = s;
          if (ruleLabel.trim()) body.label = ruleLabel.trim();
          break;
        }
        case "community-size-tiers.json": {
          const fans = parseFloat(minFans);
          const s = parseFloat(score);
          if (!Number.isFinite(fans) || !Number.isFinite(s)) {
            throw new Error(t("minFans và điểm phải là số", "minFans and score must be numbers"));
          }
          body.minFans = fans;
          body.score = s;
          break;
        }
        default:
          throw new Error(t("Loại tài liệu không hỗ trợ thêm", "This document type does not support add"));
      }
      await postLibraryEntry(fileId!, body);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Thêm thất bại", "Add failed"));
    } finally {
      setSubmitting(false);
    }
  }

  function renderFields() {
    switch (fileId) {
      case "genre-tiers.json":
        return (
          <>
            <Field label={t("Từ khóa genre (EN)", "Genre keyword (EN)")}>
              <input
                className={inputCls}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="card rpg, fps, …"
                autoFocus
              />
            </Field>
            <Field label={t("Tier", "Tier")}>
              <select className={inputCls} value={tier} onChange={(e) => setTier(e.target.value)}>
                {tierOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-muted-foreground">
              {t(
                "Lưu ngay vào DB — điểm lấy theo bảng tier của genre-tiers.",
                "Saved immediately to the database — score comes from the tier table.",
              )}
            </p>
          </>
        );
      case "studio-tiers.json":
        return (
          <>
            <Field label={t("Tên studio", "Studio name(s)")}>
              <input
                className={inputCls}
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder={t("Một tên hoặc nhiều tên, cách nhau bởi dấu phẩy", "One or more names, comma-separated")}
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Điểm", "Score")}>
                <input
                  type="number"
                  className={inputCls}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </Field>
              <Field label={t("Tier", "Tier")}>
                <input className={inputCls} value={studioTier} onChange={(e) => setStudioTier(e.target.value)} />
              </Field>
            </div>
            <Field label={t("Roles", "Roles")}>
              <input
                className={inputCls}
                value={studioRoles}
                onChange={(e) => setStudioRoles(e.target.value)}
                placeholder="developer, publisher"
              />
            </Field>
          </>
        );
      case "ip-theme-tiers.json":
      case "system-requirement-tiers.json":
      case "art-style-keywords.json":
        return (
          <>
            <Field label={t("Từ khóa (EN)", "Keyword (EN)")}>
              <input
                className={inputCls}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label={t("Điểm", "Score")}>
              <input type="number" className={inputCls} value={score} onChange={(e) => setScore(e.target.value)} />
            </Field>
          </>
        );
      case "game-size-tiers.json":
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="maxMb">
                <input type="number" className={inputCls} value={maxMb} onChange={(e) => setMaxMb(e.target.value)} />
              </Field>
              <Field label={t("Điểm", "Score")}>
                <input type="number" className={inputCls} value={score} onChange={(e) => setScore(e.target.value)} />
              </Field>
            </div>
            <Field label={t("Nhãn (tuỳ chọn)", "Label (optional)")}>
              <input className={inputCls} value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} />
            </Field>
          </>
        );
      case "update-cycle-tiers.json":
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="maxDaysSinceUpdate">
                <input type="number" className={inputCls} value={maxDays} onChange={(e) => setMaxDays(e.target.value)} />
              </Field>
              <Field label={t("Điểm", "Score")}>
                <input type="number" className={inputCls} value={score} onChange={(e) => setScore(e.target.value)} />
              </Field>
            </div>
            <Field label={t("Nhãn (tuỳ chọn)", "Label (optional)")}>
              <input className={inputCls} value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} />
            </Field>
          </>
        );
      case "community-size-tiers.json":
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="minFans">
              <input type="number" className={inputCls} value={minFans} onChange={(e) => setMinFans(e.target.value)} />
            </Field>
            <Field label={t("Điểm", "Score")}>
              <input type="number" className={inputCls} value={score} onChange={(e) => setScore(e.target.value)} />
            </Field>
          </div>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            {t("Chỉnh loại tài liệu khác trong tab Tài liệu.", "Select another document in the Documents tab.")}
          </p>
        );
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Thêm mới", "Add new")}
      description={label}
      footer={
        <ModalFooterActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          cancelLabel={t("Huỷ", "Cancel")}
          submitLabel={submitting ? t("Đang thêm…", "Adding…") : t("Thêm", "Add")}
          submitting={submitting}
        />
      }
    >
      <div className="space-y-4">
        {renderFields()}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {submitting && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("Đang ghi vào database…", "Writing to database…")}
          </p>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs space-y-1.5">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
