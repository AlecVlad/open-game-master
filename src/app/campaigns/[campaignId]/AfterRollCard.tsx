"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import type { PendingRoll } from "@/app/campaigns/[campaignId]/useCampaignStream";
import { CheckFrame } from "@/app/campaigns/[campaignId]/SkillCheckCard";
import { useI18n } from "@/lib/i18n/provider";

const STEP_IN_AFTER_MS = 3 * 60 * 1000;

// A finger-sized target (40px, the kit's own) with a ring for the keyboard.
const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70";
const OPTION = `motion-press inline-flex min-h-10 items-center rounded-full border border-amber-300/60 px-3 py-1 text-xs font-semibold disabled:opacity-50 ${RING}`;
const PLAIN = `motion-press inline-flex min-h-10 items-center px-1 text-xs underline decoration-dotted underline-offset-2 disabled:opacity-50 ${RING}`;

// The dice have landed and the game has not yet said what they did: the roller
// may spend something on them (src/lib/dm/after-roll-logic.ts). Everyone else
// sees who the table is waiting on, and whoever runs the story can keep the
// dice for a player who has stepped away.
export function AfterRollCard({
  campaignId,
  pending,
  sheets,
  meUserId,
  steersStory,
}: {
  campaignId: string;
  pending: PendingRoll;
  sheets: CharacterSheet[];
  meUserId: string;
  steersStory: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // A card already open when the wait runs long has to notice by itself: the
  // table is stalled on it, and nothing else redraws it.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const left = new Date(pending.createdAt).getTime() + STEP_IN_AFTER_MS - Date.now();
    const timer = setTimeout(() => setStale(true), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [pending.createdAt]);
  const thrown = pending.thrown;
  if (!thrown) {
    return null;
  }
  const character = sheets.find((sheet) => sheet.id === pending.characterId);
  const kindLabel =
    pending.kind === "skill_check" ? t("campaign.afterRoll.kind.skillCheck") :
    pending.kind === "saving_throw" ? t("campaign.afterRoll.kind.savingThrow") :
    pending.kind === "ability_check" ? t("campaign.afterRoll.kind.abilityCheck") :
    pending.kind === "attack" ? t("campaign.afterRoll.kind.attack") :
    pending.kind === "damage" ? t("campaign.afterRoll.kind.damage") :
    pending.kind === "initiative" ? t("campaign.afterRoll.kind.initiative") :
    t("campaign.afterRoll.kind.roll");
  const lead = thrown.outcome.terms[0];
  const d20s = lead?.kind === "dice" ? lead.dice : [];
  // The rest of the roll, for a die the player is choosing.
  const others = thrown.outcome.total - (lead?.kind === "dice" ? lead.subtotal : 0);

  async function choose(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/pending-rolls/${pending.id}/after-roll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || t("campaign.afterRoll.error.sendChoice"));
      }
    } catch {
      setError(t("campaign.afterRoll.error.server"));
    } finally {
      setBusy(false);
    }
  }

  if (pending.userId !== meUserId) {
    return (
      <CheckFrame className="mb-2 flex animate-fade-up items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="min-w-0" role="status">
          {character?.name
            ? t("campaign.afterRoll.waiting.character", { character: character.name, total: thrown.outcome.total })
            : t("campaign.afterRoll.waiting.player", { total: thrown.outcome.total })}
        </span>
        {steersStory && stale ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void choose({ keep: true })}
            className={`${PLAIN} shrink-0 font-medium`}
          >
            {t("campaign.afterRoll.keepForPlayer")}
          </button>
        ) : null}
      </CheckFrame>
    );
  }

  return (
    <CheckFrame className="mb-2 animate-fade-up px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="check-well px-2 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em]">
          {kindLabel}
        </span>
        {pending.dc !== null ? (
          <span className="check-well check-dim px-2 py-0.5 font-mono text-[11px]">{t("campaign.afterRoll.difficulty", { dc: pending.dc })}</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm">
        {character?.name
          ? t("campaign.afterRoll.result.character", { character: character.name, total: thrown.outcome.total })
          : t("campaign.afterRoll.result.you", { total: thrown.outcome.total })}
        {thrown.outcome.natural !== undefined
          ? ` ${t("campaign.afterRoll.result.natural", { natural: thrown.outcome.natural })}`
          : ""}.
        {" "}
        {thrown.choosing
          ? t("campaign.afterRoll.chooseDie")
          : t("campaign.afterRoll.changeBeforeResult")}
      </p>
      {pending.reason ? <p className="check-dim mt-0.5 text-xs">{pending.reason}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={thrown.choosing ? t("campaign.afterRoll.aria.chooseDie") : t("campaign.afterRoll.aria.changeOrKeep")}>
        {thrown.choosing
          ? d20s.map((die, index) => (
              <button
                key={index}
                type="button"
                disabled={busy}
                onClick={() => void choose({ die: index })}
                className={OPTION}
              >
                {t("campaign.afterRoll.useDie", { die: die.value, total: die.value + others })}
              </button>
            ))
          : thrown.options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={busy}
                onClick={() => void choose({ use: option.id })}
                className={OPTION}
              >
                {option.label}
              </button>
            ))}
        {thrown.choosing ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void choose({ keep: true })}
            className={`${PLAIN} check-dim`}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : t("campaign.afterRoll.keep")}
          </button>
        )}
      </div>
      {error ? <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </CheckFrame>
  );
}
