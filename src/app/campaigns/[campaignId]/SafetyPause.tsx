"use client";

import Link from "next/link";
import { Hand } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";

// The X-card's two faces (docs/vtt-parity-implementation-plan.md 9.1).
// Every player sees a calm gold scrim, "The table is taking a breath",
// with nobody named. The seat that runs the story sees the same words and
// three ways on: rewind the last passage, write it again around the
// subject, or continue. The scrim covers the header and the bottom bar, so
// a player who cannot lift it is still offered a way out of the table: an
// installed app has no browser back button, and the seat that can lift it
// may have stepped away.

export function SafetyPause({
  campaignId,
  paused,
  steersStory,
}: {
  campaignId: string;
  paused: boolean;
  steersStory: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  if (!paused) {
    return null;
  }
  async function resume(action: "continue" | "rewind" | "reroll") {
    setBusy(action);
    try {
      await fetch(`/api/campaigns/${campaignId}/safety/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="fixed inset-0 z-[52] flex items-center justify-center p-6" role="alertdialog" aria-label={t("campaign.session.safetyPause.title")}>
      <div className="handout-scrim-in absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,171,58,0.18),rgba(12,10,9,0.9))]" />
      <div className="handout-in relative max-w-md rounded-xl border border-amber-700/60 bg-stone-950/95 p-5 text-center shadow-elev-2">
        <Hand className="mx-auto mb-2 size-8 text-amber-300" />
        <h2 className="font-display text-xl text-amber-50">{t("campaign.session.safetyPause.title")}</h2>
        <p className="mt-1 text-sm text-stone-400">
          {steersStory
            ? t("campaign.session.safetyPause.steersStory")
            : t("campaign.session.safetyPause.player")}
        </p>
        {steersStory ? (
          <div className="reveal mt-4 flex flex-wrap justify-center gap-2">
            {(
              [
                ["rewind", "campaign.session.safetyPause.rewind"],
                ["reroll", "campaign.session.safetyPause.reroll"],
                ["continue", "campaign.session.safetyPause.continue"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                type="button"
                disabled={busy !== null}
                onClick={() => void resume(action)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs",
                  action === "continue" ? "border-amber-700 bg-amber-950/50 text-amber-100" : "border-stone-700 text-stone-300 hover:bg-stone-900",
                  busy === action && "opacity-60",
                )}
              >
                {t(label as never)}
              </button>
            ))}
          </div>
        ) : (
          <div className="reveal mt-4 flex justify-center">
            <Link
              href="/"
              className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-900"
            >
              {t("campaign.session.safetyPause.leave")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
