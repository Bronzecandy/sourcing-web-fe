import { cn } from "@/lib/utils";

/** Shared interactive button styles (hover + focus). */
export const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none";

export const btnGhost = cn(
  btnBase,
  "border border-border bg-background hover:bg-muted hover:border-border/80 active:scale-[0.98]",
);

export const btnPrimary = cn(
  btnBase,
  "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-sm active:scale-[0.98]",
);

export const btnDanger = cn(
  btnBase,
  "border border-destructive/40 text-destructive bg-background hover:bg-destructive/10 active:scale-[0.98]",
);

export const btnSuccess = cn(
  btnBase,
  "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-sm active:scale-[0.98]",
);

export const btnSubtle = cn(
  btnBase,
  "text-primary border border-primary/30 hover:bg-primary/10 active:scale-[0.98]",
);

export const btnIcon = cn(
  "p-1.5 rounded-lg transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
);

export const btnIconDanger = cn(
  btnIcon,
  "text-destructive hover:bg-destructive/10",
);
