"use client";

import { Check, ChevronDown, CircleHelp, Hourglass, RotateCcw, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { bannerButtonClass } from "@/app/campaigns/[campaignId]/SessionBanner";
import { Listed } from "@/app/campaigns/[campaignId]/PanelKit";
import { cn } from "@/lib/cn";
import { DM_STATUS_EVENT, type DmStatusDetail } from "@/lib/dm-status-event";
import type { TraceCall, TraceOutcome, TraceRow, TraceSource, TurnTrace } from "@/lib/dm/turn-trace-logic";
import { ui } from "@/lib/ui";
import { hostOffers, useCapabilities } from "@/lib/use-capabilities";
import { useI18n } from "@/lib/i18n/provider";

const PAGE = 10;

const BY_KEY: Record<TurnTrace["by"], string> = {
  ai: "campaign.session.turnTrace.by.ai",
  agent: "campaign.session.turnTrace.by.agent",
  person: "campaign.session.turnTrace.by.person",
};

const STATUS_KEY: Record<TurnTrace["status"], string> = {
  done: "campaign.session.turnTrace.status.done",
  halted: "campaign.session.turnTrace.status.halted",
  waiting: "campaign.session.turnTrace.status.waiting",
  running: "campaign.session.turnTrace.status.running",
};

const SOURCE_KEY: Record<TraceSource, string> = {
  model: "campaign.session.turnTrace.source.model",
  card: "campaign.session.turnTrace.source.card",
  guard: "campaign.session.turnTrace.source.guard",
  story: "campaign.session.turnTrace.source.story",
  agent: "campaign.session.turnTrace.source.agent",
  person: "campaign.session.turnTrace.source.person",
};

const OUTCOME: Record<TraceOutcome, { label: string; icon: LucideIcon; tone: string }> = {
  ok: { label: "campaign.session.turnTrace.outcome.ok", icon: Check, tone: "text-stone-300" },
  refused: { label: "campaign.session.turnTrace.outcome.refused", icon: X, tone: "text-ember-300" },
  retry: { label: "campaign.session.turnTrace.outcome.retry", icon: RotateCcw, tone: "text-ember-300" },
  waiting: { label: "campaign.session.turnTrace.outcome.waiting", icon: Hourglass, tone: "text-amber-200" },
  unanswered: { label: "campaign.session.turnTrace.outcome.unanswered", icon: CircleHelp, tone: "text-stone-400" },
};

function outcomeLabel(call: TraceCall, t: ReturnType<typeof useI18n>["t"]): string {
  if (call.outcome === "refused" && call.refusal === "rules") {
    return t("campaign.session.turnTrace.outcome.refusedRules");
  }
  if (call.outcome === "refused" && call.refusal === "limit") {
    return t("campaign.session.turnTrace.outcome.refusedLimit");
  }
  return t(OUTCOME[call.outcome].label as never);
}

function clock(iso: string, lang: "en" | "ru"): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? ""
    : at.toLocaleTimeString(lang === "ru" ? "ru-RU" : "en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
}

function factsOf(
  turn: TurnTrace,
  t: ReturnType<typeof useI18n>["t"],
  tp: ReturnType<typeof useI18n>["tp"],
): string {
  return [
    t(STATUS_KEY[turn.status] as never),
    turn.durationMs !== null ? t("campaign.session.turnTrace.duration", { seconds: (turn.durationMs / 1000).toFixed(1) }) : "",
    turn.modelCalls ? tp("campaign.session.turnTrace.modelCalls", turn.modelCalls) : "",
    turn.rolls ? tp("campaign.session.turnTrace.rolls", turn.rolls) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function traceError(message: string | undefined, t: ReturnType<typeof useI18n>["t"]): string {
  switch (message) {
    case "Only a test fight shows its turn trace. At a table in play, the GM's calls stay behind the screen.":
      return t("campaign.session.turnTrace.route.notPlaytest");
    case "Only the person who started this test fight can read its turn trace.":
      return t("campaign.session.turnTrace.route.onlyOwner");
    case "Ask for between 1 and 30 turns, and for earlier ones by a turn's id.":
      return t("campaign.session.turnTrace.route.invalidPage");
    case "That turn is not one of this table's, so there is nothing before it to show.":
      return t("campaign.session.turnTrace.route.unknownTurn");
    default:
      return t("campaign.session.turnTrace.loadError");
  }
}

// The newest page read again, with any earlier pages the author opened kept
// below it: a turn only ever joins at the top.
function withNewest(fresh: TurnTrace[], shown: TurnTrace[], keepEarlier: boolean): TurnTrace[] {
  if (!keepEarlier) {
    return fresh;
  }
  const ids = new Set(fresh.map((turn) => turn.id));
  return [...fresh, ...shown.filter((turn) => !ids.has(turn.id))];
}

export function TurnTraceButton({ campaignId }: { campaignId: string }) {
  const offered = hostOffers(useCapabilities(), "turnTrace");
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!offered) {
    return null;
  }
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={cn(bannerButtonClass(), "pk-tap")}>
        {t("campaign.session.turnTrace.button")}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t("campaign.session.turnTrace.title")}>
        {open ? <TraceBody campaignId={campaignId} /> : null}
      </Sheet>
    </>
  );
}

type Page = { turns?: TurnTrace[]; before?: string | null; error?: string };

function TraceBody({ campaignId }: { campaignId: string }) {
  const { t, lang } = useI18n();
  const [turns, setTurns] = useState<TurnTrace[]>([]);
  const [before, setBefore] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const earlier = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/turn-trace?limit=${PAGE}`, { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as Page;
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError(traceError(data.error, t));
          return;
        }
        setError("");
        setTurns((shown) => withNewest(data.turns ?? [], shown, earlier.current));
        if (!earlier.current) {
          setBefore(data.before ?? null);
        }
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setError(t("campaign.session.turnTrace.networkError"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, reload, t]);

  // Read again as the AI GM's turn runs, parks and ends, a moment after the
  // status settles.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onStatus = (event: Event) => {
      if ((event as CustomEvent<DmStatusDetail>).detail?.campaignId !== campaignId) {
        return;
      }
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => setReload((count) => count + 1), 400);
    };
    window.addEventListener(DM_STATUS_EVENT, onStatus);
    return () => {
      window.removeEventListener(DM_STATUS_EVENT, onStatus);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [campaignId]);

  async function showEarlier() {
    if (!before || busy) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/turn-trace?limit=${PAGE}&before=${encodeURIComponent(before)}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as Page;
      if (!response.ok) {
        setError(traceError(data.error, t));
        return;
      }
      earlier.current = true;
      setError("");
      setTurns((shown) => {
        const ids = new Set(shown.map((turn) => turn.id));
        return [...shown, ...(data.turns ?? []).filter((turn) => !ids.has(turn.id))];
      });
      setBefore(data.before ?? null);
    } catch {
      setError(t("campaign.session.turnTrace.networkEarlierError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 pb-1">
      <p className="text-xs leading-5 text-stone-400">{t("campaign.session.turnTrace.intro")}</p>
      <Listed loaded={loaded} error={error} onRetry={() => setReload((count) => count + 1)} loading={t("campaign.session.turnTrace.loading")}>
        {turns.length ? (
          <ol className="space-y-3">
            {turns.map((turn) => (
              <li key={turn.id}>
                <TurnCard turn={turn} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-stone-500">{t("campaign.session.turnTrace.empty")}</p>
        )}
        {before ? (
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void showEarlier()}
            className={cn(ui.btnSmall, "pk-tap mt-3 w-full justify-center text-xs")}
          >
            {t("campaign.session.turnTrace.showEarlier")}
          </button>
        ) : null}
      </Listed>
    </div>
  );
}

function TurnCard({ turn }: { turn: TurnTrace }) {
  const { t, tp, lang } = useI18n();
  const heading = `trace-${turn.id}`;
  return (
    <section aria-labelledby={heading} className="animate-fade-up rounded-lg border border-stone-700/60 bg-stone-900/40 p-3">
      <h3 id={heading} className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-semibold text-amber-100">
        <span>{t(BY_KEY[turn.by] as never)}</span>
        <span className="text-xs font-normal text-stone-400">{clock(turn.startedAt, lang)}</span>
      </h3>
      <p className="mt-0.5 text-xs text-stone-400">{factsOf(turn, t, tp)}</p>
      {turn.revertedAt ? (
        <p className="mt-1 text-xs text-amber-200">
          <RotateCcw className="mr-1 inline size-3" aria-hidden="true" />
          {t("campaign.session.turnTrace.reverted", { time: clock(turn.revertedAt, lang) })}
        </p>
      ) : null}
      {turn.by === "ai" ? <Answered lines={turn.answered} /> : null}
      {turn.rows.length ? (
        <ol className={cn("mt-2 space-y-1.5", turn.revertedAt && "opacity-60")}>
          {turn.rows.map((row, index) => (
            <li key={index}>
              <Row row={row} id={`${heading}-${index}`} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-stone-500">
          {t(turn.by === "person" ? "campaign.session.turnTrace.noPersonCalls" : "campaign.session.turnTrace.noGmCalls")}
        </p>
      )}
      {turn.narration ? <Narration text={turn.narration} id={`${heading}-said`} /> : null}
    </section>
  );
}

function Answered({ lines }: { lines: string[] }) {
  const { t } = useI18n();
  if (!lines.length) {
    return <p className="mt-2 text-xs text-stone-500">{t("campaign.session.turnTrace.noAnsweredLine")}</p>;
  }
  return (
    <div className="mt-2">
      <p className={ui.sectionEyebrow}>{t("campaign.session.turnTrace.answered")}</p>
      <ul className="mt-1 space-y-1">
        {lines.map((line, index) => (
          <li key={index} className="whitespace-pre-wrap break-words border-l-2 border-amber-500/30 pl-2 text-xs text-stone-300">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ row, id }: { row: TraceRow; id: string }) {
  const { t } = useI18n();
  if (row.kind === "reply") {
    return (
      <p className="whitespace-pre-wrap break-words border-l-2 border-stone-600/60 pl-2 text-xs text-stone-300">
        <span className="text-stone-500">{t("campaign.session.turnTrace.gmWrote")}</span>
        {row.text}
      </p>
    );
  }
  if (row.kind === "note") {
    return (
      <p className="whitespace-pre-wrap break-words rounded-md border border-ember-600/30 bg-ember-500/10 px-2 py-1.5 text-xs text-stone-200">
        <span className="font-semibold text-ember-300">
          {t(row.correction ? "campaign.session.turnTrace.engineSentBack" : "campaign.session.turnTrace.engineTold")}
        </span>
        {row.text}
      </p>
    );
  }
  return <CallRow call={row} id={id} />;
}

function CallRow({ call, id }: { call: TraceCall; id: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const mark = OUTCOME[call.outcome];
  const Icon = mark.icon;
  const no = call.outcome === "refused" || call.outcome === "retry";
  return (
    <div className={cn("rounded-md border", no ? "border-ember-600/40 bg-ember-500/5" : "border-stone-700/50")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="pk-tap flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        <span className={cn("mt-px inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold", mark.tone)}>
          <Icon className="size-3.5" aria-hidden="true" />
          {outcomeLabel(call, t)}
        </span>
        <span className="min-w-0 flex-1 text-xs">
          <span className="break-all font-mono text-amber-100">{call.tool}</span>
          <span className="text-stone-400"> {t(SOURCE_KEY[call.source] as never)}</span>
          {call.afterCorrection ? <span className="text-ember-300">{t("campaign.session.turnTrace.afterCorrection")}</span> : null}
          {call.summary || call.names.length ? (
            <span className="block break-words text-stone-400">{call.summary || call.names.join(", ")}</span>
          ) : null}
          {call.sentence ? <span className="block break-words text-stone-200">{call.sentence}</span> : null}
          {no ? (
            <span className="block text-stone-500">
              {t(call.calledAgain ? "campaign.session.turnTrace.calledAgain" : "campaign.session.turnTrace.notCalledAgain")}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn("mt-px size-4 shrink-0 text-stone-500 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div id={id} hidden={!open} className="animate-fade-up space-y-1.5 border-t border-stone-700/50 px-2 py-2">
        <p className={ui.sectionEyebrow}>{t("campaign.session.turnTrace.sentWith")}</p>
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-stone-950/60 p-2 font-mono text-[11px] text-stone-300">
          {call.args || "{}"}
        </pre>
        {call.answer ? (
          <>
            <p className={ui.sectionEyebrow}>{t("campaign.session.turnTrace.engineAnswered")}</p>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-stone-950/60 p-2 font-mono text-[11px] text-stone-300">
              {call.answer}
            </pre>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Narration({ text, id }: { text: string; id: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="pk-tap inline-flex items-center gap-1 rounded-md py-1 text-xs text-stone-300 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        {t("campaign.session.turnTrace.narration")}
      </button>
      <p id={id} hidden={!open} className="animate-fade-up mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-stone-300">
        {text}
      </p>
    </div>
  );
}
