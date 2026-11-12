import type { DmStatus } from "./useCampaignStream";
import type { MessageKey } from "@/lib/i18n/messages/index";

// Stable message keys keep the flavor line in the selected interface language.
// The choice remains deterministic for a given turn and status.
export const DM_STATUS_PHRASES: Record<Exclude<DmStatus, "idle">, MessageKey[]> = {
  thinking: [
    "campaign.session.dmStatus.thinking.1",
    "campaign.session.dmStatus.thinking.2",
    "campaign.session.dmStatus.thinking.3",
    "campaign.session.dmStatus.thinking.4",
    "campaign.session.dmStatus.thinking.5",
    "campaign.session.dmStatus.thinking.6",
    "campaign.session.dmStatus.thinking.7",
  ],
  rolling: [
    "campaign.session.dmStatus.rolling.1",
    "campaign.session.dmStatus.rolling.2",
    "campaign.session.dmStatus.rolling.3",
    "campaign.session.dmStatus.rolling.4",
    "campaign.session.dmStatus.rolling.5",
    "campaign.session.dmStatus.rolling.6",
    "campaign.session.dmStatus.rolling.7",
  ],
  awaiting_rolls: [
    "campaign.session.dmStatus.awaitingRolls.1",
    "campaign.session.dmStatus.awaitingRolls.2",
    "campaign.session.dmStatus.awaitingRolls.3",
    "campaign.session.dmStatus.awaitingRolls.4",
    "campaign.session.dmStatus.awaitingRolls.5",
    "campaign.session.dmStatus.awaitingRolls.6",
  ],
  narrating: [
    "campaign.session.dmStatus.narrating.1",
    "campaign.session.dmStatus.narrating.2",
    "campaign.session.dmStatus.narrating.3",
    "campaign.session.dmStatus.narrating.4",
    "campaign.session.dmStatus.narrating.5",
    "campaign.session.dmStatus.narrating.6",
  ],
  writing_chapter: [
    "campaign.session.dmStatus.writingChapter.1",
    "campaign.session.dmStatus.writingChapter.2",
    "campaign.session.dmStatus.writingChapter.3",
    "campaign.session.dmStatus.writingChapter.4",
    "campaign.session.dmStatus.writingChapter.5",
    "campaign.session.dmStatus.writingChapter.6",
  ],
  plotting_arc: [
    "campaign.session.dmStatus.plottingArc.1",
    "campaign.session.dmStatus.plottingArc.2",
    "campaign.session.dmStatus.plottingArc.3",
    "campaign.session.dmStatus.plottingArc.4",
    "campaign.session.dmStatus.plottingArc.5",
    "campaign.session.dmStatus.plottingArc.6",
  ],
};
