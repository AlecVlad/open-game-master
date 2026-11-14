"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { PortraitMedallion } from "@/components/sheet/SheetParts";
import { Face, useEscapeToSkip } from "@/app/campaigns/[campaignId]/moment-parts";
import {
  ARRIVAL_MS,
  arrivalStays,
  dismissArrival,
  seeSheets,
  startArrivals,
  type Arrival,
} from "@/app/campaigns/[campaignId]/arrival";
import { prefersReducedMotion, useLowEffects } from "@/lib/effects-mode";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import { classDisplayName, speciesName } from "@/lib/characters/class-words";

// The arrival banner (backlog F27): when a player seats a character while
// the lobby is open, everyone in it sees "Thornwick takes a seat" with the
// face, ancestry and class, as a light banner over the top of the lobby that
// blocks nothing. It leaves on its own after a few seconds; under reduced
// motion or low effects it holds still and waits for its Dismiss, and a
// pointer or focus resting on it holds it too. Escape skips it. The line is
// heard once, from a polite region that is always there. Styles:
// styles/moments.css, "arrival banner".
const ARRIVAL_CLASS_KEYS: Record<string, string> = {
  barbarian: "charSheet.class.barbarian",
  bard: "charSheet.class.bard",
  cleric: "charSheet.class.cleric",
  druid: "charSheet.class.druid",
  fighter: "charSheet.class.fighter",
  monk: "charSheet.class.monk",
  paladin: "charSheet.class.paladin",
  ranger: "charSheet.class.ranger",
  rogue: "charSheet.class.rogue",
  sorcerer: "charSheet.class.sorcerer",
  warlock: "charSheet.class.warlock",
  wizard: "charSheet.class.wizard",
  artificer: "charSheet.class.artificer",
};


function currentArrivalLine(sheet: Arrival, t: (key: never, params?: { name: string }) => string): string {
  return t("campaign.session.arrival.line" as never, { name: sheet.name });
}

function currentArrivalDetail(sheet: Arrival, t: (key: never) => string): string {
  const className = ARRIVAL_CLASS_KEYS[sheet.class]
    ? t(ARRIVAL_CLASS_KEYS[sheet.class] as never)
    : classDisplayName(sheet.class);
  return `${speciesName(sheet)} · ${className}`;
}

export function ArrivalBanner({ sheets }: { sheets: CharacterSheet[] }) {
  const { t } = useI18n();
  const [arrivals, setArrivals] = useState(() => startArrivals(sheets));
  const seen = seeSheets(arrivals, sheets);
  if (seen !== arrivals) {
    setArrivals(seen);
  }

  const lowEffects = useLowEffects();
  const current = arrivals.queue[0] ?? null;
  const line = current ? currentArrivalLine(current, t) : "";
  const detail = current ? currentArrivalDetail(current, t) : "";
  const [held, setHeld] = useState(false);
  const still = arrivalStays({ lowEffects, reducedMotion: prefersReducedMotion() });
  const skip = useCallback(() => {
    setHeld(false);
    setArrivals(dismissArrival);
  }, []);
  useEffect(() => {
    if (!current || still || held) return;
    const timer = window.setTimeout(skip, ARRIVAL_MS);
    return () => window.clearTimeout(timer);
  }, [current, still, held, skip]);
  useEscapeToSkip(Boolean(current), skip);

  return (
    <>
      <p role="status" className="sr-only">
        {current ? `${line}: ${detail}` : ""}
      </p>
      {current ? (
        <ArrivalCard
          key={current.id}
          arrival={current}
          line={line}
          detail={detail}
          dismissLabel={t("campaign.session.arrival.dismiss")}
          still={still}
          onDismiss={skip}
          onHold={setHeld}
        />
      ) : null}
    </>
  );
}

// The banner itself: the face, the line and the ancestry and class. Its
// words are already in the status region above, so here they are only seen.
// It takes no focus; under a still device it carries the Dismiss.
export function ArrivalCard({
  arrival,
  line,
  detail,
  dismissLabel,
  still,
  onDismiss,
  onHold,
}: {
  arrival: Arrival;
  line: string;
  detail: string;
  dismissLabel: string;
  still: boolean;
  onDismiss: () => void;
  onHold: (held: boolean) => void;
}) {
  return (
    <div
      className="moment-arrival"
      data-still={still || undefined}
      onPointerEnter={() => onHold(true)}
      onPointerLeave={() => onHold(false)}
      onFocus={() => onHold(true)}
      onBlur={() => onHold(false)}
    >
      <PortraitMedallion classId={arrival.class} className="moment-arrival-medallion">
        <Face sheet={arrival} />
      </PortraitMedallion>
      <span className="min-w-0 flex-1" aria-hidden="true">
        <span className="gold-title moment-arrival-name">{line}</span>
        <span className="moment-arrival-detail">{detail}</span>
      </span>
      {still ? (
        <button type="button" className="moment-arrival-dismiss" onClick={onDismiss}>
          {dismissLabel}
        </button>
      ) : null}
    </div>
  );
}
