import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: ReactNode;
  badge?: number;
};

type TabsProps = {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

export default function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1 border-b border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all duration-150 hover:bg-muted/40 rounded-t-md",
            active === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
          )}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold min-w-[1.25rem] text-center",
                active === tab.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
