"use client";

import { Flag, Loader2, ShieldBan } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { Dialog } from "@/components/ui/Dialog";

export type ReportTarget = {
  // The message being flagged, or nothing when a player is reported as such.
  messageId?: string;
  // The author, when there is one to block. DM passages have no user.
  userId?: string;
  authorType: "player" | "dm";
  // What the dialog calls the thing: a character name, or "the Dungeon Master".
  label: string;
  // Open straight on the block confirmation, no report.
  mode?: "report" | "block";
};

const REASONS = [
  { value: "harassment", label: "campaign.report.reason.harassment" },
  { value: "sexual", label: "campaign.report.reason.sexual" },
  { value: "hate", label: "campaign.report.reason.hate" },
  { value: "violence", label: "campaign.report.reason.violence" },
  { value: "spam", label: "campaign.report.reason.spam" },
  { value: "other", label: "campaign.report.reason.other" },
] as const;

function reportError(message: string | undefined, t: ReturnType<typeof useI18n>["t"]): string {
  switch (message) {
    case "Could not block that player.":
    case "Could not send the report.":
      return t("campaign.report.error.generic");
    case "Invalid request.":
      return t("campaign.report.error.invalidRequest");
    case "Invalid report.":
      return t("campaign.report.error.invalidReport");
    case "That player no longer exists.":
      return t("campaign.report.error.playerMissing");
    case "You cannot block yourself.":
      return t("campaign.report.error.cannotBlockSelf");
    case "That message is not in this campaign.":
      return t("campaign.report.error.messageMissing");
    case "You already reported that message.":
      return t("campaign.report.error.alreadyReported");
    case "Report a message or a player.":
      return t("campaign.report.error.chooseTarget");
    case "You cannot report yourself.":
      return t("campaign.report.error.cannotReportSelf");
    default:
      return t("campaign.report.error.generic");
  }
}

// Flags a passage, a message or a player to this server's admins, with the
// option to block the player at the same time. There is no central service,
// so the operator of the server the player chose is who reads the report.
export function ReportDialog({
  campaignId,
  target,
  onClose,
  onBlocked,
}: {
  campaignId: string;
  target: ReportTarget | null;
  onClose: () => void;
  // The block landed; the caller hides that player's messages at once.
  onBlocked?: (userId: string) => void;
}) {
  const { t } = useI18n();
  const targetLabel = target?.label === "the Dungeon Master" ? t("campaign.report.target.dm") : target?.label ?? "";
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const blockOnly = target?.mode === "block";

  function close() {
    setReason("harassment");
    setDetails("");
    setBlock(false);
    setError("");
    setDone("");
    onClose();
  }

  async function blockUser(userId: string): Promise<boolean> {
    const response = await fetch("/api/profile/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(reportError(data.error, t));
      return false;
    }
    onBlocked?.(userId);
    return true;
  }

  async function submit() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      if (blockOnly) {
        if (target.userId && (await blockUser(target.userId))) {
          setDone(t("campaign.report.done.blockOnly", { target: targetLabel }));
        }
        return;
      }
      const response = await fetch(`/api/campaigns/${campaignId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: target.messageId,
          userId: target.userId,
          reason,
          details,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(reportError(data.error, t));
        return;
      }
      if (block && target.userId && !(await blockUser(target.userId))) {
        return;
      }
      setDone(
        block && target.userId
          ? t("campaign.report.done.reportAndBlock", { target: targetLabel })
          : t("campaign.report.done.report"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && close()}
      title={blockOnly ? t("campaign.report.title.block", { target: targetLabel }) : t("campaign.report.title.report", { target: targetLabel })}
      icon={blockOnly ? <ShieldBan className="size-4 text-red-300" /> : <Flag className="size-4 text-amber-300" />}
    >
      {done ? (
        <div className="reveal space-y-4">
          <p className="text-sm text-stone-300">{done}</p>
          <div className="flex justify-end">
            <button type="button" onClick={close} className={ui.btnPrimary}>
              {t("campaign.report.doneButton")}
            </button>
          </div>
        </div>
      ) : blockOnly ? (
        <div className="reveal space-y-4">
          <p className="text-sm leading-6 text-stone-400">
            {t("campaign.report.block.description", { target: targetLabel })}
          </p>
          {error ? <p className="motion-shake text-sm text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={ui.btnSmall} disabled={busy} aria-busy={busy}>
              {t("campaign.report.cancel")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy} aria-busy={busy}
              className={cn(ui.btnPrimary, "from-red-200 via-red-300 to-red-500 text-red-950")}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldBan className="size-4" />}
              {t("campaign.report.block.action")}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-stone-400">
            {target?.authorType === "dm"
              ? t("campaign.report.description.dm")
              : t("campaign.report.description.player")}
          </p>
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-xs uppercase tracking-wide text-stone-500">{t("campaign.report.reason.label")}</legend>
            {REASONS.map((entry) => (
              <label
                key={entry.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-stone-300"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={entry.value}
                  checked={reason === entry.value}
                  onChange={() => setReason(entry.value)}
                  className="accent-amber-400"
                />
                {t(entry.label as never)}
              </label>
            ))}
          </fieldset>
          <label className="block text-xs text-stone-400">
            {t("campaign.report.details.label")}
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={2000}
              className={cn(ui.input, "mt-1 resize-y")}
            />
          </label>
          {target?.userId ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-300">
              <input
                type="checkbox"
                checked={block}
                onChange={(event) => setBlock(event.target.checked)}
                className="accent-amber-400"
              />
              {t("campaign.report.block.also", { target: targetLabel })}
            </label>
          ) : null}
          {error ? <p className="motion-shake text-sm text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={ui.btnSmall} disabled={busy} aria-busy={busy}>
              {t("campaign.report.cancel")}
            </button>
            <button type="button" onClick={submit} disabled={busy} aria-busy={busy} className={ui.btnPrimary}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
              {t("campaign.report.send")}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
