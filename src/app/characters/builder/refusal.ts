import type { MessageKey } from "@/lib/i18n/messages";
import { gearProblemText } from "./gearProblemText";

type MessageParams = Record<string, string | number>;

const REFUSAL_MESSAGE_KEYS = {
  MULTICLASS_DISABLED: "builder.refusal.multiclass.disabled",
  DUPLICATE_CLASS: "builder.refusal.multiclass.duplicate",
  THIRD_CASTER_NOT_CONFIGURED: "builder.refusal.spellcasting.thirdCaster",
  BUNDLE_TOO_LARGE: "characters.err.import.tooLarge",
  NOT_CHARACTER_FILE: "characters.err.import.notCharacter",
  NOT_OGM_CHARACTER_FILE: "characters.err.import.notOgm",
  INVALID_CHARACTER_FILE_JSON: "characters.err.import.invalidJson",
  CHARACTER_NOT_FOUND: "characters.err.notFound",
  HERO_NOT_FOUND: "campaign.joinConfirm.error.heroNotFound",
  GM_SEAT_NO_CHARACTER: "campaign.joinConfirm.error.gmSeat",
  PICK_ONE_HERO: "campaign.joinConfirm.error.pickOneHero",
  HERO_ALREADY_HAS_CHARACTER: "campaign.joinConfirm.error.alreadyHasCharacter",
  CAMPAIGN_NOT_LOBBY: "campaign.joinConfirm.error.lobbyOnly",
  PICKS_COULD_NOT_BE_READ: "campaign.joinConfirm.error.picksUnreadable",
  NO_CHARACTER_TO_SWITCH: "campaign.joinConfirm.error.noCharacterToSwitch",
  CHARACTER_UPDATE_FAILED: "campaign.joinConfirm.error.updateFailed",
  COMPANION_NOT_PLAYER_CHARACTER: "campaign.joinConfirm.error.companionRole",
  STARTING_GEAR_HOMEBREW: "builder.gear.problem.homebrew",
  STARTING_GEAR_MAGIC: "builder.gear.problem.magic",
  STARTING_GEAR_UNPRICED: "builder.gear.problem.unpriced",
  STARTING_GEAR_INSUFFICIENT_FUNDS: "builder.gear.problem.insufficientFunds",
  STARTING_GEAR_INVALID_OPTION: "builder.gear.problem.invalidOption",
  STARTING_GEAR_NOT_PROFICIENT: "builder.gear.problem.notProficient",
  STARTING_GEAR_INVALID_SLOT: "builder.gear.problem.invalidSlot",
  STARTING_GEAR_INVALID_BACKGROUND_CHOICE: "builder.gear.problem.invalidBackgroundChoice",
  CAMPAIGN_NOT_FOUND: "campaign.session.rules.error.campaignNotFound",
  STORY_GAME_MASTER_REQUIRED: "campaign.session.rules.error.gameMasterRequired",
  STORY_PARTY_LEAD_REQUIRED: "campaign.session.rules.error.partyLeadRequired",
  COMPANION_SETTING_OFF: "charUse.err.companion.off",
  COMPANION_GUESTS_ONLY: "charUse.err.companion.guestsOnly",
  COMPANION_AUTO_GUESTS: "charUse.err.companion.autoGuests",
  COMPANION_ROSTER_FULL: "charUse.err.companion.rosterFull",
  COMPANION_ALREADY_HERE: "charUse.err.companion.alreadyHere",
  COMPANION_LEFT_PARTY: "charUse.err.companion.leftParty",
  COMPANION_NOT_IN_LIBRARY: "charUse.err.companion.notInLibrary",
  INVALID_COMPANION_SHEET: "charUse.err.companion.invalidSheet",
  HERO_FELL_AT_TABLE: "campaign.joinConfirm.error.heroFell",
  PREGEN_ALREADY_PLAYED_BY_YOU: "campaign.joinConfirm.error.pregenAlreadyMine",
  PREGEN_ALREADY_TAKEN: "campaign.joinConfirm.error.pregenAlreadyTaken",
  PREGEN_COPY_ALREADY_PLAYED_BY_YOU: "campaign.joinConfirm.error.pregenCopyAlreadyMine",
  PREGEN_COPY_PLAYED_BY_ANOTHER: "campaign.joinConfirm.error.pregenCopyPlayedByAnother",
  OFFERED_PREGEN_JOIN_ONLY: "campaign.joinConfirm.error.offeredPregenJoinOnly",
} satisfies Record<string, MessageKey>;

// Refusals retain their original prose for older clients and unknown
// diagnostics. New clients translate only messages carrying a known code.
export function refusalText(
  data: unknown,
  fallback: string,
  t: (key: MessageKey, params?: MessageParams) => string,
): string {
  const body = (data ?? {}) as {
    error?: unknown;
    problems?: unknown;
    problemCodes?: unknown;
    problemParams?: unknown;
    errorCode?: unknown;
    errorParams?: unknown;
  };
  const problems = Array.isArray(body.problems)
    ? body.problems.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    : [];
  const messages = problems.length > 1
    ? problems
    : [typeof body.error === "string" && body.error ? body.error : (problems[0] ?? "")].filter(Boolean);
  if (!messages.length) return fallback;

  const codes = Array.isArray(body.problemCodes) ? body.problemCodes : [body.errorCode];
  const params = Array.isArray(body.problemParams) ? body.problemParams : [body.errorParams];
  const translated = messages.map((message, index) => {
    const code = codes[index];
    const rawParams = params[index];
    const messageParams = rawParams && typeof rawParams === "object" && !Array.isArray(rawParams)
      ? Object.fromEntries(
          Object.entries(rawParams).filter((entry): entry is [string, string | number] =>
            typeof entry[1] === "string" || typeof entry[1] === "number",
          ),
        )
      : undefined;
    if (code === "STARTING_GEAR_INVALID_SLOT") {
      return gearProblemText({ code: "invalidSlot", params: messageParams ?? {} }, t);
    }
    if (typeof code === "string" && code in REFUSAL_MESSAGE_KEYS) {
      return t(REFUSAL_MESSAGE_KEYS[code as keyof typeof REFUSAL_MESSAGE_KEYS], messageParams);
    }
    return message;
  });
  return translated.length > 1 ? translated.join("\n") : translated[0];
}
