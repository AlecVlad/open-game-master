"use client";

import { Dices, Loader2, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CampaignMember } from "@/lib/campaign-types";
import { cn } from "@/lib/cn";
import { OptionalStepper } from "@/app/workshop/kit";
import { expressionDice } from "@/lib/dice";
import { buzz, onShake, supportsShake, useShakeToRoll } from "@/lib/dice/shake-to-roll";
import {
  resolveFaceSource,
  useDiceSources,
  type FaceSource,
} from "@/lib/dice/dice-sources";
import {
  getConnectedPixels,
  getConnectedPixelsServer,
  onPixelRoll,
  onPixelsChanged,
} from "@/lib/dice/pixels-dice";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import type { PendingRoll } from "@/app/campaigns/[campaignId]/useCampaignStream";
import { CheckDie, CheckFrame, ModifierBreakdown } from "@/app/campaigns/[campaignId]/SkillCheckCard";
import { findSkill } from "@/lib/srd";
import { heldInspiration } from "@/lib/dm/roll-riders";
import { INSPIRED_KINDS } from "@/lib/dm/pending-inspiration";
import { canWaitOnRoll } from "@/lib/dm/after-roll-logic";
import { foretoldLeft } from "@/lib/dm/foretold-logic";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

const ABILITY_NAME_KEYS: Record<string, MessageKey> = {
  str: "campaign.session.roll.ability.str",
  dex: "campaign.session.roll.ability.dex",
  con: "campaign.session.roll.ability.con",
  int: "campaign.session.roll.ability.int",
  wis: "campaign.session.roll.ability.wis",
  cha: "campaign.session.roll.ability.cha",
};

const ROLL_KIND_KEYS: Record<string, MessageKey> = {
  skill_check: "campaign.session.roll.kind.skillCheck",
  saving_throw: "campaign.session.roll.kind.savingThrow",
  ability_check: "campaign.session.roll.kind.abilityCheck",
  attack: "campaign.session.roll.kind.attack",
  damage: "campaign.session.roll.kind.damage",
  initiative: "campaign.session.roll.kind.initiative",
  custom: "campaign.session.roll.kind.roll",
};

const OWNER_FALLBACK_AFTER_MS = 3 * 60 * 1000;

const SUBMIT_BUTTON = cn(
  "motion-press rounded-lg bg-gradient-to-b from-amber-100 via-amber-200 to-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-950",
  "shadow-[0_1px_0_rgba(253,247,231,0.6)_inset] transition-all duration-150 ease-snap",
  "hover:-translate-y-px hover:shadow-glow-gold-strong active:translate-y-0 active:scale-95",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none",
);

// A parked roll. For a physical-dice player the roller enters each die; for
// a player who holds their own rolls (shake to roll) the card waits for a
// shake or a tap and the server rolls. Everyone else sees a waiting card.
// The roller can always fall back to a digital roll; the owner can too once
// the card has sat unanswered for a few minutes.
//
// The presentation is the violet skill-check card (SkillCheckCard.tsx,
// docs/visual-overhaul-plan.md 5.4): the halo breathes while the roll is
// parked, the die tumbles once it has been sent, and the landing itself
// plays where the roll arrives, in the chronicle (RollCard.tsx). Every
// source and control is as it was.
export function PendingRollCard({
  campaignId,
  pending,
  sheets,
  members,
  meUserId,
  steersStory,
}: {
  campaignId: string;
  pending: PendingRoll;
  sheets: CharacterSheet[];
  members: CampaignMember[];
  meUserId: string;
  steersStory: boolean;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Sampled once on mount; the fallback affordance appearing on the next
  // re-render after the threshold is fine for a courtesy button.
  const [mountedAt] = useState(() => Date.now());

  const faces = useMemo(() => {
    try {
      return expressionDice(pending.expression);
    } catch {
      return [];
    }
  }, [pending.expression]);

  const mine = pending.userId === meUserId;
  // Held without real dice: no faces to type, the whole roll is digital
  // and released by the roller (a shake here, a tap anywhere).
  const roller = members.find((member) => member.userId === pending.userId);
  // A roll waiting on Portent is the server's to throw, as a held roll is.
  const foretelling = pending.parkedFor === "foretold";
  const heldOnly = foretelling || Boolean(roller?.holdRolls && !roller?.useRealDice);
  const shakeOn = useShakeToRoll();
  const [canShake] = useState(() => supportsShake());
  const shakeActive = mine && shakeOn && canShake;

  const [diceSources] = useDiceSources();
  const pixels = useSyncExternalStore(
    onPixelsChanged,
    getConnectedPixels,
    getConnectedPixelsServer,
  );

  // Resolve every face to its source: the chosen preference, degraded to
  // typing when the assigned Pixels die isn't currently connected.
  const faceSources = useMemo<FaceSource[]>(
    () => faces.map((sides) => resolveFaceSource(diceSources[sides], sides, pixels)),
    [faces, diceSources, pixels],
  );

  // What a face has so far: the typed or Pixels-landed entry, else empty. A
  // digital face never has a client value; the server rolls it on submit, so
  // the browser has nothing a player could read ahead of time.
  const faceValue = (index: number): string => values[index]?.trim() ?? "";

  // The wire payload: numbers for typed and Pixels faces, the literal
  // "digital" for server-rolled ones.
  const submissionDice = (): Array<number | "digital"> =>
    faces.map((_, index) =>
      faceSources[index]?.kind === "digital" ? "digital" : Number(faceValue(index)),
    );

  // A physical Pixels die landing fills the next empty face assigned to it.
  useEffect(() => {
    if (!mine) {
      return;
    }
    return onPixelRoll(({ systemId, faceCount, value }) => {
      setValues((current) => {
        const index = faceSources.findIndex(
          (source, position) =>
            source.kind === "pixel" &&
            source.systemId === systemId &&
            faces[position] === faceCount &&
            !current[position]?.trim(),
        );
        if (index < 0) {
          return current;
        }
        return { ...current, [index]: String(value) };
      });
    });
  }, [mine, faceSources, faces]);

  const character = sheets.find((sheet) => sheet.id === pending.characterId);
  const detailText = pending.detail.replaceAll("_", " ");
  const label = `${character?.name ?? t("campaign.session.roll.someone")}: ${t(ROLL_KIND_KEYS[pending.kind] ?? "campaign.session.roll.kind.roll")}${
    detailText ? ` (${detailText})` : ""
  }`;
  // Plain-words instruction: "Roll 2× d20 and 1× d8" from the faces list.
  const diceSummary = (() => {
    if (!faces.length) {
      return "";
    }
    const counts = new Map<number, number>();
    for (const sides of faces) {
      counts.set(sides, (counts.get(sides) ?? 0) + 1);
    }
    const parts = [...counts.entries()].map(
      ([sides, count]) => `${count} × d${sides}`,
    );
    return parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} ${t("campaign.session.roll.and")} ${parts[parts.length - 1]}`
      : parts[0];
  })();
  // Enter raw die faces only; any flat bonus applies server-side.
  const flatModifier = /([+-]\d+)$/.exec(pending.expression.replaceAll(" ", ""))?.[1];
  const modifierNote = flatModifier
    ? t("campaign.session.roll.modifierNote", { modifier: flatModifier })
    : "";
  const advantageNote =
    pending.advantage === "advantage"
      ? t("campaign.session.roll.advantage")
      : pending.advantage === "disadvantage"
        ? t("campaign.session.roll.disadvantage")
        : "";
  const stale = mountedAt - new Date(pending.createdAt).getTime() > OWNER_FALLBACK_AFTER_MS;
  // A digital face is always ready (the server fills it); everything else
  // needs its number in hand before the roll can go.
  const complete =
    faces.length > 0 &&
    faces.every(
      (_, index) => faceSources[index]?.kind === "digital" || faceValue(index),
    );
  // Every face comes from a die that fills itself (digital or a Pixels die):
  // no typing is needed, so the card submits on its own once all have landed.
  const fullyAutomatic =
    faceSources.length > 0 && faceSources.every((source) => source.kind !== "manual");

  async function submit(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/pending-rolls/${pending.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || t("campaign.session.roll.submitFailed"));
      }
    } catch {
      setError(t("campaign.session.roll.serverUnreachable"));
    } finally {
      setBusy(false);
    }
  }

  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    // A held roll is the player's to release: never auto-submit it, even
    // when every die source is digital.
    if (!mine || heldOnly || !fullyAutomatic || autoSubmittedRef.current || busy || !complete) {
      return;
    }
    autoSubmittedRef.current = true;
    void submit({ dice: submissionDice() });
    // submit is stable enough for this one-shot guarded call; re-running only
    // matters to catch the transition to complete, which the deps below cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, heldOnly, fullyAutomatic, busy, complete, faces, values]);

  // A shake releases the roll: the typed and Pixels faces when they are all
  // in, otherwise a fully digital roll. One shake per card.
  const shakenRef = useRef(false);
  useEffect(() => {
    if (!shakeActive || busy) {
      return;
    }
    return onShake(() => {
      if (shakenRef.current) return;
      shakenRef.current = true;
      buzz();
      void submit(!heldOnly && complete ? { dice: submissionDice() } : { fallback: "digital" });
    });
    // submit and submissionDice read the latest values through closure;
    // the listener is rebound whenever the inputs it depends on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeActive, busy, heldOnly, complete, faces, values]);

  // Inspiration: advantage on this d20 before it is thrown (SRD 5.1). Offered
  // while the character holds it and the roll could use it; the route answers
  // with the rule's sentence when it cannot.
  const canInspire =
    Boolean(character && heldInspiration(character)) &&
    (INSPIRED_KINDS as readonly string[]).includes(pending.kind) &&
    pending.advantage !== "advantage";
  // Portent: a number foretold at the last long rest, instead of this d20.
  const foretold = character && canWaitOnRoll(pending.kind) && !pending.thrown ? [...new Set(foretoldLeft(character))] : [];
  async function foretell(value: number) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/pending-rolls/${pending.id}/portent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || t("campaign.session.roll.portentFailed"));
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function inspire() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/pending-rolls/${pending.id}/inspiration`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || t("campaign.session.roll.inspirationFailed"));
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function stopHolding() {
    await fetch(`/api/campaigns/${campaignId}/members/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdRolls: false }),
    }).catch(() => undefined);
  }

  // What the card is about, for its head: the kind, the DC the table was
  // sent, and the ability behind a skill ("Athletics" is Strength).
  const title = t(ROLL_KIND_KEYS[pending.kind] ?? "campaign.session.roll.kind.roll");
  const skillId = pending.detail.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const abilityId =
    pending.kind === "skill_check"
      ? findSkill(skillId)?.ability
      : pending.kind === "saving_throw" || pending.kind === "ability_check"
        ? skillId.slice(0, 3)
        : undefined;
  const abilityName = abilityId && ABILITY_NAME_KEYS[abilityId] ? t(ABILITY_NAME_KEYS[abilityId]) : undefined;

  if (!mine) {
    return (
      <CheckFrame className="mb-2 flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <CheckDie state="waiting" sides={faces[0] ?? 20} size="size-7" />
          <span className="min-w-0">
            {t("campaign.session.roll.waitingFor", { name: character?.name ?? t("campaign.session.roll.someone"), expression: pending.expression })}{heldOnly ? "" : t("campaign.session.roll.withRealDice")}
          </span>
        </span>
        {steersStory && stale ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit({ fallback: "digital" })}
            className="motion-press shrink-0 font-medium underline decoration-dotted underline-offset-2 disabled:opacity-50"
          >
            {t("campaign.session.roll.rollDigital")}
          </button>
        ) : null}
      </CheckFrame>
    );
  }

  return (
    <CheckFrame className="mb-2 animate-fade-up px-3 py-2.5">
      <div className="flex flex-wrap items-start gap-3">
        {/* The die: resting under its halo, tumbling once the roll is sent. */}
        <CheckDie state={busy ? "waiting" : "idle"} sides={faces[0] ?? 20} halo={!busy} />
        <div className="min-w-0 flex-1 basis-52">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="check-well px-2 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em]">
              {title}
            </span>
            {pending.dc !== null ? (
              <span className="check-well check-dim px-2 py-0.5 font-mono text-[11px]">{t("campaign.session.roll.difficultyClass", { dc: pending.dc })}</span>
            ) : null}
            <ModifierBreakdown expression={pending.expression} caption={abilityName} />
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <Dices className="size-4 shrink-0" style={{ color: "var(--check-vine)" }} />
            <span className="min-w-0">{t("campaign.session.roll.yourRoll", { label })}</span>
          </p>
          {pending.reason ? <p className="check-dim mt-0.5 text-xs">{pending.reason}</p> : null}
          {canInspire ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void inspire()}
              title={t("campaign.session.roll.spendInspirationHint")}
              className="motion-pop motion-press mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/10 px-3 text-xs text-amber-100 transition-colors duration-150 hover:bg-amber-500/20 disabled:opacity-50 sm:min-h-8"
            >
              <Sparkles className="size-3.5" /> {t("campaign.session.roll.spendInspiration")}
            </button>
          ) : null}
          {foretold.length ? (
            <div role="group" aria-label={t("campaign.session.roll.usePortent")} className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs">{t("campaign.session.roll.portentInstead")}</span>
              {foretold.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  onClick={() => void foretell(value)}
                  title={t("campaign.session.roll.portentHint", { value })}
                  className="motion-press inline-flex min-h-10 items-center justify-center rounded-full border border-amber-400/60 px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:opacity-50"
                >
                  {t("campaign.session.roll.useValue", { value })}
                </button>
              ))}
            </div>
          ) : null}
      {heldOnly ? (
        <>
          {advantageNote ? (
            <p className="check-dim mt-0.5 text-xs">{advantageNote}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {shakeActive ? (
              <span className="flex items-center gap-2 text-sm">
                <Smartphone className="size-5 animate-bounce" style={{ color: "var(--check-vine)" }} />
                {t("campaign.session.roll.shakeDice", { dice: diceSummary })}
              </span>
            ) : foretelling ? null : (
              <span className="text-xs">
                {t("campaign.session.roll.rollsWait")}{canShake ? "" : t("campaign.session.roll.shakePhoneHint")}.
              </span>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => submit({ fallback: "digital" })}
              className={SUBMIT_BUTTON}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : t("campaign.session.roll.rollNow")}
            </button>
            {!shakeActive && !foretelling ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void stopHolding()}
                className="check-dim text-xs hover:underline disabled:opacity-50"
              >
                {t("campaign.session.roll.stopHolding")}
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
        </>
      ) : null}
      {!heldOnly && diceSummary ? (
        <p className="mt-1 text-xs">
          {fullyAutomatic
            ? t("campaign.session.roll.automaticSummary", { dice: diceSummary })
            : `${t("campaign.session.roll.manualSummary", { dice: diceSummary })}${modifierNote ? ` ${modifierNote}` : ""} ${t("campaign.session.roll.waitForResult")}`}
        </p>
      ) : null}
      {!heldOnly && advantageNote ? (
        <p className="check-dim mt-0.5 text-xs">{advantageNote}</p>
      ) : null}
      {!heldOnly && shakeActive ? (
        <p className="check-dim mt-0.5 flex items-center gap-1.5 text-xs">
          <Smartphone className="size-3.5" /> {t("campaign.session.roll.shakeDigitally")}
        </p>
      ) : null}

      {heldOnly ? null : (
      <div className="mt-2 flex flex-wrap items-end gap-2">
        {faces.map((sides, index) => {
          const source = faceSources[index] ?? { kind: "manual" };
          const filled = faceValue(index);
          // Digital faces are rolled by the server on submit: marked, not
          // typed, and showing no number the player could act on early.
          if (source.kind === "digital") {
            return (
              <div key={index} className="block">
                <span className="mb-0.5 block text-center text-[10px] text-sky-300/80">
                  d{sides} · {t("campaign.session.roll.auto")}
                </span>
                <div
                  aria-label={t("campaign.session.roll.rolledForYou", { die: sides })}
                  className="flex h-[34px] w-14 items-center justify-center rounded-md border border-sky-800/70 bg-sky-950/30 text-sm text-sky-100"
                >
                  <Dices className="size-4 text-sky-300/80" />
                </div>
              </div>
            );
          }
          // Pixels faces auto-fill when the die lands, but stay editable so a
          // stubborn die never blocks the roll.
          const isPixel = source.kind === "pixel";
          return (
            <div key={index} className="block">
              <span
                title={isPixel ? source.name : undefined}
                className={cn(
                  "mb-0.5 block max-w-24 truncate text-center text-[10px]",
                  isPixel ? "text-sky-300/90" : "check-dim",
                )}
              >
                {isPixel ? source.name : `d${sides}`}
              </span>
              <div className="relative">
                {/* Blank means "not rolled yet", so the stepper is the optional
                    one: the cross clears a mistyped die back to blank. */}
                <OptionalStepper
                  min={1}
                  max={sides}
                  fallback={1}
                  value={filled === "" || !Number.isFinite(Number(filled)) ? undefined : Number(filled)}
                  onChange={(next) => setValues((current) => ({ ...current, [index]: next === "" ? "" : String(next) }))}
                  label={isPixel ? `${source.name}, d${sides}` : `d${sides}`}
                  size="sm"
                />
                {isPixel && !filled ? (
                  <Dices className="pointer-events-none absolute -right-1 -top-1 size-3 animate-pulse text-sky-400/70" />
                ) : null}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          disabled={busy || !complete}
          onClick={() => submit({ dice: submissionDice() })}
          className={SUBMIT_BUTTON}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : t("campaign.session.roll.submit")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit({ fallback: "digital" })}
          className="check-dim text-xs hover:underline disabled:opacity-50"
        >
          {t("campaign.session.roll.digitalInstead")}
        </button>
      </div>
      )}
      {!heldOnly && error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
        </div>
      </div>
    </CheckFrame>
  );
}
