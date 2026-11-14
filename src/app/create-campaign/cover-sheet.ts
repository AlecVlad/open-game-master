import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { genrePreset } from "@/lib/genres";
import type { CampaignDraft, WizardGates } from "@/app/create-campaign/draft";

// The review step's pure half: every line on the cover and in the read-back,
// worked out from the draft. An optional translator localizes its visible
// wording while the default path preserves the original English contract.

type CoverTranslator = (key: MessageKey, params?: Params) => string;

const reviewKey = (part: string): MessageKey => `createCampaign.review.${part}` as MessageKey;
const messageKey = (part: string): MessageKey => part as MessageKey;

// An AI narrator plans the arc, so only then is its length a fact worth a
// stamp. The wording matches the length choices on the party step.
const LENGTH_SHORT: Record<CampaignDraft["campaignLength"], string> = {
  short: "3 acts",
  standard: "4-5 acts",
  epic: "6-8 acts",
};

export type CoverSheet = {
  title: string;
  theme: string;
  meta: string;
  difficulty: string;
  stampSub: string;
  setting: string;
  party: string;
  dice: string;
  chips: string[];
};

export function coverSheet(
  draft: CampaignDraft,
  gates: Pick<WizardGates, "solo" | "aiNarrates">,
  packName: string | null,
  t?: CoverTranslator,
): CoverSheet {
  const { solo, aiNarrates } = gates;
  const preset = genrePreset(draft.genre);
  const genreName = t
    ? t(messageKey(`createCampaign.identity.genre.${draft.genre}.name`))
    : preset.name ?? draft.genre;
  const partySize = solo
    ? t
      ? t(reviewKey("cover.partySize.solo"))
      : "Solo"
    : t
      ? t(reviewKey("cover.partySize.players"), { count: draft.maxPlayers })
      : `${draft.maxPlayers} players`;
  const party = solo
    ? t
      ? t(reviewKey("cover.party.solo"), { level: draft.startingLevel })
      : `Solo · level ${draft.startingLevel}`
    : t
      ? t(reviewKey("cover.party.players"), { count: draft.maxPlayers, level: draft.startingLevel })
      : `${draft.maxPlayers} players · level ${draft.startingLevel}`;
  const dice = t
    ? t(messageKey(draft.dicePolicy === "digital_only" ? "createCampaign.party.dice.digital" : "createCampaign.party.dice.real"))
    : draft.dicePolicy === "digital_only"
      ? "Digital only"
      : "Real dice allowed";
  const climate = t
    ? t(messageKey(`createCampaign.identity.climate.${preset.climate}`))
    : preset.climate;
  const length = t
    ? t(messageKey(`createCampaign.party.length.${draft.campaignLength}`))
    : draft.campaignLength;
  const acts = t ? t(reviewKey(`cover.lengthActs.${draft.campaignLength}`)) : LENGTH_SHORT[draft.campaignLength];
  const chips = t
    ? [t(reviewKey("cover.chip.climate"), { climate: climate.toLowerCase() })]
    : [`${preset.climate} sky`];
  if (aiNarrates) {
    chips.push(
      t
        ? t(reviewKey("cover.chip.length"), { length })
        : `${draft.campaignLength} · ${acts}`,
    );
  }

  return {
    // The wizard will not reach this step without a title; the fallback is
    // for the cover that is mounted, off screen, before one is typed.
    title: draft.title.trim() || (t
      ? t(reviewKey(solo ? "cover.untitledAdventure" : "cover.untitledCampaign"))
      : solo
        ? "Untitled adventure"
        : "Untitled campaign"),
    theme: draft.theme.trim() || (t ? t(reviewKey("cover.defaultTheme")) : "A world of your own description."),
    meta: t
      ? t(reviewKey("cover.meta"), { partySize, level: draft.startingLevel, dice })
      : `${party.toLowerCase()} · ${draft.dicePolicy === "digital_only" ? "digital dice" : "real dice allowed"}`,
    difficulty: t
      ? t(messageKey(`createCampaign.party.difficulty.${draft.difficulty}`))
      : draft.difficulty.charAt(0).toUpperCase() + draft.difficulty.slice(1),
    stampSub: aiNarrates
      ? acts
      : t
        ? t(reviewKey("cover.level"), { level: draft.startingLevel })
        : `level ${draft.startingLevel}`,
    setting: packName
      ? t
        ? t(reviewKey("cover.packSetting"), { pack: packName, genre: genreName })
        : `${packName} (${genreName})`
      : genreName,
    party,
    dice,
    chips,
  };
}
