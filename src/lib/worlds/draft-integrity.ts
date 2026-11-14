// The checks a draft needs the server for: that its monster slugs, spell
// names and item names are real, against the content pack on disk. The
// same checks scripts/validate-world-packs.mjs runs over a folder, asked of
// one pack at export time so a person is told "that slug is not in the
// content pack" in the editor rather than by a script they never run.
//
// Server-only: opens the content database. Everything the browser can check
// on its own is in ./draft-check.ts.
import { getContentDb } from "@/lib/content/db";
import { SRD_ARMOR } from "@/lib/srd/armor";
import { SRD_WEAPONS } from "@/lib/srd/weapons";
import { normalizeCreatureType } from "@/lib/bestiary/creature-type";
import type { WorldPack } from "@/lib/worlds/types";
import { textKey } from "@/lib/language/text-logic";
import { PLAYED_DOCUMENTS_SQL } from "@/lib/content/edition";
import { srdRaceId } from "@/lib/srd/race-id";

export type IntegrityMessage = {
  key: string;
  params?: Record<string, string | number>;
};

export type IntegrityReport = {
  // English fallback remains for scripts and non-UI callers.
  problems: string[];
  details: IntegrityMessage[];
  // True when the content pack was there to ask. When it is not, the
  // problems list is empty and means nothing, which the caller should say.
  checked: boolean;
};

export function checkPackIntegrity(pack: WorldPack): IntegrityReport {
  const db = getContentDb();
  if (!db) {
    return { problems: [], details: [], checked: false };
  }
  const problems: string[] = [];
  const details: IntegrityMessage[] = [];
  const addProblem = (message: string, key: string, params: Record<string, string | number>) => {
    problems.push(message);
    details.push({ key, params });
  };

  if (pack.monsters.length) {
    const lookup = db.prepare(`SELECT cr, type FROM monsters WHERE slug = ?`);
    for (const entry of pack.monsters) {
      const row = lookup.get(entry.slug) as { cr: number; type: string } | undefined;
      if (!row) {
        addProblem(`Monster "${entry.slug}" is not in the content pack.`, "workshop.plugin.integrity.monsterMissing", { slug: entry.slug });
      } else if (row.cr !== entry.cr) {
        addProblem(`${entry.name} says CR ${entry.cr}; the content pack has ${entry.slug} at CR ${row.cr}.`, "workshop.plugin.integrity.monsterCr", { name: entry.name, cr: entry.cr, slug: entry.slug, actualCr: row.cr });
      } else if (entry.type && normalizeCreatureType(row.type) !== entry.type) {
        addProblem(`${entry.name} says it is a ${entry.type}; the content pack has ${entry.slug} as ${normalizeCreatureType(row.type) ?? "unknown"}.`, "workshop.plugin.integrity.monsterType", { name: entry.name, type: entry.type, slug: entry.slug, actualType: normalizeCreatureType(row.type) ?? "unknown" });
      }
    }
  }

  if (pack.spells.length) {
    const names = new Set(
      (db.prepare(`SELECT name FROM spells WHERE ${PLAYED_DOCUMENTS_SQL}`).all() as Array<{ name: string }>).map((row) => textKey(row.name)),
    );
    for (const entry of pack.spells) {
      if (!names.has(textKey(entry.from))) addProblem(`"${entry.from}" is not a spell in the content pack.`, "workshop.plugin.integrity.spellMissing", { name: entry.from });
    }
  }

  if (pack.items.length) {
    const names = new Set(
      (db.prepare(`SELECT name FROM items WHERE ${PLAYED_DOCUMENTS_SQL}`).all() as Array<{ name: string }>).map((row) => textKey(row.name)),
    );
    for (const weapon of SRD_WEAPONS) names.add(textKey(weapon.name));
    for (const armor of SRD_ARMOR) names.add(textKey(armor.name));
    for (const entry of pack.items) {
      if (!names.has(textKey(entry.from))) addProblem(`"${entry.from}" is not an item in the content pack.`, "workshop.plugin.integrity.itemMissing", { name: entry.from });
    }
  }

  return { problems, details, checked: true };
}

// The content pack's peoples, by their one spelling (srdRaceId), which a
// pack may rename beside the bundled races: with the pack installed the
// creator offers them. Empty without the pack, when only the bundled races
// are offered.
export function contentRaceKeys(): Set<string> {
  const db = getContentDb();
  if (!db) {
    return new Set();
  }
  const rows = db.prepare(`SELECT slug FROM races WHERE ${PLAYED_DOCUMENTS_SQL}`).all() as Array<{ slug: string }>;
  return new Set(rows.map((row) => srdRaceId(row.slug)));
}
