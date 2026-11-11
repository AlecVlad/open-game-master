// Localized labels for the Hand's shared-out attacks and targets.
import type { HandShares } from "@/lib/battlemap/hand-core";
import type { Params } from "@/lib/i18n/core";

type PluralTranslator = (key: string, count: number, params?: Params) => string;

const SHARE_UNIT_KEYS: Record<HandShares["unit"], string> = {
  dart: "campaign.session.hand.share.unit.dart",
  ray: "campaign.session.hand.share.unit.ray",
  beam: "campaign.session.hand.share.unit.beam",
  creature: "campaign.session.hand.share.unit.creature",
};

export function handShareUnit(
  unit: HandShares["unit"],
  count: number,
  translatePlural: PluralTranslator,
): string {
  return translatePlural(SHARE_UNIT_KEYS[unit], count);
}

export function handShareUnitCollective(
  unit: HandShares["unit"],
  translate: (key: string) => string,
): string {
  return translate(`${SHARE_UNIT_KEYS[unit]}.collective`);
}


import type { HandGroup, HandGroupKey } from "@/lib/battlemap/hand-groups";
import type { MessageKey } from "@/lib/i18n/messages/index";

type Translator = (key: MessageKey, params?: Params) => string;

const GROUP_TITLE_KEYS: Partial<Record<HandGroupKey, MessageKey>> = {
  spells: "campaign.session.hand.group.name.spells",
  items: "campaign.session.hand.group.name.items",
  actions: "campaign.session.hand.group.name.actions",
  "pool:ki": "campaign.session.hand.group.name.ki",
  "pool:sub_superiority_dice": "campaign.session.hand.group.name.superiority",
  "pool:channel_divinity": "campaign.session.hand.group.name.channelDivinity",
  "pool:sub_psionic_energy": "campaign.session.hand.group.name.psionic",
  "pool:sorcery_points": "campaign.session.hand.group.name.sorcery",
};

const GROUP_COUNT_KEYS: Partial<Record<HandGroupKey, string>> = {
  spells: "campaign.session.hand.group.count.spell",
  items: "campaign.session.hand.group.count.card",
  actions: "campaign.session.hand.group.count.action",
  "pool:ki": "campaign.session.hand.group.count.technique",
  "pool:sub_superiority_dice": "campaign.session.hand.group.count.maneuver",
  "pool:channel_divinity": "campaign.session.hand.group.count.option",
  "pool:sub_psionic_energy": "campaign.session.hand.group.count.use",
  "pool:sorcery_points": "campaign.session.hand.group.count.option",
};

const GROUP_NOUN_KEYS: Partial<Record<HandGroupKey, MessageKey>> = {
  spells: "campaign.session.hand.group.noun.spell",
  items: "campaign.session.hand.group.noun.card",
  actions: "campaign.session.hand.group.noun.action",
  "pool:ki": "campaign.session.hand.group.noun.technique",
  "pool:sub_superiority_dice": "campaign.session.hand.group.noun.maneuver",
  "pool:channel_divinity": "campaign.session.hand.group.noun.option",
  "pool:sub_psionic_energy": "campaign.session.hand.group.noun.use",
  "pool:sorcery_points": "campaign.session.hand.group.noun.option",
};

const POOL_COUNTER_KEYS: Partial<Record<HandGroupKey, MessageKey>> = {
  "pool:ki": "campaign.session.hand.group.counter.ki",
  "pool:sub_superiority_dice": "campaign.session.hand.group.counter.dice",
  "pool:channel_divinity": "campaign.session.hand.group.counter.uses",
  "pool:sub_psionic_energy": "campaign.session.hand.group.counter.dice",
  "pool:sorcery_points": "campaign.session.hand.group.counter.points",
};

export function handGroupTitle(group: HandGroup, t: Translator): string {
  const key = GROUP_TITLE_KEYS[group.key];
  return key ? t(key) : group.name;
}

export function handGroupNounWord(group: HandGroup, t: Translator): string {
  const key = GROUP_NOUN_KEYS[group.key];
  return key ? t(key) : group.noun[1];
}

export function handGroupNoun(group: HandGroup, count: number, tp: PluralTranslator): string {
  const key = GROUP_COUNT_KEYS[group.key];
  return key ? tp(key, count) : `${count} ${count === 1 ? group.noun[0] : group.noun[1]}`;
}

export function handGroupLeft(group: HandGroup, t: Translator): string {
  if (!group.left) return "";
  if (group.key === "spells") {
    return group.left.split(" · ").map((part) => {
      let match = /^Slots (\\d+)\\/(\\d+)$/.exec(part);
      if (match) return t("campaign.session.hand.group.slotsLeft", { left: Number(match[1]), total: Number(match[2]) });
      match = /^Pact (\\d+)\\/(\\d+)$/.exec(part);
      if (match) return t("campaign.session.hand.group.pactSlotsLeft", { left: Number(match[1]), total: Number(match[2]) });
      return part;
    }).join(" · ");
  }
  const key = POOL_COUNTER_KEYS[group.key];
  const match = /^(?:.+?) (\\d+)\\/(\\d+)$/.exec(group.left);
  return key && match
    ? t("campaign.session.hand.group.poolLeft", {
        label: t(key),
        left: Number(match[1]),
        total: Number(match[2]),
      })
    : group.left;
}

export function handGroupSummary(group: HandGroup, t: Translator, tp: PluralTranslator): string {
  return [handGroupNoun(group, group.cards.length, tp), handGroupLeft(group, t)].filter(Boolean).join(", ");
}

export function handSectionLabel(label: string, t: Translator): string {
  if (label === "Cantrips") return t("campaign.session.hand.group.cantrips");
  const level = /^Level (\\d+)$/.exec(label);
  return level ? t("campaign.session.hand.group.level", { level: Number(level[1]) }) : label;
}

export function handSlotNote(note: string, t: Translator): string {
  if (!note) return "";
  let match = /^(\\d+) of (\\d+) slots$/.exec(note);
  if (match) return t("campaign.session.hand.group.slotNote.slots", { left: Number(match[1]), total: Number(match[2]) });
  match = /^(\\d+) of (\\d+) pact slots(?: \\(level (\\d+)\\))?$/.exec(note);
  if (match) return match[3]
    ? t("campaign.session.hand.group.slotNote.pactLevel", { left: Number(match[1]), total: Number(match[2]), level: Number(match[3]) })
    : t("campaign.session.hand.group.slotNote.pact", { left: Number(match[1]), total: Number(match[2]) });
  match = /^level (\\d+) slots open$/.exec(note);
  if (match) return t("campaign.session.hand.group.slotNote.openLevel", { level: Number(match[1]) });
  match = /^cast with a level (\\d+) slot$/.exec(note);
  if (match) return t("campaign.session.hand.group.slotNote.castLevel", { level: Number(match[1]) });
  if (note === "no slots") return t("campaign.session.hand.group.slotNote.none");
  return note;
}

export function handSectionLine(group: HandGroup, t: Translator): string {
  if (group.sections.length < 2) return "";
  return group.sections.map((section) => {
    const label = handSectionLabel(section.label, t);
    return `${label} ${section.cards.length}`;
  }).join(" · ");
}
