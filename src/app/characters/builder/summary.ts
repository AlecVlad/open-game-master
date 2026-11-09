import { ABILITIES } from "@/lib/schemas/abilities";
import type { Ability, AbilityScores } from "@/lib/schemas/sheet";
import { owedPicks, type OwedPick } from "./owed";
import type { StepBlock } from "./submit";
import type { MessageKey } from "@/lib/i18n/messages";

// Optional: with it the rows are said in the player's language; without it
// they stay English, as the tests read them.
export type SummaryI18n = {
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  tp: (key: string, count: number, params?: Record<string, string | number>) => string;
};
const say = (i18n: SummaryI18n | undefined, key: MessageKey, english: string, params?: Record<string, string | number>) =>
  i18n ? i18n.t(key, params) : english;

// The summary at the top of the last step (backlog F3): one row per step,
// what it holds in plain words and every pick it still owes, each with a
// way to the field that takes it. An edit opens here and a new build ends
// here, so the rows are what a player reads before saving. Pure, for
// scripts/test-builder-summary.mjs.

// One row per step before the summary, in the wizard's order (backlog F4:
// the class first, the name and story last).
export type SummaryRowKey = "calling" | "ancestry" | "abilities" | "spells-gear" | "identity";

export type SummaryRow = {
  key: SummaryRowKey;
  label: string;
  // What the step holds, one plain line each.
  lines: string[];
  // What it still owes, in the gate's order (owed.ts).
  owed: OwedPick[];
};

export type SummaryInput = {
  name: string;
  background?: string;
  race?: string;
  klass?: string;
  subclass?: string;
  level: number;
  // Asked on the class step, above the cards it changes, so its row says it.
  gender?: string;
  abilities: AbilityScores | null;
  casts: boolean;
  cantrips: string[];
  spells: string[];
  gear: Array<{ name: string; qty: number }>;
  alignment?: string;
  portrait: boolean;
  appearance: boolean;
  backstory: boolean;
  owed: {
    identity: ReadonlyArray<StepBlock>;
    ancestry: ReadonlyArray<StepBlock>;
    calling: ReadonlyArray<StepBlock>;
    abilities: ReadonlyArray<StepBlock>;
    spells: ReadonlyArray<StepBlock>;
  };
};

const ABILITY_SHORT: Record<Ability, string> = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  cha: "Cha",
};

// "Fire Bolt, Light and 2 more": a few names, then a count.
export function someNames(names: string[], shown = 3, i18n?: SummaryI18n): string {
  const and = i18n ? i18n.t("builder.and") : " and ";
  if (names.length <= shown) {
    if (names.length <= 1) return names.join("");
    return `${names.slice(0, -1).join(", ")}${and}${names[names.length - 1]}`;
  }
  const head = names.slice(0, shown).join(", ");
  return say(i18n, "builder.sum.more", `${head} and ${names.length - shown} more`, { names: head, n: names.length - shown });
}

export function summaryRows(input: SummaryInput, i18n?: SummaryI18n): SummaryRow[] {
  const s = (key: MessageKey, english: string, params?: Record<string, string | number>) => say(i18n, key, english, params);
  const some = (names: string[]) => someNames(names, 3, i18n);
  const name = input.name.trim();
  const items = input.gear.reduce((sum, item) => sum + Math.max(item.qty, 1), 0);
  const gearNames = some(input.gear.map((item) => item.name));
  const gearLine = items
    ? i18n
      ? i18n.tp("builder.sum.gear", items, { count: items, names: gearNames })
      : `Gear: ${items} ${items === 1 ? "item" : "items"}, ${gearNames}`
    : s("builder.sum.gear.none", "No gear packed");
  const touches = [
    input.alignment ? s("builder.sum.align", `Alignment ${input.alignment}`, { a: input.alignment }) : null,
    input.portrait ? s("builder.sum.portrait.yes", "Portrait added") : s("builder.sum.portrait.no", "No portrait yet"),
    input.appearance ? s("builder.sum.appearance", "Appearance written") : null,
    input.backstory ? s("builder.sum.backstory.yes", "Backstory written") : s("builder.sum.backstory.no", "No backstory yet"),
  ].filter((line): line is string => Boolean(line));
  return [
    {
      key: "calling",
      label: s("builder.sum.calling.label", "Class"),
      lines: [
        ...(input.klass
          ? [s("builder.sum.calling.line", `${input.klass}, level ${input.level}`, { klass: input.klass, level: input.level }), ...(input.subclass ? [input.subclass] : [])]
          : [s("builder.sum.calling.none", "No class chosen")]),
        // Said only once chosen: it is optional, and owes nothing unset.
        ...(input.gender ? [s("builder.sum.gender", `Gender: ${input.gender}`, { g: input.gender })] : []),
      ],
      owed: owedPicks(input.owed.calling),
    },
    {
      key: "ancestry",
      label: s("builder.sum.ancestry.label", "Ancestry and background"),
      lines: [
        input.race ?? s("builder.sum.ancestry.none", "No ancestry chosen"),
        input.background ? s("builder.sum.background.line", `${input.background} background`, { b: input.background }) : s("builder.sum.background.none", "No background chosen"),
      ],
      owed: owedPicks(input.owed.ancestry),
    },
    {
      key: "abilities",
      label: s("builder.sum.abilities.label", "Ability scores"),
      lines: [
        input.abilities
          ? ABILITIES.map((ability) => `${s(`builder.sum.ab.${ability}` as MessageKey, ABILITY_SHORT[ability])} ${input.abilities?.[ability]}`).join(", ")
          : s("builder.sum.abilities.none", "Not set yet"),
      ],
      owed: owedPicks(input.owed.abilities),
    },
    {
      key: "spells-gear",
      label: input.casts ? s("builder.sum.spellsGear.label", "Spells and gear") : s("builder.sum.gear.label", "Gear"),
      lines: [
        ...(input.casts
          ? [
              input.cantrips.length ? s("builder.sum.cantrips", `Cantrips: ${some(input.cantrips)}`, { names: some(input.cantrips) }) : s("builder.sum.cantrips.none", "No cantrips chosen"),
              input.spells.length ? s("builder.sum.spells", `Spells: ${some(input.spells)}`, { names: some(input.spells) }) : s("builder.sum.spells.none", "No spells chosen"),
            ]
          : []),
        gearLine,
      ],
      owed: owedPicks(input.owed.spells),
    },
    {
      key: "identity",
      label: s("builder.sum.identity.label", "Name and story"),
      lines: [name || s("builder.sum.name.none", "No name yet"), ...touches],
      owed: owedPicks(input.owed.identity),
    },
  ];
}

// Every pick still owed across the rows, for the line above them.
export function summaryOwedCount(rows: SummaryRow[]): number {
  return rows.reduce((sum, row) => sum + row.owed.length, 0);
}
