"use client";

import { useI18n } from "@/lib/i18n/provider";
import { abilityName } from "./lineage";

// A card's words with each ability code ("CON +2", "INT caster") printed as
// it is and spoken as the ability's name (backlog F11): the code is hidden
// from a screen reader and the name sits beside it for one only, so "CON +2"
// is heard as "Constitution +2". The abbreviation's title shows the name to a
// pointer that rests on it.
const CODE = /\b(STR|DEX|CON|INT|WIS|CHA)\b/;

const ABILITY_KEYS: Record<string, string> = {
  STR: "charSheet.ability.str",
  DEX: "charSheet.ability.dex",
  CON: "charSheet.ability.con",
  INT: "charSheet.ability.int",
  WIS: "charSheet.ability.wis",
  CHA: "charSheet.ability.cha",
};

export function AbilityText({ text }: { text: string }) {
  const { t } = useI18n();
  const parts = text.split(CODE);
  if (parts.length === 1) {
    return text;
  }
  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return part;
    }
    const key = ABILITY_KEYS[part];
    const name = key ? t(key as never) : abilityName(part.toLowerCase());
    return (
      <abbr key={index} title={name} className="no-underline">
        <span aria-hidden="true">{part}</span>
        <span className="sr-only">{name}</span>
      </abbr>
    );
  });
}
