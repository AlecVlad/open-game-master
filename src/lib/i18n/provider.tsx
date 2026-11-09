"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANG, LANG_COOKIE, translate, translatePlural, type Lang, type Params } from "./core.ts";
import { DICTIONARIES, type MessageKey } from "./messages/index.ts";

// The interface language for everything under it. The server reads the same
// choice from its cookie (./server.ts) and hands it in as `lang`, so the
// first paint is already in the reader's language.
type I18n = {
  lang: Lang;
  t: (key: MessageKey, params?: Params) => string;
  // A message that depends on a count (see translatePlural in core.ts).
  tp: (key: string, count: number, params?: Params) => string;
  setLang: (lang: Lang) => void;
};

const fallback: I18n = {
  lang: DEFAULT_LANG,
  t: (key, params) => translate(DICTIONARIES, DEFAULT_LANG, key, params),
  tp: (key, count, params) => translatePlural(DICTIONARIES, DEFAULT_LANG, key, count, params),
  setLang: () => undefined,
};

const I18nContext = createContext<I18n>(fallback);

export function I18nProvider({ lang: initial, children }: { lang: Lang; children: ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initial);

  const setLang = useCallback(
    (next: Lang) => {
      try {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // Cookies blocked: the choice lasts until the page is closed.
      }
      document.documentElement.lang = next;
      setLangState(next);
      // Pages the server rendered read the cookie again.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18n>(
    () => ({
      lang,
      t: (key, params) => translate(DICTIONARIES, lang, key, params),
      tp: (key, count, params) => translatePlural(DICTIONARIES, lang, key, count, params),
      setLang,
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}

// The common case: just the lookup.
export function useT(): I18n["t"] {
  return useContext(I18nContext).t;
}
