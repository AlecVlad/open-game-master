"use client";

import { VenetianMask, X } from "lucide-react";
import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { CharacterPortrait } from "@/lib/ui";
import { characterPlaceholder } from "@/lib/placeholders";
import { KitButton } from "./PanelKit";
import { useSettlingCards } from "./AdvanceOfferCard";
import type { ItemProposal } from "@/app/campaigns/[campaignId]/useCampaignStream";
import type { CharacterSheet } from "@/lib/schemas/sheet";

const PACT_CHOICE_LABEL_KEYS: Record<string, string> = {
  join: "campaign.session.pact.choice.join.label",
  play_along: "campaign.session.pact.choice.playAlong.label",
  report: "campaign.session.pact.choice.report.label",
  refuse: "campaign.session.pact.choice.refuse.label",
};

const PACT_CHOICE_HINT_KEYS: Record<string, string> = {
  join: "campaign.session.pact.choice.join.hint",
  play_along: "campaign.session.pact.choice.playAlong.hint",
  report: "campaign.session.pact.choice.report.hint",
  refuse: "campaign.session.pact.choice.refuse.hint",
};

// A pact's approach (issue 503 Phase 7) as an owner-only offer card in the
// chat column: who takes the character aside, their words, and the answers
// (join, play along, tell the party, refuse) for that character's player
// alone. Nobody else at the table is ever sent it (src/lib/table-delivery.ts);
// whoever runs the story sees whom it waits on and may withdraw it. It moves
// like the advance card it is built on (motion-app.css .advance-card), only
// from the server's offer and its settling. data-offer-card is what the
// apps look for to know the card is already on screen.

export function PactOffers({
  campaignId,
  proposals,
  sheets,
  meUserId,
  steersStory,
  onError,
}: {
  campaignId: string;
  proposals: ItemProposal[];
  sheets: CharacterSheet[];
  meUserId: string;
  steersStory: boolean;
  onError: (message: string) => void;
}) {
  const shown = useSettlingCards(proposals);
  if (!shown.length) {
    return null;
  }
  return (
    <>
      {shown.map(({ proposal, left }) => (
        <PactOfferCard
          key={proposal.id}
          campaignId={campaignId}
          proposal={proposal}
          character={sheets.find((sheet) => sheet.id === proposal.characterId)}
          mine={proposal.userId === meUserId}
          steersStory={steersStory}
          leaving={left}
          onError={onError}
        />
      ))}
    </>
  );
}

function PactOfferCard({
  campaignId,
  proposal,
  character,
  mine,
  steersStory,
  leaving,
  onError,
}: {
  campaignId: string;
  proposal: ItemProposal;
  character: CharacterSheet | undefined;
  mine: boolean;
  steersStory: boolean;
  leaving: boolean;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState("");
  const hintBase = useId();
  const from = proposal.from;
  const who = from?.name || t("campaign.session.pact.unknownSource");
  const face = characterPlaceholder({ race: from?.look.race || "human", class: from?.look.class || "fighter", gender: from?.look.gender || "" });
  const characterName = character?.name ?? t("campaign.session.pact.unknownCharacter");
  const choices = proposal.choices ?? [];
  const summary = t("campaign.session.pact.summary", { character: characterName });

  async function answer(choice: string) {
    setBusy(choice);
    try {
      const action = choice === "cancel" ? "cancel" : choice === "refuse" ? "decline" : "approve";
      const response = await fetch(`/api/campaigns/${campaignId}/item-proposals/${proposal.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "approve" ? { choice } : {}) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        onError(String(data.error ?? t("campaign.session.pact.error")));
      }
    } catch {
      onError(t("campaign.session.pact.network"));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="advance-shell" data-leaving={leaving ? "" : undefined}>
      <section
        aria-label={t("campaign.session.pact.cardAria", { summary, source: who })}
        data-offer-card={proposal.id}
        data-pact-offer={proposal.id}
        className={cn("advance-card panel rounded-xl px-3 py-2.5 text-xs", mine ? "ornate border-violet-400/50" : "border-violet-900/40")}
      >
        <div className="flex items-start gap-2.5">
          <CharacterPortrait url={from?.portraitUrl || undefined} fallback={face} alt={who} size="size-10" rounded="rounded-full" className="border-violet-400/40" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-violet-100">
              <VenetianMask className="size-3.5 shrink-0 text-violet-300" aria-hidden="true" />
              <span className="min-w-0">{proposal.toolName === "pact_approach" ? summary : proposal.summary}</span>
            </p>
            {proposal.reason ? <p className="mt-1 text-sm italic leading-snug text-stone-200">&ldquo;{proposal.reason}&rdquo;</p> : null}
            {mine ? (
              <p className="mt-1 text-[11px] text-stone-400">{t("campaign.session.pact.onlyYou")}</p>
            ) : null}
          </div>
        </div>
        {mine ? (
          <div role="group" aria-label={t("campaign.session.pact.answerAria", { character: characterName })} className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {choices.map((choice, index) => (
              <KitButton
                key={choice.id}
                className={cn("h-auto min-h-10 w-full flex-col items-start gap-0 whitespace-normal px-3 py-1.5 text-left", choice.id === "join" && "border-violet-400/60 text-violet-50")}
                onClick={() => void answer(choice.id)}
                disabled={Boolean(busy) || leaving}
                busy={busy === choice.id}
                aria-describedby={`${hintBase}-${index}`}
                data-pact-choice={choice.id}
              >
                <span className="text-[12px] font-medium">{PACT_CHOICE_LABEL_KEYS[choice.id] ? t(PACT_CHOICE_LABEL_KEYS[choice.id] as never) : choice.label}</span>
                <span id={`${hintBase}-${index}`} className="text-[11px] font-normal leading-snug opacity-80">
                  {PACT_CHOICE_HINT_KEYS[choice.id] ? t(PACT_CHOICE_HINT_KEYS[choice.id] as never) : choice.hint}
                </span>
              </KitButton>
            ))}
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1.5">
            <span className="text-[11px] italic text-stone-500">{t("campaign.session.pact.waiting", { character: characterName })}</span>
            {steersStory ? (
              <KitButton className="min-h-10" onClick={() => void answer("cancel")} disabled={Boolean(busy) || leaving} busy={busy === "cancel"}>
                {busy === "cancel" ? null : <X className="size-3.5" aria-hidden="true" />}
                {t("campaign.session.pact.withdraw")}
              </KitButton>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
