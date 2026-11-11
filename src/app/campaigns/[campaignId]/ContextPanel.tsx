"use client";

import { EmptyState } from "@/components/EmptyState";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { SectionHead } from "@/components/ui/SectionHead";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import type { BlockKind, ContextTrace } from "@/lib/dm/context-budget";

// "What the DM was actually sent." Lead only, because the underlying prompt
// carries DM-only facts and the secret story arc; see the route for why even
// the token counts stay behind that gate.
//
// The point of this panel is answering one question after a bad turn: was the
// thing the DM forgot even in the prompt? A dropped block with a reason is a
// far better answer than guessing at the model.

const KIND_KEY: Record<BlockKind, string> = {
  safety: "campaign.contextTrace.kind.safety",
  contract: "campaign.contextTrace.kind.contract",
  rules: "campaign.contextTrace.kind.rules",
  sky: "campaign.contextTrace.kind.sky",
  state: "campaign.contextTrace.kind.state",
  factions: "campaign.contextTrace.kind.factions",
  quests: "campaign.contextTrace.kind.quests",
  shop: "campaign.contextTrace.kind.shop",
  retrieval: "campaign.contextTrace.kind.retrieval",
  chapters: "campaign.contextTrace.kind.chapters",
  history: "campaign.contextTrace.kind.history",
  tools: "campaign.contextTrace.kind.tools",
};

function localizedBlockReason(reason: string, kind: BlockKind, t: ReturnType<typeof useI18n>["t"]): string {
  if (reason === "always included") return t("campaign.contextTrace.reason.alwaysIncluded");
  if (reason === "fits") return t("campaign.contextTrace.reason.fits");
  const ofKind = reason.match(/^over the ([a-z]+) budget \(([\d,]+) > ([\d,]+) tokens left\)$/);
  if (ofKind) {
    return t("campaign.contextTrace.reason.overKind", {
      kind: t((KIND_KEY[ofKind[1] as BlockKind] ?? KIND_KEY[kind]) as never),
      tokens: ofKind[2],
      remaining: ofKind[3],
    });
  }
  const total = reason.match(/^over the total context budget \(([\d,]+) > ([\d,]+) tokens\)$/);
  if (total) {
    return t("campaign.contextTrace.reason.overTotal", { total: total[1], limit: total[2] });
  }
  return reason;
}

function localizedArcReason(reason: string, t: ReturnType<typeof useI18n>["t"]): string {
  const held = reason.startsWith("held back: ");
  const raw = held ? reason.slice("held back: ".length) : reason;
  const hintMatch = raw.match(/(?:^|; )(no act hint|hinted at act (\d+), (due|ahead))$/);
  const hint = !hintMatch
    ? ""
    : hintMatch[1] === "no act hint"
      ? t("campaign.contextTrace.arcReason.noActHint")
      : t(hintMatch[3] === "due" ? "campaign.contextTrace.arcReason.due" : "campaign.contextTrace.arcReason.ahead", { act: Number(hintMatch[2]) });
  const body = hintMatch ? raw.slice(0, hintMatch.index).replace(/; $/, "") : raw;
  const sceneMatch = body.match(/matches the scene \(([^)]*)\)/);
  const scene = sceneMatch ? t("campaign.contextTrace.arcReason.sceneMatch", { words: sceneMatch[1] }) : "";
  const cause = body
    .replace(/, though it matches the scene \([^)]*\)/, "")
    .replace(/matches the scene \([^)]*\)/, "")
    .replace(/^,\s*/, "");
  let causeText = "";
  const maxEvents = cause.match(/^(\d+) events already shown$/);
  const budget = cause.match(/^over the (\d+)-character event budget$/);
  if (maxEvents) causeText = t("campaign.contextTrace.arcReason.maxEvents", { count: Number(maxEvents[1]) });
  else if (budget) causeText = t("campaign.contextTrace.arcReason.budget", { count: Number(budget[1]) });
  else if (cause && cause !== raw) causeText = cause;
  const detail = [causeText, scene, hint].filter(Boolean).join("; ");
  if (!detail) return reason;
  return held ? t("campaign.contextTrace.arcReason.heldBack", { reason: detail }) : detail;
}

function localizedLoreCause(reason: string, t: ReturnType<typeof useI18n>["t"]): string {
  return reason.split("; ").map((part) => {
    const named = part.match(/^the ask names it \("([^"]+)"\)$/);
    if (named) return t("campaign.contextTrace.loreReason.askNames", { word: named[1] });
    if (part === "the scene names it") return t("campaign.contextTrace.loreReason.sceneNames");
    if (part === "words match") return t("campaign.contextTrace.loreReason.wordsMatch");
    if (part === "meaning matches") return t("campaign.contextTrace.loreReason.meaningMatches");
    return part;
  }).join("; ");
}

function localizedLoreReason(reason: string, t: ReturnType<typeof useI18n>["t"]): string {
  if (reason === "pinned") return t("campaign.contextTrace.loreReason.pinned");
  if (reason === "pinned; held back: over the lore budget") return t("campaign.contextTrace.loreReason.pinnedHeld");
  const budget = reason.match(/^held back: over the lore budget \(rank (\d+), (.+)\)$/);
  if (budget) return t("campaign.contextTrace.loreReason.overBudget", { rank: Number(budget[1]), reason: localizedLoreCause(budget[2], t) });
  const cap = reason.match(/^held back: over the cap of (\d+) entries a turn \((.+)\)$/);
  if (cap) return t("campaign.contextTrace.loreReason.overCap", { count: Number(cap[1]), reason: localizedLoreCause(cap[2], t) });
  const near = reason.match(/^a near match \(rank (\d+)\), not close enough to ride$/);
  if (near) return t("campaign.contextTrace.loreReason.nearMatch", { rank: Number(near[1]) });
  const ranked = reason.match(/^rank (\d+): (.*?)(?:; excerpt (\d+) characters)?$/);
  if (ranked) {
    const base = t("campaign.contextTrace.loreReason.rank", { rank: Number(ranked[1]), reason: localizedLoreCause(ranked[2], t) });
    return ranked[3] ? t("campaign.contextTrace.loreReason.excerpt", { reason: base, count: Number(ranked[3]) }) : base;
  }
  if (reason.startsWith("held back: ")) {
    const inner = reason.slice(11);
    const nearHeld = inner.match(/^a near match \\(rank (\\d+)\\), not close enough to ride$/);
    const detail = nearHeld
      ? t("campaign.contextTrace.loreReason.nearMatch", { rank: Number(nearHeld[1]) })
      : localizedLoreCause(inner, t);
    return t("campaign.contextTrace.loreReason.heldBack", { reason: detail });
  }
  return localizedLoreCause(reason, t);
}

// Palette is stone, amber and ember only (src/app/globals.css remaps the
// Tailwind names); anything outside it renders as raw Tailwind and clashes
// with the indigo-and-gold theme.
const KIND_COLOR: Record<BlockKind, string> = {
  safety: "text-ember-300",
  contract: "text-amber-300",
  rules: "text-stone-300",
  sky: "text-stone-300",
  state: "text-amber-200",
  factions: "text-amber-200",
  quests: "text-amber-200",
  shop: "text-amber-200",
  retrieval: "text-ember-300",
  chapters: "text-ember-400",
  history: "text-stone-200",
  tools: "text-stone-400",
};

export function ContextPanel({ campaignId }: { campaignId: string }) {
  const { t, lang } = useI18n();
  const numberLocale = lang === "ru" ? "ru-RU" : "en-US";
  const [trace, setTrace] = useState<ContextTrace | null>(null);
  const [at, setAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Every state write happens after the await, never synchronously while the
  // effect is running. `reload` is a counter rather than a direct call so the
  // refresh button re-runs the same effect instead of duplicating its logic.
  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((count) => count + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/context-trace`);
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError(response.status === 403 ? t("campaign.contextTrace.error.leadOnly") : t("campaign.contextTrace.error.load"));
          setLoading(false);
          return;
        }
        const data = (await response.json()) as { trace: ContextTrace | null; at?: string };
        if (cancelled) {
          return;
        }
        setError("");
        setTrace(data.trace);
        setAt(data.at ?? "");
      } catch {
        if (!cancelled) {
          setError(t("campaign.contextTrace.error.load"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, reload, t]);

  const pct = trace ? Math.min(100, Math.round((trace.promptTokens / trace.limitTokens) * 100)) : 0;
  const over = trace ? trace.promptTokens > trace.limitTokens : false;

  return (
    <div className="space-y-3 p-3">
      <SectionHead
        title={t("campaign.contextTrace.title")}
        glyph="tab-context"
        aside={
          <button type="button" onClick={load} className={cn(ui.iconAction, "pk-tap pk-always -my-1 inline-flex items-center justify-center")} aria-label={t("campaign.contextTrace.refresh")}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </button>
        }
      />
      <p className="-mt-1 text-xs text-stone-500">
        {t("campaign.contextTrace.lastTurn", { time: at ? new Date(at).toLocaleTimeString(numberLocale) : t("campaign.contextTrace.notAvailable") })}. {t("campaign.contextTrace.tokenCountsAreEstimates")}
      </p>

      {error ? <p className="motion-shake text-xs text-red-400">{error}</p> : null}

      {!error && !loading && !trace ? (
        <EmptyState size="sm" art="scrolls" title={t("campaign.contextTrace.empty")} />
      ) : null}

      {trace ? (
        <>
          <div>
            <div className="mb-1 flex justify-between font-mono text-[11px] text-stone-400">
              <span>
                {trace.promptTokens.toLocaleString(numberLocale)} / {trace.limitTokens.toLocaleString(numberLocale)} {t("campaign.contextTrace.tokens")}
              </span>
              <span className={over ? "text-red-400" : "text-stone-500"}>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
              <div
                className={cn("bar-ease h-full rounded-full", over ? "bg-red-500" : "bg-amber-500/70")}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </div>

          {trace.tuning?.length ? (
            <div className="panel rounded-lg px-2.5 py-1.5 text-xs" data-testid="tuning-trace">
              <span className="whitespace-nowrap font-medium text-amber-200">{t("campaign.contextTrace.fittedToModel")}</span>
              <ul className="mt-1 space-y-0.5">
                {trace.tuning.map((line) => (
                  <li key={line} className="text-[11px] text-stone-400">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {trace.profile && trace.profile.name !== "full" ? (
            <div className="panel rounded-lg px-2.5 py-1.5 text-xs" data-testid="profile-trace">
              <span className="whitespace-nowrap font-medium text-amber-200">
                {trace.profile.name === "compact" ? t("campaign.contextTrace.compactToolSet") : t("campaign.contextTrace.trimmedToolSet")}
              </span>
              {trace.profile.name === "compact" ? (
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {t("campaign.contextTrace.groupsOffered", { groups: trace.profile.groups?.length ? trace.profile.groups.join(", ") : t("campaign.contextTrace.coreOnly") })}
                  {trace.profile.opened?.length ? `; ${t("campaign.contextTrace.openedDuringTurn", { groups: trace.profile.opened.join(", ") })}` : ""}. {t("campaign.contextTrace.moreToolsAway")}
                </p>
              ) : null}
            </div>
          ) : null}

          {trace.calls?.length ? (
            <div className="panel rounded-lg px-2.5 py-1.5 text-xs" data-testid="calls-trace">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="whitespace-nowrap font-medium text-amber-200">{t("campaign.contextTrace.calls")}</span>
                {trace.prefix ? (
                  <span className="shrink-0 font-mono text-[11px] text-stone-400" title={t("campaign.contextTrace.sharedWithLastTurnHelp")}>
                    {trace.prefix.sharedTokens.toLocaleString(numberLocale)}/{trace.prefix.promptTokens.toLocaleString(numberLocale)} {t("campaign.contextTrace.sharedWithLastTurn")}
                  </span>
                ) : null}
              </div>
              <ul className="mt-1 space-y-0.5">
                {trace.calls.map((call, index) => (
                  <li key={`${index}-${call.task}`} className={cn("text-[11px]", call.error ? "text-red-300/90" : "text-stone-400")}>
                    <span className="font-mono text-stone-500">{call.task}</span>{" "}
                    {call.windowTokens
                      ? call.windowAssumed
                        ? t("campaign.contextTrace.call.assumedWindow", { sent: call.promptTokens.toLocaleString(numberLocale), window: call.windowTokens.toLocaleString(numberLocale) })
                        : t("campaign.contextTrace.call.sentWindow", { sent: call.promptTokens.toLocaleString(numberLocale), window: call.windowTokens.toLocaleString(numberLocale) })
                      : t("campaign.contextTrace.call.sentUnmeasured")}
                    {call.toolCount ? t("campaign.contextTrace.call.toolsCount", { count: call.toolCount }) : ""}
                    {call.windowTokens && !call.windowAssumed ? t("campaign.contextTrace.call.replyUpTo", { tokens: call.outputTokens.toLocaleString(numberLocale) }) : ""}
                    {call.reportedInputTokens !== undefined ? t("campaign.contextTrace.call.backendCounted", { tokens: call.reportedInputTokens.toLocaleString(numberLocale) }) : ""}
                    {call.cachedInputTokens !== undefined ? t("campaign.contextTrace.call.cached", { tokens: call.cachedInputTokens.toLocaleString(numberLocale) }) : ""}
                    {call.outputTokensUsed !== undefined ? t("campaign.contextTrace.call.output", { tokens: call.outputTokensUsed.toLocaleString(numberLocale) }) : ""}
                    {call.reasoningTokens !== undefined ? t("campaign.contextTrace.call.reasoning", { tokens: call.reasoningTokens.toLocaleString(numberLocale) }) : ""}
                    {call.durationMs !== undefined ? t("campaign.contextTrace.call.duration", { seconds: (call.durationMs / 1000).toFixed(1) }) : ""}
                    {call.firstTokenMs !== undefined ? t("campaign.contextTrace.call.firstToken", { seconds: (call.firstTokenMs / 1000).toFixed(1) }) : ""}
                    {call.dropped || call.clipped ? t("campaign.contextTrace.call.fitted", { dropped: call.dropped, clipped: call.clipped }) : ""}
                    {call.finishReason && call.finishReason !== "stop" && call.finishReason !== "tool_calls" ? t("campaign.contextTrace.call.ended", { reason: call.finishReason }) : ""}
                    {call.error ? t("campaign.contextTrace.call.failed", { error: call.error }) : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {trace.houseRules ? (
            <div className="panel rounded-lg px-2.5 py-1.5 text-xs" data-testid="house-rules-trace">
              <span className="whitespace-nowrap font-medium text-amber-200">{t("campaign.contextTrace.houseRules")}</span>
              <p className="mt-0.5 text-[11px] text-stone-400">
                {trace.houseRules.shown.length ? t("campaign.contextTrace.shown", { items: trace.houseRules.shown.join("; ") }) : t("campaign.contextTrace.noneShown")}
              </p>
              {trace.houseRules.omitted.length ? (
                <p className="mt-0.5 text-[11px] text-red-300/90">{t("campaign.contextTrace.leftOutForRoom", { items: trace.houseRules.omitted.join("; ") })}</p>
              ) : null}
            </div>
          ) : null}

          {trace.arc ? (
            <div className="panel rounded-lg px-2.5 py-1.5 text-xs" data-testid="arc-trace">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="whitespace-nowrap font-medium text-amber-200">{t("campaign.contextTrace.storyArc")}</span>
                <span className="shrink-0 font-mono text-[11px] text-stone-400">
                  {t("campaign.contextTrace.arcStats", { shown: trace.arc.beats.shown, total: trace.arc.beats.total, chars: trace.arc.chars.toLocaleString(numberLocale), budget: trace.arc.budgetChars.toLocaleString(numberLocale) })}
                </span>
              </div>
              {trace.arc.events.length ? (
                <ul className="mt-1 space-y-0.5">
                  {trace.arc.events.map((pick) => (
                    <li key={pick.id} className={cn("text-[11px]", pick.included ? "text-stone-400" : "text-red-300/90")}>
                      <span className="font-mono text-stone-500">{pick.id}</span> {pick.name}
                      <span className="text-stone-500">: {localizedArcReason(pick.reason, t)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-[11px] text-stone-500">{t("campaign.contextTrace.noPlannedEvents")}</p>
              )}
            </div>
          ) : null}

          {trace.lore ? (
            <div className="panel rounded-lg px-2.5 py-1.5 text-xs" data-testid="lore-trace">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="whitespace-nowrap font-medium text-amber-200">{t("campaign.contextTrace.worldLore")}</span>
                <span className="shrink-0 font-mono text-[11px] text-stone-400">
                  {t("campaign.contextTrace.loreStats", { shown: trace.lore.picks.filter((pick) => pick.included).length, total: trace.lore.picks.filter((pick) => !pick.weak).length, chars: trace.lore.chars.toLocaleString(numberLocale), budget: trace.lore.budgetChars.toLocaleString(numberLocale) })}
                </span>
              </div>
              {trace.lore.picks.length ? (
                <ul className="mt-1 space-y-0.5">
                  {trace.lore.picks.map((pick) => (
                    <li
                      key={pick.id}
                      title={pick.id}
                      data-lore-pick={pick.included ? "kept" : pick.weak ? "near" : "held"}
                      className={cn("text-[11px]", pick.included ? "text-stone-400" : pick.weak ? "text-stone-500" : "text-red-300/90")}
                    >
                      {pick.title}
                      {pick.secret ? <span className="text-ember-300"> ({t("campaign.contextTrace.secret")})</span> : null}
                      <span className="text-stone-500">: {localizedLoreReason(pick.reason, t)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-[11px] text-stone-500">{t("campaign.contextTrace.noLoreEntry")}</p>
              )}
            </div>
          ) : null}

          <ul className="stagger space-y-1">
            {trace.blocks.map((block) => (
              <li
                key={`${block.position}-${block.id}`}
                className={cn(
                  "panel rounded-lg px-2.5 py-1.5 text-xs",
                  !block.included && "border-red-900/50 bg-red-950/20",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("font-medium", KIND_COLOR[block.kind])}>
                    {t(KIND_KEY[block.kind] as never)}
                    <span className="ml-1 font-normal text-stone-500">{block.id}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-stone-400">
                    {block.tokens.toLocaleString(numberLocale)}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    block.included ? "text-stone-500" : "text-red-300",
                  )}
                >
                  {block.included ? localizedBlockReason(block.reason, block.kind, t) : t("campaign.contextTrace.dropped", { reason: localizedBlockReason(block.reason, block.kind, t) })}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
