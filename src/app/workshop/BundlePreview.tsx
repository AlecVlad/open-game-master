"use client";

import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { UnofficialPackNotice } from "@/components/UnofficialPackNotice";
import { chip, chipOn, chipRow } from "@/app/workshop/kit";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { BUNDLE_KIND_LABELS } from "@/lib/workshop/bundle";

// What a bundle holds, shown before it becomes a workshop: the card both a
// bundle file (ImportBundleButton) and an addon's import (AddonImportButton)
// end on, so a rulebook an addon read is agreed to the same way as a file a
// friend sent.
//
// The ticks say what an untick costs: a card that picks an NPC loses that
// pick when the NPCs stay behind, and the preview says so for whatever is
// ticked right now (#158). A chapter bundle offers to link its shared
// records to the importer's own copy of the shared workshop (#159).

export type SharedHome = { id: string; title: string; found: number; total: number };

export type BundlePreviewData = {
  manifest: { name: string; blurb: string; author: string; inspiredBy: string; rightsHolder: string };
  counts: Record<string, number>;
  houseRules?: boolean;
  plugin?: boolean;
  overworld?: boolean;
  dependencies?: BundleDependency[];
  dependsOn?: { name: string } | null;
  sharedHomes?: SharedHome[];
  warnings: string[];
};

// The kinds a preview offers, in the order the counts came: every kind with
// something in it, then the house rules, the region map and the world pack
// draft when the bundle carries them.
export function kindsOf(preview: BundlePreviewData): string[] {
  const kinds = Object.entries(preview.counts)
    .filter(([, count]) => count > 0)
    .map(([kind]) => kind);
  return [
    ...kinds,
    ...(preview.houseRules ? ["rules"] : []),
    ...(preview.overworld ? ["overworld"] : []),
    ...(preview.plugin ? ["plugin"] : []),
  ];
}

export function BundlePreview({
  preview,
  kinds,
  onKinds,
  sharedWorkshopId,
  onSharedWorkshopId,
  busy,
  onConfirm,
  onCancel,
  notes = [],
}: {
  preview: BundlePreviewData;
  kinds: string[];
  onKinds: (kinds: string[]) => void;
  sharedWorkshopId: string;
  onSharedWorkshopId: (id: string) => void;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  // What the addon that made the bundle wants the DM to know.
  notes?: string[];
}) {
  const { t } = useI18n();
  const offered = kindsOf(preview);
  const kindLabel = (kind: string) => {
    const key = BUNDLE_KIND_KEYS[kind];
    return key ? t(key as never) : BUNDLE_KIND_LABELS[kind] ?? kind;
  };
  const dropped = (preview.dependencies ?? [])
    .filter((dependency) => kinds.includes(dependency.from) && !kinds.includes(dependency.to))
    .map((dependency) => {
      const from = kindLabel(dependency.from);
      const to = kindLabel(dependency.to);
      return dependency.to === "monsters" || dependency.to === "homebrew"
        ? t("workshop.bundle.preview.droppedNames", { count: dependency.count, from, to })
        : t((dependency.count === 1 ? "workshop.bundle.preview.droppedLink.one" : "workshop.bundle.preview.droppedLink.other") as never, {
            count: dependency.count,
            from,
            to,
          });
    });
  return (
    <div className={`${ui.card} reveal mt-3 p-4`}>
      <SectionHead title={preview.manifest.name} glyph="system-share" />
      <p className="text-sm text-stone-400">{preview.manifest.blurb}</p>
      {preview.manifest.author ? <p className="reveal mt-0.5 text-xs text-stone-500">{t("workshop.bundle.preview.byAuthor", { author: preview.manifest.author })}</p> : null}

      {/* Each kind is a tick: a DM who only wants the monsters takes the
          monsters. Unticking every one leaves an empty workshop, which the
          button below says out loud. */}
      <ul className={cn("stagger mt-3", chipRow)}>
        {offered.map((kind) => {
          const ticked = kinds.includes(kind);
          return (
            <li key={kind}>
              <button
                type="button"
                role="checkbox"
                aria-checked={ticked}
                onClick={() => onKinds(ticked ? kinds.filter((entry) => entry !== kind) : [...kinds, kind])}
                className={cn(ui.btnSmall, chip, "rounded-full normal-case", ticked ? chipOn : "text-stone-500")}
              >
                <Check className={cn("size-3.5", ticked ? "text-amber-300" : "opacity-20")} aria-hidden="true" />
                {preview.counts[kind] === undefined ? "" : `${preview.counts[kind]} `}
                {kindLabel(kind)}
              </button>
            </li>
          );
        })}
      </ul>

      {dropped.length ? (
        <ul className="stagger mt-2 space-y-1">
          {dropped.map((line) => (
            <li key={line} className="reveal text-xs text-amber-300/90">
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      {preview.dependsOn ? (
        <div className="reveal mt-3">
          {preview.sharedHomes?.length ? (
            <>
              <p className="mb-1 text-xs text-stone-400">{t("workshop.bundle.preview.sourceRecords", { name: preview.dependsOn.name })}</p>
              <Select
                label={t("workshop.bundle.preview.sharedRecords")}
                value={sharedWorkshopId}
                onChange={onSharedWorkshopId}
                options={[
                  ...preview.sharedHomes.map((home) => ({
                    value: home.id,
                    label: t("workshop.bundle.preview.linkToMy", { title: home.title }),
                    hint: t("workshop.bundle.preview.found", { found: home.found, total: home.total }),
                  })),
                  { value: "", label: t("workshop.bundle.preview.ownRecords") },
                ]}
              />
            </>
          ) : (
            <p className="text-xs text-stone-400">
              {t("workshop.bundle.preview.unlinked", { name: preview.dependsOn.name })}
            </p>
          )}
        </div>
      ) : null}

      <UnofficialPackNotice rightsHolder={preview.manifest.rightsHolder} inspiredBy={preview.manifest.inspiredBy} className="mt-3" />

      {[...notes, ...preview.warnings].length ? (
        <ul className="stagger mt-3 space-y-1">
          {[...notes, ...preview.warnings].map((warning) => (
            <li key={warning} className="text-xs text-amber-200/80">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-stone-500">
        {t("workshop.bundle.preview.safety")}
      </p>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onConfirm} disabled={busy} className={ui.btnPrimary}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}{" "}
          {kinds.length === 0
            ? t("workshop.bundle.preview.importEmpty")
            : kinds.length === offered.length
              ? t("workshop.bundle.preview.importAll")
              : t("workshop.bundle.preview.importSome", { count: kinds.length, total: offered.length })}
        </button>
        <button type="button" onClick={onCancel} className={ui.btnSecondary}>
          {t("workshop.bundle.preview.cancel")}
        </button>
      </div>
    </div>
  );
}
