import type { MessageKey } from "@/lib/i18n/messages";

const CAMPAIGN_ERROR_KEYS = {
  CAMPAIGN_CREATION_ADMIN_ONLY: "createCampaign.dialog.error.adminOnly",
  PASSWORD_CHANGE_REQUIRED: "createCampaign.dialog.error.passwordChange",
  INVALID_CAMPAIGN_SETTINGS: "createCampaign.dialog.error.invalidSettings",
  NO_STORYTELLER: "createCampaign.identity.dm.missing",
  INVALID_CAMPAIGN_UPDATE: "campaign.editDialog.error.invalidUpdate",
  PARTY_LEAD_REQUIRED: "campaign.editDialog.error.partyLead",
  CAMPAIGN_ENDED: "campaign.editDialog.error.ended",
  MAX_PLAYERS_BELOW_PARTY: "campaign.editDialog.error.maxPlayers",
  OWNER_OR_GM_REQUIRED: "campaign.editDialog.error.ownerOrGm",
  CAMPAIGN_ALREADY_STARTED: "campaign.editDialog.error.alreadyStarted",
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
