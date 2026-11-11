"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { GameIcon } from "@/components/ui/GameIcon";
import { KitButton, PanelError } from "./PanelKit";
import type { ItemProposal } from "@/app/campaigns/[campaignId]/useCampaignStream";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import { AdvanceOffers } from "./AdvanceOfferCard";
import { PactOffers } from "./PactOfferCard";
import { COPPER_PER_GOLD, formatPrice } from "@/lib/srd/currency";

// Pending DM offers: item and gold changes (inventoryApprovals) and damage,
// healing and conditions (vitalsApprovals). The owning player gets
// Accept/Decline, everyone else sees a passive chip, the lead may withdraw.
// Driven by item_proposal_added/item_proposal_resolved on the stream. An
// NPC's romantic advance (issue 501) is its own card, answered by the
// character's player alone (AdvanceOfferCard.tsx), and so is a pact's
// approach (issue 503), which nobody else is even sent (PactOfferCard.tsx).
const VITALS_TOOLS = new Set(["apply_damage", "heal", "set_condition", "clear_condition"]);
export function ItemProposalBar({
  campaignId,
  proposals,
  sheets,
  meUserId,
  steersStory,
}: {
  campaignId: string;
  proposals: ItemProposal[];
  sheets: CharacterSheet[];
  meUserId: string;
  steersStory: boolean;
}) {
  const { t, tp } = useI18n();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const advances = proposals.filter((proposal) => proposal.toolName === "romance_advance");
  const pacts = proposals.filter((proposal) => proposal.toolName === "pact_approach");
  const offers = proposals.filter((proposal) => proposal.toolName !== "romance_advance" && proposal.toolName !== "pact_approach");
  const summarizeProposal = (proposal: ItemProposal) => {
    const data = proposal.summaryData;
    if (!data) return proposal.summary;
    const quantitySuffix = data.quantity > 1 ? ` ×${data.quantity}` : "";
    const item = data.item || t("campaign.session.proposals.summary.unknownItem");

    switch (proposal.toolName) {
      case "trade": {
        if (!proposal.offer || !data.fromName || !data.toName) return proposal.summary;
        const side = (lines: Array<{ name: string; qty: number }>, copper: number) => {
          const parts = lines.map((line) => line.qty > 1 ? `${line.name} ×${line.qty}` : line.name);
          if (copper > 0) parts.push(formatPrice(copper));
          return parts.length ? parts.join(", ") : t("campaign.session.proposals.summary.nothing");
        };
        return t("campaign.session.proposals.summary.trade", {
          from: data.fromName,
          give: side(proposal.offer.give, proposal.offer.giveCp),
          to: data.toName,
          want: side(proposal.offer.want, proposal.offer.wantCp),
        });
      }
      case "grant_item":
        return t("campaign.session.proposals.summary.giveItem", { item, quantitySuffix, character: data.characterName });
      case "remove_item":
        return t("campaign.session.proposals.summary.takeItem", { item, quantitySuffix, character: data.characterName });
      case "modify_gold": {
        const amount = data.currency || `${Math.abs(data.delta)} gp`;
        return data.currencyDirection === "take" || (!data.currencyDirection && data.delta < 0)
          ? t("campaign.session.proposals.summary.takeMoney", { amount, character: data.characterName })
          : t("campaign.session.proposals.summary.giveMoney", { amount, character: data.characterName });
      }
      case "purchase": {
        const priceSuffix = data.price > 0
          ? t("campaign.session.proposals.summary.priceSuffix", { price: formatPrice(data.price * COPPER_PER_GOLD) })
          : "";
        return data.action === "sell"
          ? t("campaign.session.proposals.summary.sell", { character: data.characterName, item, quantitySuffix, priceSuffix })
          : t("campaign.session.proposals.summary.buy", { character: data.characterName, item, quantitySuffix, priceSuffix });
      }
      case "apply_damage":
        return data.damageType
          ? t("campaign.session.proposals.summary.damageTyped", { amount: Math.max(1, data.amount), type: data.damageType, character: data.characterName })
          : t("campaign.session.proposals.summary.damage", { amount: Math.max(1, data.amount), character: data.characterName });
      case "heal":
        if (data.temporary) return t("campaign.session.proposals.summary.temporaryHp", { character: data.characterName, amount: Math.max(1, data.amount) });
        if (data.spell) return data.amount > 0
          ? t("campaign.session.proposals.summary.healSpellAmount", { character: data.characterName, spell: data.spell, amount: data.amount })
          : t("campaign.session.proposals.summary.healSpell", { character: data.characterName, spell: data.spell });
        return t("campaign.session.proposals.summary.heal", { character: data.characterName, amount: Math.max(1, data.amount) });
      case "set_condition":
        return data.rounds > 0
          ? tp("campaign.session.proposals.summary.conditionRounds", data.rounds, { character: data.characterName, condition: data.condition })
          : t("campaign.session.proposals.summary.condition", { character: data.characterName, condition: data.condition });
      case "clear_condition":
        return t("campaign.session.proposals.summary.clearCondition", { character: data.characterName, condition: data.condition });
      default:
        return proposal.summary;
    }
  };


  async function resolve(proposalId: string, action: "approve" | "decline" | "cancel") {
    setBusyId(proposalId);
    setError("");
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/item-proposals/${proposalId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(String(data.error ?? t("campaign.session.proposals.error")));
      }
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      {/* The advance cards animate themselves, outside the bar's stagger. */}
      <div className="mx-3 mb-2 space-y-1.5 empty:hidden">
        <AdvanceOffers
          campaignId={campaignId}
          proposals={advances}
          sheets={sheets}
          meUserId={meUserId}
          steersStory={steersStory}
          onError={setError}
        />
        <PactOffers
          campaignId={campaignId}
          proposals={pacts}
          sheets={sheets}
          meUserId={meUserId}
          steersStory={steersStory}
          onError={setError}
        />
      </div>
      {offers.length || error ? (
        <div className="stagger mx-3 mb-2 space-y-1.5">
          {error ? <PanelError>{error}</PanelError> : null}
          {offers.map((proposal) => {
            const trade = proposal.toolName === "trade";
            // A trade is "mine" to answer when it is made to my character; the
            // offerer may only withdraw it (docs/vtt-parity-implementation-plan.md 11.2).
            const counterparty = trade ? sheets.find((sheet) => sheet.id === proposal.toCharacterId) : null;
            const proposer = proposal.userId === meUserId;
            const mine = trade ? counterparty?.userId === meUserId : proposal.userId === meUserId;
            const characterName =
              (trade ? counterparty?.name : sheets.find((sheet) => sheet.id === proposal.characterId)?.name) ?? t("campaign.session.proposals.unknownCharacter");
            const busy = busyId === proposal.id;
            return (
              <div
                key={proposal.id}
                className={cn(
                  "panel live-in flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                  mine ? "ornate border-amber-500/50 text-amber-100" : "text-stone-400",
                )}
              >
                <GameIcon
                  icon={{ kind: "glyph", key: trade ? "tab-trade" : VITALS_TOOLS.has(proposal.toolName) ? "tab-friends" : "tab-loot" }}
                  size="size-6"
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1">
                  {summarizeProposal(proposal)}
                  {proposal.reason ? (
                    <span className="text-stone-500"> ({proposal.reason})</span>
                  ) : null}
                </span>
                {trade && proposer && !mine && !steersStory ? (
                  <KitButton onClick={() => resolve(proposal.id, "cancel")} disabled={busy} busy={busy}>
                    {busy ? null : <X className="size-3.5" />} {t("campaign.session.proposals.withdraw")}
                  </KitButton>
                ) : mine || steersStory ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <KitButton tone="primary" onClick={() => resolve(proposal.id, "approve")} disabled={busy} busy={busy}>
                      {busy ? null : <Check className="size-3.5" />}
                      {t("campaign.session.proposals.accept")}
                    </KitButton>
                    <KitButton onClick={() => resolve(proposal.id, mine ? "decline" : "cancel")} disabled={busy}>
                      <X className="size-3.5" /> {mine ? t("campaign.session.proposals.decline") : t("campaign.session.proposals.withdraw")}
                    </KitButton>
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] italic text-stone-500">
                    {t("campaign.session.proposals.waiting", { character: characterName })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
