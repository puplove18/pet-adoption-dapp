// change the language by clicking the button on top 


import { createContext, useContext, useState, useCallback } from "react";
import translations from "./translations";

const LanguageContext = createContext();

const STORAGE_KEY = "pawledger_lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "en"
  );

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "ja" : "en");
  }, [lang, setLang]);

  /** Translate a key — falls back to english, then to the key itself */
  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en?.[key] ?? key,
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook: const { t, lang, toggleLang } = useTranslation(); */
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within <LanguageProvider>");
  return ctx;
}
