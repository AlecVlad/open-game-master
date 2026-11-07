// Assert-based tests for the interface-language core and its message files.
// Run with: node scripts/test-i18n.mjs
import assert from "node:assert/strict";
import {
  DEFAULT_LANG,
  LANGS,
  interpolate,
  isLang,
  pickLang,
  pluralCategory,
  translate,
  translatePlural,
} from "../src/lib/i18n/core.ts";
import { DICTIONARIES } from "../src/lib/i18n/messages/index.ts";

// Language choice: the cookie wins, then Accept-Language, then English.
assert.equal(pickLang("ru", "en-US,en;q=0.9"), "ru");
assert.equal(pickLang(undefined, "ru-RU,ru;q=0.9,en;q=0.8"), "ru");
assert.equal(pickLang(undefined, "de-DE,fr;q=0.9,ru;q=0.5"), "ru");
assert.equal(pickLang("xx", "en-GB"), "en");
assert.equal(pickLang(undefined, null), DEFAULT_LANG);
assert.equal(isLang("ru"), true);
assert.equal(isLang("klingon"), false);

// Parameters: replaced where named, left as written where missing.
assert.equal(interpolate("Hi {name}", { name: "Ada" }), "Hi Ada");
assert.equal(interpolate("Hi {name}", {}), "Hi {name}");
assert.equal(interpolate("Plain"), "Plain");

// Lookup: the language, else English, else the key.
const dicts = {
  en: { a: "A", b: "B", "n.one": "{count} file", "n.other": "{count} files" },
  ru: { a: "А", "n.one": "{count} файл", "n.few": "{count} файла", "n.many": "{count} файлов", "n.other": "{count} файла" },
};
assert.equal(translate(dicts, "ru", "a"), "А");
assert.equal(translate(dicts, "ru", "b"), "B");
assert.equal(translate(dicts, "ru", "zzz"), "zzz");

// Russian plurals: 1 file, 2-4 files, 5-20 files, 21 file, 22 files, 25 files.
const ru = (n) => translatePlural(dicts, "ru", "n", n);
assert.equal(ru(1), "1 файл");
assert.equal(ru(2), "2 файла");
assert.equal(ru(5), "5 файлов");
assert.equal(ru(11), "11 файлов");
assert.equal(ru(21), "21 файл");
assert.equal(ru(22), "22 файла");
assert.equal(ru(25), "25 файлов");
assert.equal(translatePlural(dicts, "en", "n", 1), "1 file");
assert.equal(translatePlural(dicts, "en", "n", 3), "3 files");
assert.equal(pluralCategory("ru", 3), "few");

// The shipped messages: every language's keys exist in English (no stray
// keys), every {placeholder} in English is in the translation, and Russian
// carries no placeholder English lacks.
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
for (const lang of LANGS) {
  for (const [key, text] of Object.entries(DICTIONARIES[lang])) {
    // A language may have plural forms English lacks (Russian .few and .many):
    // they stand on English's ".other" of the same message.
    const base = /\.(zero|two|few|many)$/.test(key) ? key.replace(/\.[a-z]+$/, ".other") : key;
    assert.ok(base in DICTIONARIES.en, `${lang} has the key "${key}" English lacks`);
    assert.deepEqual(placeholders(text), placeholders(DICTIONARIES.en[base]), `${lang} "${key}" placeholders differ`);
  }
}

// Report (not fail on) what Russian still lacks, so progress is visible.
const missing = Object.keys(DICTIONARIES.en).filter((key) => !(key in DICTIONARIES.ru));
console.log(`i18n: ${Object.keys(DICTIONARIES.en).length} messages, ${missing.length} not yet in Russian`);
if (missing.length > 0) {
  console.log(`  untranslated: ${missing.join(", ")}`);
}
console.log("i18n tests passed");
