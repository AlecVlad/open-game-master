"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { returnFocus } from "@/components/ui/return-focus";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { offerCorrectionReason } from "@/lib/correction-offer";
import { ui } from "@/lib/ui";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionHead } from "@/components/ui/SectionHead";
import { Slider } from "@/components/ui/Slider";
import type { CampaignMessage } from "@/lib/db/messages";
import {
  MAX_GUIDANCE_LENGTH,
  MAX_VARIANTS,
  REROLL_TEMP_OFFSET,
} from "@/lib/dm/renarrate-logic";

// Reroll the DM's latest narration. The server replays only the final
// narration call of that turn, so the dice, the damage and the world state
// stay exactly as they landed; the guidance line steers this take alone and
// is never remembered. Party lead only.

const GUIDANCE_PRESETS = [
  { value: "darker", message: "campaign.session.renarrate.preset.darker" },
  { value: "more dialogue", message: "campaign.session.renarrate.preset.dialogue" },
  { value: "shorter", message: "campaign.session.renarrate.preset.shorter" },
  { value: "more sensory detail", message: "campaign.session.renarrate.preset.sensory" },
] as const;

const RENARRATE_ERROR_MESSAGES: Record<string, MessageKey> = {
  CAMPAIGN_NOT_FOUND: "campaign.session.renarrate.error.campaignNotFound",
  MESSAGE_NOT_FOUND: "campaign.session.renarrate.error.messageNotFound",
  NOT_DM_NARRATION: "campaign.session.renarrate.error.notDmNarration",
  NO_DM_TURN: "campaign.session.renarrate.error.noTurn",
  TURN_NOT_FOUND: "campaign.session.renarrate.error.turnNotFound",
  NO_STORED_CONVERSATION: "campaign.session.renarrate.error.noConversation",
  VARIANTS_CAPPED: "campaign.session.renarrate.error.variantsCapped",
  MODEL_UNAVAILABLE: "campaign.session.renarrate.error.modelUnavailable",
  EMPTY_NARRATION: "campaign.session.renarrate.error.emptyNarration",
  STORE_FAILED: "campaign.session.renarrate.error.storeFailed",
  VARIANT_NOT_FOUND: "campaign.session.renarrate.error.variantNotFound",
  SELECT_FAILED: "campaign.session.renarrate.error.selectFailed",
  INVALID_SELECT_REQUEST: "campaign.session.renarrate.error.invalidSelect",
  INVALID_REROLL_REQUEST: "campaign.session.renarrate.error.invalidReroll",
  NOT_LATEST_MESSAGE: "campaign.session.renarrate.error.notLatest",
  DM_BUSY: "campaign.session.renarrate.error.dmBusy",
  SESSION_ON_HOLD: "campaign.session.renarrate.error.sessionHeld",
};

export function RenarrateDialog({
  campaignId,
  message,
  onClose,
}: {
  campaignId: string;
  message: CampaignMessage;
  onClose: () => void;
}) {
  const t = useT();
  const [guidance, setGuidance] = useState("");
  // NE-P opens its regenerate sheet at base + 0.1 and remembers a dragged
  // offset for the rest of the browse session. This dialog is per-reroll, so
  // the offset simply defaults back each time it opens.
  const [tempOffset, setTempOffset] = useState(REROLL_TEMP_OFFSET);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const taken = message.variants?.length ?? 1;
  const capped = taken >= MAX_VARIANTS;

  async function reroll() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/messages/${message.id}/renarrate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reroll", guidance, tempOffset }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        errorCode?: unknown;
        sessionHold?: { number?: unknown };
      };
      if (!response.ok) {
        const code = typeof data.errorCode === "string" ? data.errorCode : "";
        const messageKey = RENARRATE_ERROR_MESSAGES[code];
        const params =
          code === "VARIANTS_CAPPED"
            ? { max: MAX_VARIANTS }
            : code === "SESSION_ON_HOLD"
              ? { number: typeof data.sessionHold?.number === "number" ? data.sessionHold.number : 1 }
              : undefined;
        setError(
          messageKey
            ? t(messageKey, params)
            : typeof data.error === "string"
              ? data.error
              : t("campaign.session.renarrate.error.generic"),
        );
        return;
      }
      offerCorrectionReason(campaignId, data);
      onClose();
    } catch {
      setError(t("campaign.session.renarrate.error.network"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !running && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[#05030d]/70 backdrop-blur-sm" />
        <Dialog.Content {...returnFocus}
          className={cn(
            ui.dialog,
            "fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2.5 font-display text-lg">
              <GameIcon icon={{ kind: "glyph", key: "die-d20" }} size="size-8" />
              <span className="gold-title">{t("campaign.session.renarrate.title")}</span>
            </Dialog.Title>
            <Dialog.Close aria-label={t("dialog.close")} className={cn(ui.iconAction, "opacity-100")}>
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <p className="mb-3 text-xs leading-5 text-stone-400">
            {t("campaign.session.renarrate.description", { taken, max: MAX_VARIANTS })}
            {capped ? ` ${t("campaign.session.renarrate.capped")}` : ""}
          </p>

          <SectionHead
            title={t("campaign.session.renarrate.variation")}
            glyph="sky-wind"
            level="h4"
            aside={
              <span key={tempOffset} className="count-pop font-mono text-xs text-amber-200">
                +{tempOffset.toFixed(2)}
              </span>
            }
          />
          <Slider
            min={0}
            max={0.6}
            step={0.05}
            value={tempOffset}
            disabled={running}
            onChange={setTempOffset}
            label={t("campaign.session.renarrate.temperatureLabel")}
            bubble={(value) => `+${value.toFixed(2)}`}
            className="mb-4 w-full"
          />

          <SectionHead title={t("campaign.session.renarrate.guidance")} glyph="tab-log" level="h4" />
          <input
            aria-label={t("campaign.session.renarrate.guidance")}
            value={guidance}
            onChange={(event) => setGuidance(event.target.value)}
            maxLength={MAX_GUIDANCE_LENGTH}
            disabled={running}
            placeholder={t("campaign.session.renarrate.placeholder")}
            className={ui.input}
          />
          <div data-pill-group="" className="mt-2 flex flex-wrap gap-1.5">
            {GUIDANCE_PRESETS.map((preset) => (
              <button data-on={guidance === preset.value ? "" : undefined}
                key={preset.value}
                type="button"
                disabled={running}
                onClick={() => setGuidance(preset.value)}
                className="session-subtab session-subtab-plain motion-press"
              >
                {t(preset.message)}
              </button>
            ))}
          </div>

          {error ? <p className="motion-shake mt-3 text-xs text-red-400">{error}</p> : null}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={running} className={ui.btnSmall}>
              {t("campaign.session.renarrate.cancel")}
            </button>
            <button
              type="button"
              onClick={reroll}
              disabled={running || capped}
              className={ui.btnPrimary}
            >
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {t("campaign.session.renarrate.writing")}
                </>
              ) : (
                t("campaign.session.renarrate.submit")
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
