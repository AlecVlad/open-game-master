import { workshopClassName } from "@/lib/classes/workshop-registry";
import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages/index";

export type CharacterNameTranslator = (key: MessageKey, params?: Params) => string;

function wordsFromId(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function translatedName(key: string, fallback: string, t: CharacterNameTranslator): string {
  const messageKey = key as MessageKey;
  const value = t(messageKey);
  return value === key ? fallback : value;
}

// User-authored labels take precedence; standard ids use the shared catalogue.
export function characterRaceName(id: string, label: string | null | undefined, t: CharacterNameTranslator): string {
  if (label) return label;
  return translatedName(`charSheet.race.${id}`, wordsFromId(id), t);
}

export function characterClassName(
  id: string,
  t: CharacterNameTranslator,
  preferredName?: string | null,
): string {
  if (preferredName) return preferredName;
  const workshopName = workshopClassName(id);
  if (workshopName) return workshopName;
  return translatedName(`charSheet.class.${id}`, wordsFromId(id), t);
}

export function characterSubclassName(classId: string, name: string, t: CharacterNameTranslator): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return translatedName(`workshop.monsterEditor.kit.subclass.${classId}.${slug}`, name, t);
}

export function characterBackgroundName(
  id: string,
  label: string | null | undefined,
  t: CharacterNameTranslator,
): string {
  if (label) return label;
  return translatedName(`charSheet.background.${id}`, wordsFromId(id), t);
}
