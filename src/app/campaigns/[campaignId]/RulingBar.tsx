"use client";

import { Check, Scale, Users, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { offerCorrectionReason } from "@/lib/correction-offer";
import { GameIcon } from "@/components/ui/GameIcon";
import { KitButton, PanelError } from "./PanelKit";
import type { RulingDispute } from "@/app/campaigns/[campaignId]/useCampaignStream";
import type { CampaignMember } from "@/lib/campaign-types";

// Open disputed rulings (src/lib/dm/dispute-logic.ts). Whoever steers the
// story gets Uphold, Overrule and Put to a vote; during a vote every seat
// with a party slot gets its two buttons and the steerer may count early;
// the player who raised it may withdraw. Driven by ruling_disputed and
// ruling_resolved on the stream.
export function RulingBar({
  campaignId,
  disputes,
  members,
  meUserId,
  steersStory,
}: {
  campaignId: string;
  disputes: RulingDispute[];
  members: CampaignMember[];
  meUserId: string;
  steersStory: boolean;
}) {
  const { t } = useI18n();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  if (!disputes.length) {
    return null;
  }

  async function act(disputeId: string, action: string, vote?: "uphold" | "overrule") {
    setBusyId(disputeId);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/disputes/${disputeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(vote ? { vote } : {}) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(String(data.error ?? t("campaign.session.ruling.error")));
      } else {
        offerCorrectionReason(campaignId, await response.json().catch(() => null));
      }
    } finally {
      setBusyId("");
    }
  }

  const nameOf = (userId: string) => members.find((member) => member.userId === userId)?.username ?? t("campaign.session.ruling.unknownPlayer");

  return (
    <div className="stagger mx-3 mb-2 space-y-1.5" data-tour="ruling-bar">
      {error ? <PanelError>{error}</PanelError> : null}
      {disputes.map((dispute) => {
        const busy = busyId === dispute.id;
        const mine = dispute.raisedByUserId === meUserId;
        const voting = dispute.status === "voting";
        const myVote = voting ? dispute.votes[meUserId] : undefined;
        const canCast = voting && dispute.voterIds.includes(meUserId);
        const cast = Object.keys(dispute.votes).length;
        return (
          <div
            key={dispute.id}
            className={cn(
              "panel live-in flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs",
              steersStory || canCast ? "ornate border-amber-500/50 text-amber-100" : "text-stone-400",
            )}
          >
            <GameIcon icon={{ kind: "glyph", key: "system-rules" }} size="size-6" className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{t("campaign.session.ruling.raised", { name: nameOf(dispute.raisedByUserId) })}</span>
              {dispute.reason ? <span className="text-stone-400">: {dispute.reason}</span> : null}
              {voting ? (
                <span className="ml-1 text-stone-500">
                  {t("campaign.session.ruling.voteProgress", { cast, total: dispute.voterIds.length })}
                </span>
              ) : null}
            </span>
            {voting && canCast ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <KitButton tone={myVote === "uphold" ? "primary" : undefined} onClick={() => act(dispute.id, "cast", "uphold")} disabled={busy} busy={busy}>
                  <Check className="size-3.5" /> {t("campaign.session.ruling.stands")}
                </KitButton>
                <KitButton tone={myVote === "overrule" ? "primary" : undefined} onClick={() => act(dispute.id, "cast", "overrule")} disabled={busy}>
                  <X className="size-3.5" /> {t("campaign.session.ruling.overrule")}
                </KitButton>
                {steersStory ? (
                  <KitButton onClick={() => act(dispute.id, "tally")} disabled={busy}>
                    <Scale className="size-3.5" /> {t("campaign.session.ruling.countNow")}
                  </KitButton>
                ) : null}
              </span>
            ) : voting && steersStory ? (
              <KitButton onClick={() => act(dispute.id, "tally")} disabled={busy} busy={busy}>
                <Scale className="size-3.5" /> {t("campaign.session.ruling.countNow")}
              </KitButton>
            ) : steersStory ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <KitButton tone="primary" onClick={() => act(dispute.id, "uphold")} disabled={busy} busy={busy}>
                  {busy ? null : <Check className="size-3.5" />} {t("campaign.session.ruling.uphold")}
                </KitButton>
                <KitButton onClick={() => act(dispute.id, "overrule")} disabled={busy}>
                  <X className="size-3.5" /> {t("campaign.session.ruling.overrule")}
                </KitButton>
                <KitButton onClick={() => act(dispute.id, "vote")} disabled={busy}>
                  <Users className="size-3.5" /> {t("campaign.session.ruling.putToVote")}
                </KitButton>
              </span>
            ) : mine ? (
              <KitButton onClick={() => act(dispute.id, "withdraw")} disabled={busy} busy={busy}>
                {busy ? null : <X className="size-3.5" />} {t("campaign.session.ruling.withdraw")}
              </KitButton>
            ) : (
              <span className="shrink-0 text-[11px] italic text-stone-500">{t("campaign.session.ruling.waiting")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
