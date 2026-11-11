"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { offerCorrectionReason } from "@/lib/correction-offer";
import { ui } from "@/lib/ui";
import { SectionHead } from "@/components/ui/SectionHead";
import { haltedTurnPrefix } from "@/lib/campaign-types";

// A DM turn that threw. Everything the turn had (its conversation, tool calls
// and tool results) is still on the dm_turns row, so the lead can send the DM
// back in where it stopped instead of retyping the action, which would leave
// the same action in the transcript twice.
//
// The retry itself is durable server state: the moment it is claimed the
// notice loses its dmTurnId and this banner disappears for every client via
// message_updated. Local state here only covers the request in flight.
export function HaltedTurnBanner({
  campaignId,
  turnId,
  content,
  canRetry,
}: {
  campaignId: string;
  turnId: string;
  content: string;
  canRetry: boolean;
}) {
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  // The reason follows "The DM ran into a problem: " in the transcript, so
  // some start lower case; standing alone here it starts a sentence.
  const stated = content.slice(haltedTurnPrefix(content).length);
  const reason = stated.charAt(0).toUpperCase() + stated.slice(1);

  async function retry() {
    if (retrying) {
      return;
    }
    setRetrying(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dm-turn/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnId }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error || t("campaign.session.halted.restartFailed"));
      } else {
        offerCorrectionReason(campaignId, await response.json().catch(() => null));
      }
      // On success nothing else is done here: the banner goes away when the
      // message_updated event lands, and the narration streams in as usual.
    } catch {
      setError(t("campaign.session.halted.serverUnreachable"));
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="panel ornate session-banner-card reveal-banner rounded-xl">
      <SectionHead title={t("campaign.session.halted.title")} glyph="cue-bell" level="h4" className="mb-1.5" />
      <p className="text-sm text-stone-400">{reason}</p>
      {canRetry ? (
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          title={t("campaign.session.halted.retryHint")}
          className={cn(ui.btnSmall, "mt-2.5")}
        >
          {retrying ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          {retrying ? t("campaign.session.halted.retrying") : t("campaign.session.halted.retry")}
        </button>
      ) : (
        <p className="mt-1 text-xs text-stone-500">
          {t("campaign.session.halted.leadCanRetry")}
        </p>
      )}
      {error ? <p className="motion-shake mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
