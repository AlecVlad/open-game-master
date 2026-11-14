import type { PaletteCommand } from "@/components/CommandPalette";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { Params } from "@/lib/i18n/core";
import { SYSTEM_I18N_KEYS, WORKSHOP_SYSTEMS, type SystemId } from "@/app/workshop/[workshopId]/systems";

// The workshop's command palette, derived from the systems the hub lists:
// one "jump" per system, and one "create" for every system whose panel can
// open its own editor when asked.
//
// Asking is the tour's prepare broadcast (src/lib/tours/prepare.ts): the page
// knows nothing about a panel's editor, the panel does, and it already
// answers these names for the guided tours. The palette is a second caller of
// the same names, so it can never open something the panel's own "New"
// button does not.

const GLYPH: Record<SystemId, string> = {
  world: "system-world",
  storyboard: "system-storyboard",
  party: "system-party",
  maps: "system-maps",
  region: "system-region",
  encounters: "system-encounters",
  cast: "system-cast",
  factions: "system-factions",
  bestiary: "system-bestiary",
  homebrew: "system-homebrew",
  lore: "system-lore",
  tables: "system-tables",
  rules: "system-rules",
  plugin: "system-plugin",
  share: "system-share",
};

// Lore has two: its own entries, and the Market's shops below them, which
// an author looking for shops could not find (audit WA-10).
export const SYSTEM_CREATE: Partial<Record<SystemId, Array<{ label: string; labelKey: MessageKey; prepare: string; keywords: string[] }>>> = {
  world: [{ label: "New world entry", labelKey: "workshop.palette.create.worldEntry", prepare: "open-world-entry", keywords: ["create", "add", "worldforge", "wiki", "entry"] }],
  maps: [{ label: "New battle map", labelKey: "workshop.palette.create.battleMap", prepare: "open-map-create", keywords: ["create", "add", "map", "room"] }],
  encounters: [{ label: "New encounter", labelKey: "workshop.palette.create.encounter", prepare: "open-encounter-editor", keywords: ["create", "add", "fight"] }],
  cast: [{ label: "New NPC", labelKey: "workshop.palette.create.npc", prepare: "open-npc-editor", keywords: ["create", "add", "person", "character"] }],
  bestiary: [{ label: "Build a monster", labelKey: "workshop.palette.create.monster", prepare: "open-monster-build", keywords: ["create", "new", "add", "creature"] }],
  homebrew: [{ label: "New homebrew", labelKey: "workshop.palette.create.homebrew", prepare: "open-homebrew-editor", keywords: ["create", "add", "item", "spell", "option"] }],
  lore: [
    { label: "New lore entry", labelKey: "workshop.palette.create.lore", prepare: "open-lore-editor", keywords: ["create", "add", "fact", "place", "handout"] },
    { label: "New shop", labelKey: "workshop.palette.create.shop", prepare: "open-shop-editor", keywords: ["create", "add", "market", "merchant", "store", "trade"] },
  ],
  tables: [{ label: "New roll table", labelKey: "workshop.palette.create.table", prepare: "open-table-editor", keywords: ["create", "add", "random"] }],
  plugin: [{ label: "Open the world pack wizard", labelKey: "workshop.palette.create.worldPackWizard", prepare: "open-plugin-wizard", keywords: ["create", "new", "pack", "plugin"] }],
};

export function workshopCommands({
  t,
  current,
  phrase,
  onJump,
  onCreate,
  onHub,
  onHelp,
}: {
  // The system on screen, or null on the hub.
  t: (key: MessageKey, params?: Params) => string;
  current: SystemId | null;
  // Each system's live count phrase, for the quiet line under its name.
  phrase: (id: SystemId) => string;
  onJump: (id: SystemId) => void;
  onCreate: (id: SystemId, prepare: string) => void;
  onHub: () => void;
  onHelp: () => void;
}): PaletteCommand[] {
  const jumps: PaletteCommand[] = WORKSHOP_SYSTEMS.filter((system) => system.id !== current).map((system) => ({
    id: `go-${system.id}`,
    label: t("workshop.palette.goTo", { name: t(SYSTEM_I18N_KEYS[system.id].label) }),
    hint: t("workshop.palette.systemHint", { description: t(SYSTEM_I18N_KEYS[system.id].blurb), count: phrase(system.id) }),
    group: t("workshop.palette.group.jump"),
    glyph: GLYPH[system.id],
    keywords: ["open", "jump", system.id],
    onSelect: () => onJump(system.id),
  }));
  const creates: PaletteCommand[] = WORKSHOP_SYSTEMS.flatMap((system) =>
    (SYSTEM_CREATE[system.id] ?? []).map((create, index) => ({
      id: index ? `new-${system.id}-${index}` : `new-${system.id}`,
      label: t(create.labelKey),
      hint: t("workshop.palette.createHint", { name: t(SYSTEM_I18N_KEYS[system.id].label) }),
      group: t("workshop.palette.group.create"),
      glyph: GLYPH[system.id],
      keywords: [...create.keywords, system.label],
      onSelect: () => onCreate(system.id, create.prepare),
    })),
  );
  const here: PaletteCommand[] = [
    ...(current
      ? [{ id: "hub", label: t("workshop.palette.backToHub"), hint: t("workshop.palette.backToHubHint"), group: t("workshop.palette.group.thisWorkshop"), glyph: "tab-campaigns", keywords: ["home", "cards"], onSelect: onHub }]
      : []),
    { id: "help", label: t("workshop.palette.guides"), hint: t("workshop.palette.guidesHint"), group: t("workshop.palette.group.thisWorkshop"), glyph: "tab-reference", keywords: ["help", "tour", "guide"], onSelect: onHelp },
  ];
  return [...jumps, ...creates, ...here];
}
