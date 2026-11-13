"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { campaignApiErrorText } from "@/lib/i18n/campaignApiError";
import { SessionBanner, bannerButtonClass } from "@/app/campaigns/[campaignId]/SessionBanner";
import { appNotice } from "@/components/ui/ConfirmDialog";
import type { NarrationAudio } from "@/app/campaigns/[campaignId]/useNarrationAudio";
import type { NarrationStatus } from "@/app/campaigns/[campaignId]/useCampaignStream";

// Narration that did not happen, said out loud (issue 88). A passage can go
// unread because the server could not render it (no speech server, a bad
// key, a voice it does not have) or because this device could not play what
// was rendered. Either way the table used to hear nothing and be told
// nothing. The transcript row says so under the passage; this banner says so
// above the composer, which is on screen in every layout, including a staged
// fight where the transcript is folded away.

// What each seat should be told. A seat with narration muted is not waiting
// for a voice and is told nothing.
export function useNarrationStatus(
  narration: Pick<NarrationAudio, "muted" | "playbackFailure">,
  status: Record<string, NarrationStatus>,
): Record<string, NarrationStatus> | undefined {
  const { t } = useI18n();
  const { muted, playbackFailure } = narration;
  return useMemo(() => {
    if (muted) {
      return undefined;
    }
    return playbackFailure
      ? {
          ...status,
          [playbackFailure]: { state: "failed" as const, reason: t("campaign.narrationFailure.audioUnavailable") },
        }
      : status;
  }, [muted, playbackFailure, status, t]);
}

// Plays the stored narration, rendering it first when this passage has never
// been voiced. Resolves to an error string on failure, null on success.
export function useNarrationReplay(
  campaignId: string,
  narration: Pick<NarrationAudio, "unlock" | "play">,
  known: Record<string, string>,
) {
  const { t } = useI18n();
  const { unlock, play } = narration;
  return useCallback(
    async (messageId: string): Promise<string | null> => {
      // The click doubles as the gesture that gets us past the browser's
      // autoplay block.
      unlock();
      const url = known[messageId];
      if (url) {
        play(messageId, url);
        return null;
      }
      // Never voiced: render it now, then play the same take. Passages from
      // before TTS was switched on, and ones whose render failed, are
      // otherwise silent forever.
      const response = await fetch(`/api/campaigns/${campaignId}/messages/${messageId}/narrate`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return campaignApiErrorText(data, t("campaign.narrationFailure.error.render"), t);
      }
      const data = await response.json();
      play(messageId, data.url);
      return null;
    },
    [campaignId, unlock, play, known, t],
  );
}

export function NarrationFailureBanner({
  messageIds,
  status,
  onRetry,
}: {
  // The transcript's message ids, oldest first: the newest failure is shown.
  messageIds: string[];
  status: Record<string, NarrationStatus> | undefined;
  onRetry: (messageId: string) => Promise<string | null>;
}) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const failedId = useMemo(() => {
    if (!status) {
      return null;
    }
    for (let index = messageIds.length - 1; index >= 0; index -= 1) {
      if (status[messageIds[index]]?.state === "failed") {
        return messageIds[index];
      }
    }
    return null;
  }, [messageIds, status]);
  if (!failedId || !status || failedId === dismissed) {
    return null;
  }
  return (
    <SessionBanner
      glyph="cue-horn"
      tone="quiet"
      title={t("campaign.narrationFailure.title")}
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            className={bannerButtonClass(true)}
            onClick={async () => {
              setBusy(true);
              const error = await onRetry(failedId);
              setBusy(false);
              if (error) {
                void appNotice(error);
              }
            }}
          >
            {busy ? t("campaign.narrationFailure.action.trying") : t("campaign.narrationFailure.action.retry")}
          </button>
          <button type="button" className={bannerButtonClass()} onClick={() => setDismissed(failedId)}>
            {t("campaign.narrationFailure.action.dismiss")}
          </button>
        </>
      }
    >
      <span role="status" className="block">
        {status[failedId].reason || t("campaign.narrationFailure.serverSilent")}
      </span>
    </SessionBanner>
  );
}
