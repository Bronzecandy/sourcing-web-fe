import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  className?: string;
};

export default function PageHeader({
  icon,
  title,
  description,
  actions,
  stats,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && <div className="shrink-0 text-primary">{icon}</div>}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {stats}
    </div>
  );
}
