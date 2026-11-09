"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import type { PendingRoll } from "@/app/campaigns/[campaignId]/useCampaignStream";
import { CheckFrame } from "@/app/campaigns/[campaignId]/SkillCheckCard";
import { AFTER_ROLL_SECONDS } from "@/lib/dm/after-roll-logic";
import { useI18n } from "@/lib/i18n/provider";

const STEP_IN_AFTER_MS = 3 * 60 * 1000;

// A finger-sized target (40px, the kit's own) with a ring for the keyboard.
const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70";
const OPTION = `motion-press inline-flex min-h-10 items-center rounded-full border border-amber-300/60 px-3 py-1 text-xs font-semibold disabled:opacity-50 ${RING}`;
const PLAIN = `motion-press inline-flex min-h-10 items-center px-1 text-xs underline decoration-dotted underline-offset-2 disabled:opacity-50 ${RING}`;

// The dice have landed and the game has not yet said what they did: the roller
// may spend something on them (src/lib/dm/after-roll-logic.ts), and a
// Chronurgy wizard beside them may make them roll it again, on the wizard's
// own screen (src/lib/dm/chronal-shift.ts). Everyone else sees who the table
// is waiting on, and whoever runs the story can keep the dice for a player
// who has stepped away.
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
  // The seconds left before the server keeps the dice as they lie
  // (src/lib/dm/after-roll-timer.ts). A roll parked before there was a
  // deadline has none to show.
  const deadline = pending.thrown?.deadline;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [deadline]);
  // The clock ticks once a second, so a fresh deadline can briefly read long.
  const left = deadline ? Math.min(AFTER_ROLL_SECONDS, Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000))) : null;
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

  // One of my characters' choices on this roll: Chronal Shift, War God's
  // Blessing or Flash of Genius (after-roll.ts allyChoicesFor).
  const mine = new Set(sheets.filter((sheet) => sheet.userId === meUserId).map((sheet) => sheet.id));
  const myShifts = thrown.options.filter((option) => option.by && mine.has(option.by));
  const waitingOn = [...new Set(thrown.options.filter((option) => option.by && !mine.has(option.by)).map((option) => sheets.find((sheet) => sheet.id === option.by)?.name ?? t("campaign.afterRoll.helper.ally")))];
  const onlyShifts = thrown.options.filter((option) => option.by).every((option) => option.id === "chronal_shift");
  const myHelpers = [...new Set(myShifts.map((option) => option.by))];
  const helperName = character?.name ?? t("campaign.afterRoll.helper.ally");
  const helperResult = pending.kind === "attack"
    ? t("campaign.afterRoll.helper.result.attack", { character: helperName, total: thrown.outcome.total })
    : pending.dc !== null
      ? t("campaign.afterRoll.helper.result.save", { character: helperName, total: thrown.outcome.total, dc: pending.dc })
      : t("campaign.afterRoll.helper.result.check", { character: helperName, total: thrown.outcome.total });
  const helperAria = onlyShifts
    ? t("campaign.afterRoll.helper.aria.chronal", { character: helperName })
    : t("campaign.afterRoll.helper.aria.help", { character: helperName });
  const clock = left !== null ? <span className="check-dim text-xs" aria-live="off">{t("campaign.afterRoll.clock.stands", { seconds: left })}</span> : null;

  if (pending.userId !== meUserId && myShifts.length) {
    // The helper's own screen: the ally's roll, and whether to answer it.
    return (
      <CheckFrame className="mb-2 animate-fade-up px-3 py-2.5">
        <p className="text-sm">
          {helperResult}
          {thrown.outcome.natural !== undefined ? ` ${t("campaign.afterRoll.result.natural", { natural: thrown.outcome.natural })}` : ""}
        </p>
        {pending.reason ? <p className="check-dim mt-0.5 text-xs">{pending.reason}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={helperAria}>
          {myShifts.map((option) => (
            <button key={`${option.id}:${option.by}`} type="button" disabled={busy} title={option.note} onClick={() => void choose({ use: option.id, by: option.by })} className={OPTION}>
              {option.label}
            </button>
          ))}
          {myHelpers.map((helper) => (
            <button key={`leave-${helper}`} type="button" disabled={busy} onClick={() => void choose({ decline: true, by: helper })} className={`${PLAIN} check-dim`}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : myHelpers.length > 1 ? t("campaign.afterRoll.helper.letStandNamed", { name: sheets.find((sheet) => sheet.id === helper)?.name ?? "" }) : t("campaign.afterRoll.helper.letStand")}
            </button>
          ))}
          {clock}
        </div>
        {error ? <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p> : null}
      </CheckFrame>
    );
  }

  if (pending.userId !== meUserId) {
    return (
      <CheckFrame className="mb-2 flex animate-fade-up items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="min-w-0" role="status">
          {character?.name
            ? t("campaign.afterRoll.waiting.character", { character: character.name, total: thrown.outcome.total })
            : t("campaign.afterRoll.waiting.player", { total: thrown.outcome.total })}
          {thrown.kept && waitingOn.length
            ? ` ${t(waitingOn.length === 1
                ? onlyShifts ? "campaign.afterRoll.waiting.kept.chronal.one" : "campaign.afterRoll.waiting.kept.help.one"
                : onlyShifts ? "campaign.afterRoll.waiting.kept.chronal.many" : "campaign.afterRoll.waiting.kept.help.many",
              { names: waitingOn.join(", ") })}`
            : ""}
          {left !== null ? <span className="check-dim"> {t("campaign.afterRoll.clock.stands", { seconds: left })}</span> : null}
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

  const own = thrown.options.filter((option) => !option.by);
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
          : thrown.kept
            ? t("campaign.afterRoll.result.kept")
            : pending.kind === "attack"
              ? thrown.options.some((option) => option.id === "touch_of_death")
                ? t("campaign.afterRoll.attack.hits.touch")
                : thrown.options.some((option) => option.id === "destructive_wrath")
                  ? t("campaign.afterRoll.attack.hits.wrath")
                  : t(own.length ? "campaign.afterRoll.attack.misses.changeable" : "campaign.afterRoll.attack.misses")
              : own.length
                ? t("campaign.afterRoll.changeBeforeResult")
                : t("campaign.afterRoll.changeBeforeResult.helper")}
      </p>
      {pending.reason ? <p className="check-dim mt-0.5 text-xs">{pending.reason}</p> : null}
      {waitingOn.length ? (
        <p className="check-dim mt-0.5 text-xs" role="status">
          {t(onlyShifts ? "campaign.afterRoll.helpers.canChronal" : "campaign.afterRoll.helpers.canHelp", { names: waitingOn.join(", ") })}
        </p>
      ) : null}
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
          : [...own, ...myShifts].map((option) => (
              <button
                key={`${option.id}:${option.by ?? ""}`}
                type="button"
                disabled={busy}
                title={option.note}
                onClick={() => void choose(option.by ? { use: option.id, by: option.by } : { use: option.id })}
                className={OPTION}
              >
                {option.label}
              </button>
            ))}
        {thrown.choosing || thrown.kept ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void choose({ keep: true })}
            className={`${PLAIN} check-dim`}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : t("campaign.afterRoll.keep")}
          </button>
        )}
        {left !== null ? (
          // Read once by a screen reader with the card, not every second.
          <span className="check-dim text-xs" aria-live="off">
            {thrown.choosing ? t("campaign.afterRoll.clock.higherDie", { seconds: left }) : t("campaign.afterRoll.clock.stands", { seconds: left })}
          </span>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </CheckFrame>
  );
}
