// The build math table (backlog F10): every number the sheet will carry,
// beside the picks, with the parts each is made of. Pure, so
// scripts/test-builder-build-math.mjs can check it without React.
//
// Nothing is worked out here. Each number is read from the calculation the
// save and the sheet use: computeSheetDerived's parts for saves, skills,
// initiative and spellcasting, builderHp.ts for hit points, acBreakdownFor
// for armor class, the gear receipt's weapon lines (receiptMath.ts) and the
// slots the save stores (casting.ts builderSpellSlots). This module only
// lays them out as rows and says what changed.
import type { Ability } from "@/lib/schemas/sheet";
import type { MessageKey } from "@/lib/i18n/messages";
import { pickedVariant, type SpeciesVariantGroup } from "@/lib/content/species-variants";
import { SRD_SKILLS, findSkill, formatModifier, proficiencyBonus, type DerivedPart } from "@/lib/srd";
import { ABILITY_NAMES } from "@/lib/srd/legality/types";
import { armorClassLine, hitPointsLine, type BuildMathMessages } from "./derivedReasons";
import { casterLevelFor } from "@/lib/srd/multiclass";
import type { BuilderDerived } from "./useBuilderDerived";

const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const COUNT_WORDS: Record<number, string> = { 1: "one", 2: "two", 3: "three", 4: "four" };

export type BuildMathRow = {
  // Stable across renders: the announcement compares rows by it.
  id: string;
  // The row header.
  label: string;
  value: string;
  // How the number is made: "Dex +3, proficiency +2".
  working: string;
};

export type BuildMathSection = { id: string; title: string; rows: BuildMathRow[] };

export type BuildMathInput = {
  derived: Pick<
    BuilderDerived,
    | "preview"
    | "hp"
    | "acInfo"
    | "ac"
    | "shownAbilities"
    | "effectiveLevel"
    | "spellSlots"
    | "purse"
    | "racialBonus"
    | "abilityGains"
  > &
    // A character with levels in more than one class (backlog F9).
    Partial<Pick<BuilderDerived, "extras" | "casterKlass" | "casterLevel" | "pactSlots" | "multiclass" | "casterDesks" | "classList">>;
  // The scores as assigned, before the race's bonus.
  scores: Record<Ability, number | null>;
  klass: { name: string; hitDie: number } | undefined;
  // Built for a table that has chosen how hit points are worked.
  atTable: boolean;
};
function msg(messages: BuildMathMessages | undefined, key: MessageKey, params: Record<string, string | number>, fallback: string): string {
  return messages?.t?.(key, params) ?? fallback;
}

function pluralMsg(messages: BuildMathMessages | undefined, key: string, count: number, params: Record<string, string | number>, fallback: string): string {
  return messages?.tp?.(key, count, params) ?? fallback;
}


// The parts as a line, in the sheet's own words and signs, as the sheet's
// own breakdown writes them: "DEX modifier +3, proficiency +2".
function translatedPartLabel(label: string, messages?: BuildMathMessages): string {
  if (!messages?.t) return label;
  const ability = /^(STR|DEX|CON|INT|WIS|CHA) modifier$/.exec(label)?.[1]?.toLowerCase();
  if (ability) {
    const name = messages.t(("builder.extra.ability." + ability) as MessageKey);
    return messages.t("builder.extra.buildMath.working.part.ability", { ability: name });
  }
  const keys: Record<string, MessageKey> = {
    proficiency: "builder.extra.buildMath.working.part.proficiency",
    "half proficiency": "builder.extra.buildMath.working.part.halfProficiency",
    expertise: "builder.extra.buildMath.working.part.expertise",
    untrained: "builder.extra.buildMath.working.part.untrained",
    features: "builder.extra.buildMath.working.part.features",
    "subclass features": "builder.extra.buildMath.working.part.subclassFeatures",
    "magic items": "builder.extra.buildMath.working.part.magicItems",
    base: "builder.extra.buildMath.working.part.base",
  };
  const key = keys[label];
  return key ? messages.t(key) : label;
}

export function workingOf(parts: DerivedPart[], messages?: BuildMathMessages): string {
  return parts
    .map((part) => translatedPartLabel(part.label, messages) + " " + formatModifier(part.value))
    .join(", ");
}

// The slot levels in order, keyed as the sheet keys its slots.
const SLOT_LEVELS: Array<[string, string]> = [
  ["1", "1st"], ["2", "2nd"], ["3", "3rd"], ["4", "4th"], ["5", "5th"], ["6", "6th"], ["7", "7th"], ["8", "8th"], ["9", "9th"],
];

export function buildMathSections({ derived, scores, klass, atTable }: BuildMathInput, messages?: BuildMathMessages): BuildMathSection[] {
  const { preview, hp, shownAbilities, effectiveLevel } = derived;
  if (!preview || !shownAbilities || !hp || !klass) {
    return [];
  }
  const sheet = preview.derived;
  const sections: BuildMathSection[] = [];

  const hpLine = hitPointsLine({
    hitDie: klass.hitDie,
    level: effectiveLevel,
    maxHp: preview.maxHp,
    range: preview.hpRange,
    method: preview.hpMethod,
    kept: preview.hpKept,
    atTable,
    ...(derived.multiclass ? { dice: [klass.hitDie, ...(derived.extras ?? []).map((entry) => entry.klass.hitDie)] } : {}),
  }, messages);
  const parts = hp.parts;
  // A class list's later levels, class by class: each its own die.
  const split = hp.split ?? null;
  const nameOf = (id: string) =>
    derived.extras?.find((entry) => entry.klass.id === id)?.klass.name ?? klass.name;
  const hpWorking = preview.hpKept
    ? hpLine.reason
    : (() => {
        const bonus = parts.bonusPerLevel ? formatModifier(parts.bonusPerLevel) : "";
        const bonusPart = parts.bonusPerLevel
          ? msg(messages, "builder.extra.buildMath.working.hp.bonus", { bonus }, ", bonus " + bonus)
          : "";
        const firstFallback = "level 1: d" + parts.hitDie + " " + parts.hitDie + ", Con " + formatModifier(parts.conMod) + bonusPart + " = " + parts.firstLevel;
        const first = msg(messages, "builder.extra.buildMath.working.hp.level1", {
          die: parts.hitDie, con: formatModifier(parts.conMod), bonus: bonusPart, total: parts.firstLevel,
        }, firstFallback);
        const featureLine = parts.featureHp ? msg(messages, "builder.extra.buildMath.working.hp.features", { value: formatModifier(parts.featureHp) }, "features " + formatModifier(parts.featureHp)) : null;
        if (split) {
          return [
            first,
            ...split.filter((entry) => entry.levels > 0).map((entry) => {
              const className = nameOf(entry.id);
              if (preview.hpMethod === "rolled") {
                const fallback = entry.levels + " " + className.toLowerCase() + " " + (entry.levels === 1 ? "level" : "levels") + " rolled on a d" + entry.hitDie + " by the server when you save";
                return pluralMsg(messages, "builder.extra.buildMath.working.hp.classRolled", entry.levels, { className, die: entry.hitDie }, fallback);
              }
              const more = entry === split[0];
              const fallback = entry.levels + " " + (more ? "more " : "") + className.toLowerCase() + " " + (entry.levels === 1 ? "level" : "levels") + " at " + entry.perLevel + " each (d" + entry.hitDie + ") = " + entry.levels * entry.perLevel;
              return pluralMsg(messages, "builder.extra.buildMath.working.hp.classAt", entry.levels, {
                className, perLevel: entry.perLevel, die: entry.hitDie, total: entry.levels * entry.perLevel, more: more ? (messages?.t?.("builder.extra.buildMath.working.hp.more") ?? "more ") : "",
              }, fallback);
            }),
            ...(featureLine ? [featureLine] : []),
          ].join("; ");
        }
        const laterLevels = effectiveLevel - 1;
        const later = laterLevels > 0
          ? preview.hpMethod === "rolled"
            ? pluralMsg(messages, "builder.extra.buildMath.working.hp.levelsRolled", laterLevels, {}, laterLevels + " more levels rolled by the server when you save")
            : pluralMsg(messages, "builder.extra.buildMath.working.hp.levelsAt", laterLevels, {
                perLevel: parts.perLevel,
                faceName: preview.hpMethod === "max" ? (messages?.t?.("builder.extra.buildMath.working.hp.face.max") ?? "die's highest face") : (messages?.t?.("builder.extra.buildMath.working.hp.face.average") ?? "average"),
                face: parts.face, con: formatModifier(parts.conMod), bonus: bonusPart, total: parts.laterLevels,
              }, laterLevels + " more levels at " + parts.perLevel + " each (" + (preview.hpMethod === "max" ? "die's highest face" : "average") + " " + parts.face + ", Con " + formatModifier(parts.conMod) + bonusPart + ") = " + parts.laterLevels)
          : null;
        return [first, ...(later ? [later] : []), ...(featureLine ? [featureLine] : [])].join("; ");
      })();
    const acLine = armorClassLine(derived.acInfo?.ac ?? derived.ac, derived.acInfo?.parts, messages);
  sections.push({
    id: "core",
    title: "Core",
    rows: [
      { id: "ac", label: "Armor class", value: acLine.value, working: acLine.reason },
      { id: "hp", label: "Hit points", value: hpLine.value, working: hpWorking },
      { id: "initiative", label: "Initiative", value: formatModifier(sheet.initiative), working: workingOf(sheet.parts.initiative, messages) },
      {
        id: "proficiency",
        label: "Proficiency bonus",
        value: formatModifier(sheet.proficiencyBonus),
        working: msg(messages, "builder.extra.buildMath.working.level", { level: effectiveLevel }, `level ${effectiveLevel}`),
      },
      {
        id: "passive-perception",
        label: "Passive Perception",
        value: String(sheet.passivePerception),
        working: workingOf(sheet.parts.passivePerception, messages),
      },
    ],
  });

  sections.push({
    id: "abilities",
    title: "Ability scores",
    rows: ABILITIES.map((ability) => {
      const assigned = scores[ability];
      const race = derived.racialBonus[ability] ?? 0;
      const gains = derived.abilityGains[ability] ?? [];
      const working = [
        assigned === null ? null : msg(messages, "builder.extra.buildMath.working.ability.assigned", { score: assigned }, `assigned ${assigned}`),
        race ? msg(messages, "builder.extra.buildMath.working.ability.race", { bonus: formatModifier(race) }, `race ${formatModifier(race)}`) : null,
        ...gains.filter((gain) => gain.amount).map((gain) => msg(messages, "builder.extra.buildMath.working.ability.gain", { source: gain.source, amount: formatModifier(gain.amount) }, `${gain.source} ${formatModifier(gain.amount)}`)),
      ].filter(Boolean);
      return {
        id: `ability-${ability}`,
        label: messages?.t?.((`builder.extra.ability.${ability}`) as MessageKey) ?? ABILITY_NAMES[ability],
        value: `${shownAbilities[ability]} (${formatModifier(sheet.abilityMods[ability])})`,
        working: working.join(", "),
      };
    }),
  });

  sections.push({
    id: "saves",
    title: "Saving throws",
    rows: ABILITIES.map((ability) => ({
      id: `save-${ability}`,
      label: msg(messages, "builder.extra.buildMath.row.save", { ability: messages?.t?.((`builder.extra.ability.${ability}`) as MessageKey) ?? ABILITY_NAMES[ability] }, `${ABILITY_NAMES[ability]} save`),
      value: formatModifier(sheet.saves[ability]),
      working: workingOf(sheet.parts.saves[ability], messages),
    })),
  });

  sections.push({
    id: "skills",
    title: "Skills",
    rows: SRD_SKILLS.map((skill) => ({
      id: `skill-${skill.id}`,
      label: skill.name,
      value: formatModifier(sheet.skills[skill.id] ?? 0),
      working: workingOf(sheet.parts.skills[skill.id] ?? [], messages),
    })),
  });

  // The table the slots are read from: the casting class's at its own
  // level, the first class's for a single class, and the shared multiclass
  // table at the combined caster level for two or more (backlog F9).
  const slotDesks = (derived.casterDesks ?? []).filter((desk) => desk.klass.casterType !== "pact" && desk.maxSpellLevel > 0);
  const slotTable =
    derived.multiclass && slotDesks.length > 1
      ? msg(messages, "builder.extra.buildMath.working.slotTable.multiclass", { level: casterLevelFor(derived.classList ?? []) }, `multiclass table at caster level ${casterLevelFor(derived.classList ?? [])}`)
      : derived.multiclass && derived.casterKlass
        ? msg(messages, "builder.extra.buildMath.working.slotTable.class", { klass: derived.casterKlass.name, level: derived.casterLevel ?? effectiveLevel }, `${derived.casterKlass.name} table at ${derived.casterKlass.name.toLowerCase()} level ${derived.casterLevel ?? effectiveLevel}`)
        : msg(messages, "builder.extra.buildMath.working.slotTable.single", { klass: klass.name, level: effectiveLevel }, `${klass.name} table at level ${effectiveLevel}`);
  // With more than one casting class each has its own save DC and attack,
  // from its own ability (backlog F9, phase 2).
  const desks = (derived.casterDesks ?? []).filter((desk) => desk.ability && desk.spellSaveDc !== null);
  const perClass = derived.multiclass && desks.length > 1;
  const deskRows = perClass
    ? desks.flatMap((desk) => [
        {
          id: `spell-dc-${desk.classId}`,
          label: `${desk.klass.name} spell save DC`,
          value: String(desk.spellSaveDc),
          working: msg(messages, "builder.extra.buildMath.working.spellDc", { proficiency: formatModifier(sheet.proficiencyBonus), ability: (desk.ability ?? "").toUpperCase(), modifier: formatModifier((desk.spellSaveDc ?? 8) - 8 - sheet.proficiencyBonus) }, `8, proficiency ${formatModifier(sheet.proficiencyBonus)}, ${(desk.ability ?? "").toUpperCase()} modifier ${formatModifier((desk.spellSaveDc ?? 8) - 8 - sheet.proficiencyBonus)}`),
        },
        {
          id: `spell-attack-${desk.classId}`,
          label: `${desk.klass.name} spell attack`,
          value: formatModifier(desk.spellAttack ?? 0),
          working: msg(messages, "builder.extra.buildMath.working.spellAttack", { proficiency: formatModifier(sheet.proficiencyBonus), ability: (desk.ability ?? "").toUpperCase(), modifier: formatModifier((desk.spellAttack ?? 0) - sheet.proficiencyBonus) }, `proficiency ${formatModifier(sheet.proficiencyBonus)}, ${(desk.ability ?? "").toUpperCase()} modifier ${formatModifier((desk.spellAttack ?? 0) - sheet.proficiencyBonus)}`),
        },
      ])
    : [];
  const slotRows = [
    ...SLOT_LEVELS.flatMap(([level, ordinal]) => {
      const slot = derived.spellSlots[level];
      return slot && slot.max > 0
        ? [{ id: `slots-${level}`, label: `${ordinal}-level slots`, value: String(slot.max), working: slotTable }]
        : [];
    }),
    // A warlock's pact slots on a class list sit apart from the rest.
    ...(derived.pactSlots
      ? [
          {
            id: "slots-pact",
            label: "Pact magic slots",
            value: msg(messages, "builder.extra.buildMath.working.pactSlotValue", { count: derived.pactSlots.max, level: SLOT_LEVELS[derived.pactSlots.level - 1]?.[1] ?? derived.pactSlots.level }, `${derived.pactSlots.max} at ${SLOT_LEVELS[derived.pactSlots.level - 1]?.[1] ?? derived.pactSlots.level} level`),
            working: messages?.t?.("builder.extra.buildMath.working.pactSlots") ?? "warlock levels, recovered on a short rest",
          },
        ]
      : []),
  ];
  if (sheet.spellSaveDc !== null || slotRows.length || deskRows.length) {
    sections.push({
      id: "spells",
      title: "Spellcasting",
      rows: [
        ...deskRows,
        ...(sheet.spellSaveDc !== null && !perClass
          ? [{ id: "spell-dc", label: "Spell save DC", value: String(sheet.spellSaveDc), working: workingOf(sheet.parts.spellSaveDc, messages) }]
          : []),
        ...(sheet.spellAttack !== null && !perClass
          ? [{ id: "spell-attack", label: "Spell attack", value: formatModifier(sheet.spellAttack), working: workingOf(sheet.parts.spellAttack, messages) }]
          : []),
        ...slotRows,
      ],
    });
  }

  const weapons = derived.purse.receipt.rows.flatMap((row) =>
    row.weapon && row.qty > 0
      ? [
          {
            id: `weapon-${row.name}`,
            label: row.name,
            value: msg(messages, "builder.extra.buildMath.working.weaponValue", { hit: formatModifier(row.weapon.toHit), damage: row.weapon.damage, damageType: row.weapon.damageType }, `${formatModifier(row.weapon.toHit)} to hit, ${row.weapon.damage} ${row.weapon.damageType}`),
            working: [
              msg(messages, "builder.extra.buildMath.working.weaponToHit", { parts: workingOf(row.weapon.toHitParts, messages) }, `to hit: ${workingOf(row.weapon.toHitParts)}`),
              msg(messages, "builder.extra.buildMath.working.weaponDamage", { ability: row.weapon.ability.toUpperCase() }, `damage adds ${row.weapon.ability} modifier`),
              ...row.weapon.notes,
            ].join("; "),
          },
        ]
      : [],
  );
  if (weapons.length) {
    sections.push({ id: "weapons", title: "Weapons", rows: weapons });
  }
  return sections;
}

// What is already settled before the table can be worked out: before six
// scores there is no modifier, but the proficiency bonus, the class's hit
// die and saves, the ancestry's bonuses and speed and the skills picked so
// far are the sheet's already. Read from the same rows the save reads.
// The race is the one the builder reads, with its species option folded in
// (species-variants.ts withSpeciesVariant), so the option's bonuses are in
// racialBonus and the option itself is named.
export function knownSoFarRows({
  level,
  klass,
  race,
  racialBonus,
  proficientSkills,
}: {
  level: number;
  klass: { name: string; hitDie: number; saves: string[] } | undefined;
  race:
    | {
        name: string;
        speed: number;
        asi?: Partial<Record<Ability, number>>;
        asiChoice?: { count: number; amount: number; amounts?: number[] };
        variants?: SpeciesVariantGroup;
      }
    | undefined;
  racialBonus: Partial<Record<Ability, number>>;
  proficientSkills: string[];
}, messages?: BuildMathMessages): BuildMathRow[] {
  const bonuses = ABILITIES.flatMap((ability) =>
    racialBonus[ability] ? [`${messages?.t?.((`builder.extra.ability.${ability}`) as MessageKey) ?? ABILITY_NAMES[ability]} ${formatModifier(racialBonus[ability] ?? 0)}`] : [],
  );
  // The bumps the race leaves to the player (a half-elf's two +1s) that are
  // not placed yet: a placed one is in racialBonus beyond the race's own.
  const choice = race?.asiChoice;
  if (choice && choice.amount > 0) {
    const placed = ABILITIES.reduce((sum, ability) => sum + Math.max(0, (racialBonus[ability] ?? 0) - (race?.asi?.[ability] ?? 0)), 0);
    if (choice.amounts) {
      // Picks of their own amounts (a fairy's +2 then +1), placed in order.
      let left = placed;
      const open = choice.amounts.filter((amount) => (left >= amount ? ((left -= amount), false) : true));
      if (open.length) {
        const amounts = open.map((amount) => `+${amount}`).join(msg(messages, "builder.extra.buildMath.working.abilityJoin", {}, "and"));
        bonuses.push(msg(messages, "builder.extra.buildMath.working.ancestryOwedAmounts", { amounts }, `Ability increases left to assign: ${amounts}`));
      }
    } else {
      const owed = choice.count - Math.round(placed / choice.amount);
      if (owed > 0) {
        bonuses.push(pluralMsg(messages, "builder.extra.buildMath.working.ancestryOwed", owed, { amount: choice.amount, more: bonuses.length ? (messages?.t?.("builder.extra.buildMath.working.ancestryMore") ?? "more ") : "" }, `+${choice.amount} to ${COUNT_WORDS[owed] ?? owed} ${bonuses.length ? "more " : ""}of your choice`));
      }
    }
    }
  }
  const variant = race?.variants ? pickedVariant(race) : null;
  const skills = proficientSkills.flatMap((id) => {
    const skill = findSkill(id);
    return skill ? [skill.name] : [];
  });
  return [
    { id: "proficiency", label: "Proficiency bonus", value: formatModifier(proficiencyBonus(level)), working: msg(messages, "builder.extra.buildMath.working.level", { level }, `level ${level}`) },
    ...(klass
      ? [
          { id: "hit-die", label: "Hit die", value: `d${klass.hitDie}`, working: klass.name },
          {
            id: "save-proficiencies",
            label: "Proficient saves",
            value: klass.saves.map((save) => messages?.t?.((`builder.extra.ability.${save}`) as MessageKey) ?? ABILITY_NAMES[save] ?? save).join(", "),
            working: klass.name,
          },
        ]
      : []),
    ...(race?.variants
      ? [{ id: "species-choice", label: race.variants.label, value: variant?.name ?? (messages?.t?.("builder.extra.buildMath.working.stillToChoose") ?? "still to choose"), working: race.name }]
      : []),
    ...(race
      ? [
          { id: "ancestry-bonuses", label: "Ancestry bonuses", value: bonuses.join(", ") || (messages?.t?.("builder.extra.buildMath.working.none") ?? "none"), working: race.name },
          { id: "speed", label: "Speed", value: `${race.speed} ft`, working: race.name },
        ]
      : []),
    ...(skills.length
      ? [{ id: "skill-proficiencies", label: "Proficient skills", value: skills.join(", "), working: messages?.t?.("builder.extra.buildMath.working.skillsFromPicks") ?? "class, background and ancestry picks" }]
      : []),
  ];
}

// What a screen reader hears when picks move the numbers: the first number
// that changed, said as "Armor class 16, was 14", and how many more did. A
// row that appears is said with its value alone; one that goes is not said.
function translatedRowLabel(row: BuildMathRow, messages?: BuildMathMessages): string {
  if (!messages?.t) return row.label;
  const keyById: Record<string, MessageKey> = {
    ac: "builder.extra.buildMath.row.ac",
    hp: "builder.extra.buildMath.row.hp",
    initiative: "builder.extra.buildMath.row.initiative",
    proficiency: "builder.extra.buildMath.row.proficiency",
    "passive-perception": "builder.extra.buildMath.row.passivePerception",
    "hit-die": "builder.extra.buildMath.row.hitDie",
    "save-proficiencies": "builder.extra.buildMath.row.saveProficiencies",
    "ancestry-bonuses": "builder.extra.buildMath.row.ancestryBonuses",
    speed: "builder.extra.buildMath.row.speed",
    "skill-proficiencies": "builder.extra.buildMath.row.skillProficiencies",
    "spell-dc": "builder.extra.buildMath.row.spellDc",
    "spell-attack": "builder.extra.buildMath.row.spellAttack",
    "slots-pact": "builder.extra.buildMath.row.pactSlots",
  };
  const fixed = keyById[row.id];
  if (fixed) return messages.t(fixed);
  if (row.id.startsWith("spell-dc-")) return messages.t("builder.extra.buildMath.row.classSpellDc", { klass: row.label.replace(/ spell save DC$/i, "") });
  if (row.id.startsWith("spell-attack-")) return messages.t("builder.extra.buildMath.row.classSpellAttack", { klass: row.label.replace(/ spell attack$/i, "") });
  if (row.id.startsWith("ability-")) return messages.t((`builder.extra.ability.${row.id.slice("ability-".length)}`) as MessageKey);
  if (row.id.startsWith("save-")) {
    const ability = messages.t((`builder.extra.ability.${row.id.slice("save-".length)}`) as MessageKey);
    return messages.t("builder.extra.buildMath.row.save", { ability });
  }
  if (row.id.startsWith("slots-")) return messages.t("builder.extra.buildMath.row.slots", { level: row.id.slice("slots-".length) });
  return row.label;
}
export function changeLine(before: ReadonlyMap<string, string>, after: BuildMathSection[], messages?: BuildMathMessages): string | null {
  const changed: string[] = [];
  for (const row of after.flatMap((section) => section.rows)) {
    const was = before.get(row.id);
    if (was === undefined) {
      changed.push(`${translatedRowLabel(row, messages)} ${row.value}`);
    } else if (was !== row.value) {
      changed.push(`${translatedRowLabel(row, messages)} ${row.value}, was ${was}`);
    }
  }
  if (!changed.length) {
    return null;
  }
  const more = changed.length - 1;
  if (!messages?.t) {
    return more ? `${changed[0]}. ${more} more ${more === 1 ? "number" : "numbers"} changed.` : `${changed[0]}.`;
  }
  if (!more) return messages.t("builder.extra.buildMath.working.change.single", { first: changed[0] });
  return messages.tp?.("builder.extra.buildMath.working.change.more", more, { first: changed[0] }) ?? `${changed[0]}. ${more} more numbers changed.`;
}

export function snapshotOf(sections: BuildMathSection[]): Map<string, string> {
  return new Map(sections.flatMap((section) => section.rows.map((row) => [row.id, row.value] as const)));
}

type Timers = {
  setTimeout: (run: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

// One polite line per burst of changes. The first change after a quiet
// spell opens a window of `waitMs`; every change inside it is folded into
// the line said when it closes, compared against what was last said. The
// first table seen is the starting point and is not announced.
export function createChangeAnnouncer({
  say,
  messages,
  waitMs = 1200,
  timers = { setTimeout: (run, ms) => setTimeout(run, ms), clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) },
}: {
  say: (line: string) => void;
  messages?: BuildMathMessages;
  waitMs?: number;
  timers?: Timers;
}) {
  let said: Map<string, string> | null = null;
  let latest: BuildMathSection[] = [];
  let pending: unknown = null;
  const flush = () => {
    pending = null;
    const line = said ? changeLine(said, latest, messages) : null;
    said = snapshotOf(latest);
    if (line) {
      say(line);
    }
  };
  return {
    update(sections: BuildMathSection[]) {
      latest = sections;
      if (said === null || said.size === 0) {
        // Nothing to compare with yet: the table filling in for the first
        // time is not a change.
        said = snapshotOf(sections);
        return;
      }
      if (pending === null) {
        pending = timers.setTimeout(flush, waitMs);
      }
    },
    dispose() {
      if (pending !== null) {
        timers.clearTimeout(pending);
        pending = null;
      }
    },
  };
}
