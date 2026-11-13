import type { MessageKey } from "@/lib/i18n/messages";
import { gearProblemText } from "./gearProblemText";

type MessageParams = Record<string, string | number>;

const MULTICLASS_CLASS_MESSAGE_KEYS: Record<string, MessageKey> = {
  barbarian: "charSheet.class.barbarian",
  bard: "charSheet.class.bard",
  cleric: "charSheet.class.cleric",
  druid: "charSheet.class.druid",
  fighter: "charSheet.class.fighter",
  monk: "charSheet.class.monk",
  paladin: "charSheet.class.paladin",
  ranger: "charSheet.class.ranger",
  rogue: "charSheet.class.rogue",
  sorcerer: "charSheet.class.sorcerer",
  warlock: "charSheet.class.warlock",
  wizard: "charSheet.class.wizard",
  artificer: "charSheet.class.artificer",
};

const ABILITY_MESSAGE_KEYS: Record<string, MessageKey> = {
  str: "charSheet.ability.str",
  dex: "charSheet.ability.dex",
  con: "charSheet.ability.con",
  int: "charSheet.ability.int",
  wis: "charSheet.ability.wis",
  cha: "charSheet.ability.cha",
};

const REFUSAL_MESSAGE_KEYS = {
  MULTICLASS_DISABLED: "builder.refusal.multiclass.disabled",
  DUPLICATE_CLASS: "builder.refusal.multiclass.duplicate",
  THIRD_CASTER_NOT_CONFIGURED: "builder.refusal.spellcasting.thirdCaster",
  BUNDLE_TOO_LARGE: "characters.err.import.tooLarge",
  NOT_CHARACTER_FILE: "characters.err.import.notCharacter",
  NOT_OGM_CHARACTER_FILE: "characters.err.import.notOgm",
  INVALID_CHARACTER_FILE_JSON: "characters.err.import.invalidJson",
  CHARACTER_NOT_FOUND: "characters.err.notFound",
  PORTRAIT_NO_IMAGE_MODEL: "characters.err.portrait.noImageModel",
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
  AUTH_REQUIRED: "auth.err.notLoggedIn",
  PASSWORD_CHANGE_REQUIRED: "createCampaign.dialog.error.passwordChange",
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
  MULTICLASS_NOT_ALLOWED_FOR_CHARACTER: "charUse.err.multiclass",
  CAMPAIGN_CREATION_ADMIN_ONLY: "createCampaign.dialog.error.adminOnly",
  JOIN_INVALID_INVITE_CODE: "home.join.error.invalidCode",
  JOIN_INVITE_NOT_FOUND: "home.join.error.notFound",
  JOIN_CAMPAIGN_ENDED: "home.join.error.ended",
  JOIN_CAMPAIGN_STARTED: "home.join.error.started",
  JOIN_CAMPAIGN_FULL: "home.join.error.full",
  JOIN_THROTTLED: "home.join.error.throttled",
  JOIN_FAILED: "home.join.error.failed",
  STARTER_INVALID_REQUEST: "home.starter.error.invalidRequest",
  STARTER_NO_STORYTELLER: "home.starter.error.noStoryteller",
  CAMPAIGN_DELETE_OWNER_ONLY: "home.dash.del.ownerOnly",
  CAMPAIGN_CLONE_NOT_FOUND: "home.dash.clone.notFound",
  INVALID_CAMPAIGN_CLONE: "home.dash.clone.invalid",
  INVALID_COMPANION_SHEET: "charUse.err.companion.invalidSheet",
  HERO_FELL_AT_TABLE: "campaign.joinConfirm.error.heroFell",
  PREGEN_ALREADY_PLAYED_BY_YOU: "campaign.joinConfirm.error.pregenAlreadyMine",
  PREGEN_ALREADY_TAKEN: "campaign.joinConfirm.error.pregenAlreadyTaken",
  PREGEN_COPY_ALREADY_PLAYED_BY_YOU: "campaign.joinConfirm.error.pregenCopyAlreadyMine",
  PREGEN_COPY_PLAYED_BY_ANOTHER: "campaign.joinConfirm.error.pregenCopyPlayedByAnother",
  OFFERED_PREGEN_JOIN_ONLY: "campaign.joinConfirm.error.offeredPregenJoinOnly",
  LEVEL_UP_ALREADY_TAKEN: "charSheet.levelUp.error.alreadyTaken",
  LEVEL_UP_ALREADY_AT_MAX: "charSheet.levelUp.error.alreadyAtMax",
  LEVEL_UP_COSMETIC_FIELDS_ONLY: "charSheet.levelUp.error.cosmeticFieldsOnly",
  LEVEL_UP_CHARACTER_DEAD: "charSheet.levelUp.block.dead",
  LEVEL_UP_CHARACTER_ZERO_HP: "charSheet.levelUp.block.zeroHp",
  LEVEL_UP_MAX_LEVEL: "charSheet.levelUp.block.maxLevel",
  LEVEL_UP_WRONG_SEQUENCE: "charSheet.levelUp.error.wrongSequence",
  LEVEL_UP_XP_REQUIRED: "charSheet.levelUp.block.xp",
  LEVEL_UP_UNKNOWN_CLASS: "charSheet.levelUp.error.unknownClass",
  LEVEL_UP_MULTICLASS_DISABLED: "charSheet.levelUp.error.multiclassDisabled",
  LEVEL_UP_MULTICLASS_LIMIT: "charSheet.levelUp.multiclass.error.limit",
  LEVEL_UP_MULTICLASS_CANDIDATE_PREREQUISITE: "charSheet.levelUp.multiclass.error.candidateShort",
  LEVEL_UP_MULTICLASS_HELD_PREREQUISITE: "charSheet.levelUp.multiclass.error.heldShort",
  LEVEL_UP_MULTICLASS_UNAVAILABLE: "charSheet.levelUp.multiclass.error.unavailable",
  LEVEL_UP_SUBCLASS_ALREADY_SET: "charSheet.levelUp.error.subclassAlreadySet",
  LEVEL_UP_SUBCLASS_TOO_EARLY: "charSheet.levelUp.error.subclassTooEarly",
  LEVEL_UP_SUBCLASS_NOT_OFFERED: "charSheet.levelUp.error.subclassNotOffered",
  LEVEL_UP_ABILITY_LOWERED: "charSheet.levelUp.error.abilityLowered",
  LEVEL_UP_ABILITY_CAP: "charSheet.levelUp.error.abilityCap",
  LEVEL_UP_ASI_TOO_MANY: "charSheet.levelUp.error.asiTooMany",
  LEVEL_UP_ASI_NOT_GRANTED: "charSheet.levelUp.error.asiNotGranted",
  LEVEL_UP_FEAT_ALREADY_TAKEN: "charSheet.levelUp.error.featAlreadyTaken",
  LEVEL_UP_FEAT_NOT_OFFERED: "charSheet.levelUp.error.featNotOffered",
  LEVEL_UP_FEAT_PREREQUISITE: "charSheet.levelUp.error.featPrerequisite",
  LEVEL_UP_EXPERTISE_TOO_MANY: "charSheet.levelUp.error.expertiseTooMany",
  LEVEL_UP_EXPERTISE_NOT_AVAILABLE: "charSheet.levelUp.error.expertiseNotAvailable",
  LEVEL_UP_EXPERTISE_REQUIRES_PROFICIENCY: "charSheet.levelUp.error.expertiseProficiency",
  LEVEL_UP_FIGHTING_STYLE_NOT_OFFERED: "charSheet.levelUp.error.fightingStyleNotOffered",
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
    if (code === "LEVEL_UP_ABILITY_LOWERED" || code === "LEVEL_UP_ABILITY_CAP") {
      const ability = messageParams?.ability;
      if (typeof ability === "string" && ABILITY_MESSAGE_KEYS[ability]) {
        messageParams.ability = t(ABILITY_MESSAGE_KEYS[ability]);
      }
    }
    if (
      code === "LEVEL_UP_MULTICLASS_CANDIDATE_PREREQUISITE" ||
      code === "LEVEL_UP_MULTICLASS_HELD_PREREQUISITE"
    ) {
      const classId = messageParams?.classId;
      if (typeof classId === "string" && MULTICLASS_CLASS_MESSAGE_KEYS[classId]) {
        messageParams.className = t(MULTICLASS_CLASS_MESSAGE_KEYS[classId]);
      }
    }
    if (typeof code === "string" && code in REFUSAL_MESSAGE_KEYS) {
      return t(REFUSAL_MESSAGE_KEYS[code as keyof typeof REFUSAL_MESSAGE_KEYS], messageParams);
    }
    return message;
  });
  return translated.length > 1 ? translated.join("\n") : translated[0];
}
