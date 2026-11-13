import type { MessageKey } from "@/lib/i18n/messages";

const CAMPAIGN_ERROR_KEYS = {
  CAMPAIGN_CREATION_ADMIN_ONLY: "createCampaign.dialog.error.adminOnly",
  PASSWORD_CHANGE_REQUIRED: "createCampaign.dialog.error.passwordChange",
  AUTH_REQUIRED: "auth.err.notLoggedIn",
  CAMPAIGN_NOT_FOUND: "campaign.session.rules.error.campaignNotFound",
  STORY_GAME_MASTER_REQUIRED: "campaign.session.rules.error.gameMasterRequired",
  STORY_PARTY_LEAD_REQUIRED: "campaign.session.rules.error.partyLeadRequired",
  INVALID_HOUSE_RULES: "campaign.session.rules.error.invalidHouseRules",
  INVALID_RULE_CHUNK_UPDATE: "campaign.session.rules.error.invalidChunkUpdate",
  RULE_CHUNK_NOT_FOUND: "campaign.session.rules.error.chunkNotFound",
  INVALID_GAME_SETTINGS: "campaign.session.rules.invalidSettings",
  INVALID_CAMPAIGN_SETTINGS: "createCampaign.dialog.error.invalidSettings",
  NO_STORYTELLER: "createCampaign.identity.dm.missing",
  INVALID_CAMPAIGN_UPDATE: "campaign.editDialog.error.invalidUpdate",
  PARTY_LEAD_REQUIRED: "campaign.editDialog.error.partyLead",
  CAMPAIGN_ENDED: "campaign.editDialog.error.ended",
  MAX_PLAYERS_BELOW_PARTY: "campaign.editDialog.error.maxPlayers",
  OWNER_OR_GM_REQUIRED: "campaign.editDialog.error.ownerOrGm",
  CAMPAIGN_ALREADY_STARTED: "campaign.editDialog.error.alreadyStarted",
  COVER_INVALID_IMAGE: "campaign.editDialog.cover.error.invalidImage",
  COVER_SAVE_FAILED: "campaign.editDialog.cover.error.save",
  NO_IMAGE_BACKEND: "campaign.editDialog.cover.error.noImageBackend",
  INVALID_UPLOAD_REQUEST: "campaign.editDialog.cover.upload.error.invalid",
  UPLOAD_IMAGE_TYPE_NOT_SUPPORTED: "campaign.editDialog.cover.upload.error.type",
  UPLOAD_IMAGE_TOO_LARGE: "campaign.editDialog.cover.upload.error.size",
  UPLOAD_IMAGE_DIMENSIONS_TOO_LARGE: "campaign.editDialog.cover.upload.error.dimensions",
  ONE_CHARACTER_PER_PLAYER: "campaign.lobby.error.oneCharacterOnly",
  CHARACTER_ID_REQUIRED: "campaign.lobby.error.chooseCharacter",
  CHARACTER_NOT_OWNED: "campaign.lobby.error.notYourCharacter",
  COMBAT_SWITCH_LOCKED: "campaign.lobby.error.combatSwitchWait",
  INVALID_READY_REQUEST: "campaign.lobby.error.invalidReady",
  AI_MODE_NO_GM_SEAT: "campaign.lobby.error.noGmSeat",
  GM_SEAT_PERMISSION_REQUIRED: "campaign.lobby.error.assignSeatPermission",
  SEAT_INPUT_REQUIRED: "campaign.lobby.error.invalidSeatRequest",
  PLAYER_NOT_IN_CAMPAIGN: "campaign.lobby.error.playerNotAtTable",
  CO_GM_MUST_BE_DIFFERENT: "campaign.lobby.error.coGmDifferent",
  HUMAN_MODE_REQUIRES_GM: "campaign.lobby.error.humanGameNeedsGm",
  SEAT_UPDATE_FAILED: "campaign.lobby.error.seatMoveFailed",
  NO_CHARACTER_TO_REMOVE: "campaign.lobby.error.noCharacterToRemove",
} satisfies Record<string, MessageKey>;

// The server keeps its English message for old clients and logs. The UI uses
// the stable code when one is present, and preserves unknown dynamic errors.
export function campaignApiErrorText(
  data: unknown,
  fallback: string,
  t: (key: MessageKey) => string,
): string {
  const body = (data ?? {}) as { error?: unknown; errorCode?: unknown };
  const code = body.errorCode;
  if (typeof code === "string" && code in CAMPAIGN_ERROR_KEYS) {
    return t(CAMPAIGN_ERROR_KEYS[code as keyof typeof CAMPAIGN_ERROR_KEYS]);
  }
  return typeof body.error === "string" && body.error ? body.error : fallback;
}
