"use client";

import { Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { reloadPage } from "@/lib/navigation";
import { useI18n } from "@/lib/i18n/provider";

// The notice every page shows while the account is scheduled for deletion
// (src/lib/account-deletion.ts). One button calls it off; the page reloads
// so whatever fetched the user sees the cleared stamp.
export function DeletionBanner({ dueAt, className }: { dueAt: string; className?: string }) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const when = new Date(dueAt).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function keep() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepAccount: true }),
      });
      if (!response.ok) {
        setError(t("deletionBanner.error"));
        setBusy(false);
        return;
      }
      reloadPage();
    } catch {
      setError(t("deletionBanner.error"));
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200",
        className,
      )}
    >
      <span>
        {t("deletionBanner.message", { date: when })}
        {error ? <span className="motion-shake block text-xs text-red-300">{error}</span> : null}
      </span>
      <button type="button" onClick={keep} disabled={busy} aria-busy={busy} className={ui.btnSmall}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
        {t("deletionBanner.keep")}
      </button>
    </div>
  );
}
