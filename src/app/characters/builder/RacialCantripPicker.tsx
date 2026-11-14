"use client";

import CatalogBrowser from "@/app/characters/builder/CatalogBrowser";
import ContentPicker from "@/app/characters/builder/ContentPicker";
import type { RaceOption } from "@/app/characters/builder/useBuilderOptions";
import { GameTerm } from "@/components/ui/GameTerm";
import { useI18n } from "@/lib/i18n/provider";
import { contentSlug } from "@/lib/help";
import { textKey } from "@/lib/language/text-logic";
import { racialCantripsOf } from "@/lib/srd/racial-cantrips";
import { Chip } from "./steps/shared";

// The cantrips a race lets the player choose: a high elf's one wizard
// cantrip, or as many as a homebrew species offers (up to three). Each pick
// is a chip with its ⓘ and a remove; the list stays open until every one is
// picked, as the variant human's feat does beside it. Shown on the ancestry
// step (RacialChoicesSection.tsx) and, for a character stored before the
// picks were kept, on the library's level-up sheet (LevelUpSheet.tsx).
export function RacialCantripPicker({
  race,
  cantrips,
  onChange,
}: {
  race: Pick<RaceOption, "name" | "cantripChoice">;
  cantrips: string[];
  onChange: (cantrips: string[]) => void;
}) {
  const { t, tp } = useI18n();
  const choice = race.cantripChoice;
  if (!choice) {
    return null;
  }
  const { list, count } = choice;
  const picked = racialCantripsOf({ cantrips }).slice(0, count);
  // A repeat, or a pick past the race's count, is not taken.
  const pick = (name: string) => {
    if (picked.length >= count || picked.some((entry) => textKey(entry) === textKey(name))) {
      return;
    }
    onChange([...picked, name]);
  };
  const unpick = (name: string) => onChange(picked.filter((entry) => textKey(entry) !== textKey(name)));
  return (
    <div data-builder-target="racialCantrip">
      <span className="mb-1 flex flex-wrap items-center gap-1 text-stone-400">
        {t("builder.racialCantrip.title")}{" "}
        <GameTerm id="cantrip">{tp("builder.extra.lineage.choice.cantrip", count, { count, list })}</GameTerm>{" "}
        {t("builder.racialCantrip.progress", { picked: picked.length, count })}
      </span>
      <p className="mb-1.5 text-xs text-stone-500">
        {t("builder.racialCantrip.help")}
      </p>
      {picked.length ? (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {picked.map((name) => (
            <Chip
              key={name}
              label={name}
              info={{ reference: { kind: "spells", slug: contentSlug(name), name } }}
              onRemove={() => unpick(name)}
            />
          ))}
        </div>
      ) : null}
      {picked.length < count ? (
        <>
          {/* Nobody can search for a cantrip they have never heard of.
              Every one this race may take is listed from the start, each
              with the ⓘ that says what it does; the search is second. */}
          <CatalogBrowser
            kind="spells"
            buttonLabel={t("builder.racialCantrip.all", { list })}
            defaultOpen
            openSections={[`cantrips:${list}`]}
            selectedNames={picked}
            onPick={(entry) => pick(entry.name)}
            onUnpick={unpick}
            sections={[
              {
                key: `cantrips:${list}`,
                label: t("builder.racialCantrip.all", { list }),
                params: { class: list, level: "0" },
              },
            ]}
            metaOf={(entry) => entry.school ?? ""}
          />
          <p className="mt-2 mb-1 text-xs text-stone-500">{t("builder.racialCantrip.search.label")}</p>
          <ContentPicker
            kind="spells"
            extraParams={{ class: list, level: "0" }}
            placeholder={t("builder.racialCantrip.search.placeholder")}
            onPick={(entry) => pick(entry.name)}
          />
        </>
      ) : null}
    </div>
  );
}
