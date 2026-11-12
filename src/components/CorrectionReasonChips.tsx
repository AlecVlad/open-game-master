"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { CORRECTION_REASON_LABELS, CORRECTION_REASONS, type CorrectionReason } from "@/lib/correction-reasons";
import { CORRECTION_OFFER_EVENT, type CorrectionOffer } from "@/lib/correction-offer";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// After a fix to the AI (an undo, an edit, a reroll, a rewind...), one
// optional tap says why (issue #460). The fix is already done when this
// shows; ignoring it, closing it or letting it fade leaves the reason
// blank, which the correction ledger counts like any other fix. "Changed my
// mind" is left out of every rate.
const SHOWN_MS = 15_000;

const CORRECTION_REASON_KEYS: Record<CorrectionReason, MessageKey> = {
  wrong_rule: "correction.reason.wrongRule",
  wrong_number: "correction.reason.wrongNumber",
  wrong_target: "correction.reason.wrongTarget",
  story: "correction.reason.story",
  changed_mind: "correction.reason.changedMind",
};

export function CorrectionReasonChips({ campaignId }: { campaignId: string }) {
  const t = useT();
  const [offer, setOffer] = useState<CorrectionOffer | null>(null);
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<CorrectionOffer>).detail;
      if (!detail || detail.campaignId !== campaignId || !detail.ids.length) {
        return;
      }
      clear();
      savedRef.current = false;
      setSaved(false);
      setOffer(detail);
      timer.current = window.setTimeout(() => setOffer(null), SHOWN_MS);
    };
    window.addEventListener(CORRECTION_OFFER_EVENT, listener);
    return () => {
      window.removeEventListener(CORRECTION_OFFER_EVENT, listener);
      clear();
    };
  }, [campaignId]);

  // Said by a polite live region that is always on the page (a region
  // added with its words is often not read), and never by moving focus:
  // the strip must not pull anyone off what they were doing.
  const announcement = !offer ? "" : saved
    ? t("correction.announce.saved")
    : t("correction.announce.prompt");
  const status = (
    <p role="status" aria-live="polite" className="sr-only" data-correction-status="">
      {announcement}
    </p>
  );

  if (!offer) {
    return status;
  }

  const choose = (reason: CorrectionReason) => {
    const ids = offer.ids;
    savedRef.current = true;
    setSaved(true);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => setOffer(null), 1_500);
    // Best effort: a reason that does not arrive leaves the fix recorded
    // without one, which is what skipping does too.
    void fetch(`/api/campaigns/${campaignId}/corrections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids, reason }),
    }).catch(() => undefined);
  };

  // While a keyboard user is inside the strip it stays; it goes by itself
  // again once focus leaves. Escape closes it from any chip.
  const hold = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const release = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    hold();
    timer.current = window.setTimeout(() => setOffer(null), savedRef.current ? 1_500 : SHOWN_MS);
  };

  return (
    <>
      {status}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4" data-correction-chips="">
        <div
          role="group"
          aria-label={t("correction.group.aria")}
          onFocus={hold}
          onBlur={release}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOffer(null);
            }
          }}
          className="panel panel-smoke pointer-events-auto flex max-w-xl flex-wrap items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-stone-300 shadow-lg"
        >
          {saved ? (
            <span data-correction-saved="">{t("correction.saved")}</span>
          ) : (
            <>
              <span className="mr-1 text-stone-400">{t("correction.prompt")}</span>
              {CORRECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  data-correction-reason={reason}
                  onClick={() => choose(reason)}
                  className="inline-flex min-h-10 items-center rounded-full border border-stone-600/60 bg-stone-900/60 px-3 text-stone-200 hover:border-amber-500/50 hover:text-amber-100 motion-press sm:min-h-8 sm:px-2.5"
                >
                  {t(CORRECTION_REASON_KEYS[reason])}
                </button>
              ))}
            </>
          )}
          <button
            type="button"
            aria-label={t("correction.close")}
            onClick={() => setOffer(null)}
            className="ml-auto inline-flex size-10 items-center justify-center rounded-md text-stone-500 hover:text-stone-200 sm:size-8"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </>
  );
}
