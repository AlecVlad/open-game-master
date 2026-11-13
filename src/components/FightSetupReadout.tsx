"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { DiceKind, DiceRoller } from "@/lib/dice-script-logic";
import type { FightSetupNotice, FightSetupReadout as FightSetupReadoutData } from "@/lib/workshop/fight-setup-logic";

const CONDITION_KEYS: Partial<Record<string, MessageKey>> = {
  blinded: "workshop.homebrew.item.condition.blinded", charmed: "workshop.homebrew.item.condition.charmed",
  deafened: "workshop.homebrew.item.condition.deafened", frightened: "workshop.homebrew.item.condition.frightened",
  grappled: "workshop.homebrew.item.condition.grappled", incapacitated: "workshop.homebrew.item.condition.incapacitated",
  invisible: "workshop.homebrew.item.condition.invisible", paralyzed: "workshop.homebrew.item.condition.paralyzed",
  petrified: "workshop.homebrew.item.condition.petrified", poisoned: "workshop.homebrew.item.condition.poisoned",
  prone: "workshop.homebrew.item.condition.prone", restrained: "workshop.homebrew.item.condition.restrained",
  stunned: "workshop.homebrew.item.condition.stunned", unconscious: "workshop.homebrew.item.condition.unconscious",
};

const DICE_KIND_KEYS: Record<DiceKind, MessageKey> = {
  any: "workshop.testFight.setup.readout.dice.kind.any", attack: "workshop.testFight.setup.readout.dice.kind.attack",
  damage: "workshop.testFight.setup.readout.dice.kind.damage", save: "workshop.testFight.setup.readout.dice.kind.save",
  death_save: "workshop.testFight.setup.readout.dice.kind.deathSave", initiative: "workshop.testFight.setup.readout.dice.kind.initiative",
  check: "workshop.testFight.setup.readout.dice.kind.check",
};

const DICE_ROLLER_KEYS: Record<DiceRoller, MessageKey> = {
  any: "workshop.testFight.setup.readout.dice.roller.next", enemy: "workshop.testFight.setup.readout.dice.roller.enemy",
  hero: "workshop.testFight.setup.readout.dice.roller.hero",
};

function joined(values: string[], and: string): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} ${and} ${values[values.length - 1]}`;
}

export function FightSetupReadout({ readout, notice, className = "space-y-0.5 text-[11px] text-stone-300", itemClassName }: {
  readout: FightSetupReadoutData;
  notice?: Pick<FightSetupNotice, "initiativeOrderReplacesOpeningRolls" | "partyStartsFresh">;
  className?: string;
  itemClassName?: string;
}) {
  const { t } = useI18n();
  const and = t("workshop.testFight.joinAnd");
  const condition = (name: string) => { const key = CONDITION_KEYS[name.toLowerCase()]; return key ? t(key) : name; };
  const lines: string[] = [];
  if (notice) lines.push(t("workshop.testFight.setup.readout.notice.opened"));
  const party = readout.party.kind === "stand-ins"
    ? t("workshop.testFight.setup.readout.party.standIns", { size: readout.party.size, level: readout.party.level })
    : readout.party.kind === "characters"
      ? t("workshop.testFight.setup.readout.party.characters", { count: readout.party.count })
      : t("workshop.testFight.setup.readout.party.elsewhere", { count: readout.party.size });
  lines.push(t("workshop.testFight.setup.readout.saved", { date: readout.savedAt.slice(0, 10), party }));
  const foes = readout.foes.map((foe) => {
    if (foe.status === "dead") return `${foe.name} ${t("workshop.testFight.setup.readout.foe.dead")}`;
    if (foe.status === "fled") return `${foe.name} ${t("workshop.testFight.setup.readout.foe.fled")}`;
    const details: string[] = [];
    if (foe.hp < foe.maxHp) details.push(t("workshop.testFight.setup.readout.foe.hp", { hp: foe.hp, maxHp: foe.maxHp }));
    details.push(...foe.conditions.map(condition));
    if (foe.hidden) details.push(t("workshop.testFight.setup.readout.foe.hidden"));
    return details.length ? t("workshop.testFight.setup.readout.foe.detail", { name: foe.name, details: details.join("; ") }) : "";
  }).filter(Boolean);
  lines.push(foes.length ? t("workshop.testFight.setup.readout.foes.summary", { details: joined(foes, and) }) : t("workshop.testFight.setup.readout.foes.unchanged"));
  const heroes = readout.heroes.map((hero) => {
    const details: string[] = [];
    if (hero.deathState === "dying") details.push(t("workshop.testFight.setup.readout.hero.dying"));
    else if (hero.deathState === "zeroHp") details.push(t("workshop.testFight.setup.readout.hero.zeroHp"));
    details.push(...hero.conditions.map(condition));
    if (hero.slotsSpent) details.push(t("workshop.testFight.setup.readout.hero.slotsSpent", { count: hero.slotsSpent }));
    return t("workshop.testFight.setup.readout.hero.detail", { name: hero.name, details: details.join("; ") });
  });
  if (heroes.length) lines.push(t("workshop.testFight.setup.readout.party.summary", { details: joined(heroes, and) }));
  if (readout.initiative.length) lines.push(t("workshop.testFight.setup.readout.initiative", { order: readout.initiative.map((entry) => `${entry.name} ${entry.initiative}`).join(", ") }));
  if (readout.dice) {
    const dice: string[] = [];
    if (readout.dice.seed !== null) dice.push(t("workshop.testFight.setup.readout.dice.seed", { seed: readout.dice.seed }));
    const forced = readout.dice.queue.map((face) => {
      const kind = t(DICE_KIND_KEYS[face.kind]);
      return face.who
        ? t("workshop.testFight.setup.readout.dice.forcedNamed", { who: face.who, kind, face: face.face })
        : t("workshop.testFight.setup.readout.dice.forcedRoller", { roller: t(DICE_ROLLER_KEYS[face.roller]), kind, face: face.face });
    });
    if (forced.length) dice.push(t("workshop.testFight.setup.readout.dice.forced", { entries: forced.join(" ") }));
    lines.push(t("workshop.testFight.setup.readout.dice.summary", { details: dice.join(" ") }));
  }
  if (notice?.initiativeOrderReplacesOpeningRolls) lines.push(t("workshop.testFight.setup.readout.notice.initiativeReplaced"));
  if (notice?.partyStartsFresh) lines.push(t("workshop.testFight.setup.readout.notice.partyStartsFresh"));
  return <ul className={className}>{lines.map((line, index) => <li key={index} className={itemClassName}>{line}</li>)}</ul>;
}
