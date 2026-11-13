// What a feat hands over beyond its ability point: languages, skills,
// expertise, armor, weapons and tools, read from the feat's own text so a
// content pack's feats count as much as ODM's (issue #125: Linguist's three
// languages, Heavily Armored's armor and Skill Expert's skill were words on
// the sheet and nothing more, while the DM held the character to "only
// their listed languages"; issue #147: the Level Up and Tome of Heroes
// wordings, and a pick that may be a skill or a tool).
//
// A grant that leaves a choice (which three languages, which skill, which
// four weapons) is picked where the feat is picked and stored on the sheet
// as featChoices, keyed by the textKey of the feat's name
// (src/lib/schemas/sheet.ts featChoice). The server applies the grants
// when the sheet is made, edited or levelled (src/lib/srd/sheet-legality.ts,
// src/lib/srd/level-up.ts); the builder applies them to its preview. The
// reading of the text is src/lib/srd/feat-grant-text.ts. Pure.
import type { Proficiencies } from "@/lib/schemas/sheet";
import { ALL_SKILLS } from "@/lib/content/mechanics";
import { featSpellsOwed, featSpellsOwedDetail, type CastingAbility, type FeatSpellOwedDetail } from "@/lib/srd/feat-spells";
import { featGrantSpec, featGrantsAnything, lowerText as lower, type FeatGrantSpec, type PickKind } from "@/lib/srd/feat-grant-text";
import { SRD_WEAPONS } from "@/lib/srd/weapons";
import { featChoice } from "@/lib/schemas/sheet";

export { featGrantSpec, featGrantsAnything, KNOWN_TOOLS, type FeatGrantSpec, type PickKind } from "@/lib/srd/feat-grant-text";

export type FeatPickOwedDetail = {
  languages: number;
  skills: number;
  expertise: number;
  weapons: number;
  tools: number;
  shared: number;
  sharedKinds: PickKind[];
  damageType: boolean;
};

export type FeatOwedDetail =
  | { kind: "picks"; feat: string; picks: FeatPickOwedDetail }
  | { kind: "spells"; feat: string; spells: FeatSpellOwedDetail };
export type FeatPicks = {
  languages?: string[];
  skills?: string[];
  expertise?: string[];
  weapons?: string[];
  tools?: string[];
  // Armor a feat offers as a pick (shields).
  armor?: string[];
  // The spells a feat teaches (src/lib/srd/feat-spells.ts): the cantrips
  // and spells named, the class list and the casting ability where the
  // feat leaves those open.
  cantrips?: string[];
  spells?: string[];
  list?: string;
  ability?: CastingAbility;
  // Elemental Adept's damage type (src/lib/srd/feat-combat.ts).
  damageType?: string;
};

export type FeatChoices = Record<string, FeatPicks>;

const SINGULAR: Record<PickKind, string> = { skills: "skill", languages: "language", tools: "tool", weapons: "weapon", armor: "armor" };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 || word === "armor" ? "" : "s"}`;
const named = (list: string[] | undefined) => (list ?? []).filter((entry) => entry && entry.trim());
const dedicated = (spec: FeatGrantSpec, kind: PickKind) => (kind === "armor" ? 0 : spec[kind]);

// How many of a feat's shared picks ("three skills or tools") are made:
// every pick of those kinds beyond the kind's own count.
export function anyPicksMade(spec: FeatGrantSpec, picks: FeatPicks | undefined, except?: PickKind): number {
  return spec.anyKinds
    .filter((kind) => kind !== except)
    .reduce((sum, kind) => sum + Math.max(0, named(picks?.[kind]).length - dedicated(spec, kind)), 0);
}

// How many picks of a kind the feat allows: its own count, plus whatever
// of the shared count the other kinds have not used.
export function pickSlots(spec: FeatGrantSpec, picks: FeatPicks | undefined, kind: PickKind): number {
  const own = dedicated(spec, kind);
  return spec.anyKinds.includes(kind) ? own + Math.max(0, spec.any - anyPicksMade(spec, picks, kind)) : own;
}

// What the feat still waits for, as the sentence the gate shows, or null.
export function featPicksOwed(feat: string, spec: FeatGrantSpec, picks: FeatPicks | undefined): string | null {
  const has = (list: string[] | undefined) => named(list).length;
  const owed: string[] = [];
  if (spec.languages > has(picks?.languages)) {
    owed.push(plural(spec.languages - has(picks?.languages), "language"));
  }
  if (spec.skills > has(picks?.skills)) {
    owed.push(plural(spec.skills - has(picks?.skills), "skill"));
  }
  if (spec.expertise > has(picks?.expertise)) {
    owed.push(`expertise in ${plural(spec.expertise - has(picks?.expertise), "skill")}`);
  }
  if (spec.weapons > has(picks?.weapons)) {
    owed.push(plural(spec.weapons - has(picks?.weapons), "weapon"));
  }
  if (spec.tools > has(picks?.tools)) {
    owed.push(plural(spec.tools - has(picks?.tools), "tool"));
  }
  const shared = spec.any - anyPicksMade(spec, picks);
  if (shared > 0) {
    const kinds = spec.anyKinds.map((kind) => (shared === 1 ? SINGULAR[kind] : kind === "armor" ? "armor" : kind));
    owed.push(`${shared} ${kinds.join(" or ")}`);
  }
  if (spec.damageTypes.length && !(picks?.damageType ?? "").trim()) {
    owed.push("a damage type");
  }
  return owed.length ? `${feat}: pick ${owed.join(", ")}.` : null;
}

// Everything a feat still waits for, training and spells alike: the one
// sentence the builder's gate and the level-up dialog show.
export function featPicksOwedDetail(spec: FeatGrantSpec, picks: FeatPicks | undefined): FeatPickOwedDetail | null {
  const has = (list: string[] | undefined) => named(list).length;
  const detail: FeatPickOwedDetail = {
    languages: Math.max(0, spec.languages - has(picks?.languages)),
    skills: Math.max(0, spec.skills - has(picks?.skills)),
    expertise: Math.max(0, spec.expertise - has(picks?.expertise)),
    weapons: Math.max(0, spec.weapons - has(picks?.weapons)),
    tools: Math.max(0, spec.tools - has(picks?.tools)),
    shared: Math.max(0, spec.any - anyPicksMade(spec, picks)),
    sharedKinds: spec.anyKinds,
    damageType: spec.damageTypes.length > 0 && !(picks?.damageType ?? "").trim(),
  };
  return detail.languages || detail.skills || detail.expertise || detail.weapons || detail.tools || detail.shared || detail.damageType
    ? detail
    : null;
}

export function featOwedDetail(feat: string, spec: FeatGrantSpec, picks: FeatPicks | undefined): FeatOwedDetail | null {
  const pickDetail = featPicksOwedDetail(spec, picks);
  if (pickDetail) return { kind: "picks", feat, picks: pickDetail };
  const spellDetail = featSpellsOwedDetail(spec.taught, picks);
  return spellDetail ? { kind: "spells", feat, spells: spellDetail } : null;
}
export function featOwed(feat: string, spec: FeatGrantSpec, picks: FeatPicks | undefined): string | null {
  return featPicksOwed(feat, spec, picks) ?? featSpellsOwed(feat, spec.taught, picks);
}

export type FeatGrantInput = {
  proficiencies: Proficiencies;
  // The feats on the sheet, each with its text (empty when the catalog has
  // no row for it, which grants nothing). A grant read elsewhere (a
  // subclass's training, src/lib/srd/subclass-training.ts) brings its spec.
  feats: Array<{ name: string; desc: string; spec?: FeatGrantSpec }>;
  choices: FeatChoices;
  // Strict: every pick a feat leaves open must be made, be one the feat
  // offers, and be new to the character. Otherwise what fits is applied
  // and the rest is left alone (a stored sheet, a companion the engine
  // drafts).
  strict: boolean;
  // With strict: a pick left open is owed rather than wrong, and lands in
  // `owed` instead of `problems`; a pick that is named is still held to the
  // feat. A file exported before a feat asked for its picks names none of
  // them (issue #430), and what it does name is still somebody's hand edit.
  picksMayWait?: boolean;
};

// Stable detail codes accompany the legacy prose. Unknown/custom names stay as parameters.
export type FeatGrantProblemDetail = {
  code:
    | "FEAT_GRANT_DAMAGE_TYPE_NOT_OFFERED"
    | "FEAT_GRANT_SKILL_INVALID"
    | "FEAT_GRANT_SKILL_NOT_OFFERED"
    | "FEAT_GRANT_SKILL_ALREADY_HELD"
    | "FEAT_GRANT_LANGUAGE_ALREADY_HELD"
    | "FEAT_GRANT_EXPERTISE_NOT_PROFICIENT"
    | "FEAT_GRANT_EXPERTISE_ALREADY_HELD"
    | "FEAT_GRANT_TOOL_NOT_OFFERED"
    | "FEAT_GRANT_TOOL_ALREADY_HELD"
    | "FEAT_GRANT_WEAPON_INVALID"
    | "FEAT_GRANT_WEAPON_NOT_OFFERED"
    | "FEAT_GRANT_ARMOR_NOT_OFFERED"
    | "FEAT_GRANT_ARMOR_ALREADY_HELD";
  params: Record<string, string | number>;
};

// `owed`: the picks still to make, when they may wait (picksMayWait).
export type FeatGrantVerdict = {
  proficiencies: Proficiencies;
  problems: string[];
  problemDetails: Array<FeatGrantProblemDetail | null>;
  owed?: string[];
};

const WEAPON_NAMES = new Set(SRD_WEAPONS.map((weapon) => lower(weapon.name)));
const weaponName = (name: string) => SRD_WEAPONS.find((weapon) => lower(weapon.name) === lower(name))?.name ?? null;

// The sheet's training with every feat's grants in. Fixed grants always;
// picks as the sheet records them, held to the feat's text when strict.
export function applyFeatGrants(input: FeatGrantInput): FeatGrantVerdict {
  const problems: string[] = [];
  const problemDetails: Array<FeatGrantProblemDetail | null> = [];
  const addProblem = (message: string, detail?: FeatGrantProblemDetail) => {
    problems.push(message);
    problemDetails.push(detail ?? null);
  };
  const owedPicks: string[] = [];
  let languages = [...input.proficiencies.languages];
  let skills = [...input.proficiencies.skills];
  let expertise = [...(input.proficiencies.expertise ?? [])];
  let weapons = [...input.proficiencies.weapons];
  let tools = [...input.proficiencies.tools];
  let armor = [...input.proficiencies.armor];
  const has = (list: string[], entry: string) => list.some((held) => lower(held) === lower(entry));
  for (const feat of input.feats) {
    const spec = feat.spec ?? featGrantSpec(feat.desc);
    if (!featGrantsAnything(spec) && !spec.damageTypes.length) {
      continue;
    }
    const picks = featChoice(input.choices, feat.name) ?? {};
    for (const piece of spec.armor) {
      // A second class's grant reads "light armor" where a class's reads
      // "light"; either means the training is held.
      if (!has(armor, piece) && !has(armor, `${piece} armor`)) {
        armor.push(piece);
      }
    }
    for (const piece of spec.fixedWeapons) {
      if (!has(weapons, piece)) {
        weapons.push(piece);
      }
    }
    for (const piece of spec.fixedTools) {
      if (!has(tools, piece)) {
        tools.push(piece);
      }
    }
    // A skill or language the feat names outright; one already held is
    // simply held (Surgical Combatant's "if you are already proficient").
    for (const skill of spec.fixedSkills) {
      if (!has(skills, skill)) {
        skills.push(skill);
      }
    }
    for (const language of spec.fixedLanguages) {
      if (!has(languages, language)) {
        languages.push(language);
      }
    }
    if (input.strict) {
      const owed = featPicksOwed(feat.name, spec, picks);
      if (owed) {
        if (input.picksMayWait) {
          owedPicks.push(owed);
        } else {
          addProblem(owed);
        }
      }
      const element = lower(picks.damageType ?? "");
      if (spec.damageTypes.length && element && !spec.damageTypes.includes(element)) {
        addProblem(
          `"${picks.damageType}" is not a damage type ${feat.name} offers; pick one of ${spec.damageTypes.join(", ")}.`,
          { code: "FEAT_GRANT_DAMAGE_TYPE_NOT_OFFERED", params: { feat: feat.name, damageType: picks.damageType, offered: spec.damageTypes.join(", ") } },
        );
      }
    }
    // Each kind takes its own count, then what is left of the shared one
    // ("three skills or tools"), in a fixed order so the budget is one.
    let shared = spec.any;
    const allowed = (kind: PickKind, list: string[]): string[] => {
      const own = dedicated(spec, kind);
      const extra = spec.anyKinds.includes(kind) ? Math.min(shared, Math.max(0, list.length - own)) : 0;
      if (spec.anyKinds.includes(kind)) {
        shared -= extra;
      }
      return list.slice(0, own + extra);
    };
    // Skills: real ones, from the list the grant names, not already held.
    const pickedSkills = allowed("skills", named(picks.skills).map(lower));
    for (const skill of pickedSkills) {
      if (!ALL_SKILLS.includes(skill as (typeof ALL_SKILLS)[number])) {
        if (input.strict) {
          addProblem(
            `"${skill}" is not a skill; ${feat.name}'s skill is picked from the skill list.`,
            { code: "FEAT_GRANT_SKILL_INVALID", params: { feat: feat.name, skill } },
          );
        }
        continue;
      }
      if (spec.skillsFrom.length && !spec.skillsFrom.includes(skill)) {
        if (input.strict) {
          addProblem(
            `${skill.replace(/_/g, " ")} is not a skill ${feat.name} offers; pick from ${spec.skillsFrom.map((entry) => entry.replace(/_/g, " ")).join(", ")}.`,
            { code: "FEAT_GRANT_SKILL_NOT_OFFERED", params: { feat: feat.name, skill, offered: spec.skillsFrom.join(",") } },
          );
        }
        continue;
      }
      if (has(skills, skill)) {
        if (input.strict) {
          addProblem(
            `${feat.name} grants a new skill; this character is already proficient in ${skill}.`,
            { code: "FEAT_GRANT_SKILL_ALREADY_HELD", params: { feat: feat.name, skill } },
          );
        }
        continue;
      }
      skills.push(skill);
      // Knowledge Domain's skills come doubled.
      if (spec.pickedExpertise && !has(expertise, skill)) {
        expertise.push(skill);
      }
    }
    // Expertise the grant names outright, on skills it also names.
    for (const skill of spec.fixedExpertise) {
      if (has(skills, skill) && !has(expertise, skill)) {
        expertise.push(skill);
      }
    }
    // Languages: new ones, each once.
    const pickedLanguages = allowed("languages", named(picks.languages));
    for (const language of pickedLanguages) {
      if (has(languages, language)) {
        if (input.strict) {
          addProblem(
            `${feat.name}'s languages are new ones; this character already speaks ${language}.`,
            { code: "FEAT_GRANT_LANGUAGE_ALREADY_HELD", params: { feat: feat.name, language } },
          );
        }
        continue;
      }
      languages.push(language.trim());
    }
    // Expertise: in a skill held (the feat's own counts), not already doubled.
    const pickedExpertise = named(picks.expertise).map(lower).slice(0, spec.expertise);
    for (const skill of pickedExpertise) {
      if (!has(skills, skill)) {
        if (input.strict) {
          addProblem(
            `${feat.name}'s expertise doubles a skill the character has; ${skill} is not among them.`,
            { code: "FEAT_GRANT_EXPERTISE_NOT_PROFICIENT", params: { feat: feat.name, skill } },
          );
        }
        continue;
      }
      if (has(expertise, skill)) {
        if (input.strict) {
          addProblem(
            `This character already has expertise in ${skill}; ${feat.name}'s goes on another skill.`,
            { code: "FEAT_GRANT_EXPERTISE_ALREADY_HELD", params: { feat: feat.name, skill } },
          );
        }
        continue;
      }
      expertise.push(skill);
    }
    // Tools: from what the feat offers, not already held.
    const pickedTools = allowed("tools", named(picks.tools).map(lower));
    for (const tool of pickedTools) {
      if (spec.toolsFrom.length && !spec.toolsFrom.includes(tool)) {
        if (input.strict) {
          addProblem(
            `"${tool}" is not a tool ${feat.name} offers.`,
            { code: "FEAT_GRANT_TOOL_NOT_OFFERED", params: { feat: feat.name, tool } },
          );
        }
        continue;
      }
      if (has(tools, tool)) {
        if (input.strict) {
          addProblem(
            `${feat.name} grants a new tool; this character already has ${tool}.`,
            { code: "FEAT_GRANT_TOOL_ALREADY_HELD", params: { feat: feat.name, tool } },
          );
        }
        continue;
      }
      tools.push(tool);
    }
    // Weapons: from the weapon table (or the part of it the feat names),
    // not already trained with by name.
    const pickedWeapons = allowed("weapons", named(picks.weapons));
    for (const weapon of pickedWeapons) {
      const name = weaponName(weapon);
      if (!name || !WEAPON_NAMES.has(lower(name))) {
        if (input.strict) {
          addProblem(
            `"${weapon}" is not a weapon on the table; ${feat.name}'s weapons are picked from it.`,
            { code: "FEAT_GRANT_WEAPON_INVALID", params: { feat: feat.name, weapon } },
          );
        }
        continue;
      }
      if (spec.weaponsFrom.length && !spec.weaponsFrom.some((offered) => lower(offered) === lower(name))) {
        if (input.strict) {
          addProblem(
            `${name} is not a weapon ${feat.name} offers.`,
            { code: "FEAT_GRANT_WEAPON_NOT_OFFERED", params: { feat: feat.name, weapon: name } },
          );
        }
        continue;
      }
      if (has(weapons, name)) {
        continue;
      }
      weapons.push(name);
    }
    // Armor: what the feat offers (shields), not already worn.
    const pickedArmor = allowed("armor", named(picks.armor).map(lower));
    for (const piece of pickedArmor) {
      if (!spec.armorFrom.includes(piece)) {
        if (input.strict) {
          addProblem(
            `"${piece}" is not armor ${feat.name} offers.`,
            { code: "FEAT_GRANT_ARMOR_NOT_OFFERED", params: { feat: feat.name, armor: piece } },
          );
        }
        continue;
      }
      if (has(armor, piece)) {
        if (input.strict) {
          addProblem(
            `${feat.name} grants new armor training; this character already has ${piece}.`,
            { code: "FEAT_GRANT_ARMOR_ALREADY_HELD", params: { feat: feat.name, armor: piece } },
          );
        }
        continue;
      }
      armor.push(piece);
    }
  }
  languages = [...new Set(languages)];
  skills = [...new Set(skills)];
  expertise = [...new Set(expertise)];
  weapons = [...new Set(weapons)];
  tools = [...new Set(tools)];
  armor = [...new Set(armor)];
  return {
    problems,
    problemDetails,
    proficiencies: { ...input.proficiencies, languages, skills, expertise, weapons, tools, armor },
    ...(owedPicks.length ? { owed: owedPicks } : {}),
  };
}

// The training without the picks these feats made: what an edit starts
// from, so a Linguist's languages re-picked in the edit replace the old
// ones rather than pile on them. Fixed grants (armor) stay: they are the
// feat's whether or not it is re-picked, and the regrant adds them again.
export function withoutFeatPicks(proficiencies: Proficiencies, choices: FeatChoices | undefined): Proficiencies {
  if (!choices) {
    return proficiencies;
  }
  const picked = Object.values(choices);
  const drop = (kind: PickKind | "expertise") => new Set(picked.flatMap((picks) => (picks[kind] ?? []).map(lower)));
  const languages = drop("languages");
  const skills = drop("skills");
  const expertise = drop("expertise");
  const weapons = drop("weapons");
  const tools = drop("tools");
  const armor = drop("armor");
  return {
    ...proficiencies,
    languages: proficiencies.languages.filter((entry) => !languages.has(lower(entry))),
    skills: proficiencies.skills.filter((entry) => !skills.has(lower(entry))),
    expertise: (proficiencies.expertise ?? []).filter((entry) => !expertise.has(lower(entry)) && !skills.has(lower(entry))),
    weapons: proficiencies.weapons.filter((entry) => !weapons.has(lower(entry))),
    tools: proficiencies.tools.filter((entry) => !tools.has(lower(entry))),
    armor: proficiencies.armor.filter((entry) => !armor.has(lower(entry))),
  };
}
