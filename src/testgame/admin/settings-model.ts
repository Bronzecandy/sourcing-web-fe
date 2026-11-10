import type { ConfigLibraryRow, TestGameSettings } from "../types";

export const CONFIG_LEVELS = ["Rất cao", "Cao", "Trung bình", "Thấp", "Rất thấp"];

export type NumKey = "sendHour" | "remindAfterDays" | "responseDays" | "remindBeforeDays" | "evidenceMax" | "footageMaxMb";

/** Cùng giới hạn `saveSettings` ở BE (BE tự kẹp, FE báo lỗi thay vì lưu lặng lẽ). */
export const RANGES: Record<NumKey, [number, number]> = {
  sendHour: [0, 23],
  remindAfterDays: [1, 14],
  responseDays: [1, 30],
  remindBeforeDays: [1, 14],
  evidenceMax: [1, 5],
  footageMaxMb: [10, 1024],
};

export type SettingsDraft = Record<NumKey, string> &
  Pick<TestGameSettings, "senderName" | "senderEmail" | "seatalkGroupId" | "driveRootFolderId" | "configLibrary">;

export const SETTING_LABEL: Record<keyof TestGameSettings, string> = {
  sendHour: "Giờ gửi",
  remindAfterDays: "Nhắc phản hồi sau",
  responseDays: "Hạn phản hồi",
  remindBeforeDays: "Nhắc trước hạn test",
  senderName: "Tên người gửi",
  senderEmail: "Email liên hệ",
  seatalkGroupId: "Group SeaTalk",
  driveRootFolderId: "Folder Drive gốc",
  evidenceMax: "Số ảnh bằng chứng",
  footageMaxMb: "Dung lượng footage",
  configLibrary: "Library cấu hình",
};

const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[a-z]{2,}$/i;
const DRIVE_ID_RE = /^[A-Za-z0-9_-]{10,}$/;

/** Rất cao → Rất thấp; level lạ (sửa tay trong DB) giữ ở cuối. */
export function normalizeLibrary(rows: ConfigLibraryRow[]): ConfigLibraryRow[] {
  const fixed = CONFIG_LEVELS.map((level) => rows.find((r) => r.level === level) ?? { level, android: "", ios: "", pc: "" });
  return [...fixed, ...rows.filter((r) => !CONFIG_LEVELS.includes(r.level))];
}

export function toDraft(s: TestGameSettings): SettingsDraft {
  return {
    sendHour: String(s.sendHour),
    remindAfterDays: String(s.remindAfterDays),
    responseDays: String(s.responseDays),
    remindBeforeDays: String(s.remindBeforeDays),
    evidenceMax: String(s.evidenceMax),
    footageMaxMb: String(s.footageMaxMb),
    senderName: s.senderName,
    senderEmail: s.senderEmail,
    seatalkGroupId: s.seatalkGroupId,
    driveRootFolderId: s.driveRootFolderId,
    configLibrary: normalizeLibrary(s.configLibrary),
  };
}

export function toSettings(d: SettingsDraft): TestGameSettings {
  return {
    sendHour: Number(d.sendHour),
    remindAfterDays: Number(d.remindAfterDays),
    responseDays: Number(d.responseDays),
    remindBeforeDays: Number(d.remindBeforeDays),
    evidenceMax: Number(d.evidenceMax),
    footageMaxMb: Number(d.footageMaxMb),
    senderName: d.senderName.trim(),
    senderEmail: d.senderEmail.trim(),
    seatalkGroupId: d.seatalkGroupId.trim(),
    driveRootFolderId: d.driveRootFolderId.trim(),
    configLibrary: d.configLibrary
      .map((r) => ({ level: r.level, android: r.android.trim(), ios: r.ios.trim(), pc: r.pc.trim() }))
      .filter((r) => r.android || r.ios || r.pc),
  };
}

export function changedSettings(next: TestGameSettings, base: TestGameSettings): Partial<TestGameSettings> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(next) as Array<keyof TestGameSettings>) {
    if (JSON.stringify(next[k]) !== JSON.stringify(base[k])) out[k] = next[k];
  }
  return out as Partial<TestGameSettings>;
}

export function validateSettings(d: SettingsDraft): Partial<Record<keyof SettingsDraft, string>> {
  const e: Partial<Record<keyof SettingsDraft, string>> = {};
  for (const [k, [min, max]] of Object.entries(RANGES) as Array<[NumKey, [number, number]]>) {
    const n = Number(d[k]);
    if (d[k].trim() === "" || !Number.isInteger(n) || n < min || n > max) e[k] = `Số nguyên từ ${min} đến ${max}`;
  }
  if (d.senderEmail.trim() && !EMAIL_RE.test(d.senderEmail.trim())) e.senderEmail = "Email không hợp lệ";
  if (d.driveRootFolderId.trim() && !DRIVE_ID_RE.test(d.driveRootFolderId.trim())) {
    e.driveRootFolderId = "ID folder không hợp lệ — dán link folder Drive hoặc ID";
  }
  return e;
}

/** Nhận cả link `drive.google.com/drive/folders/<id>` hoặc `?id=<id>`. */
export function driveFolderId(value: string): string {
  const s = value.trim();
  return s.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1] ?? s.match(/[?&]id=([A-Za-z0-9_-]+)/)?.[1] ?? s;
}

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/** Thời điểm gửi từng mốc — theo `scheduler.ts`, `campaigns.ts` (M1), `tester-flow.ts` (M3). */
export function mailTiming(code: string, s: Pick<TestGameSettings, "remindAfterDays" | "remindBeforeDays"> | undefined): string {
  switch (code) {
    case "M1":
      return "Khi Initiate, hoặc khi thêm tester vào game test đã Initiate";
    case "M2":
      return `${s?.remindAfterDays ?? 1} ngày sau khi mời, nếu tester chưa phản hồi`;
    case "M3":
      return "Ngay khi tester xác nhận tham gia";
    case "M4":
      return "Ngày bắt đầu test";
    case "M5":
      return `${s?.remindBeforeDays ?? 2} ngày trước hạn test, nếu chưa nộp`;
    case "M6":
      return "Ngày hạn test, nếu chưa nộp";
    case "M7":
      return "Ngày sau hạn test (game test chuyển Reporting)";
    default:
      return "—";
  }
}
