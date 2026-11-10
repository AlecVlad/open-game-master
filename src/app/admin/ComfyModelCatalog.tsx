"use client";

import { useState } from "react";
import { comfyModel } from "@/lib/image-models/catalog";
import { HARDWARE_PROFILES, type VerifiedRow } from "@/lib/image-models/curate";
import { seconds } from "@/lib/image-models/describe";
import { VERIFIED_ROWS } from "@/lib/image-models/verified";
import type { ComfyModelReport } from "@/lib/comfyui";
import type { ComfyDiscovery } from "@/app/admin/AdminImagesSection";
import { paintsHere } from "@/lib/image-models/curate";
import type { MaskedConfig } from "@/app/admin/AdminSettingsFields";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";


// Every image model ODM can run on ComfyUI, curated for the machine this
// ComfyUI runs on: what its hardware made of each one (verified.json), what
// is installed, and for the rest, the files to add and where they download
// from. Under the Image model picker in Admin > Images.

type Images = MaskedConfig["images"];

const hardwareLabel = (id: string) => HARDWARE_PROFILES.find((profile) => profile.id === id)?.label ?? id;

const MODEL_BLURB_KEYS: Record<string, MessageKey> = {
  z_turbo: "admin.images.catalog.blurb.z_turbo",
  z_image: "admin.images.catalog.blurb.z_image",
  qwen_image_21: "admin.images.catalog.blurb.qwen_image_21",
  qwen_image_21_turbo: "admin.images.catalog.blurb.qwen_image_21_turbo",
  qwen_image: "admin.images.catalog.blurb.qwen_image",
  qwen_image_lightning: "admin.images.catalog.blurb.qwen_image_lightning",
  krea2_turbo: "admin.images.catalog.blurb.krea2_turbo",
  flux1_schnell: "admin.images.catalog.blurb.flux1_schnell",
  flux1_dev: "admin.images.catalog.blurb.flux1_dev",
  flux1_krea_dev: "admin.images.catalog.blurb.flux1_krea_dev",
  flux2_dev: "admin.images.catalog.blurb.flux2_dev",
  flux2_klein_4b: "admin.images.catalog.blurb.flux2_klein_4b",
  flux2_klein_4b_base: "admin.images.catalog.blurb.flux2_klein_4b_base",
  flux2_klein_9b: "admin.images.catalog.blurb.flux2_klein_9b",
  chroma1_hd: "admin.images.catalog.blurb.chroma1_hd",
  chroma1_radiance: "admin.images.catalog.blurb.chroma1_radiance",
  hidream_fast: "admin.images.catalog.blurb.hidream_fast",
  hidream_dev: "admin.images.catalog.blurb.hidream_dev",
  hidream_full: "admin.images.catalog.blurb.hidream_full",
  sd35_large: "admin.images.catalog.blurb.sd35_large",
  sd35_medium: "admin.images.catalog.blurb.sd35_medium",
  pony_xl: "admin.images.catalog.blurb.pony_xl",
  sdxl: "admin.images.catalog.blurb.sdxl",
  hunyuan_image_21: "admin.images.catalog.blurb.hunyuan_image_21",
  longcat_image: "admin.images.catalog.blurb.longcat_image",
  ovis_image: "admin.images.catalog.blurb.ovis_image",
  boogu_turbo: "admin.images.catalog.blurb.boogu_turbo",
  capybara: "admin.images.catalog.blurb.capybara",
  ideogram4: "admin.images.catalog.blurb.ideogram4",
  ming_image: "admin.images.catalog.blurb.ming_image",
  kandinsky5_lite: "admin.images.catalog.blurb.kandinsky5_lite",
  omnigen2: "admin.images.catalog.blurb.omnigen2",
  pixeldit: "admin.images.catalog.blurb.pixeldit",
  hidream_o1_dev: "admin.images.catalog.blurb.hidream_o1_dev",
  netayume_lumina: "admin.images.catalog.blurb.netayume_lumina",
  anima: "admin.images.catalog.blurb.anima",
  newbie: "admin.images.catalog.blurb.newbie",
};


function measured(row: VerifiedRow) {
  return {
    portrait: seconds(row.seconds.square),
    landscape: seconds(row.seconds.landscape),
    first: seconds(row.coldSeconds),
    peak: row.peakGb,
    steps: row.steps,
  };
}

function ModelRow({
  report,
  hardware,
  inUse,
  onPick,
}: {
  report: ComfyModelReport;
  hardware: string | null;
  inUse: boolean;
  onPick: () => void;
}) {
  const { t } = useI18n();
  const model = comfyModel(report.id);
  if (!model) return null;
  const row = report.verified;
  // Unmeasured here: what other hardware saw, as a guide.
  const elsewhere = row ? null : VERIFIED_ROWS.find((entry) => entry.model === report.id && entry.verdict !== "fails") ?? null;
  const installed = report.missing.length === 0;
  return (
    <li className="rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-stone-200">
          {model.label}
          {row?.verdict === "recommended" ? <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-300">{t("admin.images.catalog.recommended")}</span> : null}
          {model.style === "anime" ? <span className="ml-2 text-[10px] uppercase tracking-wide text-stone-500">{t("admin.images.catalog.anime")}</span> : null}
        </span>
        <span className="text-[11px] text-stone-500">
          {inUse ? t("admin.images.catalog.inUse") : installed ? t("admin.images.catalog.installed") : t("admin.images.catalog.toAdd", { size: report.downloadGb })}
        </span>
      </div>
      <p className="text-[11px] leading-4 text-stone-400">{MODEL_BLURB_KEYS[model.id] ? t(MODEL_BLURB_KEYS[model.id]) : model.blurb}</p>
      <p className="text-[11px] leading-4 text-stone-500">
        {row && row.verdict !== "fails"
          ? t("admin.images.catalog.measured", measured(row))
          : row
            ? t("admin.images.catalog.didNotRun", { hardware: hardware ?? t("admin.images.catalog.thisHardware") })
            : elsewhere
              ? t("admin.images.catalog.measuredElsewhere", { hardware: hardwareLabel(elsewhere.hardware), details: t("admin.images.catalog.measured", measured(elsewhere)) })
              : t("admin.images.catalog.notMeasured")}
        {report.fits === false ? ` ${t("admin.images.catalog.peak", { size: report.needGb ?? 0 })}` : ""}
      </p>
      {row?.notes ? <p className="text-[11px] leading-4 text-stone-500">{row.notes}</p> : null}
      <p className="text-[11px] leading-4 text-stone-600">
        {model.maker}. {model.license}.
      </p>
      {!installed ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-[11px] text-amber-300 hover:text-amber-200">{t("admin.images.catalog.filesToAdd")}</summary>
          <ul className="mt-1 space-y-0.5">
            {report.missing.map((file) => (
              <li key={file.name} className="text-[11px] leading-4 text-stone-400">
                <a href={file.url} target="_blank" rel="noreferrer" className="text-amber-200 underline">
                  {file.name}
                </a>{" "}
                {t("admin.images.catalog.into", { folder: file.folder, size: file.sizeGb })}
              </li>
            ))}
          </ul>
        </details>
      ) : !inUse && row?.verdict !== "fails" ? (
        <button type="button" className="mt-1 text-[11px] text-amber-300 hover:text-amber-200" onClick={onPick}>
          {t("admin.images.catalog.useModel")}
        </button>
      ) : null}
    </li>
  );
}

export function ComfyModelCatalog({
  discovery,
  preset,
  checkpoint,
  onPick,
}: {
  discovery: ComfyDiscovery;
  preset: string;
  checkpoint: string;
  onPick: (patch: Partial<Images>) => void;
}) {
  const { t, tp } = useI18n();
  const hardware = discovery.hardware?.label ?? null;
  // The models that cannot paint here (did not run, or want more GPU
  // memory than this one has) and the ones that painted poorly are kept
  // off the list; one click shows them, each saying why.
  const [showUnfit, setShowUnfit] = useState(false);
  const unfit = discovery.models.filter((report) => !paintsHere(report) || report.verified?.verdict === "poor");
  const reports = showUnfit ? discovery.models : discovery.models.filter((report) => !unfit.includes(report));
  const groups = [
    {
      key: "measured",
      title: t("admin.images.catalog.group.measured", { hardware: hardware ?? t("admin.images.catalog.thisHardware") }),
      items: reports.filter((report) => report.verified && report.verified.verdict !== "fails" && report.verified.verdict !== "poor" && paintsHere(report)),
    },
    { key: "unmeasured", title: hardware ? t("admin.images.catalog.group.unmeasured", { hardware: hardware ?? t("admin.images.catalog.thisHardware") }) : t("admin.images.catalog.group.models"), items: reports.filter((report) => !report.verified && paintsHere(report)) },
    { key: "poor", title: t("admin.images.catalog.group.poor", { hardware: hardware ?? t("admin.images.catalog.thisHardware") }), items: reports.filter((report) => report.verified?.verdict === "poor" && paintsHere(report)) },
    { key: "too-big", title: t("admin.images.catalog.group.tooBig"), items: reports.filter((report) => report.verified?.verdict !== "fails" && !paintsHere(report)) },
    { key: "failed", title: t("admin.images.catalog.group.failed", { hardware: hardware ?? t("admin.images.catalog.thisHardware") }), items: reports.filter((report) => report.verified?.verdict === "fails") },
  ].filter((group) => group.items.length);
  const measuredCount = groups.find((group) => group.key === "measured")?.items.length ?? 0;
  const installedCount = reports.filter((report) => !report.missing.length).length;
  const device = discovery.device;

  const slotOf = (report: ComfyModelReport) => {
    const load = comfyModel(report.id)?.graph.load;
    return load && "checkpoint" in load ? load.checkpoint : null;
  };
  const inUse = (report: ComfyModelReport) => {
    const slot = slotOf(report);
    return slot
      ? preset === "checkpoint" && Boolean(report.files[slot]) && checkpoint === report.files[slot]
      : preset === report.id;
  };
  const pick = (report: ComfyModelReport) => {
    const slot = slotOf(report);
    onPick(slot ? { comfyWorkflowPreset: "checkpoint", comfyCheckpoint: report.files[slot] } : { comfyWorkflowPreset: report.id });
  };

  return (
    <details className="rounded-lg border border-stone-800 bg-stone-950/30 px-3 py-2">
      <summary className="cursor-pointer text-sm text-stone-300">
        {t("admin.images.catalog.title")}
        <span className="ml-2 text-[11px] text-stone-500">
          {device ? t("admin.images.catalog.device", { hardware: hardware ? `${hardware}, ${device.name}` : device.name, memory: device.memoryGb }) : ""} 
          {t("admin.images.catalog.counts", { installed: installedCount, measured: hardware ? t("admin.images.catalog.measuredCount", { count: measuredCount }) : "" })}
        </span>
      </summary>
      <p className="mt-2 text-[11px] leading-4 text-stone-500">
        {t("admin.images.catalog.description")}
      </p>
      {unfit.length ? (
        <p className="mt-2 text-[11px] leading-4 text-stone-500">
          {tp(showUnfit ? "admin.images.catalog.unfit.visible" : "admin.images.catalog.unfit.hidden", unfit.length)}.{" "}
          <button type="button" className="underline hover:text-stone-300" onClick={() => setShowUnfit((on) => !on)}>
            {showUnfit ? t("admin.images.catalog.hide") : t("admin.images.catalog.show")}
          </button>
        </p>
      ) : null}
      <div className="reveal mt-2 space-y-3">
        {groups.map((group) => (
          <section key={group.key}>
            <h4 className="mb-1 text-xs font-medium text-stone-400">{group.title}</h4>
            <ul className="space-y-1.5">
              {group.items.map((report) => (
                <ModelRow key={report.id} report={report} hardware={hardware} inUse={inUse(report)} onPick={() => pick(report)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

[executed on device: PZLD8SRKH9OMZNV (424c96e3-c9c5-4152-a4d9-25b4c5961356)]