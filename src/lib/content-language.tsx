import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ContentLang = "vi" | "en";

const STORAGE_KEY = "sourcing-content-lang";

type Ctx = {
  lang: ContentLang;
  setLang: (l: ContentLang) => void;
};

const ContentLangContext = createContext<Ctx>({
  lang: "vi",
  setLang: () => {},
});

function readStoredLang(): ContentLang {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "en" || s === "vi") return s;
  } catch {
    /* ignore */
  }
  return "vi";
}

export function ContentLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<ContentLang>(readStoredLang);

  const setLang = useCallback((l: ContentLang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return (
    <ContentLangContext.Provider value={value}>
      {children}
    </ContentLangContext.Provider>
  );
}

export function useContentLang(): Ctx {
  return useContext(ContentLangContext);
}
