"use client";

import { Check, ListOrdered, Loader2, Minus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { SectionHead } from "@/components/ui/SectionHead";
import { PanelError, kitButtonClass, panelField } from "./PanelKit";
import { SequenceEditor } from "./SequenceEditor";
import {
  PLAN_MAX_CHARS,
  orderKey,
  sequenceOf,
  unconfirmedOrder,
  waitingOn,
  type CoordinationEntry,
  type CoordinationPhase,
  type PlanSequence,
} from "@/lib/dm/coordination-logic";

// The plan the party is coordinating (issue 254), above the composer for
// every seat. Each player drafts a line per character they control, changes
// it until they mark it Ready, or passes; anyone in the plan may ask a
// companion for something; the lead can resolve it early (the missing pass)
// or set it aside. What each character means to do is shown to the whole
// party, so they can fit their moves together. Nothing reaches the DM until
// the plan resolves (src/lib/dm/coordination.ts). When the lead puts the
// plan in order (issue 292) every seat sees it as numbered steps, and a
// player whose Ready the new order took back is told where they stand now.

export function CoordinationPanel({
  campaignId,
  phase,
  meUserId,
  steersStory,
}: {
  campaignId: string;
  phase: CoordinationPhase;
  meUserId: string;
  steersStory: boolean;
}) {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The lead's order being edited, before it is saved for everyone.
  const [ordering, setOrdering] = useState<PlanSequence | null>(null);
  const waiting = waitingOn(phase);
  const mine = phase.entries.some((entry) => !entry.companion && entry.userId === meUserId);
  const sequence = sequenceOf(phase);
  const unconfirmed = unconfirmedOrder(phase);
  const byId = new Map(phase.entries.map((entry) => [entry.characterId, entry]));
  const stateWords: Record<CoordinationEntry["state"], string> = {
    waiting: t("campaign.session.coordination.state.waiting"),
    drafting: t("campaign.session.coordination.state.drafting"),
    ready: t("campaign.session.coordination.state.ready"),
    pass: t("campaign.session.coordination.state.pass"),
  };
  const joinNames = (names: string[]) =>
    names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`;
  const placeDescription = (characterId: string) => {
    if (!sequence) return t("campaign.session.coordination.position.everyone");
    const at = sequence.findIndex((step) => step.includes(characterId));
    if (at < 0) return "";
    const before = sequence.slice(0, at).flat().map((id) => byId.get(id)?.name ?? id);
    const alongside = sequence[at].filter((id) => id !== characterId).map((id) => byId.get(id)?.name ?? id);
    const position = before.length
      ? t("campaign.session.coordination.position.after", { names: joinNames(before) })
      : t("campaign.session.coordination.position.first");
    const together = alongside.length
      ? t("campaign.session.coordination.position.alongside", { names: joinNames(alongside) })
      : "";
    return t("campaign.session.coordination.position.summary", { step: at + 1, steps: sequence.length, position, together });
  };
  const errorText = (message?: string) => {
    if (!message) return t("campaign.session.coordination.error.generic");
    const sessionEnd = " is over. Use OOC for table talk until the next session starts.";
    if (message.startsWith("Session ") && message.endsWith(sessionEnd)) {
      return t("campaign.session.coordination.error.sessionOver", { number: message.slice(8, -sessionEnd.length) });
    }
    const companionEnd = " is an AI companion; stage a request for them instead.";
    if (message.endsWith(companionEnd)) {
      return t("campaign.session.coordination.error.companionRequest", { name: message.slice(0, -companionEnd.length) });
    }
    const ownerEnd = "'s player stages their part.";
    if (message.startsWith("Only ") && message.endsWith(ownerEnd)) {
      return t("campaign.session.coordination.error.onlyOwner", { name: message.slice(5, -ownerEnd.length) });
    }
    const describeStart = "Say what ";
    const describeEnd = " does before marking it ready, or pass.";
    if (message.startsWith(describeStart) && message.endsWith(describeEnd)) {
      return t("campaign.session.coordination.error.mustDescribe", { name: message.slice(describeStart.length, -describeEnd.length) });
    }
    if (message.startsWith("The order changed after ")) {
      return t("campaign.session.coordination.error.waitForChangedOrder", { names: joinNames(unconfirmed) });
    }
    const exact: Record<string, string> = {
      "Invalid request.": t("campaign.session.coordination.error.invalidRequest"),
      "Whoever steers the story opens a coordinated plan.": t("campaign.session.coordination.error.mustSteerOpen"),
      "Whoever steers the story sets the plan's order.": t("campaign.session.coordination.error.mustSteerOrder"),
      "Only the lead resolves the plan early.": t("campaign.session.coordination.error.onlyLeadResolve"),
      "Only the lead sets the plan aside.": t("campaign.session.coordination.error.onlyLeadSetAside"),
      "The party is not coordinating right now.": t("campaign.session.coordination.error.notCoordinating"),
      "Coordinated actions are for a table the AI narrates; a GM in the seat already takes the party's moves together.": t("campaign.session.coordination.error.aiOnly"),
      "The adventure has not started yet.": t("campaign.session.coordination.error.adventureNotStarted"),
      "A fight is running; the initiative order takes the turns now.": t("campaign.session.coordination.error.fightRunning"),
      "The party is already coordinating; resolve or set aside that plan first.": t("campaign.session.coordination.error.alreadyOpen"),
      "Pick at least one player's character to coordinate.": t("campaign.session.coordination.error.pickPlayer"),
      "The order must name each character in the plan once.": t("campaign.session.coordination.error.orderInvalid"),
      "Only a player in the plan may ask a companion for something.": t("campaign.session.coordination.error.onlyPlayerRequest"),
      "This plan has already been resolved or set aside.": t("campaign.session.coordination.error.planEnded"),
      "The lead has just changed the order. Look at where your character stands now, then mark it Ready.": t("campaign.session.coordination.error.orderChanged"),
      "That character is not part of this plan.": t("campaign.session.coordination.error.characterMissing"),
      "Requests are for the AI companions in the plan.": t("campaign.session.coordination.error.requestsCompanions"),
    };
    return exact[message] ?? t("campaign.session.coordination.error.generic");
  };

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/coordination`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(errorText(data.error));
        return false;
      }
      return true;
    } catch {
      setError(t("campaign.session.coordination.error.network"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const draftOf = (entry: CoordinationEntry) => drafts[entry.characterId] ?? entry.text;
  const setDraft = (entry: CoordinationEntry, text: string) =>
    setDrafts((current) => ({ ...current, [entry.characterId]: text.slice(0, PLAN_MAX_CHARS) }));
  const settle = async (entry: CoordinationEntry, state: "drafting" | "ready" | "pass") => {
    if (await send({ action: "plan", characterId: entry.characterId, text: draftOf(entry), state, orderSeen: orderKey(phase) })) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[entry.characterId];
        return next;
      });
    }
  };

  const saveOrder = async (next: PlanSequence | null) => {
    if (await send({ action: "order", sequence: next })) {
      setOrdering(null);
    }
  };

  // Each character's line in the plan.
  const entryRow = (entry: CoordinationEntry): ReactNode => {
    const own = !entry.companion && entry.userId === meUserId;
    const settled = entry.state === "ready" || entry.state === "pass";
    return (
      <li
        key={entry.characterId}
        data-coordination-entry={entry.characterId}
        data-state={entry.state}
        data-order-changed={entry.orderChanged ? "" : undefined}
        className={cn(
          "rounded-md border px-2.5 py-2 transition-colors duration-200",
          entry.state === "ready"
            ? "border-emerald-700/50 bg-emerald-950/15"
            : entry.orderChanged
              ? "border-amber-500/60 bg-amber-950/20"
              : "border-stone-800 bg-stone-950/40",
        )}
      >
        <div className="flex items-center gap-1.5 text-xs">
          {entry.state === "ready" ? (
            <Check className="motion-pop size-3.5 text-emerald-400" aria-hidden="true" />
          ) : entry.state === "pass" ? (
            <Minus className="size-3.5 text-stone-500" aria-hidden="true" />
          ) : (
            <span className="inline-block size-3.5 text-center text-[10px] leading-3 text-amber-300" aria-hidden="true">
              ...
            </span>
          )}
          <span className="font-medium text-stone-200">{entry.name}</span>
          <span className="text-[11px] text-stone-500">
            {entry.companion
              ? entry.text
                ? t("campaign.session.coordination.companion.asked", { name: entry.requestedBy ?? t("campaign.session.coordination.theParty") })
                : t("campaign.session.coordination.companion.acts")
              : entry.orderChanged
                ? t("campaign.session.coordination.checkingOrder")
                : stateWords[entry.state]}
          </span>
        </div>

        {own && entry.orderChanged ? (
          <p role="status" className="motion-pop mt-1.5 rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-100" data-order-notice>
            {t("campaign.session.coordination.orderChanged", { name: entry.name, place: placeDescription(entry.characterId) })}
          </p>
        ) : null}

        {own && !settled ? (
          <div className="mt-1.5 space-y-1.5">
            <textarea
              value={draftOf(entry)}
              onChange={(event) => setDraft(entry, event.target.value)}
              rows={2}
              maxLength={PLAN_MAX_CHARS}
              placeholder={
                sequence
                  ? t("campaign.session.coordination.draft.atStep", { name: entry.name })
                  : t("campaign.session.coordination.draft.prompt", { name: entry.name })
              }
              aria-label={t("campaign.session.coordination.draft.aria", { name: entry.name })}
              className={cn(panelField, "w-full resize-y text-xs")}
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={busy || !draftOf(entry).trim()}
                onClick={() => void settle(entry, "ready")}
                className={kitButtonClass("primary")}
                data-coordination-ready
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t("campaign.session.coordination.ready")}
              </button>
              <button
                type="button"
                disabled={busy || draftOf(entry) === entry.text}
                onClick={() => void settle(entry, "drafting")}
                className={kitButtonClass("small")}
              >
                {t("campaign.session.coordination.shareDraft")}
              </button>
              <button type="button" disabled={busy} onClick={() => void settle(entry, "pass")} className={kitButtonClass("small")} data-coordination-pass>
                {t("campaign.session.coordination.pass")}
              </button>
            </div>
          </div>
        ) : entry.text ? (
          <p className="mt-1 whitespace-pre-wrap text-xs text-stone-300" data-coordination-text>
            {entry.text}
          </p>
        ) : null}

        {own && settled ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void send({ action: "plan", characterId: entry.characterId, state: "drafting" })}
            className={cn(kitButtonClass("small"), "mt-1.5")}
            data-coordination-change
          >
            {t("campaign.session.coordination.change")}
          </button>
        ) : null}

        {entry.companion && mine ? (
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={draftOf(entry)}
              onChange={(event) => setDraft(entry, event.target.value)}
              maxLength={PLAN_MAX_CHARS}
              placeholder={t("campaign.session.coordination.companion.prompt", { name: entry.name })}
              aria-label={t("campaign.session.coordination.companion.aria", { name: entry.name })}
              className={cn(panelField, "w-auto min-w-0 flex-1 text-xs")}
            />
            <button
              type="button"
              disabled={busy || draftOf(entry) === entry.text}
              onClick={async () => {
                if (await send({ action: "request", characterId: entry.characterId, text: draftOf(entry) })) {
                  setDrafts((current) => {
                    const next = { ...current };
                    delete next[entry.characterId];
                    return next;
                  });
                }
              }}
              className={kitButtonClass("small", "shrink-0")}
              data-coordination-request
            >
              {t(draftOf(entry).trim() ? "campaign.session.coordination.companion.ask" : "campaign.session.coordination.companion.withdraw")}
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <section className="panel ornate reveal mb-2 rounded-lg border-amber-500/40 p-3" data-coordination={phase.id} data-ordered={sequence ? "" : undefined} aria-label={t("campaign.session.coordination.aria")}>
      <SectionHead
        title={t("campaign.session.coordination.title")}
        glyph="tab-party"
        level="h3"
        aside={waiting.length ? t("campaign.session.coordination.waitingOn", { count: waiting.length }) : t("campaign.session.coordination.allReady")}
      />
      <p className="mb-2 text-xs text-stone-400">
        {phase.prompt ? <span className="mr-1 font-serif italic text-amber-200/80">{phase.prompt}</span> : null}
        {t(sequence ? "campaign.session.coordination.description.ordered" : "campaign.session.coordination.description.together")}
      </p>
      {sequence ? (
        <ol className="stagger space-y-2" aria-label={t("campaign.session.coordination.order.aria")}>
          {sequence.map((ids, index) => {
            const members = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
            const passedBefore = sequence
              .slice(0, index)
              .flat()
              .flatMap((id) => (byId.get(id)?.state === "pass" ? [byId.get(id)!.name] : []));
            return (
              <li key={`step-${index}-${ids.join("+")}`} data-coordination-step={index + 1} className="reveal">
                <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wide text-amber-200/80">
                  <span className="rounded-full border border-amber-500/40 px-1.5 font-medium tabular-nums">{index + 1}</span>
                  {index === 0 ? t("campaign.session.coordination.step.first") : t("campaign.session.coordination.step.after", { step: index })}
                  {members.length > 1 ? <span className="normal-case tracking-normal text-stone-400">{t("campaign.session.coordination.step.sameTime")}</span> : null}
                </p>
                {passedBefore.length ? (
                  <p className="mb-1 text-[11px] text-amber-300/80" data-step-pass-note>
                    {t("campaign.session.coordination.step.passedBefore", { names: joinNames(passedBefore) })}
                  </p>
                ) : null}
                <ul className="space-y-2">{members.map(entryRow)}</ul>
              </li>
            );
          })}
        </ol>
      ) : (
        <ul className="stagger space-y-2">{phase.entries.map(entryRow)}</ul>
      )}

      {steersStory && ordering ? (
        <div className="reveal mt-2 rounded-md border border-amber-500/30 bg-stone-950/50 p-2" data-coordination-ordering>
          <p className="mb-1.5 text-[11px] text-stone-400">
            {t("campaign.session.coordination.order.help")}
          </p>
          <SequenceEditor
            items={phase.entries.map((entry) => ({ id: entry.characterId, name: entry.name, companion: entry.companion }))}
            sequence={ordering}
            onChange={setOrdering}
            disabled={busy}
            label={t("campaign.session.leadFloor.order.editor")}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveOrder(ordering.length > 1 ? ordering : null)}
              className={kitButtonClass("primary")}
              data-coordination-save-order
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t(ordering.length > 1 ? "campaign.session.coordination.order.save" : "campaign.session.coordination.order.saveTogether")}
            </button>
            {sequence ? (
              <button type="button" disabled={busy} onClick={() => void saveOrder(null)} className={kitButtonClass("small")} data-coordination-clear-order>
                {t("campaign.session.coordination.order.allAtOnce")}
              </button>
            ) : null}
            <button type="button" disabled={busy} onClick={() => setOrdering(null)} className={kitButtonClass("small")}>
              {t("campaign.session.coordination.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {steersStory ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {!ordering ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setOrdering(sequence ?? phase.entries.map((entry) => [entry.characterId]))}
              className={kitButtonClass("small")}
              data-coordination-order
            >
              <ListOrdered className="size-3.5" />
              {t(sequence ? "campaign.session.coordination.order.change" : "campaign.session.coordination.order.set")}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || unconfirmed.length > 0}
            onClick={() => void send({ action: "resolve" })}
            className={kitButtonClass("small")}
            title={
              unconfirmed.length
                ? t("campaign.session.coordination.resolve.waitForOrder", { names: joinNames(unconfirmed) })
                : waiting.length
                  ? t("campaign.session.coordination.resolve.waitingWillPass", { names: joinNames(waiting) })
                  : t("campaign.session.coordination.resolve.tooltip")
            }
            data-coordination-resolve
          >
            {waiting.length ? t("campaign.session.coordination.resolve.withPass", { names: joinNames(waiting) }) : t("campaign.session.coordination.resolve.button")}
          </button>
          <button type="button" disabled={busy} onClick={() => void send({ action: "cancel" })} className={kitButtonClass("small")} data-coordination-cancel>
            {t("campaign.session.coordination.setAside")}
          </button>
        </div>
      ) : null}
      {steersStory && unconfirmed.length ? (
        <p className="motion-pop mt-1.5 text-[11px] text-amber-300" role="status" data-order-waiting>
          {t("campaign.session.coordination.waitForOrder", { names: joinNames(unconfirmed) })}
        </p>
      ) : null}
      {error ? <PanelError className="mt-1.5">{error}</PanelError> : null}
    </section>
  );
}
