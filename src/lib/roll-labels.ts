// How a roll is worded wherever it is stored or shown: the detail the engine
// writes, the chronicle card, cinematic mode's toast and chronicle line. An
// attack or damage roll records its attacker, who goes in front, and its
// detail says what was used and against whom, so each creature is named
// once. Every other roll, and one stored before the attacker was recorded,
// keeps the sheet it concerns (characterId) in front, as it always has.
// Pure (type imports only), so client components and test scripts import it.

import type { StoredRoll } from "@/lib/db/rolls";
import type { MessageKey } from "@/lib/i18n/messages/index";

type Worded = Pick<StoredRoll, "kind" | "detail" | "attacker">;

// One target: "Club vs Aria".
export function rollAgainst(what: string, target: string): string {
  return `${what} vs ${target}`;
}

// An area's creatures, or what a fall lands on: "Fireball on Goblin 1, Goblin 2".
// An area that caught only creatures the table cannot see names none.
export function rollOn(what: string, targets: string[]): string {
  return targets.length ? `${what} on ${targets.join(", ")}` : what;
}

// Who made the roll: its attacker, else the sheet it concerns.
export function rollerName(roll: Pick<StoredRoll, "attacker">, sheetName: string | undefined): string | undefined {
  return roll.attacker ? roll.attacker.name : sheetName;
}

// A roll kind as the table reads it, on every card and in cinematic mode.
export const ROLL_KIND_LABELS: Record<string, string> = {
  skill_check: "Skill check",
  saving_throw: "Saving throw",
  ability_check: "Ability check",
  attack: "Attack roll",
  damage: "Damage",
  initiative: "Initiative",
  custom: "Roll",
};

// The chronicle card's line: "Goblin · Attack roll (Club vs Aria)".
const ROLL_KIND_MESSAGE_KEYS: Record<string, MessageKey> = {
  skill_check: "campaign.afterRoll.kind.skillCheck",
  saving_throw: "campaign.afterRoll.kind.savingThrow",
  ability_check: "campaign.afterRoll.kind.abilityCheck",
  attack: "campaign.afterRoll.kind.attack",
  damage: "campaign.afterRoll.kind.damage",
  initiative: "campaign.afterRoll.kind.initiative",
  custom: "campaign.afterRoll.kind.roll",
};

type RollTranslator = (key: MessageKey) => string;

export function rollCardLabel(
  roll: Worded,
  sheetName: string | undefined,
  translate?: RollTranslator,
): string {
  const who = rollerName(roll, sheetName);
  const detail = roll.detail ? roll.detail.replaceAll("_", " ") : "";
  const kind = translate
    ? translate(ROLL_KIND_MESSAGE_KEYS[roll.kind] ?? "campaign.afterRoll.kind.roll")
    : ROLL_KIND_LABELS[roll.kind] ?? "Roll";
  return `${who ? `${who} · ` : ""}${kind}${detail ? ` (${detail})` : ""}`;
}

// Cinematic mode's roll pill, up to the dice: "Goblin · Club vs Aria".

const CINEMATIC_ROLL_KIND_KEYS: Record<string, MessageKey> = {
  skill_check: "campaign.session.roll.kind.skillCheck",
  saving_throw: "campaign.session.roll.kind.savingThrow",
  ability_check: "campaign.session.roll.kind.abilityCheck",
  attack: "campaign.session.roll.kind.attack",
  damage: "campaign.session.roll.kind.damage",
  initiative: "campaign.session.roll.kind.initiative",
  custom: "campaign.session.roll.kind.roll",
};

export function rollToastLead(roll: Worded & Pick<StoredRoll, "requestedBy">, sheetName: string | undefined, translate?: RollTranslator): string {
  const who = rollerName(roll, sheetName);
  const label = translate ? translate(CINEMATIC_ROLL_KIND_KEYS[roll.kind] ?? "campaign.session.roll.kind.roll") : ROLL_KIND_LABELS[roll.kind] || "Roll";
  const what = roll.detail.trim() || label;
  return `${who ? `${who} · ` : roll.requestedBy === "dm" ? "The GM · " : ""}${what}`;
}

// Cinematic mode's chronicle line, up to the dice. A roll without an
// attacker keeps the reading it always had: its detail alone, which for a
// roll stored before the attacker was recorded still opens with the roller's
// name.
export function rollChronicleLead(roll: Worded, sheetName: string | undefined, translate?: RollTranslator): string {
  const label = translate ? translate(CINEMATIC_ROLL_KIND_KEYS[roll.kind] ?? "campaign.session.roll.kind.roll") : ROLL_KIND_LABELS[roll.kind] || "Roll";
  const detail = roll.detail.trim();
  if (roll.attacker) {
    return `${roll.attacker.name} · ${detail || label}`;
  }
  return detail || (sheetName ? `${sheetName} · ${label}` : label);
}
