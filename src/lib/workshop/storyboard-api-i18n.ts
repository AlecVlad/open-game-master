import { translate, translatePlural, type Lang } from "../i18n/core.ts";
import { DICTIONARIES } from "../i18n/messages/index.ts";

// checkBeat is deliberately pure and is also used by tests. Keep its
// internal English diagnostics stable; translate only at the API boundary.
export function localizeStoryboardError(error: string, lang: Lang): string {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(DICTIONARIES, lang, key, params);

  if (error === "A card needs a title, even a bad one.") {
    return t("campaign.storyboard.error.titleRequired");
  }
  if (error === "No such card.") {
    return t("campaign.storyboard.error.missingCard");
  }

  const overflow = error.match(
    /^This card's text is ([\d,]+) characters; the limit is ([\d,]+)\. The last ([\d,]+) would be lost(?:: "([\s\S]*)")?\.$/,
  );
  if (overflow) {
    const number = (value: string) => Number(value.replace(/,/g, ""));
    const characters = (value: number) =>
      translatePlural(DICTIONARIES, lang, "campaign.storyboard.characters", value, {
        count: value.toLocaleString(lang),
      });
    return t("campaign.storyboard.error.bodyOverflow", {
      length: characters(number(overflow[1])),
      max: characters(number(overflow[2])),
      lostCount: translatePlural(DICTIONARIES, lang, "campaign.storyboard.error.lostCharacters", number(overflow[3])),
      lost: overflow[4] ? (lang === "ru" ? `: «${overflow[4]}»` : `: "${overflow[4]}"`) : "",
    });
  }
  return error;
}
