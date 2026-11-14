"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import { ChipList, LineList, PairList } from "@/app/workshop/plugin/fields";
import type { SectionProps } from "@/app/workshop/plugin/types";

// The setting half of a pack: what the narrator is handed about the world
// beyond its names. Factions, places, hooks and a glossary go into the
// game-state block; name seeds are offered as clickable suggestions in the
// character builder. Pull from this workshop (in the panel header) fills
// these from the factions, lore, places, hook cards and cast already built
// here.

export function SettingSection({ draft, onDraft }: SectionProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.setting.factions")} glyph="system-factions" className="mb-0" />
        <p className="mb-3 text-[11px] text-stone-500">{t("workshop.plugin.setting.factions.body")}</p>
        <PairList
          items={draft.factions}
          onChange={(factions) => onDraft({ ...draft, factions })}
          first={{ key: "name", label: t("workshop.plugin.setting.faction"), max: 60 }}
          second={{ key: "blurb", label: t("workshop.plugin.setting.faction.about"), max: 200 }}
          addLabel={t("workshop.plugin.setting.addFaction")}
          empty={t("workshop.plugin.setting.noFactions")}
        />
      </section>
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.setting.places")} glyph="system-region" className="mb-0" />
        <p className="mb-3 text-[11px] text-stone-500">{t("workshop.plugin.setting.places.body")}</p>
        <PairList
          items={draft.locations}
          onChange={(locations) => onDraft({ ...draft, locations })}
          first={{ key: "name", label: t("workshop.plugin.setting.place"), max: 60 }}
          second={{ key: "blurb", label: t("workshop.plugin.setting.place.like"), max: 200 }}
          addLabel={t("workshop.plugin.setting.addPlace")}
          empty={t("workshop.plugin.setting.noPlaces")}
        />
      </section>
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.setting.hooks")} glyph="quest-active" className="mb-0" />
        <p className="mb-3 text-[11px] text-stone-500">{t("workshop.plugin.setting.hooks.body")}</p>
        <LineList
          items={draft.hooks}
          onChange={(hooks) => onDraft({ ...draft, hooks })}
          maxLength={240}
          addLabel={t("workshop.plugin.setting.addHook")}
          placeholder={t("workshop.plugin.setting.hook.placeholder")}
          empty={t("workshop.plugin.setting.noHooks")}
        />
      </section>
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.setting.glossary")} glyph="tab-reference" className="mb-0" />
        <p className="mb-3 text-[11px] text-stone-500">{t("workshop.plugin.setting.glossary.body")}</p>
        <PairList
          items={draft.glossary}
          onChange={(glossary) => onDraft({ ...draft, glossary })}
          first={{ key: "term", label: t("workshop.plugin.setting.term"), max: 40 }}
          second={{ key: "meaning", label: t("workshop.plugin.setting.meaning"), max: 160 }}
          addLabel={t("workshop.plugin.setting.addTerm")}
          empty={t("workshop.plugin.setting.noGlossary")}
        />
      </section>
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.setting.nameSeeds")} glyph="tab-characters" className="mb-0" />
        <p className="mb-3 text-[11px] text-stone-500">{t("workshop.plugin.setting.nameSeeds.body")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block font-display text-[11px] tracking-[0.1em] text-amber-300/85">{t("workshop.plugin.setting.people")}</span>
            <ChipList
              items={draft.nameSeeds.people}
              onChange={(people) => onDraft({ ...draft, nameSeeds: { ...draft.nameSeeds, people } })}
              placeholder={t("workshop.plugin.setting.person.placeholder")}
            />
          </div>
          <div>
            <span className="mb-1 block font-display text-[11px] tracking-[0.1em] text-amber-300/85">{t("workshop.plugin.setting.placesGroup")}</span>
            <ChipList
              items={draft.nameSeeds.places}
              onChange={(places) => onDraft({ ...draft, nameSeeds: { ...draft.nameSeeds, places } })}
              placeholder={t("workshop.plugin.setting.place.placeholder")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
