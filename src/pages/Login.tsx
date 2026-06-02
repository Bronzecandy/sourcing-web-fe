import { LogIn } from "lucide-react";
import { useUiCopy } from "@/lib/use-ui-copy";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

export default function LoginPage() {
  const { t } = useUiCopy();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sourcing</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t("Đăng nhập để truy cập công cụ phân tích game", "Sign in to access game analytics")}
          </p>
        </div>
        <a
          href={`${apiBase.replace(/\/$/, "")}/auth/google`}
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground px-4 py-3 font-medium hover:opacity-90 transition-opacity"
        >
          <LogIn className="w-5 h-5" />
          {t("Đăng nhập với Google", "Sign in with Google")}
        </a>
      </div>
    </div>
  );
}
