"use client";

import {
  Brush,
  Download,
  Eraser,
  FileUp,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Move,
  PenLine,
  RefreshCw,
  Trash2,
  Type,
  Users,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { encodeImageForUpload } from "@/lib/image-encode";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { PanelError, kitButtonClass, panelField } from "./PanelKit";
import type { OverworldTile, TileSkin } from "@/lib/overworld/logic";
import {
  MAX_BRUSH_RADIUS,
  OVERWORLD_BRUSHES,
  OVERWORLD_BRUSH_TILES,
  type OverworldBrush,
} from "@/lib/overworld/paint";
import {
  FEATURE_LIMITS,
  OVERWORLD_SIZES,
  PATH_KINDS,
  type LabelSize,
  type OverworldSize,
  type PathKind,
} from "@/lib/overworld/features";

// The region map's toolbars (docs/workshop-parity-audit.md phase 15). Each
// is a small stateless strip; OverworldPanel holds the state and decides
// what a tap on the canvas means under the mode chosen here.

type Translator = ReturnType<typeof useI18n>["t"];

const OVERWORLD_ERROR_KEYS: Record<string, string> = {
  "Describe the region first.": "campaign.overworld.errors.modelDescription",
  "A workshop has no party to place. The party is placed at the table, as it travels.": "campaign.overworld.errors.workshopParty",
  "That is not an uploaded image.": "campaign.overworld.errors.invalidImage",
  "That name is already taken here.": "campaign.overworld.errors.nameTaken",
  "That map is the wrong size to paint on.": "campaign.overworld.errors.paint.wrongSize",
  "Nothing was painted.": "campaign.overworld.errors.paint.empty",
  "That is too much to paint in one go.": "campaign.overworld.errors.paint.tooMany",
  "That is not a terrain this map knows.": "campaign.overworld.errors.paint.unknownTerrain",
  "A stroke landed nowhere.": "campaign.overworld.errors.paint.missedStroke",
  "That was already what the map looked like.": "campaign.overworld.errors.paint.unchanged",
  "That would leave nowhere on the map a settlement could stand. Leave some ground that is not sea or peak.": "campaign.overworld.errors.paint.noSettlement",
  "The map would not render.": "campaign.overworld.errors.mapRender",
};

export function localizeOverworldError(error: string | undefined, t: Translator): string {
  const key = error ? OVERWORLD_ERROR_KEYS[error] : undefined;
  return key ? t(key as never) : t("campaign.overworld.errors.generic");
}

// What the panel's own dialog asks for, by what a tap meant.
export type OverworldAsk =
  | { kind: "pin"; at: { x: number; y: number } }
  | { kind: "rename"; locationId: string }
  | { kind: "label"; at: { x: number; y: number } };

export function askCopy(
  ask: OverworldAsk | null,
  labelSize: LabelSize,
  heldName: string,
  t: Translator,
): { title: string; label: string; defaultValue: string; maxLength: number; allowEmpty: boolean; submitLabel: string } {
  if (ask?.kind === "rename") {
    return {
      title: t("campaign.overworld.rename.title"),
      label: t("campaign.overworld.rename.question"),
      defaultValue: heldName,
      maxLength: 80,
      allowEmpty: false,
      submitLabel: t("campaign.overworld.rename.button"),
    };
  }
  if (ask?.kind === "label") {
    return {
      title: t(labelSize === "large" ? "campaign.overworld.rename.region" : "campaign.overworld.rename.place"),
      label: t("campaign.overworld.rename.mapText"),
      defaultValue: "",
      maxLength: FEATURE_LIMITS.labelLength,
      allowEmpty: false,
      submitLabel: t("campaign.overworld.rename.write"),
    };
  }
  return {
    title: t("campaign.overworld.pin.label"),
    label: t("campaign.overworld.pin.optional"),
    defaultValue: "",
    maxLength: 60,
    allowEmpty: true,
    submitLabel: t("campaign.overworld.pin.place"),
  };
}

type ImportSummary = { cells: number; places: number; rivers: number; routes: number };

// Sends the GeoJSON texts to the import route and says what it read.
export async function importAzgaarFiles<Data extends { map: { width: number; height: number } }>(
  campaignId: string,
  files: string[],
  size: OverworldSize,
  t: Translator,
): Promise<{ data: Data; note: string } | { error: string }> {
  const response = await fetch(`/api/campaigns/${campaignId}/overworld/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files, ...size }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: t("campaign.overworld.errors.mapRead") };
  }
  const { summary, ...data } = payload as Data & { summary: ImportSummary };
  return {
    data: data as unknown as Data,
    note: t("campaign.overworld.import.summary", { cells: summary.cells, width: data.map.width, height: data.map.height, places: summary.places, roads: summary.routes, rivers: summary.rivers }),
  };
}

export type OverworldMode =
  | "look"
  | "pin"
  | "party"
  | "place"
  | "paint"
  | "line"
  | "label"
  | "erase";

// Every button here is the kit's small button (ui.btnSmall through PanelKit);
// a chosen mode or brush wears the gold on-state over it.
const chip = kitButtonClass("small");
const idle = "";
const active = "border-amber-500/60 bg-amber-400/10 text-amber-100";

const MODES = [
  ["pin", "campaign.overworld.mode.addPin", MapPin],
  ["party", "campaign.overworld.mode.placeParty", Users],
  ["place", "campaign.overworld.mode.movePlace", Move],
  ["paint", "campaign.overworld.mode.paintTerrain", Brush],
  ["line", "campaign.overworld.mode.drawLine", PenLine],
  ["label", "campaign.overworld.mode.writeLabel", Type],
  ["erase", "campaign.overworld.mode.erase", Eraser],
] as const;

export function ModeBar({
  mode,
  onMode,
  partyTool = true,
  partyPlaced,
  onPartyTransit,
  pinsCount,
  onClearPins,
  regenBusy,
  onRegenerate,
}: {
  mode: OverworldMode;
  onMode: (mode: OverworldMode) => void;
  // Off in a workshop, which has no party to place (issue 553).
  partyTool?: boolean;
  partyPlaced: boolean;
  onPartyTransit: () => void;
  pinsCount: number;
  onClearPins: () => void;
  regenBusy: boolean;
  onRegenerate: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-tour="region-modes">
      {MODES.filter(([value]) => partyTool || value !== "party").map(([value, labelKey, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onMode(mode === value ? "look" : value)}
          className={cn(chip, mode === value ? active : idle)}
        >
          <Icon className="size-3.5" /> {mode === value ? t("campaign.overworld.map.tapHint") : t(labelKey)}
        </button>
      ))}
      {partyPlaced ? (
        <button type="button" onClick={onPartyTransit} className={cn(chip, idle)}>
          {t("campaign.overworld.map.partyTransit")}
        </button>
      ) : null}
      {pinsCount ? (
        <button type="button" onClick={onClearPins} className={cn(chip, idle)}>
          <X className="size-3.5" /> {t("campaign.overworld.map.clearPins")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenBusy}
        title={t("campaign.overworld.map.reroll")}
        className={cn(chip, idle, "disabled:opacity-50")}
      >
        {regenBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        {t("campaign.overworld.map.regenerate")}
      </button>
    </div>
  );
}

const TERRAIN_LABEL_KEYS = {
  Water: "campaign.overworld.terrain.water",
  Plains: "campaign.overworld.terrain.plains",
  Forest: "campaign.overworld.terrain.forest",
  Hills: "campaign.overworld.terrain.hills",
  Mountains: "campaign.overworld.terrain.mountains",
  Swamp: "campaign.overworld.terrain.swamp",
  "Black water": "campaign.overworld.terrain.blackWater",
  Moors: "campaign.overworld.terrain.moors",
  Darkwood: "campaign.overworld.terrain.darkwood",
  Mire: "campaign.overworld.terrain.mire",
  "Cold sea": "campaign.overworld.terrain.coldSea",
  Fields: "campaign.overworld.terrain.fields",
  "Old growth": "campaign.overworld.terrain.oldGrowth",
  "Fog marsh": "campaign.overworld.terrain.fogMarsh",
  Canals: "campaign.overworld.terrain.canals",
  "Low blocks": "campaign.overworld.terrain.lowBlocks",
  Sprawl: "campaign.overworld.terrain.sprawl",
  Uptown: "campaign.overworld.terrain.uptown",
  Arcologies: "campaign.overworld.terrain.arcologies",
  Undercity: "campaign.overworld.terrain.undercity",
  Farmland: "campaign.overworld.terrain.farmland",
  "Foundry hills": "campaign.overworld.terrain.foundryHills",
  "Iron peaks": "campaign.overworld.terrain.ironPeaks",
  "Dead water": "campaign.overworld.terrain.deadWater",
  Wastes: "campaign.overworld.terrain.wastes",
  Ruins: "campaign.overworld.terrain.ruins",
  Dunes: "campaign.overworld.terrain.dunes",
  Crags: "campaign.overworld.terrain.crags",
  "Toxic bog": "campaign.overworld.terrain.toxicBog",
} as const;

export function TileLegend({ skin }: { skin: Record<OverworldTile, TileSkin> }) {
  const { t } = useI18n();
  return (
    <div className="stagger-pop flex flex-wrap gap-x-3 gap-y-1">
      {(Object.keys(skin) as OverworldTile[]).map((tile) => (
        <span key={tile} className="flex items-center gap-1 text-[11px] text-stone-400">
          <span className="inline-block size-3 rounded-sm border border-black/30" style={{ backgroundColor: skin[tile].fill }} />
          {t(TERRAIN_LABEL_KEYS[skin[tile].label as keyof typeof TERRAIN_LABEL_KEYS])}
        </span>
      ))}
    </div>
  );
}

export function PaintTools({
  skin,
  brush,
  onBrush,
  radius,
  onRadius,
  stranded,
  undo,
}: {
  skin: Record<OverworldTile, TileSkin>;
  brush: OverworldBrush;
  onBrush: (brush: OverworldBrush) => void;
  radius: number;
  onRadius: (radius: number) => void;
  stranded: Array<{ id: string; name: string }>;
  undo?: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void };
}) {
  const { t } = useI18n();
  return (
    <div className="panel reveal space-y-2 rounded-lg p-2.5">
      <SectionHead title={t("campaign.overworld.paint.title")} glyph="climate-temperate" level="h4" />
      <div data-pill-group="" role="group" aria-label={t("campaign.overworld.paint.brush")} className="flex flex-wrap items-center gap-1">
        {OVERWORLD_BRUSHES.map((value) => (
          <button data-on={brush === value ? "" : undefined}
            key={value}
            type="button"
            aria-pressed={brush === value}
            onClick={() => onBrush(value)}
            className={cn(chip, brush === value ? active : idle)}
          >
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: skin[OVERWORLD_BRUSH_TILES[value]].fill }}
            />
            {t(`campaign.overworld.paint.brush.${value}` as never)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400">
        {t("campaign.overworld.paint.brushSize")}
        <Slider min={0} max={MAX_BRUSH_RADIUS} value={radius} onChange={onRadius} label={t("campaign.overworld.paint.brushSize")} className="pk-w-28" />
        <span className="text-stone-500">{radius === 0 ? t("campaign.overworld.paint.oneTile") : t("campaign.overworld.paint.radiusAcross", { count: radius * 2 + 1 })}</span>
        {undo ? (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={undo.onUndo}
              disabled={!undo.canUndo}
              title={t("campaign.overworld.history.undo")}
              className={cn(chip, undo.canUndo ? idle : "border-stone-800 text-stone-700")}
            >
              {t("campaign.overworld.history.undo").replace(" (Ctrl+Z)", "")}
            </button>
            <button
              type="button"
              onClick={undo.onRedo}
              disabled={!undo.canRedo}
              title={t("campaign.overworld.history.redo")}
              className={cn(chip, undo.canRedo ? idle : "border-stone-800 text-stone-700")}
            >
              {t("campaign.overworld.history.redo").replace(" (Ctrl+Shift+Z)", "")}
            </button>
          </span>
        ) : null}
      </div>
      <p className="text-xs text-stone-500">{t("campaign.overworld.paint.dragHint")}</p>
      {stranded.length ? (
        <p role="status" className="live-in text-xs text-amber-300/90">
          {t("campaign.overworld.paint.stranded", { places: stranded.map((place) => place.name).filter(Boolean).join(", ") })}
        </p>
      ) : null}
    </div>
  );
}

// A road, river or border is drawn one tap at a time and finished on
// purpose, so a mis-tap is an undo rather than a stray line on the map.
export function LineTools({
  kind,
  onKind,
  pendingCount,
  label,
  onLabel,
  onFinish,
  onUndo,
  onCancel,
}: {
  kind: PathKind;
  onKind: (kind: PathKind) => void;
  pendingCount: number;
  label: string;
  onLabel: (label: string) => void;
  onFinish: () => void;
  onUndo: () => void;
  onCancel: () => void;
}) {
  const { t, tp } = useI18n();
  const kindLabel = t(`campaign.overworld.line.${kind}` as never);
  return (
    <div className="panel reveal space-y-2 rounded-lg p-2.5">
      <SectionHead title={t("campaign.overworld.mode.drawLine")} glyph="pace-normal" level="h4" />
      <div data-pill-group="" role="group" aria-label={t("campaign.overworld.line.kind")} className="flex flex-wrap items-center gap-1">
        {PATH_KINDS.map((value) => (
          <button data-on={kind === value ? "" : undefined}
            key={value}
            type="button"
            aria-pressed={kind === value}
            disabled={pendingCount > 0 && value !== kind}
            onClick={() => onKind(value)}
            className={cn(chip, kind === value ? active : idle, "disabled:opacity-40")}
          >
            {t(`campaign.overworld.line.${value}` as never)}
          </button>
        ))}
        <input
          value={label}
          maxLength={FEATURE_LIMITS.labelLength}
          onChange={(event) => onLabel(event.target.value)}
          placeholder={t("campaign.overworld.line.namePlaceholder", { kind: kindLabel })}
          aria-label={t("campaign.overworld.line.namePlaceholder", { kind: kindLabel })}
          className={cn(panelField, "w-auto min-w-32 flex-1")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
        <span>
          {pendingCount === 0
            ? t("campaign.overworld.line.hint")
            : tp("campaign.overworld.line.pendingPoints", pendingCount)}
        </span>
        <button
          type="button"
          disabled={pendingCount < 2}
          onClick={onFinish}
          className={kitButtonClass("primary", "disabled:opacity-40")}
        >
          {t("campaign.overworld.line.finish", { kind: kindLabel })}
        </button>
        <button type="button" disabled={pendingCount === 0} onClick={onUndo} className={cn(chip, idle, "disabled:opacity-40")}>
          {t("campaign.overworld.line.undoPoint")}
        </button>
        <button type="button" disabled={pendingCount === 0} onClick={onCancel} className={cn(chip, idle, "disabled:opacity-40")}>
          {t("campaign.overworld.line.cancel")}
        </button>
      </div>
    </div>
  );
}

export function LabelTools({ size, onSize }: { size: LabelSize; onSize: (size: LabelSize) => void }) {
  const { t } = useI18n();
  return (
    <div data-pill-group="" className="panel reveal flex flex-wrap items-center gap-1.5 rounded-lg p-2.5 text-xs text-stone-500">
      <span>{t("campaign.overworld.label.hint")}</span>
      <button data-on={size === "small" ? "" : undefined} type="button" aria-pressed={size === "small"} onClick={() => onSize("small")} className={cn(chip, size === "small" ? active : idle)}>
        {t("campaign.overworld.label.place")}
      </button>
      <button data-on={size === "large" ? "" : undefined} type="button" aria-pressed={size === "large"} onClick={() => onSize("large")} className={cn(chip, size === "large" ? active : idle)}>
        {t("campaign.overworld.label.region")}
      </button>
    </div>
  );
}

// The map as a file, either way: a picture in place of the tiles, a map
// drawn in Fantasy Map Generator read into the grid, or the map saved out as
// a PNG to print or hand round.
export function FileTools({
  backdropPath,
  onBackdrop,
  onExport,
  exporting,
  onImport,
  importing,
  importNote,
  mapSize,
}: {
  backdropPath: string;
  onBackdrop: (path: string) => void;
  onExport: () => void;
  exporting: boolean;
  onImport: (files: string[], size: OverworldSize) => void;
  importing: boolean;
  importNote: string;
  mapSize: OverworldSize;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const geoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sizeId, setSizeId] = useState("current");
  const { t } = useI18n();

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const { dataUrl, type } = await encodeImageForUpload(file);
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, name: file.name, type }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(t("campaign.overworld.errors.imageUpload"));
        return;
      }
      onBackdrop(payload.url);
    } catch {
      setError(t("campaign.overworld.errors.imageUpload"));
    } finally {
      setUploading(false);
    }
  }

  async function pickGeo(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    setError("");
    const texts = await Promise.all([...files].map((file) => file.text()));
    const preset = OVERWORLD_SIZES.find((entry) => entry.id === sizeId);
    onImport(texts, preset ? { width: preset.width, height: preset.height } : mapSize);
  }

  return (
    <div className="panel space-y-2 rounded-lg p-2.5">
      <SectionHead title={t("campaign.overworld.file.title")} glyph="tab-handout" level="h4" />
      <input
        ref={imageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void upload(file);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={geoRef}
        type="file"
        multiple
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        onChange={(event) => {
          void pickGeo(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-1.5" data-tour="region-files">
        <button
          type="button"
          disabled={uploading}
          onClick={() => imageRef.current?.click()}
          className={cn(chip, idle, "disabled:opacity-50")}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
          {backdropPath ? t("campaign.overworld.file.replace") : t("campaign.overworld.file.usePicture")}
        </button>
        {backdropPath ? (
          <button type="button" onClick={() => onBackdrop("")} className={cn(chip, idle)}>
            <Trash2 className="size-3.5" /> {t("campaign.overworld.file.backToTiles")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={exporting}
          onClick={onExport}
          className={cn(chip, idle, "disabled:opacity-50")}
        >
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {t("campaign.overworld.file.savePng")}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={importing}
          onClick={() => geoRef.current?.click()}
          className={cn(chip, idle, "disabled:opacity-50")}
        >
          {importing ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
          {t("campaign.overworld.file.importAzgaar")}
        </button>
        <Select
          size="sm"
          value={sizeId}
          onChange={setSizeId}
          label={t("campaign.overworld.file.gridSize")}
          options={[
            { value: "current", label: t("campaign.overworld.file.currentSize", { width: mapSize.width, height: mapSize.height }) },
            ...OVERWORLD_SIZES.map((entry) => ({ value: entry.id as string, label: `${t(`campaign.overworld.size.${entry.id}` as never)} (${entry.width} × ${entry.height})` })),
          ]}
          className="min-w-0 max-w-full"
        />
        <span className="text-[11px] leading-4 text-stone-500">
          {t("campaign.overworld.file.description")}
        </span>
      </div>
      {importNote ? <p role="status" className="live-in text-xs text-emerald-300/90">{importNote}</p> : null}
      {error ? <PanelError>{error}</PanelError> : null}
    </div>
  );
}
