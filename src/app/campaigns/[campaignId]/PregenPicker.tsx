"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { JoinConfirmDialog, type JoinHero } from "@/app/campaigns/[campaignId]/JoinConfirmDialog";

type Hero = { id: string; name: string; tagline: string; blurb: string };

const PREGEN_TEXT_KEYS: Record<string, { tagline: string; blurb: string }> = {
  brakk: {
    tagline: "campaign.pregenPicker.brakk.tagline",
    blurb: "campaign.pregenPicker.brakk.blurb",
  },
  kara: {
    tagline: "campaign.pregenPicker.kara.tagline",
    blurb: "campaign.pregenPicker.kara.blurb",
  },
  vex: {
    tagline: "campaign.pregenPicker.vex.tagline",
    blurb: "campaign.pregenPicker.vex.blurb",
  },
  sera: {
    tagline: "campaign.pregenPicker.sera.tagline",
    blurb: "campaign.pregenPicker.sera.blurb",
  },
};


// Ready-made heroes for a seat with no character yet
// (src/lib/starter/pregens.ts). A click opens the confirm sheet
// (JoinConfirmDialog.tsx, backlog F6), which seats the hero; the sheet lands
// in the player's library too, so it can be kept, edited or brought to
// another table. Offered in every lobby, not only the starter's: a friend
// who joined with a room code and ten minutes to spare is who it is for.
export function PregenPicker({
  campaignId,
  heading,
  onSeated,
}: {
  campaignId: string;
  // The line above the heroes; null where the card around it already says.
  heading?: string | null;
  // Called once the hero has its seat (the join page goes back to the table).
  onSeated?: () => void;
}) {
  const { t } = useI18n();
  const headingText = heading === undefined ? t("campaign.pregenPicker.heading") : heading;
  const [heroes, setHeroes] = useState<Hero[] | null>(null);
  const [picked, setPicked] = useState<JoinHero | null>(null);

  useEffect(() => {
    fetch("/api/starter")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { pregens?: Hero[] } | null) => setHeroes(data?.pregens ?? []))
      .catch(() => setHeroes([]));
  }, []);

  if (!heroes?.length) {
    return null;
  }
  return (
    <div className={cn(ui.card, "space-y-2 px-4 py-3")} data-tour="pregen-picker">
      {headingText ? <p className="text-xs uppercase tracking-wide text-stone-500">{headingText}</p> : null}
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {heroes.map((hero) => (
          <li key={hero.id}>
            <button
              type="button"
              onClick={() => setPicked({ kind: "pregen", id: hero.id, name: hero.name })}
              className="motion-press flex w-full flex-col items-start rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2 text-left hover:border-amber-500/40"
            >
              <span className="text-sm text-stone-100">{PREGEN_TEXT_KEYS[hero.id] ? t(PREGEN_TEXT_KEYS[hero.id].tagline as never) : hero.tagline}</span>
              <span className="text-xs text-stone-500">{PREGEN_TEXT_KEYS[hero.id] ? t(PREGEN_TEXT_KEYS[hero.id].blurb as never) : hero.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
      <JoinConfirmDialog
        campaignId={campaignId}
        hero={picked}
        onClose={() => setPicked(null)}
        onSeated={() => {
          setPicked(null);
          onSeated?.();
        }}
      />
    </div>
  );
}
