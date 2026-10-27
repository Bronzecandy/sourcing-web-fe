import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { ctaYellow, TESTER_LOGIN_URL } from "./styles";

export default function LoginButton({
  label = "Đăng nhập",
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <a
      href={TESTER_LOGIN_URL}
      className={cn(
        ctaYellow,
        size === "sm" && "px-4 py-2 text-sm",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-base",
        className,
      )}
    >
      <LogIn className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
      {label}
    </a>
  );
}
