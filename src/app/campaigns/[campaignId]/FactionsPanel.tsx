"use client";

import { EmptyState } from "@/components/EmptyState";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { appConfirm } from "@/components/ui/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionHead } from "@/components/ui/SectionHead";
import { Slider } from "@/components/ui/Slider";
import { LoreImageField } from "@/app/workshop/lore/LoreFields";
import { GlyphChip, KitButton, LoadFailed, PanelError, PanelLoading, panelField, panelRow } from "./PanelKit";
import { WorldEntryLink, useOpenOnArrival } from "@/app/workshop/world/WorldEntryLink";
import { useUnsavedDraft } from "@/app/workshop/unsaved";
import { useI18n } from "@/lib/i18n/provider";
import { campaignApiErrorText } from "@/lib/i18n/campaignApiError";

// A faction as the editor's draft.
function draftOf(faction: FactionView): Draft {
  return {
    name: faction.name,
    blurb: faction.blurb,
    goal: faction.goal ?? "",
    attitude: faction.attitude,
    power: faction.power ?? 1,
    tags: faction.tags.join(", "),
    portraitPath: faction.portraitPath,
  };
}
import { findLostCreate, readLoad, readWrite, useLoadStatus } from "@/lib/load-state";
import { FACTION_ATTITUDES, REPUTATION_MAX, REPUTATION_MIN, reputationLabel, type FactionAttitude } from "@/lib/dm/faction-logic";
import { DictateField } from "@/components/DictateField";
import { appendDictation } from "@/lib/dictation";

// Factions (docs/vtt-parity-implementation-plan.md section 6): a card per
// faction with its crest, its stance, the party's standing on a ladder
// and the members drawn from the cast. Whoever steers the story edits;
// goal and power are theirs alone.

export type FactionView = {
  id: string;
  name: string;
  blurb: string;
  attitude: FactionAttitude;
  tags: string[];
  portraitPath: string;
  standing: number;
  standingLabel: string;
  members: Array<{ id: string; name: string; portraitUrl: string }>;
  goal?: string;
  power?: number;
};

type Draft = { name: string; blurb: string; goal: string; attitude: FactionAttitude; power: number; tags: string; portraitPath: string };

const blank = (): Draft => ({ name: "", blurb: "", goal: "", attitude: "neutral", power: 1, tags: "", portraitPath: "" });

// The attitude ladder has five painted faces; anything a pack adds beyond
// them reads as neutral rather than as a broken image.
const ATTITUDE_GLYPHS = new Set(["allied", "friendly", "neutral", "wary", "hostile"]);
const attitudeGlyph = (attitude: string) => `attitude-${ATTITUDE_GLYPHS.has(attitude) ? attitude : "neutral"}`;

export function FactionsPanel({
  campaignId,
  steersStory,
  refreshKey = 0,
  openId,
  onWorldEntry,
  workshop = false,
}: {
  campaignId: string;
  steersStory: boolean;
  refreshKey?: number;
  // In the workshop only (src/app/workshop/world/WorldEntryLink.tsx): the
  // record to open on arrival, and the way to its WorldForge entry.
  openId?: string | null;
  onWorldEntry?: (id: string) => void;
  // A workshop has no party to stand with a faction (issue 553): standing is
  // the table's play and no import carries it. The faction's attitude is
  // how prep says where it starts, and that travels.
  workshop?: boolean;
}) {
  const { t } = useI18n();
  const attitudeLabels: Record<FactionAttitude, string> = {
    hostile: t("campaign.factions.attitude.hostile"),
    wary: t("campaign.factions.attitude.wary"),
    neutral: t("campaign.factions.attitude.neutral"),
    friendly: t("campaign.factions.attitude.friendly"),
    allied: t("campaign.factions.attitude.allied"),
  };
  const reputationLabels: Record<string, string> = {
    hunted: t("campaign.factions.reputation.hunted"),
    disliked: t("campaign.factions.reputation.disliked"),
    suspected: t("campaign.factions.reputation.suspected"),
    unknown: t("campaign.factions.reputation.unknown"),
    noticed: t("campaign.factions.reputation.noticed"),
    trusted: t("campaign.factions.reputation.trusted"),
    honoured: t("campaign.factions.reputation.honoured"),
  };
  const localReputation = (label: string) => reputationLabels[label] ?? label;
  const showsStanding = !workshop;
  const [factions, setFactions] = useState<FactionView[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  // A refused list is shown in the server's words, never as "no factions
  // yet" (issue 140); the rows stay up when a later read fails.
  const { loaded, loadError, settle } = useLoadStatus();

  useEffect(() => {
    let cancelled = false;
    readLoad<{ factions?: FactionView[] }>(fetch(`/api/campaigns/${campaignId}/factions`), t("campaign.factions.load.label")).then((outcome) => {
      if (cancelled) {
        return;
      }
      settle(outcome);
      if (outcome.payload) {
        setFactions(outcome.payload.factions ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, refreshKey, reload, settle, t]);

  function startEdit(faction: FactionView) {
    setError("");
    setDraft(draftOf(faction));
    setEditing(faction.id);
  }

  // In the workshop, an editor with changes is asked about before leaving.
  const openFaction = editing && editing !== "new" ? factions?.find((faction) => faction.id === editing) ?? null : null;
  useUnsavedDraft(
    Boolean(onWorldEntry) && editing !== null &&
      JSON.stringify(draft) !== JSON.stringify(openFaction ? draftOf(openFaction) : blank()),
  );

  useOpenOnArrival(openId, steersStory ? factions : null, startEdit);

  // Every write says what the server refused, or that it was not reached
  // (WA-05); a refused save used to close nothing and say nothing. With no
  // answer a change may have landed, so the list is read again, and the
  // editor keeps the draft.
  async function save() {
    if (!draft.name.trim()) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { ...draft, tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean) };
      const creating = editing === "new";
      const sent = await readWrite(
        fetch(creating ? `/api/campaigns/${campaignId}/factions` : `/api/campaigns/${campaignId}/factions/${editing}`, {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        t("campaign.factions.error.save"),
        (body, status) => campaignApiErrorText(body, t("campaign.factions.error.save"), t),
      );
      if (sent.error !== null) {
        // A new faction whose answer was lost is looked for first: the
        // server takes a second one of the same name, so a blind second
        // press would make two.
        if (sent.unanswered && creating) {
          const name = draft.name.trim();
          const reread = async () =>
            (await readLoad<{ factions?: FactionView[] }>(fetch(`/api/campaigns/${campaignId}/factions`), t("campaign.factions.load.label"))).payload?.factions ?? null;
          const found = await findLostCreate(loaded ? factions : null, reread, (faction) => faction.name === name);
          setReload((current) => current + 1);
          if (found === "made") {
            setEditing(null);
            return;
          }
          setError(
            found === "missing"
              ? t("campaign.factions.error.saveMissing")
              : t("campaign.factions.error.saveUnknown"),
          );
          return;
        }
        setError(sent.unanswered ? t("campaign.factions.error.saveUnanswered", { error: sent.error }) : sent.error);
        if (sent.unanswered) setReload((current) => current + 1);
        return;
      }
      setEditing(null);
      setReload((current) => current + 1);
    } finally {
      setBusy(false);
    }
  }

  async function remove(faction: FactionView) {
    if (!(await appConfirm(t("campaign.factions.confirm.remove", { name: faction.name }), { actionLabel: t("campaign.factions.confirm.removeAction"), tone: "danger" }))) {
      return;
    }
    setError("");
    const sent = await readWrite(
      fetch(`/api/campaigns/${campaignId}/factions/${faction.id}`, { method: "DELETE" }),
      t("campaign.factions.error.remove"),
      (body, status) => campaignApiErrorText(body, t("campaign.factions.error.remove"), t),
    );
    setError(sent.error ?? "");
    setReload((current) => current + 1);
  }

  async function setStanding(faction: FactionView, standing: number) {
    setError("");
    const sent = await readWrite(
      fetch(`/api/campaigns/${campaignId}/factions/${faction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standing }),
      }),
      t("campaign.factions.error.standing"),
      (body, status) => campaignApiErrorText(body, t("campaign.factions.error.standing"), t),
    );
    setError(sent.error ?? "");
    setReload((current) => current + 1);
  }

  if (factions === null) {
    return loadError ? <LoadFailed error={loadError} onRetry={() => setReload((current) => current + 1)} /> : <PanelLoading label={t("campaign.factions.loading")} />;
  }
  return (
    <div className="space-y-2">
      {loaded && loadError ? <LoadFailed error={loadError} onRetry={() => setReload((current) => current + 1)} /> : null}
      <SectionHead
        title={t("campaign.factions.title")}
        glyph="tab-factions"
        aside={
          steersStory && editing === null ? (
            <KitButton
              onClick={() => {
                setError("");
                setDraft(blank());
                setEditing("new");
              }}
              data-tour="factions-add"
            >
              <Plus className="size-3.5" /> {t("campaign.factions.addOne")}
            </KitButton>
          ) : factions.length ? (
            factions.length
          ) : null
        }
      />
      {error ? <PanelError>{error}</PanelError> : null}
      {editing !== null ? (
        <div className="panel reveal space-y-1.5 rounded-lg p-2.5">
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={80} placeholder={t("campaign.factions.name.placeholder")} aria-label={t("campaign.factions.name.label")} className={panelField} />
          <DictateField label={t("campaign.factions.blurb.label")} onTranscript={(text) => setDraft((current) => ({ ...current, blurb: appendDictation(current.blurb, text, 400) }))}>
            <textarea value={draft.blurb} onChange={(event) => setDraft({ ...draft, blurb: event.target.value })} rows={2} maxLength={400} placeholder={t("campaign.factions.blurb.label")} aria-label={t("campaign.factions.blurb.label")} className={panelField} />
          </DictateField>
          <DictateField label={t("campaign.factions.goal.label")} onTranscript={(text) => setDraft((current) => ({ ...current, goal: appendDictation(current.goal, text, 400) }))}>
            <textarea value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} rows={2} maxLength={400} placeholder={t("campaign.factions.goal.placeholder")} aria-label={t("campaign.factions.goal.placeholder")} className={cn(panelField, "border-violet-900/60 focus:border-violet-500/70")} />
          </DictateField>
          <div data-pill-group="" role="group" aria-label={t("campaign.factions.attitude.label")} className="flex flex-wrap items-center gap-1">
            {FACTION_ATTITUDES.map((attitude) => (
              <button data-on={draft.attitude === attitude ? "" : undefined} key={attitude} type="button" aria-pressed={draft.attitude === attitude} onClick={() => setDraft({ ...draft, attitude })} className="pk-pill pk-tap motion-press capitalize">
                <GameIcon icon={{ kind: "glyph", key: attitudeGlyph(attitude) }} size="size-4" />
                {attitudeLabels[attitude]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>{t("campaign.factions.power.label")}</span>
            <Slider min={0} max={5} value={draft.power} onChange={(power) => setDraft({ ...draft, power })} label={t("campaign.factions.power.label")} className="min-w-0 flex-1" />
            <span key={draft.power} className="count-pop w-4 text-right tabular-nums text-stone-200">{draft.power}</span>
          </div>
          <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder={t("campaign.factions.tags.placeholder")} aria-label={t("campaign.factions.tags.placeholder")} className={panelField} />
          <LoreImageField imagePath={draft.portraitPath} onChange={(portraitPath) => setDraft({ ...draft, portraitPath })} />
          <div className="flex gap-1.5">
            <KitButton tone="primary" disabled={busy || !draft.name.trim()} busy={busy} onClick={() => void save()}>
              {editing === "new" ? t("campaign.factions.action.add") : t("campaign.factions.action.save")}
            </KitButton>
            <KitButton
              onClick={() => {
                setEditing(null);
                setError("");
              }}
            >
              <X className="size-3.5" /> {t("campaign.factions.action.cancel")}
            </KitButton>
            {onWorldEntry && editing !== "new" ? <WorldEntryLink onOpen={() => onWorldEntry(editing)} /> : null}
          </div>
        </div>
      ) : null}
      {!factions.length && editing === null ? <EmptyState
          size="sm"
          art="board"
          title={t("campaign.factions.empty.title")}
          hint={
            steersStory
              ? workshop
                ? t("campaign.factions.empty.hint.workshop")
                : t("campaign.factions.empty.hint.session")
              : undefined
          }
        /> : null}
      <ul className="stagger space-y-1.5" data-tour="factions-list">
        {factions.map((faction) => {
          const items: ContextMenuItem[] = steersStory
            ? [
                { id: "edit", label: t("campaign.factions.menu.edit"), glyph: "ui-edit", onSelect: () => startEdit(faction) },
                ...(showsStanding ? Array.from({ length: REPUTATION_MAX - REPUTATION_MIN + 1 }, (_, index) => REPUTATION_MIN + index) : []).map((step, index) => ({
                  id: `standing-${step}`,
                  label: t("campaign.factions.menu.standing", { score: `${step > 0 ? "+" : ""}${step}`, reputation: localReputation(reputationLabel(step)) }),
                  glyph: step < 0 ? "attitude-hostile" : step === 0 ? "attitude-neutral" : "attitude-friendly",
                  separated: index === 0,
                  disabled: step === faction.standing,
                  onSelect: () => void setStanding(faction, step),
                })),
                { id: "remove", label: t("campaign.factions.menu.remove", { name: faction.name }), glyph: "ui-delete", tone: "danger" as const, separated: true, onSelect: () => void remove(faction) },
              ]
            : [];
          return (
            <ContextMenu as="li" key={faction.id} items={items} label={faction.name} className={panelRow}>
              <div className="flex items-start gap-2">
                {faction.portraitPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={faction.portraitPath} alt="" className="size-11 shrink-0 rounded-md border border-amber-500/40 object-cover shadow-[0_2px_8px_rgba(4,2,12,0.5)]" />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-amber-500/25 bg-stone-900/70">
                    <GameIcon icon={{ kind: "glyph", key: "system-factions" }} size="size-8" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-medium text-stone-100">
                    <span className="min-w-0 truncate">{faction.name}</span>
                    <GlyphChip glyph={attitudeGlyph(faction.attitude)} className="capitalize">{attitudeLabels[faction.attitude]}</GlyphChip>
                    {faction.power !== undefined ? <span className="text-[11px] font-normal text-violet-300">{t("campaign.factions.power.value", { power: faction.power })}</span> : null}
                  </p>
                  {faction.blurb ? <p className="reveal text-xs leading-5 text-stone-400">{faction.blurb}</p> : null}
                  {faction.goal ? <p className="reveal text-xs italic leading-5 text-violet-300/80">{t("campaign.factions.goal.value", { goal: faction.goal })}</p> : null}
                  {showsStanding ? (
                    <div className="mt-1 flex items-center gap-1" title={t("campaign.factions.standing.title", { standing: localReputation(faction.standingLabel) })}>
                      {Array.from({ length: REPUTATION_MAX - REPUTATION_MIN + 1 }, (_, index) => REPUTATION_MIN + index).map((step) => (
                        <button
                          key={step}
                          type="button"
                          disabled={!steersStory}
                          onClick={() => void setStanding(faction, step)}
                          aria-label={t("campaign.factions.standing.aria", { step })}
                          aria-pressed={step === faction.standing}
                          className={cn(
                            "bar-ease h-2.5 w-3.5 rounded-sm enabled:hover:brightness-125 motion-press",
                            step === 0 ? "bg-stone-600" : step < 0 ? (step >= faction.standing ? "bg-red-500/80" : "bg-stone-800") : step <= faction.standing ? "bg-amber-400" : "bg-stone-800",
                          )}
                        />
                      ))}
                      <span key={faction.standing} className="count-pop ml-1 text-[11px] text-stone-400">{localReputation(reputationLabel(faction.standing))}</span>
                    </div>
                  ) : null}
                  {faction.members.length ? (
                    <p className="reveal mt-1 text-[11px] text-stone-500">{t("campaign.factions.members", { members: faction.members.map((member) => member.name).join(", ") })}</p>
                  ) : null}
                </div>
                {steersStory ? (
                  <span className="flex shrink-0 flex-col items-center gap-0.5">
                    <KitButton onClick={() => startEdit(faction)}>
                      <Pencil className="size-3" /> {t("campaign.factions.menu.edit")}
                    </KitButton>
                    <KitButton tone="iconDanger" always onClick={() => void remove(faction)} aria-label={t("campaign.factions.menu.remove", { name: faction.name })}>
                      <Trash2 className="size-3.5" />
                    </KitButton>
                  </span>
                ) : null}
              </div>
            </ContextMenu>
          );
        })}
      </ul>
    </div>
  );
}
