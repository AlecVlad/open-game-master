"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index.ts";
import { cn } from "@/lib/cn";
import type { ModelDiagnostic, ModelRole, ModelSummaryPart, ModelVerdict } from "@/lib/model-registry/catalog-logic";

// A translated note under a model field: catalog abilities and any warning
// about whether the selected model can do the role this campaign needs.
export function ModelNote({ role, baseUrl, model }: { role: ModelRole; baseUrl: string; model: string }) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState<{ key: string; verdict: ModelVerdict | null } | null>(null);
  const name = model.trim();
  const key = `${role}|${baseUrl}|${name}`;

  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    const params = new URLSearchParams({ role, model: name, baseUrl });
    void fetch(`/api/models?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { verdict?: ModelVerdict } | null) => {
        if (!cancelled) setAnswer({ key, verdict: data?.verdict ?? null });
      })
      .catch(() => {
        if (!cancelled) setAnswer({ key, verdict: null });
      });
    return () => {
      cancelled = true;
    };
  }, [role, baseUrl, name, key]);

  const verdict = answer?.key === key ? answer.verdict : null;
  if (!verdict) return null;
  const tone = verdict.fit === "unfit" ? "text-red-400" : verdict.fit === "warn" ? "text-amber-300" : "text-stone-500";
  const warnings = verdict.warningDetails?.length
    ? verdict.warningDetails.map((detail: ModelDiagnostic) => {
        const params = detail.code === "preRelease" && detail.params?.status
          ? { ...detail.params, status: t(("modelNote.status." + detail.params.status) as MessageKey) }
          : detail.params;
        return t(("modelNote.warning." + detail.code) as MessageKey, params);
      })
    : verdict.warnings;
  const summary = verdict.summaryParts?.length
    ? verdict.summaryParts.map((part: ModelSummaryPart) => t(("modelNote.summary." + part.code) as MessageKey, part.params)).join(" · ")
    : verdict.summary;
  return <p className={cn("text-[11px] leading-4", tone)}>{[...warnings, summary].join(" ")}</p>;
}
