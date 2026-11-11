import {
  BookOpen,
  Dices,
  FlaskConical,
  Globe2,
  LayoutGrid,
  type LucideIcon,
  Map as MapIcon,
  Puzzle,
  Scale,
  Share2,
  Skull,
  Swords,
  UserRound,
  Users,
  Flag,
  Orbit,
} from "lucide-react";
import type { WorkshopSummary } from "@/app/workshop/types";
import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { IconRef } from "@/lib/icons";

// The systems a workshop is made of, and how each one counts itself.
//
// Nine of the counts come straight off the workshop's contents map, which
// /api/workshops/:id already serves per importable kind. The bestiary, the
// homebrew shelf, the party and the plugin are the exceptions: monsters,
// items, spells, character options and pregens are the builder's, not the
// workshop's, and the world pack draft is one JSON value rather than rows,
// so none of them are importable kinds and their counts are fetched from
// their own routes by the page. WorldForge counts what it adds over the
// records the other cards already count (links, events, secrets, maps), from
// its own route too. Rules is a yes-or-no rather than a number, and Share has
// nothing to count.

export type WorldCount = { entries: number; links: number; events: number; secrets: number; maps: number };

// Each system's painted glyph (scripts/icon-set.mjs paints them).
export function systemGlyph(id: SystemId): IconRef {
  return { kind: "glyph", key: `system-${id}` };
}

export const WORKSHOP_SYSTEMS = [
  { id: "world", label: "WorldForge", blurb: "Build the world", icon: Orbit },
  { id: "storyboard", label: "Storyboard", blurb: "Plan the arc", icon: LayoutGrid },
  { id: "party", label: "Party", blurb: "Who it is built for", icon: UserRound },
  { id: "maps", label: "Battle maps", blurb: "Rooms to fight in", icon: MapIcon },
  { id: "region", label: "Region", blurb: "The overworld & its places", icon: Globe2 },
  { id: "encounters", label: "Encounters", blurb: "Fights, budgeted", icon: Swords },
  { id: "cast", label: "Cast", blurb: "NPCs & agendas", icon: Users },
  { id: "factions", label: "Factions", blurb: "Powers & standing", icon: Flag },
  { id: "bestiary", label: "Bestiary", blurb: "Homebrew monsters", icon: Skull },
  { id: "homebrew", label: "Homebrew", blurb: "Items, spells & options", icon: FlaskConical },
  { id: "lore", label: "Lore", blurb: "Facts, handouts & shops", icon: BookOpen },
  { id: "tables", label: "Tables", blurb: "Roll tables", icon: Dices },
  { id: "rules", label: "Rules", blurb: "House & variant", icon: Scale },
  { id: "plugin", label: "Plugin", blurb: "Build a world pack", icon: Puzzle },
  { id: "share", label: "Share", blurb: "Export a bundle", icon: Share2 },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
}>;

export type SystemId = (typeof WORKSHOP_SYSTEMS)[number]["id"];

export const SYSTEM_I18N_KEYS = {
  world: { label: "workshop.system.world.label", blurb: "workshop.system.world.blurb" },
  storyboard: { label: "workshop.system.storyboard.label", blurb: "workshop.system.storyboard.blurb" },
  party: { label: "workshop.system.party.label", blurb: "workshop.system.party.blurb" },
  maps: { label: "workshop.system.maps.label", blurb: "workshop.system.maps.blurb" },
  region: { label: "workshop.system.region.label", blurb: "workshop.system.region.blurb" },
  encounters: { label: "workshop.system.encounters.label", blurb: "workshop.system.encounters.blurb" },
  cast: { label: "workshop.system.cast.label", blurb: "workshop.system.cast.blurb" },
  factions: { label: "workshop.system.factions.label", blurb: "workshop.system.factions.blurb" },
  bestiary: { label: "workshop.system.bestiary.label", blurb: "workshop.system.bestiary.blurb" },
  homebrew: { label: "workshop.system.homebrew.label", blurb: "workshop.system.homebrew.blurb" },
  lore: { label: "workshop.system.lore.label", blurb: "workshop.system.lore.blurb" },
  tables: { label: "workshop.system.tables.label", blurb: "workshop.system.tables.blurb" },
  rules: { label: "workshop.system.rules.label", blurb: "workshop.system.rules.blurb" },
  plugin: { label: "workshop.system.plugin.label", blurb: "workshop.system.plugin.blurb" },
  share: { label: "workshop.system.share.label", blurb: "workshop.system.share.blurb" },
} as const;

export function isSystemId(value: string | null): value is SystemId {
  return WORKSHOP_SYSTEMS.some((system) => system.id === value);
}

// What a card shows big and what the system title says after its name.
// `figure` is null when there is nothing to count (Share) and, for the
// bestiary, while its count is still on the wire.
export type SystemCount = { figure: string | null; phrase: string; total: number };

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

type SystemCountI18n = {
  t: (key: MessageKey, params?: Params) => string;
  tp: (key: string, count: number, params?: Params) => string;
};

function countText(i18n: SystemCountI18n | undefined, key: MessageKey, fallback: string, params?: Params): string {
  return i18n ? i18n.t(key, params) : fallback;
}

function countPlural(i18n: SystemCountI18n | undefined, key: string, count: number, one: string, many: string): string {
  return i18n ? i18n.tp(key, count) : plural(count, one, many);
}

export function systemCount(
  id: SystemId,
  workshop: WorkshopSummary,
  bestiary: number | null,
  homebrew: number | null = null,
  pregens: number | null = null,
  plugin: number | null = null,
  world: WorldCount | null = null,
  i18n?: SystemCountI18n,
): SystemCount {
  const contents = workshop.contents;
  switch (id) {
    case "world": {
      if (!world) return { figure: null, phrase: countText(i18n, "workshop.systemCount.loading", "counting"), total: 0 };
      const pieces = world.links + world.events + world.secrets + world.maps;
      return {
        figure: String(world.entries),
        phrase: world.entries
          ? countText(i18n, "workshop.systemCount.world.summary",
              `${plural(world.entries, "entry", "entries")}, ${plural(world.links, "link", "links")}, ${plural(world.events, "event", "events")}`,
              {
                entries: countPlural(i18n, "workshop.systemCount.world.entries", world.entries, "entry", "entries"),
                links: countPlural(i18n, "workshop.systemCount.world.links", world.links, "link", "links"),
                events: countPlural(i18n, "workshop.systemCount.world.events", world.events, "event", "events"),
              })
          : countText(i18n, "workshop.systemCount.world.empty", "an empty world"),
        total: pieces,
      };
    }
    case "plugin":
      return {
        figure: plugin === null ? null : String(plugin),
        phrase: plugin === null ? countText(i18n, "workshop.systemCount.loading", "counting") : plugin ? countPlural(i18n, "workshop.systemCount.plugin.entries", plugin, "entry in the pack", "entries in the pack") : countText(i18n, "workshop.systemCount.plugin.none", "no pack yet"),
        total: plugin ?? 0,
      };
    case "party": {
      const party = workshop.gameSettings.targetParty;
      return {
        figure: String(party.size),
        phrase:
          pregens === null
            ? countText(i18n, "workshop.systemCount.party.level", `at level ${party.level}`, { level: party.level })
            : countText(i18n, "workshop.systemCount.party.levelWithPregens",
                `at level ${party.level}, ${plural(pregens, "pregen ready", "pregens ready")}`,
                { level: party.level, pregens: countPlural(i18n, "workshop.systemCount.party.pregens", pregens, "pregen ready", "pregens ready") }),
        total: pregens ?? 0,
      };
    }
    case "homebrew":
      return {
        figure: homebrew === null ? null : String(homebrew),
        phrase: homebrew === null ? countText(i18n, "workshop.systemCount.loading", "counting") : countPlural(i18n, "workshop.systemCount.homebrew.pieces", homebrew, "piece of homebrew", "pieces of homebrew"),
        total: homebrew ?? 0,
      };
    case "storyboard": {
      const count = contents.storyboard;
      return {
        figure: String(count),
        phrase: count ? countText(i18n, "workshop.systemCount.storyboard.inProgress", "a board in progress") : countText(i18n, "workshop.systemCount.storyboard.none", "no board yet"),
        total: count,
      };
    }
    case "maps":
      return { figure: String(contents.maps), phrase: countText(i18n, "workshop.systemCount.maps", `${contents.maps} in the drawer`, { count: contents.maps }), total: contents.maps };
    case "region": {
      // Places live here: the overworld pins every location the workshop
      // knows, so they are counted on this card rather than on Lore, whose
      // tab lists only lore entries (issue #121 saw a 28 over a list of 16).
      const count = contents.overworld;
      const places = contents.locations;
      const drawn = count ? countText(i18n, "workshop.systemCount.region.drawn", "the overworld is drawn") : countText(i18n, "workshop.systemCount.region.none", "no overworld yet");
      return {
        figure: String(count + places),
        phrase: places ? countText(i18n, "workshop.systemCount.region.withPlaces", `${drawn}, ${plural(places, "place", "places")} on it`, { overworld: drawn, places: countPlural(i18n, "workshop.systemCount.region.places", places, "place", "places") }) : drawn,
        total: count + places,
      };
    }
    case "encounters":
      return {
        figure: String(contents.encounters),
        phrase: countPlural(i18n, "workshop.systemCount.encounters.fights", contents.encounters, "fight", "fights"),
        total: contents.encounters,
      };
    case "cast":
      return {
        figure: String(contents.npcs),
        phrase: countPlural(i18n, "workshop.systemCount.cast.people", contents.npcs, "person", "people"),
        total: contents.npcs,
      };
    case "factions":
      // Not counted on the summary; the panel reads its own list.
      return { figure: null, phrase: countText(i18n, "workshop.systemCount.factions.summary", "powers of the world"), total: 0 };
    case "bestiary":
      return {
        figure: bestiary === null ? null : String(bestiary),
        phrase: bestiary === null ? countText(i18n, "workshop.systemCount.loading", "counting") : countPlural(i18n, "workshop.systemCount.bestiary.monsters", bestiary, "monster", "monsters"),
        total: bestiary ?? 0,
      };
    case "lore": {
      // The Market's shops sit under Lore's entries, so the card counts and
      // names them too (audit WA-10).
      const count = contents.lore;
      const shops = contents.shops ?? 0;
      const entries = countPlural(i18n, "workshop.systemCount.lore.entries", count, "entry", "entries");
      return {
        figure: String(count + shops),
        phrase: shops ? countText(i18n, "workshop.systemCount.lore.summary", `${entries}, ${plural(shops, "shop", "shops")}`, { entries, shops: countPlural(i18n, "workshop.systemCount.lore.shops", shops, "shop", "shops") }) : entries,
        total: count + shops,
      };
    }
    case "tables":
      return {
        figure: String(contents.tables),
        phrase: countPlural(i18n, "workshop.systemCount.tables.count", contents.tables, "table", "tables"),
        total: contents.tables,
      };
    case "rules":
      return {
        figure: contents.houseRules ? "set" : "none",
        phrase: contents.houseRules ? countText(i18n, "workshop.systemCount.rules.set", "house rules set") : countText(i18n, "workshop.systemCount.rules.none", "no house rules yet"),
        total: 0,
      };
    case "share":
      return { figure: null, phrase: countText(i18n, "workshop.systemCount.share.export", "export a bundle"), total: 0 };
  }
}

// "41 pieces of prep": every countable thing in the workshop, for the hub's
// section heading.
export function totalPieces(
  workshop: WorkshopSummary,
  bestiary: number | null,
  homebrew: number | null = null,
  pregens: number | null = null,
  plugin: number | null = null,
  world: WorldCount | null = null,
): number {
  return WORKSHOP_SYSTEMS.reduce(
    (sum, system) => sum + systemCount(system.id, workshop, bestiary, homebrew, pregens, plugin, world).total,
    0,
  );
}
