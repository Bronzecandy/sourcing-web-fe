import { LogIn } from "lucide-react";
import { useUiCopy } from "@/lib/use-ui-copy";
import { useDocumentBrand } from "@/lib/brand";
import BrandLogo from "@/components/brand/BrandLogo";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

export default function LoginPage() {
  const { t } = useUiCopy();
  useDocumentBrand("sourcing");

  return (
    <div className="brand-hero min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-8 text-center space-y-7 shadow-2xl backdrop-blur">
        <BrandLogo brand="sourcing" size="md" className="justify-center" />
        <p className="text-sm text-white/80">
          {t("Đăng nhập để truy cập công cụ phân tích game", "Sign in to access game analytics")}
        </p>
        <a
          href={`${apiBase.replace(/\/$/, "")}/auth/google`}
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-brand-yellow text-brand-navy px-4 py-3 font-semibold hover:brightness-105 transition"
        >
          <LogIn className="w-5 h-5" />
          {t("Đăng nhập với Google", "Sign in with Google")}
        </a>
      </div>
    </div>
  );
}
