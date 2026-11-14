import { cookies, headers } from "next/headers";
import { LANG_COOKIE, pickLang, translate, type Lang, type Params } from "./core.ts";
import { DICTIONARIES, type MessageKey } from "./messages/index.ts";

// For server components: the reader's language (cookie, else the browser's
// Accept-Language, else English) and a lookup in it.
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const list = await headers();
  return pickLang(jar.get(LANG_COOKIE)?.value, list.get("accept-language"));
}

export async function getT(): Promise<(key: MessageKey, params?: Params) => string> {
  const lang = await getLang();
  return (key, params) => translate(DICTIONARIES, lang, key, params);
}
