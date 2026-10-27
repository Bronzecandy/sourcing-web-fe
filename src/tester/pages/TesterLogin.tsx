import { useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useDocumentBrand } from "@/lib/brand";
import BrandLogo from "@/components/brand/BrandLogo";

const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export default function TesterLogin() {
  useDocumentBrand("tester");
  const [params] = useSearchParams();
  const domainError = params.get("error") === "domain";

  return (
    <div className="brand-hero flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-white/15 bg-white/10 p-10 text-center text-white shadow-2xl backdrop-blur">
        <BrandLogo brand="tester" size="lg" className="justify-center" />
        <div className="space-y-2">
          <p className="text-lg font-semibold">Trải nghiệm game mới cùng team New Games</p>
          <p className="text-sm text-white/75">
            Đăng nhập bằng Google, làm bảng hỏi khoảng 10 phút để team mời bạn test đúng dòng game bạn giỏi nhất.
          </p>
        </div>
        {domainError && (
          <p className="rounded-lg bg-brand-magenta/30 px-3 py-2 text-sm">
            Email này chưa nằm trong danh sách được đăng ký Tester Program.
          </p>
        )}
        <a
          href={`${apiBase}/auth/google?portal=tester`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-3 font-semibold text-brand-navy transition hover:brightness-105"
        >
          <LogIn className="h-5 w-5" />
          Đăng nhập với Google
        </a>
        <p className="text-xs text-white/60">Powered by Garena</p>
      </div>
    </div>
  );
}
