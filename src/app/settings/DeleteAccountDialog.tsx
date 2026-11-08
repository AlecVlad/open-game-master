"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { Dialog } from "@/components/ui/Dialog";
import { GameIcon } from "@/components/ui/GameIcon";
import { useI18n } from "@/lib/i18n/provider";

// The last question before an account goes: the grace copy, the password (or
// the word DELETE for a Discord-only account), and a button that stays locked
// until that is filled in. The page owns the request; this only asks.
export function DeleteAccountDialog({
  hasPassword,
  graceCopy,
  graceDays,
  value,
  onValue,
  error,
  deleting,
  ready,
  onConfirm,
  onClose,
}: {
  hasPassword: boolean;
  graceCopy: string;
  graceDays: number;
  value: string;
  onValue: (next: string) => void;
  error: string;
  deleting: boolean;
  ready: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // A request on the wire cannot be walked away from.
        if (!open && !deleting) onClose();
      }}
      title={t("settings.dd.title")}
      icon={<GameIcon icon={{ kind: "glyph", key: "quest-failed" }} size="size-7" />}
      width="w-[min(92vw,26rem)]"
    >
      <p className="text-xs leading-5 text-stone-400">
        {graceCopy} {t("settings.dd.note")}
      </p>
      {/* Not a form: Enter in the field must never be what erases an account. */}
      <div className="mt-4">
        <label className="block text-xs text-stone-400">
          {hasPassword ? t("settings.dd.password") : t("settings.dd.type")}
          <input
            type={hasPassword ? "password" : "text"}
            autoFocus
            value={value}
            onChange={(event) => onValue(event.target.value)}
            className={cn(ui.input, "mt-1")}
          />
        </label>
        {error ? <p role="alert" className="motion-shake mt-2 text-xs text-red-400">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={deleting} className={ui.btnSmall}>
            {t("settings.dd.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!ready || deleting}
            className={cn(ui.btnPrimary, "from-red-200 via-red-300 to-red-500 text-red-950")}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            {graceDays === 0 ? t("settings.dd.forever") : t("settings.dd.mine")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
