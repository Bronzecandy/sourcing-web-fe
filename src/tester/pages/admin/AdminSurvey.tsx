import { useQuery } from "@tanstack/react-query";
import { testerApi } from "../../api";

export default function AdminSurvey() {
  const { data, isLoading, error } = useQuery({ queryKey: ["tester-admin-survey"], queryFn: testerApi.adminSurveyReport });
  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Không tải được bảng hỏi.</p>;
  const { form, report } = data;
  const issues = [...report.errors.map((e) => `Lỗi: ${e}`), ...report.warnings.map((w) => `Cảnh báo: ${w}`), ...report.placeholders.map((p) => `Placeholder: ${p}`)];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-white p-5 text-sm shadow-sm">
        <h2 className="font-semibold text-brand-navy">
          {form.title} · v{form.version}
        </h2>
        <p className="mt-1 text-muted-foreground">{form.introduction}</p>
        <p className="mt-3">
          {form.questions.length} câu · {data.responses} lượt trả lời ·{" "}
          {issues.length === 0 ? "Cấu hình hợp lệ (không lỗi, không placeholder)" : `${issues.length} vấn đề`}
        </p>
        {issues.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-destructive">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Bảng hỏi lấy từ tab Questionnaire (format survey-toolkit). Sửa trên sheet rồi chạy{" "}
          <code>npm run tester:extract-config</code> và <code>npm run tester:seed -- --force</code> trên BE.
        </p>
      </section>
      <section className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-brand-navy text-white">
            <tr>
              {["c", "Câu hỏi", "Type", "Bắt buộc", "Dòng game", "Đáp án / CONNECT"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.questions.map((q) => (
              <tr key={q.code} className="border-t border-border align-top">
                <td className="px-3 py-2 tabular-nums">{q.number}</td>
                <td className="max-w-md px-3 py-2">{q.text}</td>
                <td className="px-3 py-2">{q.type}</td>
                <td className="px-3 py-2">{q.mustAnswer ? "Y" : "N"}</td>
                <td className="px-3 py-2">{q.genreKey ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {q.options.length === 0
                    ? "—"
                    : q.options.map((o) => (
                        <div key={o.order}>
                          {o.label}
                          {o.connect.length > 0 && <span className="text-brand-violet"> → Q{o.connect.join("&Q")}</span>}
                          {o.textInput && <span className="text-muted-foreground"> [ô nhập]</span>}
                        </div>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
