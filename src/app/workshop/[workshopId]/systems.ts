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
import type { IconRef } from "@/lib/icons";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { Params } from "@/lib/i18n/core";

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

export type SystemMessages = {
  t: (key: MessageKey, params?: Params) => string;
  tp: (key: string, count: number, params?: Params) => string;
};

export function systemCount(
  id: SystemId,
  workshop: WorkshopSummary,
  bestiary: number | null,
  homebrew: number | null = null,
  pregens: number | null = null,
  plugin: number | null = null,
  world: WorldCount | null = null,
  messages?: SystemMessages,
): SystemCount {
  const contents = workshop.contents;
  const say = (key: MessageKey, fallback: string, params?: Params) =>
    messages ? messages.t(key, params) : fallback;
  const word = (key: string, count: number, one: string, many: string) =>
    messages ? messages.tp(key, count) : plural(count, one, many);
  switch (id) {
    case "world": {
      if (!world) return { figure: null, phrase: say("workshop.system.count.loading", "counting"), total: 0 };
      const pieces = world.links + world.events + world.secrets + world.maps;
      return {
        figure: String(world.entries),
        phrase: world.entries
          ? `${word("workshop.system.count.world.entry", world.entries, "entry", "entries")}, ${word("workshop.system.count.world.link", world.links, "link", "links")}, ${word("workshop.system.count.world.event", world.events, "event", "events")}`
          : say("workshop.system.count.world.empty", "an empty world"),
        total: pieces,
      };
    }
    case "plugin":
      return {
        figure: plugin === null ? null : String(plugin),
        phrase: plugin === null
          ? say("workshop.system.count.loading", "counting")
          : plugin
            ? word("workshop.system.count.plugin.entry", plugin, "entry in the pack", "entries in the pack")
            : say("workshop.system.count.plugin.none", "no pack yet"),
        total: plugin ?? 0,
      };
    case "party": {
      const party = workshop.gameSettings.targetParty;
      const level = say("workshop.system.count.party.level", `at level ${party.level}`, { level: party.level });
      return {
        figure: String(party.size),
        phrase: pregens === null
          ? level
          : `${level}, ${word("workshop.system.count.party.pregen", pregens, "pregen ready", "pregens ready")}`,
        total: pregens ?? 0,
      };
    }
    case "homebrew":
      return {
        figure: homebrew === null ? null : String(homebrew),
        phrase: homebrew === null
          ? say("workshop.system.count.loading", "counting")
          : word("workshop.system.count.homebrew.entry", homebrew, "piece of homebrew", "pieces of homebrew"),
        total: homebrew ?? 0,
      };
    case "storyboard": {
      const count = contents.storyboard;
      return {
        figure: String(count),
        phrase: count
          ? say("workshop.system.count.storyboard.progress", "a board in progress")
          : say("workshop.system.count.storyboard.empty", "no board yet"),
        total: count,
      };
    }
    case "maps":
      return {
        figure: String(contents.maps),
        phrase: say("workshop.system.count.maps.drawer", `${contents.maps} in the drawer`, { count: contents.maps }),
        total: contents.maps,
      };
    case "region": {
      const count = contents.overworld;
      const places = contents.locations;
      const drawn = count
        ? say("workshop.system.count.region.drawn", "the overworld is drawn")
        : say("workshop.system.count.region.empty", "no overworld yet");
      return {
        figure: String(count + places),
        phrase: places
          ? `${drawn}, ${word("workshop.system.count.region.place", places, "place on it", "places on it")}`
          : drawn,
        total: count + places,
      };
    }
    case "encounters":
      return {
        figure: String(contents.encounters),
        phrase: word("workshop.system.count.encounter.fight", contents.encounters, "fight", "fights"),
        total: contents.encounters,
      };
    case "cast":
      return {
        figure: String(contents.npcs),
        phrase: word("workshop.system.count.cast.person", contents.npcs, "person", "people"),
        total: contents.npcs,
      };
    case "factions":
      return { figure: null, phrase: say("workshop.system.count.factions.powers", "powers of the world"), total: 0 };
    case "bestiary":
      return {
        figure: bestiary === null ? null : String(bestiary),
        phrase: bestiary === null
          ? say("workshop.system.count.loading", "counting")
          : word("workshop.system.count.bestiary.monster", bestiary, "monster", "monsters"),
        total: bestiary ?? 0,
      };
    case "lore": {
      const count = contents.lore;
      const shops = contents.shops ?? 0;
      const entries = word("workshop.system.count.lore.entry", count, "entry", "entries");
      return {
        figure: String(count + shops),
        phrase: shops
          ? `${entries}, ${word("workshop.system.count.lore.shop", shops, "shop", "shops")}`
          : entries,
        total: count + shops,
      };
    }
    case "tables":
      return {
        figure: String(contents.tables),
        phrase: word("workshop.system.count.table", contents.tables, "table", "tables"),
        total: contents.tables,
      };
    case "rules":
      return {
        figure: contents.houseRules ? "set" : "none",
        phrase: contents.houseRules
          ? say("workshop.system.count.rules.set", "house rules set")
          : say("workshop.system.count.rules.none", "no house rules yet"),
        total: 0,
      };
    case "share":
      return { figure: null, phrase: say("workshop.system.count.share.export", "export a bundle"), total: 0 };
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
