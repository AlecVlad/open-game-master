"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";
import { CONSCIENCE_RUNGS, type ConscienceRung } from "@/lib/dm/conscience-logic";

// A lasting companion's conscience on its Bonds row (issue 503): the five
// rungs from content to the breaking point, with a marker that slides one
// rung (360 ms) when the server moves it, and the ultimatum it set, with the
// time left on the campaign's clock; and what it does inside the party (the
// share a mercenary wants, what it refused today). Every move comes from a
// server outcome (a deed recorded, standing changed, a deadline passed, a
// refusal), never from the narration. A player's row shows a move once the
// story has said it (issue 615); whoever runs the story also reads what is
// still unsaid and unease kept in. Reduced motion keeps the colour and the
// words and drops the slide and the reveal (motion-app.css).

export type ConscienceView = {
  rung: ConscienceRung;
  ultimatum: { condition: string; due: string; left: string; leftMinutes?: number } | null;
  // What they mean to do at their breaking point (issue 503 Phase 2): a
  // storyteller secret, sent only to a person running the table.
  plan?: string;
  // Inside the party (Phase 4): the share a mercenary still wants before it
  // fights, and what it refused today. Said aloud, so every seat reads them.
  demand?: string;
  refused?: string;
  // A hidden employer (Phase 8): a storyteller secret, like the plan.
  agenda?: string;
  // Issue 615, for whoever runs the story: a move the table has not heard
  // yet, and unease the companion keeps in, with who noticed it.
  unheard?: boolean;
  hidden?: { noticedBy: string[] };
  // For a player: one of their own characters noticed unease kept in.
  noticed?: boolean;
};

// Calm to grave, in the palettes the day theme turns too (globals.css).
const MARKER: Record<ConscienceRung, string> = {
  content: "bg-emerald-500/80",
  uneasy: "bg-amber-400/80",
  warning: "bg-amber-600",
  ultimatum: "bg-rose-500",
  breaking: "bg-rose-700",
};

const WORD: Record<ConscienceRung, string> = {
  content: "text-emerald-300",
  uneasy: "text-amber-300",
  warning: "text-amber-200",
  ultimatum: "text-rose-300",
  breaking: "text-rose-200",
};

function localizedDuration(minutes: number, t: ReturnType<typeof useI18n>["t"]): string {
  const total = Math.max(0, Math.round(minutes));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (days) parts.push(t("campaign.relationship.time.days", { count: days }));
  if (hours) parts.push(t("campaign.relationship.time.hours", { count: hours }));
  if (mins || parts.length === 0) parts.push(t("campaign.relationship.time.minutes", { count: mins }));
  return parts.join(" ");
}

export function ConscienceLadder({ name, conscience }: { name: string; conscience: ConscienceView }) {
  const { t } = useI18n();
  const step = CONSCIENCE_RUNGS.indexOf(conscience.rung);
  const rungLabel = t(`campaign.relationship.conscience.rung.${conscience.rung}` as never);
  const left = conscience.ultimatum
    ? conscience.ultimatum.leftMinutes === undefined
      ? conscience.ultimatum.left
      : localizedDuration(conscience.ultimatum.leftMinutes, t)
    : "";
  return (
    <div className="mt-1.5" data-conscience-ladder={name} data-rung={conscience.rung}>
      <p className="flex items-baseline gap-1.5 text-[11px] leading-4">
        <span className="text-stone-400">{t("campaign.relationship.conscience.title")}</span>
        <span key={conscience.rung} className={cn("live-in font-medium", WORD[conscience.rung])}>
          {rungLabel}
        </span>
      </p>
      <span
        role="img"
        aria-label={t("campaign.relationship.conscience.aria", { name, rung: rungLabel, step: step + 1, steps: CONSCIENCE_RUNGS.length })}
        className="conscience-track relative mt-1 grid h-1.5 grid-cols-5 overflow-hidden rounded-full bg-stone-800"
      >
        {CONSCIENCE_RUNGS.map((rung, index) => (
          <span key={rung} className={cn("h-full", index ? "border-l border-stone-950/70" : "")} />
        ))}
        <span
          className={cn("conscience-marker absolute inset-y-0 left-0 w-1/5 rounded-full", MARKER[conscience.rung])}
          style={{ transform: `translateX(${step * 100}%)` }}
        />
      </span>
      {conscience.ultimatum ? (
        <p className="reveal mt-1 text-xs leading-5 text-stone-300" data-ultimatum>
          <span className="font-medium text-rose-300">{t("campaign.relationship.conscience.ultimatum")}</span> {conscience.ultimatum.condition}
          <span className="text-stone-400">
            {" "}
            <span data-countdown>{t("campaign.relationship.conscience.deadline", { due: conscience.ultimatum.due, left })}</span>
          </span>
        </p>
      ) : null}
      {conscience.demand ? (
        <p key={`demand-${conscience.demand}`} className="reveal mt-1 text-xs leading-5 text-stone-300" data-share-demand>
          <span className="font-medium text-amber-300">{t("campaign.relationship.conscience.demand")}</span> {conscience.demand}
        </p>
      ) : null}
      {conscience.refused ? (
        <p key={`refused-${conscience.refused}`} className="reveal mt-1 text-xs leading-5 text-stone-300" data-refused>
          <span className="font-medium text-rose-300">{t("campaign.relationship.conscience.refused")}</span> {conscience.refused}
        </p>
      ) : null}
      {conscience.plan ? (
        <p className="reveal mt-1 text-xs leading-5 text-stone-300" data-conscience-plan>
          <span className="font-medium text-violet-300">{t("campaign.relationship.conscience.plan")}</span> {name} {conscience.plan}.
        </p>
      ) : null}
      {conscience.agenda ? (
        <p className="reveal mt-1 text-xs leading-5 text-stone-300" data-conscience-agenda>
          <span className="font-medium text-violet-300">{t("campaign.relationship.conscience.agenda")}</span> {name} {conscience.agenda}.
        </p>
      ) : null}
      {conscience.hidden ? (
        <p className="reveal mt-1 text-xs leading-5 text-stone-300" data-conscience-hidden>
          <span className="font-medium text-violet-300">{t("campaign.relationship.conscience.hidden")}</span>{" "}
          {conscience.hidden.noticedBy.length ? conscience.hidden.noticedBy.join(", ") : t("campaign.relationship.conscience.nobodyNoticed")}.
        </p>
      ) : null}
      {conscience.unheard ? (
        <p key={`unheard-${conscience.rung}`} className="reveal mt-1 text-xs leading-5 text-stone-300" data-conscience-unheard>
          <span className="font-medium text-amber-300">{t("campaign.relationship.conscience.unheard")}</span> {t("campaign.relationship.conscience.unheardTail", { name })}
        </p>
      ) : null}
      {conscience.noticed ? (
        <p className="reveal mt-1 text-xs leading-5 text-stone-300" data-conscience-noticed>
          <span className="font-medium text-violet-300">{t("campaign.relationship.conscience.noticed")}</span> {t("campaign.relationship.conscience.noticedTail", { name })}
        </p>
      ) : null}
    </div>
  );
}
