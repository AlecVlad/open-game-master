// What stands between a draft and a pack, said all at once.
//
// scripts/validate-world-packs.mjs is the author-facing validator for a
// folder of finished manifests. This is the same list of rules, asked of a
// draft while it is still being written, so the editor can show a person
// what is left rather than making them export to find out. The two must
// agree: a draft this passes is a manifest the validator passes, except for
// the content-pack checks (real monster slugs, real spell names), which need
// the server and live in ./draft-integrity.ts.
//
// Two grades. A `problem` is something worldPackSchema or the validator
// refuses, so the export button waits on it. `advice` is the size targets
// and the DM brief floor: a pack under them installs fine and plays thin,
// and the person deciding that is the one who wrote it.
//
// Client-safe: the catalogs it reads are the same JSON the character builder
// already ships to the browser.
import { findClass, findRace, SRD_BACKGROUNDS } from "@/lib/srd";
import { CUSTOM_BACKGROUNDS } from "@/lib/backgrounds";
import { MAX_PACK_ART_BYTES, packArtSlots } from "@/lib/worlds/art";
import { finishDraft, type WorldPackDraft } from "@/lib/worlds/draft";
import { textKey } from "@/lib/language/text-logic";
import { srdRaceId } from "@/lib/srd/race-id";

export type DraftCheckMessage = {
  key: string;
  params?: Record<string, string | number>;
};

export type DraftCheck = {
  // English fallback remains for non-UI callers.
  problems: string[];
  advice: string[];
  // Stable message data lets the editor render notices in the active locale.
  problemMessages: DraftCheckMessage[];
  adviceMessages: DraftCheckMessage[];
};

const ALIGNMENT_CODES = new Set(["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"]);

// The floors scripts/validate-world-packs.mjs enforces on a bundled pack,
// offered here as targets.
export const SIZE_TARGETS: Array<{ key: string; label: string; floor: number }> = [
  { key: "races", label: "races", floor: 6 },
  { key: "classes", label: "classes", floor: 6 },
  { key: "backgrounds", label: "backgrounds", floor: 4 },
  { key: "monsters", label: "monsters", floor: 15 },
  { key: "spells", label: "spells", floor: 10 },
  { key: "items", label: "items", floor: 6 },
  { key: "factions", label: "factions", floor: 3 },
  { key: "locations", label: "places", floor: 4 },
  { key: "hooks", label: "hooks", floor: 4 },
  { key: "glossary", label: "glossary lines", floor: 6 },
];

export const DM_FLAVOR_FLOOR = 200;

function dataUrlBytes(dataUrl: string): number {
  return Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
}

// Every string in the pack, with the path it sits at, for the em dash walk
// the validator does.
function walkStrings(value: unknown, trail: string, visit: (text: string, at: string) => void) {
  if (typeof value === "string") {
    visit(value, trail);
  } else if (Array.isArray(value)) {
    value.forEach((entry, index) => walkStrings(entry, `${trail}[${index + 1}]`, visit));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      if (key === "art") continue;
      walkStrings(entry, trail ? `${trail}.${key}` : key, visit);
    }
  }
}

// The ids a pack renames, each of which must be an option the character
// creator offers: applyIdReskins renames only what exists, so an unknown id
// is dropped without a word and the world promises a people or a calling no
// player can find. Shared by the workshop's export (below) and the server's
// install (./install.ts), which also passes the content pack's race slugs so
// a pack may rename a people the pack brings. A race is matched on its one
// spelling (srdRaceId), as the creator matches it.
type ReskinIds = {
  races: Array<{ id: string }>;
  classes: Array<{ id: string; castingLabel?: string | null }>;
  backgrounds: Array<{ id: string }>;
  companionRaces: string[];
};

// The renamed ids the creator does not offer, one line each. The server's
// install refuses a file holding any (./install.ts) and reads this list,
// never the wording of the problems below.
export function unknownReskinIds(pack: ReskinIds, extraRaceKeys: ReadonlySet<string> = new Set()): string[] {
  const unknown: string[] = [];
  const knownRace = (id: string) => Boolean(findRace(srdRaceId(id))) || extraRaceKeys.has(srdRaceId(id));
  for (const entry of pack.races) {
    if (!knownRace(entry.id)) unknown.push(`Race "${entry.id}" is not in the catalog.`);
  }
  for (const entry of pack.classes) {
    if (!findClass(entry.id)) unknown.push(`Class "${entry.id}" is not in the catalog.`);
  }
  const backgroundIds = new Set([
    ...SRD_BACKGROUNDS.map((entry) => entry.id),
    ...CUSTOM_BACKGROUNDS.map((entry) => entry.id),
  ]);
  for (const entry of pack.backgrounds) {
    if (!backgroundIds.has(entry.id)) unknown.push(`Background "${entry.id}" is not in the catalog.`);
  }
  for (const id of pack.companionRaces) {
    if (!knownRace(id)) unknown.push(`Companion race "${id}" is not in the catalog.`);
  }
  return unknown;
}

export function reskinIdProblems(pack: ReskinIds, extraRaceKeys: ReadonlySet<string> = new Set()): string[] {
  const problems = unknownReskinIds(pack, extraRaceKeys);
  for (const entry of pack.classes) {
    const klass = findClass(entry.id);
    if (klass && klass.spellAbility === null && entry.castingLabel) {
      problems.push(`${klass.name} does not cast, so its casting label must stay empty.`);
    }
  }
  return problems;
}

export function checkDraft(draft: WorldPackDraft): DraftCheck {
  const problems: string[] = [];
  const advice: string[] = [];
  const problemMessages: DraftCheckMessage[] = [];
  const adviceMessages: DraftCheckMessage[] = [];
  const addProblem = (message: string, key: string, params: Record<string, string | number> = {}) => {
    problems.push(message);
    problemMessages.push({ key, params });
  };
  const addAdvice = (message: string, key: string, params: Record<string, string | number> = {}) => {
    advice.push(message);
    adviceMessages.push({ key, params });
  };
  const pack = finishDraft(draft) as ReturnType<typeof finishDraft> & {
    races: Array<{ id: string; name: string }>;
    classes: Array<{ id: string; name: string; castingLabel: string | null }>;
    backgrounds: Array<{ id: string; name: string }>;
    spells: Array<{ from: string; name: string }>;
    items: Array<{ from: string; name: string }>;
    features: Array<{ from: string; name: string }>;
    monsters: Array<{ slug: string; name: string; cr: number }>;
    factions: Array<{ name: string }>;
    locations: Array<{ name: string }>;
    hooks: string[];
    glossary: Array<{ term: string }>;
    nameSeeds: { people: string[]; places: string[] };
    companionRaces: string[];
    alignments: string[];
    art: Record<string, string>;
  };

  // ---- the identity a pack cannot ship without ----
  if (!String(pack.name)) addProblem("Give the world a name.", "workshop.plugin.check.nameRequired");
  if (!String(pack.blurb)) addProblem("Write the one-line blurb the picker shows.", "workshop.plugin.check.blurbRequired");
  if (!String(pack.inspiredBy)) addProblem("Say what the world is inspired by, even if the answer is 'my own'.", "workshop.plugin.check.inspiredByRequired");
  if (!String(pack.theme)) addProblem("Set the theme line: it seeds every campaign that picks this world.", "workshop.plugin.check.themeRequired");
  if (pack.baseGenre === "custom") addProblem("Pick a base genre; a pack cannot be 'custom'.", "workshop.plugin.check.baseGenreCustom");
  if (!/^[a-z][a-z0-9_]{2,49}$/.test(String(pack.id))) {
    addProblem("The name does not fold to a usable id; give it a few letters.", "workshop.plugin.check.idInvalid");
  }

  // ---- reskins by id ----
  for (const message of reskinIdProblems(pack)) {
    const race = /^Race "(.+)" is not in the catalog\.$/.exec(message);
    const klass = /^Class "(.+)" is not in the catalog\.$/.exec(message);
    const background = /^Background "(.+)" is not in the catalog\.$/.exec(message);
    const companion = /^Companion race "(.+)" is not in the catalog\.$/.exec(message);
    const casting = /^(.+) does not cast, so its casting label must stay empty\.$/.exec(message);
    if (race) addProblem(message, "workshop.plugin.check.raceUnknown", { id: race[1] });
    else if (klass) addProblem(message, "workshop.plugin.check.classUnknown", { id: klass[1] });
    else if (background) addProblem(message, "workshop.plugin.check.backgroundUnknown", { id: background[1] });
    else if (companion) addProblem(message, "workshop.plugin.check.companionRaceUnknown", { id: companion[1] });
    else if (casting) addProblem(message, "workshop.plugin.check.classNoCasting", { name: casting[1] });
    else problems.push(message);
  }
  for (const [key, list] of [
    ["races", pack.races],
    ["classes", pack.classes],
    ["backgrounds", pack.backgrounds],
  ] as const) {
    const names = new Set<string>();
    const ids = new Set<string>();
    for (const entry of list) {
      if (entry.name.toLowerCase() === entry.id.toLowerCase()) {
        addProblem(`In ${key}, "${entry.id}" is renamed to its own id.`, "workshop.plugin.check.reskinSameId", { group: key, id: entry.id });
      }
      if (names.has(textKey(entry.name))) addProblem(`Two ${key} are both called "${entry.name}".`, "workshop.plugin.check.duplicateReskinName", { group: key, name: entry.name });
      if (ids.has(entry.id)) addProblem(`"${entry.id}" is reskinned twice in ${key}; only one would show.`, "workshop.plugin.check.duplicateReskinId", { group: key, id: entry.id });
      names.add(textKey(entry.name));
      ids.add(entry.id);
    }
  }

  // ---- reskins by name ----
  for (const [key, list] of [
    ["spells", pack.spells],
    ["items", pack.items],
    ["features", pack.features],
  ] as const) {
    const names = new Set<string>();
    const sources = new Set<string>();
    for (const entry of list) {
      if (textKey(entry.name) === textKey(entry.from)) {
        addProblem(`In ${key}, "${entry.from}" is renamed to itself.`, "workshop.plugin.check.renamedToSelf", { group: key, source: entry.from });
      }
      if (names.has(textKey(entry.name))) addProblem(`Two ${key} are both called "${entry.name}".`, "workshop.plugin.check.duplicateNameReskin", { group: key, name: entry.name });
      if (sources.has(textKey(entry.from))) addProblem(`"${entry.from}" is reskinned twice in ${key}.`, "workshop.plugin.check.sourceReskinnedTwice", { group: key, source: entry.from });
      names.add(textKey(entry.name));
      sources.add(textKey(entry.from));
    }
  }

  // ---- monsters ----
  const slugs = new Set<string>();
  for (const entry of pack.monsters) {
    if (slugs.has(entry.slug)) addProblem(`Monster "${entry.slug}" is listed twice.`, "workshop.plugin.check.monsterDuplicate", { slug: entry.slug });
    slugs.add(entry.slug);
  }

  for (const code of pack.alignments) {
    if (!ALIGNMENT_CODES.has(code)) addProblem(`"${code}" is not an alignment code.`, "workshop.plugin.check.alignmentInvalid", { code });
  }

  // ---- art ----
  const slotKeys = new Set<string>();
  for (const slot of packArtSlots(pack)) {
    if (slotKeys.has(slot.key)) {
      addProblem(`Two ${slot.kind}s fold to the same picture key "${slot.key}"; rename one.`, "workshop.plugin.check.artKeyCollision", { kind: slot.kind, key: slot.key });
    }
    slotKeys.add(slot.key);
  }
  for (const [key, dataUrl] of Object.entries(pack.art)) {
    const bytes = dataUrlBytes(dataUrl);
    if (bytes > MAX_PACK_ART_BYTES) {
      addProblem(`The picture for "${key}" is ${Math.round(bytes / 1024)} KB; the cap is ${MAX_PACK_ART_BYTES / 1024} KB.`, "workshop.plugin.check.artTooLarge", { key, size: Math.round(bytes / 1024), max: MAX_PACK_ART_BYTES / 1024 });
    }
  }

  // ---- the house style ----
  walkStrings(pack, "", (text, at) => {
    if (text.includes("—")) addProblem(`There is an em dash in ${at}; packs use plain dashes.`, "workshop.plugin.check.emDash", { path: at });
  });

  // ---- advice ----
  if (String(pack.dmFlavor).length < DM_FLAVOR_FLOOR) {
    addAdvice(
      `The GM brief is ${String(pack.dmFlavor).length} characters; ${DM_FLAVOR_FLOOR} or more is what steers the narrator.`,
      "workshop.plugin.check.briefTooShort",
      { count: String(pack.dmFlavor).length, minimum: DM_FLAVOR_FLOOR },
    );
  }
  for (const target of SIZE_TARGETS) {
    const count = (pack[target.key as keyof typeof pack] as unknown[]).length;
    if (count < target.floor) addAdvice(`${count} ${target.label}; a full pack has at least ${target.floor}.`, "workshop.plugin.check.sizeBelowTarget", { count, minimum: target.floor, group: target.key });
  }
  if (pack.nameSeeds.people.length < 6) addAdvice("Fewer than six people names to suggest in the builder.", "workshop.plugin.check.nameSeedsPeople");
  if (pack.nameSeeds.places.length < 6) addAdvice("Fewer than six place names to suggest in the builder.", "workshop.plugin.check.nameSeedsPlaces");
  if (!String(pack.rightsHolder)) {
    addAdvice("No rights holder, so this ships as an original world. Fill it in if it stands on somebody else's setting.", "workshop.plugin.check.rightsHolderMissing");
  }
  if (!pack.art.cover) addAdvice("No cover picture; the picker will show the genre plate.", "workshop.plugin.check.coverMissing");

  return { problems, advice, problemMessages, adviceMessages };
}
