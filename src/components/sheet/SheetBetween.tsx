"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";
import type { CharacterSheet } from "@/lib/schemas/sheet";

// Life between adventures on the sheet (SRD 5.1, Between Adventures, and the
// diseases, madness and poisons of Running the Game): the lifestyle paid at
// each dawn, crafting, training, research and recuperating progress, and the
// afflictions the engine holds. The lines are the engine's own
// (GET /sheet/between, src/lib/dm/between-lines.ts), asked again whenever the
// sheet changes (a dawn charges the purse, a rest moves a disease). A line
// only the DM sees (a disease still incubating) is marked as such. Rows
// arrive on the sheet's stagger (motion-app.css .stagger-up).

type BetweenLine = { text: string; kind: "affliction" | "between"; secret?: boolean };


type BetweenTranslator = ReturnType<typeof useI18n>["t"];

function localizeBetweenLine(text: string, kind: BetweenLine["kind"], t: BetweenTranslator): string {
  const diseaseNames: Record<string, string> = {
    "cackle fever": t("charSheet.between.disease.cackle"),
    "sewer plague": t("charSheet.between.disease.sewer"),
    "sight rot": t("charSheet.between.disease.sight"),
  };
  const poisonNames: Record<string, string> = {
    assassins_blood: t("charSheet.between.poison.assassins_blood"),
    burnt_othur_fumes: t("charSheet.between.poison.burnt_othur_fumes"),
    crawler_mucus: t("charSheet.between.poison.crawler_mucus"),
    drow_poison: t("charSheet.between.poison.drow_poison"),
    essence_of_ether: t("charSheet.between.poison.essence_of_ether"),
    malice: t("charSheet.between.poison.malice"),
    midnight_tears: t("charSheet.between.poison.midnight_tears"),
    oil_of_taggit: t("charSheet.between.poison.oil_of_taggit"),
    pale_tincture: t("charSheet.between.poison.pale_tincture"),
    purple_worm_poison: t("charSheet.between.poison.purple_worm_poison"),
    serpent_venom: t("charSheet.between.poison.serpent_venom"),
    torpor: t("charSheet.between.poison.torpor"),
    truth_serum: t("charSheet.between.poison.truth_serum"),
    wyvern_poison: t("charSheet.between.poison.wyvern_poison"),
  };
  const lifestyleNames: Record<string, string> = {
    wretched: t("charSheet.between.lifestyle.wretched"),
    squalid: t("charSheet.between.lifestyle.squalid"),
    poor: t("charSheet.between.lifestyle.poor"),
    modest: t("charSheet.between.lifestyle.modest"),
    comfortable: t("charSheet.between.lifestyle.comfortable"),
    wealthy: t("charSheet.between.lifestyle.wealthy"),
    aristocratic: t("charSheet.between.lifestyle.aristocratic"),
  };
  const disease = (name: string) => diseaseNames[name.trim().toLowerCase()] ?? name;
  if (kind === "affliction") {
    let match = /^infected with (.+), symptoms in (\\d+) h$/.exec(text);
    if (match) return t("charSheet.between.infected", { disease: disease(match[1]), hours: Number(match[2]) });
    match = /^(.+) \\((\\d+) of (\\d+) rest saves toward a cure\\)$/.exec(text);
    if (match) return t("charSheet.between.diseaseProgress", { disease: disease(match[1]), successes: Number(match[2]), total: Number(match[3]) });
    match = /^Cackle Fever \\(DC (\\d+), (\\d+) of 3 failed rest saves\\)$/.exec(text);
    if (match) return t("charSheet.between.cackle", { dc: Number(match[1]), fails: Number(match[2]) });
    match = /^Sight Rot \\(-?(\\d+), (\\d+) of 3 Eyebright doses\\)$/.exec(text);
    if (match) return t("charSheet.between.sight", { penalty: Number(match[1]), doses: Number(match[2]) });
    match = /^indefinite madness, flaw: (.+)$/.exec(text);
    if (match) return t("charSheet.between.indefinite", { flaw: match[1] });
    match = /^(short|long)-term madness \\((.*?)(?:, (\\d+) h left)?\\)$/.exec(text);
    if (match) {
      const remaining = match[3] ? `, ${t("charSheet.between.hoursLeft", { hours: Number(match[3]) })}` : "";
      const madnessKind = t(match[1] === "short" ? "charSheet.between.madness.short" : "charSheet.between.madness.long");
      return t("charSheet.between.madness", { kind: madnessKind, conditions: match[2], remaining });
    }
    const poison = /^(.+?)(?:, next save in (\\d+) h)?$/.exec(text);
    if (poison) {
      const id = poison[1].trim().toLowerCase().replace(/\\s+/g, "_");
      if (poisonNames[id]) {
        const nextSave = poison[2] ? t("charSheet.between.nextSave", { hours: Number(poison[2]) }) : "";
        return t("charSheet.between.poison", { poison: poisonNames[id], nextSave: nextSave ? `, ${nextSave}` : "" });
      }
    }
    return text;
  }
  return text.split("; ").map((part) => {
    let match = /^lifestyle (\\w+) \\((.+) a day, paid at each dawn in town\\)$/.exec(part);
    if (match) return t("charSheet.between.lifestyle", {
      name: lifestyleNames[match[1]] ?? match[1],
      price: match[2],
    });
    match = /^crafting (.+) (\\d[\\d,.]* \\w+) of (\\d[\\d,.]* \\w+)$/.exec(part);
    if (match) return t("charSheet.between.crafting", { item: match[1], progress: match[2], total: match[3] });
    match = /^training (.+) (\\d+)\\/250 days$/.exec(part);
    if (match) return t("charSheet.between.training", { subject: match[1], days: Number(match[2]) });
    match = /^researching (.+) \\((\\d+) days\\)$/.exec(part);
    if (match) return t("charSheet.between.research", { topic: match[1], days: Number(match[2]) });
    match = /^recuperating (\\d+)\\/3 days$/.exec(part);
    if (match) return t("charSheet.between.recuperating", { days: Number(match[1]) });
    return part;
  }).join("; ");
}

export function SheetBetween({ sheet, className }: { sheet: CharacterSheet; className?: string }) {
  const { t } = useI18n();
  const [lines, setLines] = useState<BetweenLine[]>([]);
  // The purse, the conditions and the edit stamp change when the engine
  // charges a lifestyle, moves a disease or finishes a craft.
  const stamp = `${sheet.updatedAt}|${sheet.gold}|${sheet.conditions.join(",")}`;

  useEffect(() => {
    let live = true;
    fetch(`/api/campaigns/${sheet.campaignId}/sheet/between?characterId=${encodeURIComponent(sheet.id)}`)
      .then((response): Promise<{ lines?: BetweenLine[] }> | { lines?: BetweenLine[] } =>
        response.ok ? (response.json() as Promise<{ lines?: BetweenLine[] }>) : {},
      )
      .then((data) => {
        if (live) setLines(Array.isArray(data.lines) ? data.lines : []);
      })
      .catch(() => {
        if (live) setLines([]);
      });
    return () => {
      live = false;
    };
  }, [sheet.campaignId, sheet.id, stamp]);

  if (!lines.length) return null;
  return (
    <div className={cn("reveal rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2", className)}>
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-stone-500">{t("charSheet.between.title")}</p>
      <ul className="stagger-up space-y-0.5 text-xs">
        {lines.map((line) => (
          <li
            key={localizeBetweenLine(line.text, line.kind, t)}
            className={cn(
              "flex items-start gap-1.5",
              line.kind === "affliction" ? "text-red-200/90" : "text-stone-300",
            )}
          >
            <span aria-hidden="true" className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", line.kind === "affliction" ? "bg-red-400/80" : "bg-amber-400/70")} />
            <span>
              {line.text}
              {line.secret ? <span className="ml-1 text-[10px] uppercase tracking-wide text-stone-500">{t("charSheet.between.dmOnly")}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
