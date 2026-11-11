"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import { SessionBanner, bannerButtonClass } from "@/app/campaigns/[campaignId]/SessionBanner";

// Lead-only banner after a mid-game joiner creates their character: write
// the introduction as a Direct, or let the DM improvise one now.
export function NewAdventurerBanner({
  campaignId,
  text,
  onWriteIntro,
  onDismiss,
}: {
  campaignId: string;
  text: string;
  onWriteIntro: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);

  async function letDmIntroduce() {
    if (sending) {
      return;
    }
    setSending(true);
    try {
      await fetch(`/api/campaigns/${campaignId}/lead-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Introduce the newly joined character into the scene now.",
        }),
      });
      onDismiss();
    } finally {
      setSending(false);
    }
  }

  return (
    <SessionBanner
      glyph="system-party"
      title={t("campaign.session.newAdventurer.title")}
      actions={
        <>
          <button type="button" onClick={onWriteIntro} className={bannerButtonClass(true)}>
            {t("campaign.session.newAdventurer.writeIntro")}
          </button>
          <button
            type="button"
            onClick={letDmIntroduce}
            disabled={sending}
            className={bannerButtonClass()}
          >
            {t("campaign.session.newAdventurer.letGm")}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            title={t("campaign.session.newAdventurer.dismiss")}
            aria-label={t("campaign.session.newAdventurer.dismiss")}
            className={cn(ui.iconAction, "opacity-100")}
          >
            <X className="size-4" />
          </button>
        </>
      }
    >
      <span className="block sm:truncate">{text}</span>
    </SessionBanner>
  );
}
