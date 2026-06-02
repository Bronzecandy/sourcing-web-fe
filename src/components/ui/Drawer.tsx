import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnIcon } from "@/lib/button-classes";

type DrawerSize = "default" | "wide" | "full";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: DrawerSize;
};

const SIZE_CLASS: Record<DrawerSize, string> = {
  default: "max-w-lg",
  wide: "max-w-2xl",
  full: "max-w-none w-full sm:max-w-3xl lg:max-w-4xl",
};

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
  size = "default",
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative flex flex-col w-full h-full bg-card border-l border-border shadow-xl",
          SIZE_CLASS[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 id="drawer-title" className="text-lg font-semibold truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(btnIcon, "text-muted-foreground shrink-0")}
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="shrink-0 px-5 py-4 border-t border-border bg-muted/20">{footer}</footer>
        )}
      </aside>
    </div>
  );
}
