"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { Select, type SelectOption } from "@/components/ui/Select";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Field, addChip, chipOn } from "@/app/workshop/kit";
import { TerrainCanvas } from "@/app/campaigns/[campaignId]/TerrainCanvas";
import type { MapOption } from "@/app/workshop/encounters/types";
import { previewGround } from "@/lib/battlemap/ground-change";
import type { FightAction } from "@/lib/dm/fight-event-logic";
import {
  fitGroundTiles,
  GROUND_KINDS,
  GROUND_LIMITS,
  insideBorder,
  type GroundKind,
} from "@/lib/dm/fight-ground-logic";
import { useI18n } from "@/lib/i18n/provider";

// "The ground changes" in a prepared fight's Events (issue 685; what it does
// at the table: src/lib/dm/fight-ground.ts). The squares are picked on the
// fight's own prepared map, drawn with the canvas the placements use, and
// the map shows them as they will be. The kind of ground is the painter's own
// palette, picked, never typed. A keyboard reaches every square through the
// column and row steppers, since the canvas answers only a pointer.

type GroundAction = Extract<FightAction, { kind: "ground" }>;

// A prepared map the editor can draw: one the drawer handed back whole.
export type GroundMap = MapOption & { terrain: string; width: number; height: number };

export function groundMapOf(map: MapOption | null): GroundMap | null {
  return map?.terrain && map.width && map.height ? (map as GroundMap) : null;
}

export function GroundEditor({
  action,
  name,
  map,
  onChange,
}: {
  action: GroundAction;
  name: string;
  map: GroundMap;
  onChange: (next: FightAction) => void;
}) {
  const { t } = useI18n();
  const board = { width: map.width, height: map.height };
  const kindOptions: SelectOption<GroundKind>[] = GROUND_KINDS.map((kind) => ({
    value: kind,
    label: t(`campaign.session.encounterEvents.ground.kind.${kind}` as never),
    hint: t(`campaign.session.encounterEvents.ground.effect.${kind}` as never),
  }));
  // The square the keyboard row points at, and whether it has been moved
  // since the last tap, so the map marks it only for someone steering by
  // keys.
  const [cursor, setCursor] = useState({ x: 1, y: 1 });
  const [aiming, setAiming] = useState(false);
  const picked = new Set(action.tiles.map((tile) => `${tile.x},${tile.y}`));
  const full = action.tiles.length >= GROUND_LIMITS.tiles;
  const toggle = (x: number, y: number) => {
    // The map's edge is the painter's to keep, as for a GM's brush.
    if (!insideBorder(x, y, board)) {
      return;
    }
    const on = picked.has(`${x},${y}`);
    if (!on && full) {
      return;
    }
    const tiles = on ? action.tiles.filter((tile) => tile.x !== x || tile.y !== y) : [...action.tiles, { x, y }];
    onChange({ ...action, tiles: fitGroundTiles(tiles, board) });
  };
  const here = picked.has(`${cursor.x},${cursor.y}`);
  const labels = [...(map.labels ?? []), ...(aiming ? [{ x: cursor.x, y: cursor.y, text: t("campaign.session.encounterEvents.ground.here"), dmOnly: true }] : [])];
  const aim = (next: { x: number; y: number }) => {
    setCursor(next);
    setAiming(true);
  };
  return (
    <div className="space-y-1.5">
      <Field label={t("campaign.session.encounterEvents.ground.becomes")} className="min-w-48">
        <Select<GroundKind>
          label={t("campaign.session.encounterEvents.ground.becomesForAction", { action: name })}
          value={action.terrain}
          options={kindOptions}
          onChange={(terrain) => onChange({ ...action, terrain })}
        />
      </Field>
      <TerrainCanvas
        terrain={previewGround(map.terrain, map.width, map.height, action.tiles, action.terrain)}
        width={map.width}
        height={map.height}
        labels={labels}
        props={map.props}
        tool={{ kind: "select" }}
        selected={action.tiles.map((tile) => ({ x0: tile.x, y0: tile.y, x1: tile.x, y1: tile.y }))}
        zoomable
        guard
        onSelect={(x, y) => {
          setAiming(false);
          toggle(x, y);
        }}
      />
      <p className="text-[11px] text-stone-500" aria-live="polite">
        {action.tiles.length
          ? t("campaign.session.encounterEvents.ground.selected", { count: action.tiles.length, limit: GROUND_LIMITS.tiles })
          : t("campaign.session.encounterEvents.ground.empty")}{" "}
        {t("campaign.session.encounterEvents.ground.border")}
      </p>
      <div role="group" aria-label={t("campaign.session.encounterEvents.ground.squarePicker", { action: name })} className="flex flex-wrap items-end gap-1.5">
        <Field label={t("campaign.session.encounterEvents.ground.column")}>
          <NumberStepper
            label={t("campaign.session.encounterEvents.ground.columnForAction", { action: name })}
            value={cursor.x}
            min={1}
            max={Math.max(1, map.width - 2)}
            onChange={(x) => aim({ ...cursor, x })}
          />
        </Field>
        <Field label={t("campaign.session.encounterEvents.ground.row")}>
          <NumberStepper
            label={t("campaign.session.encounterEvents.ground.rowForAction", { action: name })}
            value={cursor.y}
            min={1}
            max={Math.max(1, map.height - 2)}
            onChange={(y) => aim({ ...cursor, y })}
          />
        </Field>
        <button
          type="button"
          aria-pressed={here}
          disabled={!here && full}
          onClick={() => {
            setAiming(true);
            toggle(cursor.x, cursor.y);
          }}
          className={cn(ui.btnSmall, addChip, here && chipOn)}
        >
          {t("campaign.session.encounterEvents.ground.changeSquare")}
        </button>
      </div>
      <p className="text-[11px] text-stone-400">
        {t("campaign.session.encounterEvents.ground.tableNote", {
          line: t(`campaign.session.encounterEvents.ground.line.${action.terrain}` as never),
          announcement: t("campaign.session.encounterEvents.action.say"),
        })}
      </p>
    </div>
  );
}
