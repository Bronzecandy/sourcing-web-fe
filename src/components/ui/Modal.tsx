import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnGhost, btnIcon } from "@/lib/button-classes";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 transition-opacity"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative flex flex-col w-full max-w-md max-h-[min(90vh,640px)] bg-card border border-border rounded-xl shadow-xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className={btnIcon} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="shrink-0 flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function ModalFooterActions({
  onCancel,
  onSubmit,
  cancelLabel,
  submitLabel,
  submitting,
  submitDisabled,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  cancelLabel: string;
  submitLabel: string;
  submitting?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <>
      <button type="button" onClick={onCancel} className={cn(btnGhost, "px-4 py-2")}>
        {cancelLabel}
      </button>
      <button
        type="button"
        disabled={submitting || submitDisabled}
        onClick={onSubmit}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground transition-all duration-150 hover:bg-primary/90 hover:shadow-sm active:scale-[0.98] disabled:opacity-50",
        )}
      >
        {submitLabel}
      </button>
    </>
  );
}
