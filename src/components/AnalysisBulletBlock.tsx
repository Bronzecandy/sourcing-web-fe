export function AnalysisBulletBlock({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={className ?? "list-disc space-y-1.5 pl-5 text-sm text-muted-foreground"}>
      {items.map((line, i) => (
        <li key={i} className="leading-relaxed">
          {line}
        </li>
      ))}
    </ul>
  );
}
