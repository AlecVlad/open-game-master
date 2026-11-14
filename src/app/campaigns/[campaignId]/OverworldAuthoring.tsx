"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import {
  DEFAULT_OVERWORLD_PARAMS,
  OVERWORLD_PARAM_LABELS,
  type OverworldParams,
} from "@/lib/overworld/logic";
import { OVERWORLD_SIZES, type OverworldSize } from "@/lib/overworld/features";
import type { OverworldData } from "@/app/campaigns/[campaignId]/overworldDraw";
import { offersStoryModel, useCapabilities } from "@/lib/use-capabilities";
import { DictateField } from "@/components/DictateField";
import { appendDictation } from "@/lib/dictation";
import { localizeOverworldError } from "@/app/campaigns/[campaignId]/OverworldTools";

// Authoring the region: describe it, roll seeds against it, name what you
// see, and write down what only you know.
//
// The order matters and is deliberate. Terrain is seeded value noise, so a
// description cannot become tiles; it becomes the five dials below, and then
// the DM rerolls seeds until the coastline falls somewhere they like. That
// is why "Roll another" sits next to the description rather than under it.
//
// The description box is the one step that needs a text model. Without one
// the dials, the reroll, the places and the notes all remain; only the
// reading of prose into dials is gone.

type Plan = {
  params: OverworldParams;
  places: Array<{ name: string; blurb: string }>;
  note: string;
};

export function OverworldAuthoring({
  campaignId,
  data,
  onData,
}: {
  campaignId: string;
  data: OverworldData;
  onData: (next: OverworldData) => void;
}) {
  const { t, tp } = useI18n();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [params, setParams] = useState<OverworldParams>(
    (data.map.params as OverworldParams) ?? DEFAULT_OVERWORLD_PARAMS,
  );
  const [notes, setNotes] = useState(data.map.notes ?? "");
  // The size the next roll is made at. Resizing IS a reroll: the noise
  // field has no edges to extend, so the ground is rolled again and the
  // places keep their spots where the new ground allows.
  const [size, setSize] = useState<OverworldSize>({ width: data.map.width, height: data.map.height });
  const sizeId =
    OVERWORLD_SIZES.find((entry) => entry.width === size.width && entry.height === size.height)?.id ??
    "custom";
  const [placeName, setPlaceName] = useState("");
  const [placeBlurb, setPlaceBlurb] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canDescribe = offersStoryModel(useCapabilities());

  // Returns whether the change landed, so the add-a-place form below can
  // clear itself only on success. Existing callers ignore the result.
  async function patch(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/overworld`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(localizeOverworldError((payload as { error?: string }).error, t));
        return false;
      }
      onData(payload as OverworldData);
      return true;
    } finally {
      setBusy(false);
    }
  }

  // Manual place creation. The server has taken patch.places since the AI
  // describe flow shipped; only the UI never offered it outside that flow,
  // which left a DM unable to name a place without asking the model. A place
  // added here lands as a ghost marker and is anchored like any other.
  async function addPlace() {
    const name = placeName.trim();
    if (!name) {
      return;
    }
    if (await patch({ places: [{ name, blurb: placeBlurb.trim() }] })) {
      setPlaceName("");
      setPlaceBlurb("");
    }
  }

  async function describe() {
    setBusy(true);
    setError("");
    setPlan(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/overworld/describe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(localizeOverworldError((payload as { error?: string }).error, t));
        return;
      }
      const described = (payload as { plan: Plan }).plan;
      setPlan(described);
      setParams(described.params);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-stone-800 bg-stone-950/40 px-2.5 py-2"
      data-tour="region-shape"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-1.5 text-left text-xs font-medium uppercase tracking-wide text-stone-500 hover:text-stone-300"
      >
        <Wand2 className="size-3.5" />
        {t("campaign.overworld.authoring.title")}
      </button>

      {open ? (
        <div className="reveal mt-2 space-y-2">
          {canDescribe ? (
            <>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder={t("campaign.overworld.authoring.descriptionPlaceholder")}
                className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-sm text-stone-200"
              />
              <button
                type="button"
                disabled={busy || description.trim().length < 3}
                onClick={() => void describe()}
                className="flex items-center gap-1 rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-900 disabled:opacity-40"
              >
                {busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                {t("campaign.overworld.authoring.readDials")}
              </button>
              {plan ? (
                <p className="reveal text-[11px] text-stone-500">
                  {plan.note || t("campaign.overworld.authoring.dialsSet")} {t("campaign.overworld.authoring.rerollHint")}
                </p>
              ) : null}
            </>
          ) : null}

          {(Object.keys(OVERWORLD_PARAM_LABELS) as Array<keyof OverworldParams>).map((key) => (
            <label key={key} className="flex items-center gap-2 text-[11px] text-stone-500">
              <span className="w-20 shrink-0">{t(`campaign.overworld.param.${key}` as never)}</span>
              <Slider
                min={0}
                max={100}
                value={Math.round(params[key] * 100)}
                onChange={(next) => setParams({ ...params, [key]: next / 100 })}
                label={t(`campaign.overworld.param.${key}` as never)}
                bubble={(percent) => `${percent}%`}
                className="min-w-0 flex-1"
              />
            </label>
          ))}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={busy} aria-busy={busy}
              onClick={() => void patch({ regenerate: true, params, ...size })}
              title={t("campaign.overworld.authoring.rerollTitle")}
              className="rounded-md border border-amber-700 bg-amber-950/50 px-2 py-1 text-xs text-amber-100 disabled:opacity-40"
            >
              {t("campaign.overworld.authoring.rerollButton")}
            </button>
            <Select
              value={sizeId as string}
              label={t("campaign.overworld.authoring.sizeLabel")}
              size="sm"
              onChange={(next) => {
                const preset = OVERWORLD_SIZES.find((entry) => entry.id === next);
                if (preset) {
                  setSize({ width: preset.width, height: preset.height });
                }
              }}
              options={[
                ...(sizeId === "custom" ? [{ value: "custom", label: `${size.width} × ${size.height}` }] : []),
                ...OVERWORLD_SIZES.map((entry) => ({
                  value: entry.id as string,
                  label: `${t(`campaign.overworld.size.${entry.id}` as never)} (${entry.width} × ${entry.height})`,
                })),
              ]}
            />
            {plan?.places.length ? (
              <button
                type="button"
                disabled={busy} aria-busy={busy}
                onClick={() => void patch({ places: plan.places })}
                className={cn(
                  "rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-300",
                  "hover:bg-stone-900 disabled:opacity-40",
                )}
              >
                {tp("campaign.overworld.authoring.addPlaceCount", plan.places.length)}
              </button>
            ) : null}
          </div>
          {plan?.places.length ? (
            <ul className="reveal space-y-0.5 text-[11px] text-stone-500">
              {plan.places.map((place) => (
                <li key={place.name}>
                  <span className="text-stone-300">{place.name}</span>
                  {place.blurb ? ` ${place.blurb}` : ""}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-stone-500">{t("campaign.overworld.authoring.addPlace")}</span>
            <input
              value={placeName}
              maxLength={80}
              onChange={(event) => setPlaceName(event.target.value)}
              placeholder={t("campaign.overworld.authoring.placeNamePlaceholder")}
              className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-sm text-stone-200"
            />
            <DictateField single label={t("campaign.overworld.authoring.placeBlurbLabel")} onTranscript={(text) => setPlaceBlurb((current) => appendDictation(current, text, 300))}>
              <input
                value={placeBlurb}
                maxLength={300}
                onChange={(event) => setPlaceBlurb(event.target.value)}
                placeholder={t("campaign.overworld.authoring.placeBlurbPlaceholder")}
                className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-sm text-stone-200"
              />
            </DictateField>
            <button
              type="button"
              disabled={busy || !placeName.trim()}
              onClick={() => void addPlace()}
              className="rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-900 disabled:opacity-40"
            >
              {t("campaign.overworld.authoring.putOnMap")}
            </button>
          </div>

          <div>
            <label htmlFor="region-notes" className="text-[11px] uppercase tracking-wide text-stone-500">
              {t("campaign.overworld.authoring.regionNotes")}
            </label>
            {/* Typed notes save when the field lets go of focus; spoken ones
                save as they land, since no blur follows them. */}
            <DictateField
              label={t("campaign.overworld.authoring.regionNotes")}
              className="mt-0.5"
              onTranscript={(text) => {
                const next = appendDictation(notes, text);
                setNotes(next);
                void patch({ notes: next });
              }}
            >
              <textarea
                id="region-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={() => {
                  if (notes !== (data.map.notes ?? "")) {
                    void patch({ notes });
                  }
                }}
                rows={2}
                placeholder={t("campaign.overworld.authoring.regionNotesPlaceholder")}
                className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-sm text-stone-200"
              />
            </DictateField>
            <span className="text-[10px] text-stone-600">{t("campaign.overworld.authoring.privateNote")}</span>
          </div>

          {error ? <p className="motion-shake text-[11px] text-red-400">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
