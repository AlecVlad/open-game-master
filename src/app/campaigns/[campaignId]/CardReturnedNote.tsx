"use client";

import { Loader2, RotateCcw, Undo2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { askConcentrationSwap, isConcentrationQuestion } from "@/components/concentration-prompt";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import type { CampaignMessage } from "@/lib/db/messages";
import type { ConcentrationSwap } from "@/lib/dm/concentration-confirm-logic";

// A card the GM never carried out went back to its player (issue 570,
// src/lib/dm/turn.ts giveCardsBack): its line says so, with why, instead of
// the story telling it as done. Nothing was spent, so the Hand deals the
// card again; its player can also play it again from here in one press,
// with the same sentence and the same choices.
export function CardReturnedNote({ message, mine, name }: { message: CampaignMessage; mine: boolean; name: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const playAgain = async () => {
    if (state !== "idle" || !message.intent) return;
    setState("sending");
    setError("");
    const post = (concentrationAck?: ConcentrationSwap) =>
      fetch(`/api/campaigns/${message.campaignId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message.content,
          kind: "do",
          characterId: message.characterId ?? undefined,
          intent: message.intent,
          ...(concentrationAck ? { concentrationAck } : {}),
        }),
      });
    try {
      let response = await post();
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        // A cast that ends the spell held now is asked about, as in the Hand.
        const ack = isConcentrationQuestion(response.status, data) ? await askConcentrationSwap(data) : null;
        if (!ack) {
          setError(isConcentrationQuestion(response.status, data) ? t("campaign.session.cardReturned.keptSpell") : data.error || t("campaign.session.cardReturned.error.play"));
          setState("idle");
          return;
        }
        response = await post(ack);
        if (!response.ok) {
          const again = (await response.json().catch(() => ({}))) as { error?: string };
          setError(again.error || t("campaign.session.cardReturned.error.play"));
          setState("idle");
          return;
        }
      }
      setState("sent");
    } catch {
      setError(t("campaign.session.cardReturned.error.network"));
      setState("idle");
    }
  };

  return (
    <div className="card-returned motion-pop mt-1 flex flex-col items-end gap-1 text-right text-xs" role="status">
      <p className="inline-flex items-start gap-1.5 text-amber-200/90">
        <Undo2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {mine ? t("campaign.session.cardReturned.mine") : t("campaign.session.cardReturned.other", { name })}
          {message.cardReturned ? <span className="block text-stone-400">{message.cardReturned}</span> : null}
        </span>
      </p>
      {mine && message.intent ? (
        state === "sent" ? (
          <span className="motion-pop text-stone-400">{t("campaign.session.cardReturned.playedAgain")}</span>
        ) : (
          <button
            type="button"
            onClick={() => void playAgain()}
            disabled={state === "sending"}
            className={cn(ui.btnSmall, "motion-press min-h-10 sm:min-h-8")}
          >
            {state === "sending" ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} {t("campaign.session.cardReturned.playAgain")}
          </button>
        )
      ) : null}
      {error ? <span className="text-red-300">{error}</span> : null}
    </div>
  );
}
