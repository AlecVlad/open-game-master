"use client";

import { useId, useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";
import { LengthNote } from "@/components/ui/LengthNote";
import { cn } from "@/lib/cn";
import { panelField } from "@/app/campaigns/[campaignId]/PanelKit";
import {
  STYLE_NOTES_MAX,
  type CombatPace,
  type NarrationLength,
} from "@/lib/dm/narration-style-logic";
import type { GameSettings } from "@/lib/schemas/game-settings";

// The table's say over how the AI DM writes (issue #383): how long its
// narration runs, and the lead's own notes on voice and pacing. Fits the
// prose to the model and the table without touching the DM's instructions
// (src/lib/dm/narration-style-logic.ts).
export function NarrationStyleRows({
  settings,
  patch,
}: {
  settings: GameSettings;
  patch: (update: Partial<GameSettings>) => void;
}) {
  const t = useT();
  const narrationLabels: Record<NarrationLength, string> = {
    short: t("campaign.narrationStyle.length.short"),
    standard: t("campaign.narrationStyle.length.standard"),
    rich: t("campaign.narrationStyle.length.rich"),
  };
  const narrationHints: Record<NarrationLength, string> = {
    short: t("campaign.narrationStyle.length.hint.short"),
    standard: t("campaign.narrationStyle.length.hint.standard"),
    rich: t("campaign.narrationStyle.length.hint.rich"),
  };
  const combatLabels: Record<CombatPace, string> = {
    rare: t("campaign.narrationStyle.pace.rare"),
    balanced: t("campaign.narrationStyle.pace.balanced"),
    frequent: t("campaign.narrationStyle.pace.frequent"),
  };
  const combatHints: Record<CombatPace, string> = {
    rare: t("campaign.narrationStyle.pace.hint.rare"),
    balanced: t("campaign.narrationStyle.pace.hint.balanced"),
    frequent: t("campaign.narrationStyle.pace.hint.frequent"),
  };
  const notesId = useId();
  const [notes, setNotes] = useState(settings.styleNotes);
  // Another seat's save, or this one's coming back trimmed: the box follows
  // the server's copy whenever that copy changes.
  const [served, setServed] = useState(settings.styleNotes);
  if (served !== settings.styleNotes) {
    setServed(settings.styleNotes);
    setNotes(settings.styleNotes);
  }
  const over = notes.length > STYLE_NOTES_MAX;

  return (
    <>
      <div data-settings-row="narration-length" className="reveal flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.narrationStyle.length")}</span>
        <Tooltip content={t("campaign.narrationStyle.length.description")}>
          <span className="inline-flex min-w-0 max-w-full">
            <Select<NarrationLength>
              size="sm"
              label={t("campaign.narrationStyle.length.label")}
              value={settings.narrationLength}
              onChange={(narrationLength) => patch({ narrationLength })}
              options={(Object.keys(NARRATION_LENGTH_LABELS) as NarrationLength[]).map((length) => ({
                value: length,
                label: narrationLabels[length],
              }))}
              className="min-w-0 max-w-full"
            />
          </span>
        </Tooltip>
        <span key={settings.narrationLength} className="live-in text-stone-500">
          {narrationHints[settings.narrationLength]}
        </span>
      </div>
      <div data-settings-row="combat-pace" className="reveal flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.narrationStyle.pace")}</span>
        <Tooltip content={t("campaign.narrationStyle.pace.description")}>
          <span className="inline-flex min-w-0 max-w-full">
            <Select<CombatPace>
              size="sm"
              label={t("campaign.narrationStyle.pace.label")}
              value={settings.combatPace ?? "balanced"}
              onChange={(combatPace) => patch({ combatPace })}
              options={(Object.keys(COMBAT_PACE_LABELS) as CombatPace[]).map((pace) => ({
                value: pace,
                label: combatLabels[pace],
              }))}
              className="min-w-0 max-w-full"
            />
          </span>
        </Tooltip>
        <span key={settings.combatPace ?? "balanced"} className="live-in text-stone-500">
          {combatHints[settings.combatPace ?? "balanced"]}
        </span>
      </div>
      <div data-settings-row="style-notes" className="reveal space-y-1">
        <label htmlFor={notesId} className="pk-rowlabel block">
          {t("campaign.narrationStyle.notes")}
        </label>
        <textarea
          id={notesId}
          value={notes}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
          // Saved when you leave the box, not on every key.
          onBlur={() => {
            const next = notes.trim();
            if (!over && next !== settings.styleNotes) {
              patch({ styleNotes: next });
            }
          }}
          placeholder={t("campaign.narrationStyle.notes.placeholder")}
          aria-describedby={`${notesId}-length`}
          className={cn(panelField, "w-full resize-y")}
        />
        <LengthNote
          id={`${notesId}-length`}
          length={notes.length}
          max={STYLE_NOTES_MAX}
          idle={t("campaign.narrationStyle.notes.idle")}
        />
      </div>
    </>
  );
}
