"use client";

import { Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { CopyLine } from "@/components/CopyLine";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";

// Shown with a new connection that can play one campaign, on a server whose
// admin turned poll links on: the other way to wake an agent, for one that
// nothing can send requests to (a hosted assistant whose hooks can only check
// a URL). One click makes the link; like the token, it is shown once
// (docs/player-webhooks.md).
export function PlayerPollLinkSetup({ grantId, characterName }: { grantId: string; characterName: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  async function make() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/profile/agents/${encodeURIComponent(grantId)}/poll-link`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? t("settings.pl.err"));
        return;
      }
      setLink(String(data.url ?? ""));
    } catch {
      setError(t("settings.pl.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-stone-800 p-3">
      <p className="text-sm text-stone-200">{t("settings.pl.title")}</p>
      <p className="text-xs text-stone-500">
        {t("settings.pl.body1", { name: characterName })}<code>wake</code>{t("settings.pl.body2")}<code>fingerprint</code>{t("settings.pl.body3")}
      </p>
      {link ? (
        <div className="space-y-1">
          <CopyLine text={link} label={t("settings.pl.label")} />
          <p className="text-xs text-amber-200">
            {t("settings.pl.once")}
          </p>
        </div>
      ) : (
        <button type="button" className={ui.btnSmall} onClick={() => void make()} disabled={busy} aria-busy={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />} {t("settings.pl.make")}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
