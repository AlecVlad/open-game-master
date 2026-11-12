"use client";

import { Box, Hand, MapPin, Pencil, Ruler } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";
import { Slider } from "@/components/ui/Slider";
import { ADHOC_NAME_MAX } from "@/lib/dm/board-logic";
import { TEMPLATE_SHAPES } from "@/lib/battlemap/template";
import type { TemplateShape } from "@/lib/battlemap/template";
import type { AdhocTokenKind } from "@/lib/battlemap/types";

// The DM's rail above the tactical board, and the small card that opens on a
// token. Presentational only: BattleMapPanel owns the state and does the
// talking, so the two can be read separately.

export type BoardTool = "handle" | "place" | "measure" | "point" | "draw";

const TOOL_LABEL_KEYS: Record<BoardTool, string> = {
  handle: "campaign.session.battle.dmTool.move",
  place: "campaign.session.battle.dmTool.place",
  measure: "campaign.session.battle.dmTool.measure",
  point: "campaign.session.battle.dmTool.point",
  draw: "campaign.session.battle.dmTool.draw",
};
const ADHOC_LABEL_KEYS: Record<AdhocTokenKind, string> = {
  npc: "campaign.session.battle.dmToken.person",
  prop: "campaign.session.battle.dmToken.object",
};
const ADHOC_HINT_KEYS: Record<AdhocTokenKind, string> = {
  npc: "campaign.session.battle.dmToken.personHint",
  prop: "campaign.session.battle.dmToken.objectHint",
};
const ADHOC_PLACEHOLDER_KEYS: Record<AdhocTokenKind, string> = {
  npc: "campaign.session.battle.dmToken.personPlaceholder",
  prop: "campaign.session.battle.dmToken.objectPlaceholder",
};
const SHAPE_LABEL_KEYS: Record<TemplateShape, string> = {
  sphere: "campaign.session.battle.dmTemplate.sphere",
  cone: "campaign.session.battle.dmTemplate.cone",
  line: "campaign.session.battle.dmTemplate.line",
  cube: "campaign.session.battle.dmTemplate.cube",
};
const SHAPE_MEASURE_KEYS: Record<TemplateShape, string> = {
  sphere: "campaign.session.battle.dmTemplate.radius",
  cone: "campaign.session.battle.dmTemplate.length",
  line: "campaign.session.battle.dmTemplate.length",
  cube: "campaign.session.battle.dmTemplate.side",
};

const TOOL_ICONS: Record<BoardTool, typeof Hand> = {
  handle: Hand,
  place: Box,
  measure: Ruler,
  point: MapPin,
  draw: Pencil,
};

export function BoardToolRail({
  tool,
  onTool,
  disabled,
}: {
  tool: BoardTool;
  onTool: (tool: BoardTool) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  return (
    // board-tools: in a fixed window the row keeps to one line and scrolls
    // sideways, so it never takes the board's height (world.css, issue 87).
    <div data-pill-group="" className="board-tools flex flex-wrap gap-1">
      {(Object.keys(TOOL_LABEL_KEYS) as BoardTool[]).map((option) => {
        const Icon = TOOL_ICONS[option];
        return (
          <button data-on={tool === option ? "" : undefined}
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onTool(option)}
            title={t(TOOL_LABEL_KEYS[option] as never)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs disabled:opacity-40",
              tool === option
                ? "border-amber-700 bg-amber-950/50 text-amber-100"
                : "border-stone-700 text-stone-400 hover:text-stone-200",
            )}
          >
            <Icon className="size-3.5" />
            {t(TOOL_LABEL_KEYS[option] as never)}
          </button>
        );
      })}
    </div>
  );
}

export function PlaceTokenForm({
  kind,
  name,
  onKind,
  onName,
}: {
  kind: AdhocTokenKind;
  name: string;
  onKind: (kind: AdhocTokenKind) => void;
  onName: (name: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5 rounded-lg border border-stone-800 bg-stone-950/60 px-2.5 py-2">
      <div data-pill-group="" className="flex gap-1">
        {(Object.keys(ADHOC_LABEL_KEYS) as AdhocTokenKind[]).map((option) => (
          <button data-on={kind === option ? "" : undefined}
            key={option}
            type="button"
            onClick={() => onKind(option)}
            title={t(ADHOC_HINT_KEYS[option] as never)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs",
              kind === option
                ? "border-amber-700 bg-amber-950/50 text-amber-100"
                : "border-stone-700 text-stone-400 hover:text-stone-200",
            )}
          >
            {t(ADHOC_LABEL_KEYS[option] as never)}
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(event) => onName(event.target.value)}
        maxLength={ADHOC_NAME_MAX}
        placeholder={t(ADHOC_PLACEHOLDER_KEYS[kind] as never)}
        className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-200 placeholder:text-stone-600"
      />
      <p className="text-[11px] text-stone-500">
        {name.trim()
          ? t("campaign.session.battle.dmToken.tapTile")
          : t("campaign.session.battle.dmToken.nameFirst")}
      </p>
    </div>
  );
}

export type CaughtToken = { name: string; characterId?: string; enemyId?: string };

export function MeasureControls({
  shape,
  sizeFeet,
  caught,
  onShape,
  onSize,
  onClear,
}: {
  shape: TemplateShape;
  sizeFeet: number;
  caught: CaughtToken[];
  onShape: (shape: TemplateShape) => void;
  onSize: (feet: number) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const enemyIds = caught.map((entry) => entry.enemyId).filter(Boolean).join(", ");
  return (
    <div className="space-y-1.5 rounded-lg border border-stone-800 bg-stone-950/60 px-2.5 py-2">
      <div data-pill-group="" className="flex flex-wrap gap-1">
        {TEMPLATE_SHAPES.map((option) => (
          <button data-on={shape === option ? "" : undefined}
            key={option}
            type="button"
            onClick={() => onShape(option)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs",
              shape === option
                ? "border-amber-700 bg-amber-950/50 text-amber-100"
                : "border-stone-700 text-stone-400 hover:text-stone-200",
            )}
          >
            {t(SHAPE_LABEL_KEYS[option] as never)}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-[11px] text-stone-400">
        <span className="w-16 capitalize">{t(SHAPE_MEASURE_KEYS[shape] as never)}</span>
        <Slider
          min={5}
          max={60}
          step={5}
          value={sizeFeet}
          onChange={onSize}
          label={t("campaign.session.battle.dmTemplate.sliderLabel", { measure: t(SHAPE_MEASURE_KEYS[shape] as never) })}
          bubble={(feet) => `${feet} ft`}
          className="min-w-0 flex-1"
        />
        <span className="w-12 text-right tabular-nums text-stone-300">{sizeFeet} ft</span>
      </label>
      <p className="text-[11px] leading-4 text-stone-500">
        {t("campaign.session.battle.dmTemplate.tapStart")}
      </p>
      {caught.length ? (
        <p className="text-[11px] leading-4 text-amber-300">
          {t("campaign.session.battle.dmTemplate.caught", { names: caught.map((entry) => entry.name).join(", ") })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-400 hover:text-stone-200"
        >
          {t("campaign.session.battle.dmTemplate.clear")}
        </button>
        {/* The console's Area of effect takes enemy ids as comma-separated
            text, so measuring and resolving are two steps rather than one
            long form filled in by eye. */}
        {enemyIds ? (
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(enemyIds)}
            title={enemyIds}
            className="rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-400 hover:text-stone-200"
          >
            {t("campaign.session.battle.dmTemplate.copyEnemyIds")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
