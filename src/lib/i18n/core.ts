// The interface language: which languages exist, how a message is looked up,
// filled in and pluralised. Pure functions, no React and no Next, so the
// same code serves the client provider, the server helper and
// scripts/test-i18n.mjs. Messages live in ./messages/ (English is the
// source; any message a language lacks is read in English).

export const LANGS = ["en", "ru"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

// The reader's choice, kept in a cookie so the server can render the right
// language and <html lang> before the page loads.
export const LANG_COOKIE = "ogm-lang";

// Each language's own name, shown to people choosing it.
export const LANG_NAMES: Record<Lang, string> = { en: "English", ru: "Русский" };

export type Messages = Record<string, string>;
export type Dictionaries = Record<Lang, Messages>;
export type Params = Record<string, string | number>;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

// The saved choice wins; with none, the browser's first listed language we
// have; with none of those, English.
export function pickLang(cookieValue: string | undefined, acceptLanguage: string | null | undefined): Lang {
  if (isLang(cookieValue)) {
    return cookieValue;
  }
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase().split("-")[0] ?? "";
    if (isLang(tag)) {
      return tag;
    }
  }
  return DEFAULT_LANG;
}

// "Hello {name}": every {name} is replaced by the parameter of that name; a
// placeholder with no parameter stays as written, so a slip shows.
export function interpolate(template: string, params?: Params): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}

// The message in this language, else in English, else the key itself (so a
// missing message is visible rather than blank).
export function lookup(dictionaries: Dictionaries, lang: Lang, key: string): string {
  return dictionaries[lang][key] ?? dictionaries[DEFAULT_LANG][key] ?? key;
}

export function translate(dictionaries: Dictionaries, lang: Lang, key: string, params?: Params): string {
  return interpolate(lookup(dictionaries, lang, key), params);
}

// A count's form: Russian has one / few / many / other, English one / other.
export function pluralCategory(lang: Lang, count: number): Intl.LDMLPluralRule {
  return new Intl.PluralRules(lang).select(count);
}

// A message that depends on a count keeps one entry per form:
// "users.count.one", "users.count.few", "users.count.many", "users.count.other".
// {count} is filled in automatically. A form a language lacks falls back to
// its ".other", then to English.
export function translatePlural(
  dictionaries: Dictionaries,
  lang: Lang,
  key: string,
  count: number,
  params?: Params,
): string {
  const category = pluralCategory(lang, count);
  const messages = dictionaries[lang];
  const english = dictionaries[DEFAULT_LANG];
  const template =
    messages[`${key}.${category}`] ??
    messages[`${key}.other`] ??
    english[`${key}.${pluralCategory(DEFAULT_LANG, count)}`] ??
    english[`${key}.other`] ??
    key;
  return interpolate(template, { count, ...params });
}
