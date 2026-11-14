"use client";

import { Check, ImageIcon, Loader2, Minus, Wand2, X } from "lucide-react";
import { useState } from "react";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// The agent program's picture test, painted the way the tables paint
// (src/lib/harness/picture-test.ts): the tables' own picture door and queue,
// a landscape location map, the saved file, then the campaigns themselves.
// A pass offers the one step that makes it paint for them: on, the default,
// and the campaigns stranded on a backend that cannot paint moved onto it.

type Stage = { id: string; ok: boolean | null; detail?: string };
type CampaignRow = { id: string; title: string; kind: string; backend: string; picturesOn: boolean; canPaint: boolean };
type Result = { image?: { url: string }; stages?: Stage[]; campaigns?: CampaignRow[]; wouldMove?: number; error?: string };
type Moved = { id: string; title: string; from: string; mapsTurnedOn: boolean };

const STAGE_LABELS: Record<string, MessageKey> = {
  painted: "admin.harness.picture.stage.painted",
  saved: "admin.harness.picture.stage.saved",
  shape: "admin.harness.picture.stage.shape",
};
const STAGE_ORDER = ["painted", "saved", "shape"];

const BACKEND_NAMES: Record<string, string> = {
  comfyui: "ComfyUI",
  openai: "OpenAI",

};

function names(rows: Array<{ title: string }>, more: (count: number) => string): string {
  const titles = rows.map((row) => row.title);
  return titles.length > 3 ? `${titles.slice(0, 3).join(", ")} ${more(titles.length - 3)}` : titles.join(", ");
}

export function HarnessPictureTest({
  saved,
  picturesVerified,
  picturesForTables,
  offerAdopt = true,
  onVerified,
  onAdopted,
}: {
  saved: boolean;
  picturesVerified: boolean;
  // Already the tables' picture backend, switched on.
  picturesForTables: boolean;
  // The guided setup saves the choice on its own Continue instead.
  offerAdopt?: boolean;
  onVerified: () => void;
  onAdopted?: () => void;
}) {
  const { t, tp } = useI18n();
  const [painting, setPainting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [moved, setMoved] = useState<Moved[] | null>(null);
  const [adoptError, setAdoptError] = useState("");
  const localizePictureDetail = (detail: string) => {
    const painted = detail.match(/^(.+) s through the tables' own picture queue$/);
    if (painted) return t("admin.harness.picture.detail.painted", { seconds: painted[1] });
    if (detail === "No picture came back.") return t("admin.harness.picture.err.noPicture");
    if (detail === "The file the table would be sent is missing or unreadable.") return t("admin.harness.picture.detail.missingFile");
    const shape = detail.match(/^(\d+) x (\d+), not the landscape a map asks for; the table crops it$/);
    if (shape) return t("admin.harness.picture.detail.notLandscape", { width: shape[1], height: shape[2] });
    const dimensions = detail.match(/^(\d+) x (\d+)$/);
    if (dimensions) return t("admin.harness.picture.detail.dimensions", { width: dimensions[1], height: dimensions[2] });
    const file = detail.match(/^([A-Z0-9]+), (\d+) KB$/);
    if (file) return t("admin.harness.picture.detail.file", { format: file[1], size: file[2] });
    return detail;
  };

  async function paint() {
    setPainting(true);
    setResult(null);
    setMoved(null);
    try {
      const response = await fetch("/api/admin/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "picture" }),
      });
      const data = (await response.json().catch(() => ({}))) as Result;
      setResult(response.ok && data.image ? data : { ...data, error: data.error ?? t("admin.harness.picture.err.noPicture") });
      if (response.ok && data.image) {
        onVerified();
      }
    } catch {
      setResult({ error: t("admin.harness.picture.err.reach") });
    } finally {
      setPainting(false);
    }
  }

  async function adopt() {
    setAdopting(true);
    setAdoptError("");
    try {
      const response = await fetch("/api/admin/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adopt" }),
      });
      const data = (await response.json().catch(() => ({}))) as { moved?: Moved[]; error?: string };
      if (!response.ok) {
        setAdoptError(data.error ?? t("admin.harness.picture.err.adopt"));
        return;
      }
      setMoved(data.moved ?? []);
      onAdopted?.();
    } catch {
      setAdoptError(t("admin.harness.picture.err.reach"));
    } finally {
      setAdopting(false);
    }
  }

  const stages: Stage[] = painting
    ? STAGE_ORDER.map((id) => ({ id, ok: null }))
    : (result?.stages ?? []);
  const passed = Boolean(result?.image);
  const campaigns = (result?.campaigns ?? []).filter((row) => row.kind === "campaign" && row.picturesOn);
  const onAgent = campaigns.filter((row) => row.backend === "harness");
  const stranded = campaigns.filter((row) => row.backend !== "harness" && !row.canPaint);
  const keeping = campaigns.filter((row) => row.backend !== "harness" && row.canPaint);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={ui.btnSmall} onClick={paint} disabled={!saved || painting} aria-busy={painting}>
          {painting ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          {picturesVerified ? t("admin.harness.picture.paintAgain") : t("admin.harness.picture.paint")}
        </button>
        <span className="text-xs text-stone-500">
          {t("admin.harness.picture.intro")}
        </span>
      </div>

      {stages.length ? (
        <ol className="hx-stages" aria-live="polite">
          {stages.map((stage, index) => {
            const state = stage.ok === null ? (painting ? "wait" : "skip") : stage.ok ? "ok" : "bad";
            return (
              <li key={stage.id} className="hx-stage live-in" data-state={state} style={{ animationDelay: `${index * 60}ms` }}>
                <span className="hx-stage-mark mt-0.5">
                  {state === "ok" ? (
                    <Check key="ok" className="tick-in size-4 text-emerald-400" />
                  ) : state === "bad" ? (
                    <X key="bad" className="tick-in size-4 text-red-400" />
                  ) : state === "wait" ? (
                    <Loader2 className="size-4 animate-spin text-stone-500" />
                  ) : (
                    <Minus className="size-4 text-stone-600" />
                  )}
                </span>
                <span>
                  <span className={state === "bad" ? "text-red-300" : state === "ok" ? "text-stone-200" : "text-stone-500"}>
                    {t(STAGE_LABELS[stage.id] ?? "admin.harness.picture.stage.unknown")}
                  </span>
                  {stage.detail ? <span className="block text-xs text-stone-500">{localizePictureDetail(stage.detail)}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {painting ? (
        <div className="hx-picture breathe aspect-[3/2] bg-stone-900" aria-label={t("admin.harness.picture.painting")} />
      ) : result?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={result.image.url} src={result.image.url} alt={t("admin.harness.picture.alt")} className="hx-picture aspect-[3/2]" />
      ) : null}

      {result && !passed && result.error ? (
        <p role="alert" className="motion-shake text-sm text-red-400">
          {result.error}
        </p>
      ) : null}

      {passed ? (
        <div className="live-in space-y-2 text-sm">
          {moved ? (
            <p role="status" className="flex items-start gap-1.5 text-emerald-400">
              <Check className="tick-in mt-0.5 size-4 shrink-0" />
              <span>
                {t("admin.harness.picture.paintingForTables")}
                {moved.length
                  ? ` ${tp("admin.harness.picture.moved", moved.length, { names: names(moved, (count) => t("admin.harness.picture.more", { count })), maps: moved.some((row) => row.mapsTurnedOn) ? t("admin.harness.picture.mapsOn") : "" })}`
                  : ""}
              </span>
            </p>
          ) : !offerAdopt ? (
            <p className="text-stone-300">
              {t("admin.harness.picture.works")}
              {stranded.length
                ? ` ${tp("admin.harness.picture.stranded", stranded.length, { names: names(stranded, (count) => t("admin.harness.picture.more", { count })) })}`
                : ` ${t("admin.harness.picture.continue")}`}
            </p>
          ) : picturesForTables ? (
            <p className="text-stone-300">
              {onAgent.length ? tp("admin.harness.picture.alreadyUsed", onAgent.length) : t("admin.harness.picture.alreadyUsed")}.
            </p>
          ) : (
            <div className="su-note space-y-2">
              <p>
                {t("admin.harness.picture.notUsedYet")}
                {stranded.length
                  ? ` ${tp("admin.harness.picture.strandedAdopt", stranded.length, { names: names(stranded, (count) => t("admin.harness.picture.more", { count })) })}`
                  : ""}
              </p>
              <button type="button" className={ui.btnSecondary} onClick={adopt} disabled={adopting} aria-busy={adopting}>
                {adopting ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} {t("admin.harness.picture.adopt")}
              </button>
            </div>
          )}
          {keeping.length ? (
            <p className="text-xs text-stone-500">
              {tp("admin.harness.picture.keeping", keeping.length, { backends: [...new Set(keeping.map((row) => row.backend === "harness" ? t("admin.harness.picture.backend.agent") : row.backend === "mflux-hs" || row.backend === "sdnq-hs" ? t("admin.harness.picture.backend.flux") : BACKEND_NAMES[row.backend] ?? row.backend))].join(", ") })}
            </p>
          ) : null}
          {adoptError ? (
            <p role="alert" className="motion-shake text-sm text-red-400">
              {adoptError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

[executed on device: PZLD8SRKH9OMZNV (424c96e3-c9c5-4152-a4d9-25b4c5961356)]