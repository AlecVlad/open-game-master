"use client";

import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionHead } from "@/components/ui/SectionHead";
import { downloadBlob } from "@/lib/download";
import type { NarratorQualityOverview } from "@/lib/narrator-quality-server";
import type { QualityGroup } from "@/lib/narrator-quality";
import type { DmMode } from "@/lib/dm/viewer";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// Admin > Usage > Narrator quality (issue #460): how the AI's turns ended
// and what tables had to fix, one row per backend class and DM mode. Rates
// are only compared within a row: the people who send these lean towards
// those who know the rules, and a table that trusts the AI looks cleaner
// than it is. The export is read before a beta is promoted to stable
// (docs/releases.md).


const BACKEND_LABELS: Record<QualityGroup["backendClass"], MessageKey> = {
  local: "admin.quality.backend.local",
  api: "admin.quality.backend.api",
  agent: "admin.quality.backend.agent",
  unknown: "admin.quality.backend.unknown",
};

const MODE_LABELS: Record<DmMode, MessageKey> = {
  ai: "admin.quality.mode.ai",
  steered: "admin.quality.mode.steered",
  human: "admin.quality.mode.human",
  assisted: "admin.quality.mode.assisted",
};

function percent(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : "–";
}

function count(value: number): string {
  return value ? String(value) : "–";
}

function exportName(now = new Date()): string {
  return `odm-narrator-quality-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
}

export function AdminNarratorQualityCard() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<NarratorQualityOverview | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/narrator-quality")
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as (NarratorQualityOverview & { error?: string }) | null;
        if (cancelled) return;
        if (!response.ok || !data) {
          setError(data?.error || t("admin.quality.err.load"));
          return;
        }
        setOverview(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("admin.quality.err.network"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportRows = async () => {
    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/narrator-quality?export=1");
      if (!response.ok) {
        setError(t("admin.quality.err.export"));
        return;
      }
      const text = `${JSON.stringify(await response.json(), null, 2)}\n`;
      downloadBlob(exportName(), new Blob([text], { type: "application/json" }));
    } catch {
      setError(t("admin.quality.err.network"));
    } finally {
      setExporting(false);
    }
  };

  const groups = overview?.groups ?? [];

  return (
    <section className="panel texture-noise rounded-xl p-5" data-narrator-quality="">
      <SectionHead
        level="h2"
        title={t("admin.quality.title")}
        glyph="tab-context"
        aside={<span className="count-pop tabular-nums">{overview?.turns ?? 0}</span>}
      />
      <p className="mb-3 text-xs text-stone-400">
        {t("admin.quality.intro")}
      </p>
      {error ? <p role="alert" className="mb-2 text-sm text-red-400">{error}</p> : null}
      {overview && !groups.length ? (
        <p className="text-sm text-stone-400" data-narrator-quality-empty="">
          {t("admin.quality.empty")}
        </p>
      ) : null}
      {groups.length ? (
        // One block per backend and DM mode, its figures in a grid that
        // wraps: a twelve-column table only scrolled sideways on a phone.
        <ul className="space-y-3">
          {groups.map((group) => {
            const figures: Array<{ label: MessageKey; value: string; hint?: string; clean?: boolean }> = [
              { label: "admin.quality.f.turns", value: String(group.turns) },
              { label: "admin.quality.f.clean", value: percent(group.clean, group.turns), clean: true },
              { label: "admin.quality.f.failed", value: count(group.failed) },
              { label: "admin.quality.f.refused", value: count(group.refused) },
              { label: "admin.quality.f.capped", value: count(group.capped) },
              { label: "admin.quality.f.guard", value: count(group.guardFired) },
              { label: "admin.quality.f.unchecked", value: count(group.unchecked), hint: t("admin.quality.f.unchecked.hint") },
              { label: "admin.quality.f.corrected", value: group.correctionsCounted ? percent(group.corrected, group.turns) : t("admin.quality.f.notCounted") },
              { label: "admin.quality.f.rewound", value: count(group.rolledBack) },
            ];
            return (
              <li
                key={`${group.backendClass}:${group.dmMode}`}
                className="rounded-lg border border-stone-700/50 bg-stone-950/30 p-3"
                data-quality-group={`${group.backendClass}:${group.dmMode}`}
              >
                <p className="mb-2 text-sm text-stone-100">
                  {t(BACKEND_LABELS[group.backendClass])}
                  <span className="text-stone-500"> &middot; </span>
                  <span className="text-stone-300">{t(MODE_LABELS[group.dmMode])}</span>
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3 lg:grid-cols-5">
                  {figures.map((figure) => (
                    <div key={figure.label} className="flex items-baseline justify-between gap-2 sm:block" title={figure.hint}>
                      <dt className="text-[11px] uppercase tracking-wide text-stone-500">{t(figure.label)}</dt>
                      <dd className="tabular-nums text-stone-200" {...(figure.clean ? { "data-quality-clean": "" } : {})}>
                        {figure.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs text-stone-400">
                  <span className="text-[11px] uppercase tracking-wide text-stone-500">{t("admin.quality.mostCorrected")}</span>
                  <span className="text-stone-200" data-quality-tools="">
                    {group.tools.length
                      ? group.tools.map((tool) => `${tool.tool.replaceAll("_", " ")} (${tool.corrections})`).join(", ")
                      : t("admin.quality.none")}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-2 text-[11px] text-stone-500">
        {overview?.rule ?? ""}{t("admin.quality.rule")}
        {overview?.earlierCorrections ? ` ${t("admin.quality.earlier", { count: overview.earlierCorrections })}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={ui.btnSmall} onClick={exportRows} disabled={exporting} data-narrator-quality-export="">
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} {t("admin.quality.export")}
        </button>
        <span className="text-[11px] text-stone-500">
          {t("admin.quality.exportNote")}
        </span>
      </div>
    </section>
  );
}
