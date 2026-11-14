"use client";

import { LANGS, LANG_NAMES } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/provider";

// The interface language, one button per language, each in its own name.
export function LanguageSwitcher() {
  const { lang, t, setLang } = useI18n();
  return (
    <div data-pill-group="" role="group" aria-label={t("lang.label")} className="flex flex-wrap gap-2">
      {LANGS.map((id) => (
        <button
          key={id}
          type="button"
          lang={id}
          data-on={lang === id ? "" : undefined}
          aria-pressed={lang === id}
          onClick={() => setLang(id)}
          className="theme-card motion-press"
        >
          {LANG_NAMES[id]}
        </button>
      ))}
    </div>
  );
}
