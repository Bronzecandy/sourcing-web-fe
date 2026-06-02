import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUiCopy } from "@/lib/use-ui-copy";

export default function WaitingPage() {
  const { t } = useUiCopy();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <Clock className="w-12 h-12 mx-auto text-amber-500" />
        <h1 className="text-xl font-bold">{t("Đang chờ phê duyệt", "Awaiting approval")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Tài khoản của bạn đã đăng ký. Admin sẽ cấp quyền truy cập từng mục trên sidebar.",
            "Your account is registered. An admin will grant access to each section.",
          )}
        </p>
        {user?.email && (
          <p className="text-xs text-muted-foreground">
            {t("Email", "Email")}: {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm text-primary hover:underline"
        >
          {t("Đăng xuất", "Sign out")}
        </button>
      </div>
    </div>
  );
}
