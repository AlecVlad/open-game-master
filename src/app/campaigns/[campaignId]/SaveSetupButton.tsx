"use client";

import { useState } from "react";
import { appConfirm, appNotice } from "@/components/ui/ConfirmDialog";
import { bannerButtonClass } from "@/app/campaigns/[campaignId]/SessionBanner";
import { useI18n } from "@/lib/i18n/provider";
import { campaignApiErrorText } from "@/lib/i18n/campaignApiError";
import { hostOffers, useCapabilities } from "@/lib/use-capabilities";

// "Save as set-up" on a test table (issue 685, src/lib/workshop/fight-setup.ts):
// the moment on the table becomes the prepared fight's set-up, and every
// test of it opens there from now on. The control the report asked for in
// place of redoing every console step by hand at each test; the set-up is
// loaded by default once it exists, so there is no second control to load
// it. Hidden on a host that cannot save one.

export function SaveSetupButton({ campaignId }: { campaignId: string }) {
  const { t } = useI18n();
  const capabilities = useCapabilities();
  const [busy, setBusy] = useState(false);
  if (!hostOffers(capabilities, "fightSetups")) {
    return null;
  }

  async function save() {
    if (
      !(await appConfirm(
        t("workshop.testFight.setup.confirm"),
        {
          title: t("workshop.testFight.setup.confirmTitle"),
          actionLabel: t("workshop.testFight.setup.confirmAction"),
          tone: "plain",
        },
      ))
    ) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/fight-setup`, { method: "POST" });
      const data = await response.json().catch(() => null) as
        | { ok?: boolean; keptMap?: boolean; lines?: unknown }
        | null;
      if (!response.ok) {
        await appNotice(
          campaignApiErrorText(data, t("workshop.testFight.setup.error.saveFailed"), t),
          t("workshop.testFight.setup.notSavedTitle"),
        );
        return;
      }
      if (!data || data.ok !== true || typeof data.keptMap !== "boolean" || !Array.isArray(data.lines)) {
        await appNotice(
          t("workshop.testFight.setup.error.response"),
          t("workshop.testFight.setup.notSavedTitle"),
        );
        return;
      }
      const mapNote = data.keptMap ? ` ${t("workshop.testFight.setup.mapKept")}` : "";
      await appNotice(
        `${t("workshop.testFight.setup.savedNotice")}${mapNote}`,
        t("workshop.testFight.setup.savedTitle"),
      );
    } catch {
      await appNotice(
        t("workshop.testFight.setup.error.network"),
        t("workshop.testFight.setup.notSavedTitle"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} aria-busy={busy} onClick={() => void save()} className={bannerButtonClass()} data-save-setup>
      {busy ? t("workshop.testFight.setup.saving") : t("workshop.testFight.setup.save")}
    </button>
  );
}
