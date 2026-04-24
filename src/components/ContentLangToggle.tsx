import { useContentLang } from "@/lib/content-language";
import { cn } from "@/lib/utils";

export default function ContentLangToggle() {
  const { lang, setLang } = useContentLang();

  return (
    <div
      className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium"
      role="group"
      aria-label="Content language"
    >
      <button
        type="button"
        onClick={() => setLang("vi")}
        className={cn(
          "px-2.5 py-1 rounded-md transition-colors",
          lang === "vi" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "px-2.5 py-1 rounded-md transition-colors",
          lang === "en" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        EN
      </button>
    </div>
  );
}
