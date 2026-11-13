"use client";

import { Loader2, Play, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ui } from "@/lib/ui";
import { Dialog } from "@/components/ui/Dialog";
import { useI18n } from "@/lib/i18n/provider";
import { refusalText } from "@/app/characters/builder/refusal";

type Starter = {
  oneShot: { id: string; title: string; tagline: string; description: string };
  pregens: Array<{ id: string; name: string; tagline: string; blurb: string }>;
};

const PREGEN_TEXT_KEYS: Record<string, { tagline: string; blurb: string }> = {
  brakk: { tagline: "campaign.pregenPicker.brakk.tagline", blurb: "campaign.pregenPicker.brakk.blurb" },
  kara: { tagline: "campaign.pregenPicker.kara.tagline", blurb: "campaign.pregenPicker.kara.blurb" },
  vex: { tagline: "campaign.pregenPicker.vex.tagline", blurb: "campaign.pregenPicker.vex.blurb" },
  sera: { tagline: "campaign.pregenPicker.sera.tagline", blurb: "campaign.pregenPicker.sera.blurb" },
};

// The quick start: one evening's adventure with ready-made heroes, for a
// table that wants to play in ten minutes (src/lib/starter/one-shot.ts).
// One click makes the table; the lobby offers the heroes.
export function StarterDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (campaignId: string) => void;
}) {
  const { t } = useI18n();
  const [starter, setStarter] = useState<Starter | null>(null);
  const [busy, setBusy] = useState<"" | "solo" | "friends">("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || starter) {
      return;
    }
    fetch("/api/starter")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Starter | null) => {
        if (data) {
          setStarter(data);
        }
      })
      .catch(() => undefined);
  }, [open, starter]);

  async function start(solo: boolean) {
    setBusy(solo ? "solo" : "friends");
    setError("");
    try {
      const response = await fetch("/api/starter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solo }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(refusalText(data, t("home.starter.err"), t));
        return;
      }
      onOpenChange(false);
      onCreated(data.campaign.id);
    } finally {
      setBusy("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("home.starter.title")} icon={<Play className="size-4 text-amber-300" />}>
      <div className="space-y-4">
        <div>
          <p className="font-display text-lg tracking-wide text-amber-50">{starter?.oneShot.title ?? t("home.starter.fallbackTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-stone-400">
            {starter?.oneShot.description ?? t("home.starter.loading")}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">{t("home.starter.heroes")}</p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(starter?.pregens ?? []).map((hero) => (
              <li key={hero.id} className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
                <p className="text-sm text-stone-100">{PREGEN_TEXT_KEYS[hero.id] ? t(PREGEN_TEXT_KEYS[hero.id].tagline as never) : hero.tagline}</p>
                <p className="text-xs text-stone-500">{PREGEN_TEXT_KEYS[hero.id] ? t(PREGEN_TEXT_KEYS[hero.id].blurb as never) : hero.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-stone-500">
          {t("home.starter.note")}
        </p>
        {error ? <p className="motion-shake text-sm text-red-400">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => start(true)} className={ui.btnSmall} disabled={busy !== ""} aria-busy={busy === "solo"}>
            {busy === "solo" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {t("home.starter.solo")}
          </button>
          <button type="button" onClick={() => start(false)} className={ui.btnPrimary} disabled={busy !== ""} aria-busy={busy === "friends"}>
            {busy === "friends" ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            {t("home.starter.host")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
