import { LANGUAGES } from "@/lib/workshop/pickers";

type Translate = (key: string) => string;

const LANGUAGE_KEYS: Record<string, string> = {
  common: "workshop.homebrew.language.common",
  dwarvish: "workshop.homebrew.language.dwarvish",
  elvish: "workshop.homebrew.language.elvish",
  giant: "workshop.homebrew.language.giant",
  gnomish: "workshop.homebrew.language.gnomish",
  goblin: "workshop.homebrew.language.goblin",
  halfling: "workshop.homebrew.language.halfling",
  orc: "workshop.homebrew.language.orc",
  abyssal: "workshop.homebrew.language.abyssal",
  celestial: "workshop.homebrew.language.celestial",
  draconic: "workshop.homebrew.language.draconic",
  "deep speech": "workshop.homebrew.language.deepSpeech",
  infernal: "workshop.homebrew.language.infernal",
  primordial: "workshop.homebrew.language.primordial",
  sylvan: "workshop.homebrew.language.sylvan",
  undercommon: "workshop.homebrew.language.undercommon",
  "thieves' cant": "workshop.homebrew.language.thievesCant",
  druidic: "workshop.homebrew.language.druidic",
  "telepathy 60 ft": "workshop.homebrew.language.telepathy60ft",
};

const TOOL_KEYS: Record<string, string> = {
  "alchemist's supplies": "workshop.homebrew.toolProficiency.alchemistsSupplies",
  "brewer's supplies": "workshop.homebrew.toolProficiency.brewersSupplies",
  "calligrapher's supplies": "workshop.homebrew.toolProficiency.calligraphersSupplies",
  "carpenter's tools": "workshop.homebrew.toolProficiency.carpentersTools",
  "cartographer's tools": "workshop.homebrew.toolProficiency.cartographersTools",
  "cobbler's tools": "workshop.homebrew.toolProficiency.cobblersTools",
  "cook's utensils": "workshop.homebrew.toolProficiency.cooksUtensils",
  "glassblower's tools": "workshop.homebrew.toolProficiency.glassblowersTools",
  "jeweler's tools": "workshop.homebrew.toolProficiency.jewelersTools",
  "leatherworker's tools": "workshop.homebrew.toolProficiency.leatherworkersTools",
  "mason's tools": "workshop.homebrew.toolProficiency.masonsTools",
  "painter's supplies": "workshop.homebrew.toolProficiency.paintersSupplies",
  "potter's tools": "workshop.homebrew.toolProficiency.pottersTools",
  "smith's tools": "workshop.homebrew.toolProficiency.smithsTools",
  "tinker's tools": "workshop.homebrew.toolProficiency.tinkersTools",
  "weaver's tools": "workshop.homebrew.toolProficiency.weaversTools",
  "woodcarver's tools": "workshop.homebrew.toolProficiency.woodcarversTools",
  "disguise kit": "workshop.homebrew.toolProficiency.disguiseKit",
  "forgery kit": "workshop.homebrew.toolProficiency.forgeryKit",
  "herbalism kit": "workshop.homebrew.toolProficiency.herbalismKit",
  "navigator's tools": "workshop.homebrew.toolProficiency.navigatorsTools",
  "poisoner's kit": "workshop.homebrew.toolProficiency.poisonersKit",
  "thieves' tools": "workshop.homebrew.toolProficiency.thievesTools",
  "one type of gaming set": "workshop.homebrew.toolProficiency.oneGamingSet",
  "one type of musical instrument": "workshop.homebrew.toolProficiency.oneMusicalInstrument",
  "one type of artisan's tools": "workshop.homebrew.toolProficiency.oneArtisanTools",
  "vehicles (land)": "workshop.homebrew.toolProficiency.landVehicles",
  "vehicles (water)": "workshop.homebrew.toolProficiency.waterVehicles",
};

export function languageLabel(value: string, t: Translate): string {
  const key = LANGUAGE_KEYS[value.trim().toLowerCase()];
  return key ? t(key) : value;
}

export function languageOptions(t: Translate) {
  return LANGUAGES.map((value) => ({ value, label: languageLabel(value, t) }));
}

export function toolLabel(value: string, t: Translate): string {
  const key = TOOL_KEYS[value.trim().toLowerCase()];
  return key ? t(key) : value;
}

export function toolOptions(values: readonly string[], t: Translate) {
  return values.map((value) => ({ value, label: toolLabel(value, t) }));
}
