"use client";

import "@/app/styles/rulebook.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hammer, Loader2 } from "lucide-react";
import type { RulebookPageResponse } from "@/lib/rulebook/types";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// Under a page's title: how the table runs what the page describes
// (src/lib/rulebook/crosswalk.ts), and for an entry the workshop can copy,
// a way to start one from it. The copy opens in the newest of the reader's
// workshops (the shelf is theirs in every workshop alike), in the editor for
// its kind, from this entry, unsaved.

const SUPPORT_LABEL: Record<NonNullable<RulebookPageResponse["crosswalk"]>["support"], MessageKey> = {
  engine: "rulebook.support.engine",
  structured: "rulebook.support.structured",
  editable: "rulebook.support.editable",
  reference: "rulebook.support.reference",
};

const WHERE_MESSAGE: Partial<Record<string, MessageKey>> = {
  "half-dragon-template": "rulebook.where.halfDragonTemplate",
  "customizing-npcs": "rulebook.where.customizingNpcs",
  "racial-traits": "rulebook.where.racialTraits",
  "beyond-1st-level": "rulebook.where.beyondFirstLevel",
  multiclassing: "rulebook.where.multiclassing",
  alignment: "rulebook.where.alignment",
  languages: "rulebook.where.languages",
  inspiration: "rulebook.where.inspiration",
  backgrounds: "rulebook.where.backgrounds",
  coinage: "rulebook.where.coinage",
  "selling-treasure": "rulebook.where.sellingTreasure",
  armor: "rulebook.where.armor",
  weapons: "rulebook.where.weapons",
  "adventuring-gear": "rulebook.where.adventuringGear",
  tools: "rulebook.where.tools",
  "mounts-and-vehicles": "rulebook.where.mountsAndVehicles",
  "trade-goods": "rulebook.where.tradeGoods",
  expenses: "rulebook.where.expenses",
  feats: "rulebook.where.feats",
  "using-ability-scores": "rulebook.where.abilityScores",
  adventuring: "rulebook.where.adventuring",
  combat: "rulebook.where.combat",
  spellcasting: "rulebook.where.spellcasting",
  "spell-lists": "rulebook.where.spellLists",
  traps: "rulebook.where.traps",
  diseases: "rulebook.where.diseases",
  madness: "rulebook.where.madness",
  objects: "rulebook.where.objects",
  poisons: "rulebook.where.poisons",
  "magic-items": "rulebook.where.magicItems",
  "sentient-magic-items": "rulebook.where.sentientMagicItems",
  artifacts: "rulebook.where.artifacts",
  "monster-statistics": "rulebook.where.monsterStatistics",
  "nonplayer-characters": "rulebook.where.nonplayerCharacters",
  conditions: "rulebook.where.conditions",
  "gods-of-the-multiverse": "rulebook.where.gods",
  "the-planes-of-existence": "rulebook.where.planes",
  "legal-information": "rulebook.where.legalInformation",
};

const FAMILY_TEMPLATE_MESSAGE: Partial<Record<string, MessageKey>> = {
  "ammunition-1-2-or-3": "rulebook.template.ammunitionFamily",
  "armor-1-2-or-3": "rulebook.template.armorFamily",
  "shield-1-2-or-3": "rulebook.template.shieldFamily",
};

export function PagePrep({ data, canStart = true }: { data: RulebookPageResponse; canStart?: boolean }) {
  const { t } = useI18n();
  const crosswalk = data.crosswalk;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const router = useRouter();
  if (!crosswalk) {
    return null;
  }
  async function startFrom() {
    if (!crosswalk?.editor) return;
    setBusy(true);
    setNote("");
    try {
      const body = (await fetch("/api/workshops").then((response) => (response.ok ? response.json() : null))) as { workshops?: Array<{ id: string; updatedAt?: string }> } | null;
      const workshops = [...(body?.workshops ?? [])].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
      if (!workshops.length) {
        setNote(t("rulebook.prep.makeWorkshopFirst"));
        return;
      }
      const system = crosswalk.editor === "monster" ? "bestiary" : "homebrew";
      const start = `${crosswalk.editor}:${data.page.id}`;
      router.push(`/workshop/${workshops[0].id}?system=${system}&start=${encodeURIComponent(start)}`);
    } finally {
      setBusy(false);
    }
  }
  const copyable = canStart && crosswalk.editor && !(crosswalk.editor === "monster" && crosswalk.template);
  const whereKey: MessageKey | undefined = WHERE_MESSAGE[data.page.id] ?? (data.page.kind === "spell" ? crosswalk.support === "engine" ? "rulebook.where.spellEngine" : "rulebook.where.spellEditable" : data.page.kind === "item" ? crosswalk.support === "engine" ? "rulebook.where.itemEngine" : "rulebook.where.itemEditable" : crosswalk.editor === "monster" ? "rulebook.where.monster" : crosswalk.editor === "race" ? "rulebook.where.race" : crosswalk.editor === "archetype" ? "rulebook.where.class" : undefined);
  const templateMessage = FAMILY_TEMPLATE_MESSAGE[data.page.id];
  return (
    <div className="rb-prep" data-support={crosswalk.support} data-testid="rulebook-prep">
      <p>
        <span className="rb-prep-label">{t(SUPPORT_LABEL[crosswalk.support])}:</span> {whereKey ? t(whereKey) : crosswalk.where}
        {crosswalk.template ? <span className="rb-prep-note"> {crosswalk.template === "half-dragon" || crosswalk.template === "npc" ? "" : templateMessage ? `(${t(templateMessage)})` : `(${crosswalk.template})`}</span> : null}
      </p>
      {copyable ? (
        <button type="button" onClick={() => void startFrom()} disabled={busy} className="rb-turn-link rb-prep-start motion-press">
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Hammer className="size-3.5" aria-hidden="true" />}
          {crosswalk.editor === "archetype" ? t("rulebook.prep.writeSubclass") : t("rulebook.prep.startCopy")}
        </button>
      ) : null}
      {note ? <p className="rb-prep-note">{note}</p> : null}
    </div>
  );
}
