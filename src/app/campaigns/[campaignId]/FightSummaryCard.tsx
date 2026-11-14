"use client";

import { Swords, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";
import { KitButton } from "@/app/campaigns/[campaignId]/PanelKit";
import type { EncounterSummary } from "@/lib/dm/encounter-summary";

// After the fight (docs/vtt-parity-implementation-plan.md 4.2): small gold
// stat tiles, display numerals over eyebrow labels, fading up one after
// another. Dismissed by hand; the next fight replaces it.

function Tile({ label, value, index }: { label: string; value: number | string; index: number }) {
  return (
    <div
      className="animate-fade-up rounded-md border border-amber-900/50 bg-stone-950/70 px-2 py-1.5 text-center"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <p className="font-display text-lg text-amber-100">{value}</p>
      <p className="eyebrow text-[9px] text-stone-500">{label}</p>
    </div>
  );
}

export function FightSummaryCard({ summary, onDismiss, className }: { summary: EncounterSummary; onDismiss: () => void; className?: string }) {
  const { t } = useI18n();
  // The fight's length is game time, six seconds a round; the real minutes
  // it took read as time at the table, below (issue 668).
  const tableMinutes = summary.seconds > 0 ? Math.max(1, Math.round(summary.seconds / 60)) : 0;
  const totalGameSeconds = Math.max(1, Math.round(summary.rounds)) * 6;
  const gameMinutes = Math.floor(totalGameSeconds / 60);
  const gameSeconds = totalGameSeconds % 60;
  const gameTime = !gameMinutes
    ? t("campaign.session.fightSummary.gameTime.seconds", { count: gameSeconds })
    : gameSeconds
      ? t("campaign.session.fightSummary.gameTime.minutesSeconds", { minutes: gameMinutes, seconds: gameSeconds })
      : t("campaign.session.fightSummary.gameTime.minutes", { count: gameMinutes });
  const top = [...summary.fighters].sort((a, b) => b.dealt - a.dealt)[0];
  const tiles: Array<[string, number | string]> = [
    [t("campaign.session.fightSummary.tile.rounds"), summary.rounds],
    [t("campaign.session.fightSummary.tile.gameTime"), gameTime],
    [t("campaign.session.fightSummary.tile.dealt"), summary.totals.dealt],
    [t("campaign.session.fightSummary.tile.taken"), summary.totals.taken],
    [t("campaign.session.fightSummary.tile.healed"), summary.totals.healed],
    [t("campaign.session.fightSummary.tile.slain"), summary.kills],
    // Foes left lying knocked out, beaten but alive (issue #667); shown only
    // when there are some, so a fight with none keeps its eight tiles.
    ...(summary.spared ? ([[t("campaign.session.fightSummary.tile.spared"), summary.spared]] as Array<[string, number]>) : []),
    [t("campaign.session.fightSummary.tile.nat20s"), summary.totals.nat20s],
    [t("campaign.session.fightSummary.tile.nat1s"), summary.totals.nat1s],
  ];
  return (
    <section className={cn("texture-noise rounded-xl border border-amber-800/50 bg-stone-950/85 p-3 shadow-elev-1", className)} aria-label={t("campaign.session.fightSummary.aria")}>
      <div className="mb-2 flex items-center gap-2">
        <Swords className="size-4 text-amber-500" />
        <p className="eyebrow text-[10px] text-amber-300/80">{t("campaign.session.fightSummary.title")}</p>
        <span className="text-xs capitalize text-stone-400">{summary.outcome.replace(/_/g, " ")}</span>
        {/* The kit's own icon button: a finger-sized target with the focus
            ring every control has; the bare 22px one was neither. */}
        <KitButton tone="icon" always onClick={onDismiss} aria-label={t("campaign.session.fightSummary.dismiss")} className="-my-2 -mr-2 ml-auto">
          <X className="size-4" aria-hidden="true" />
        </KitButton>
      </div>
      <div className="stagger-up grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {tiles.map(([label, value], index) => (
          <Tile key={label} label={label} value={value} index={index} />
        ))}
      </div>
      {top && top.dealt > 0 ? (
        <p className="reveal mt-2 text-[11px] text-stone-400">
          {t("campaign.session.fightSummary.topDamage", { name: top.name, damage: top.dealt })}
          {summary.fighters.length > 1 ? t("campaign.session.fightSummary.breakdown", { details: summary.fighters.map((line) => `${line.name} ${line.dealt}/${line.taken}`).join(", ") }) : ""}.
        </p>
      ) : null}
      {tableMinutes ? <p className="mt-1 text-[11px] text-stone-500">{t("campaign.session.fightSummary.tableTime", { count: tableMinutes })}.</p> : null}
    </section>
  );
}
