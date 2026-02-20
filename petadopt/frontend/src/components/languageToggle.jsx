import { useTranslation } from "../i18n/LanguageContext";

/**
 * Compact EN / JP toggle pill that sits in the header.
 * Active language gets a solid background; inactive is muted.
 */
export default function LanguageToggle() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 text-xs font-semibold">
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1.5 transition ${
          lang === "en"
            ? "bg-purple-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("ja")}
        className={`px-2.5 py-1.5 transition ${
          lang === "ja"
            ? "bg-purple-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        JP
      </button>
    </div>
  );
}
