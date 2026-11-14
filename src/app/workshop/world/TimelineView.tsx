"use client";

import { CalendarPlus, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";
import { ui } from "@/lib/ui";
import { Select } from "@/components/ui/Select";
import { appConfirm } from "@/components/ui/ConfirmDialog";
import { KitButton } from "@/app/campaigns/[campaignId]/PanelKit";
import { CANON_STATES, newId, type Calendar, type WorldEvent } from "@/lib/worldforge/model";
import { absoluteYear, formatYear, lifespan, sortEvents } from "@/lib/worldforge/time";
import type { WorldApi, WorldState } from "./useWorld";
import { EntityAvatar, EntityPicker, typeOf } from "./world-ui";

// The timeline, after WorldForge's: calendars are reckonings, each with an
// offset that places its year 0 on one shared line, so an event dated in one
// reads in all of them. Events run in that line's order, grouped by era, and
// a person named in an event outside their own life is flagged.

const blankEvent = (calendarId: string): WorldEvent => ({ id: "", title: "", body: "", era: "", when: { calendarId, yearNum: null, year: "" }, refs: [], canon: "canon" });

export function TimelineView({ api, world, onOpen }: { api: WorldApi; world: WorldState; onOpen: (ref: string) => void }) {
  const { t, tp } = useI18n();
  const { doc, entities } = world;
  const [editing, setEditing] = useState<WorldEvent | null>(null);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const byRef = useMemo(() => new Map(entities.map((entity) => [entity.ref, entity])), [entities]);
  const events = sortEvents(doc.events, doc.calendars);
  const eras = [...new Set(doc.events.map((event) => event.era).filter(Boolean))];

  async function saveEvent(event: WorldEvent) {
    const id = event.id || newId("ev");
    await api.patch({ events: [...doc.events.filter((entry) => entry.id !== id), { ...event, id }] });
    setEditing(null);
  }
  async function saveCalendar(next: Calendar) {
    const id = next.id || newId("cal");
    await api.patch({ calendars: [...doc.calendars.filter((entry) => entry.id !== id), { ...next, id }] });
    setCalendar(null);
  }
  async function dropCalendar(entry: Calendar) {
    if (await appConfirm(t("workshop.world.timeline.calendar.remove.body"), { title: t("workshop.world.timeline.calendar.remove.title", { name: entry.name }), actionLabel: t("workshop.world.timeline.remove") })) {
      await api.patch({ calendars: doc.calendars.filter((other) => other.id !== entry.id) });
    }
  }

  // An era's heading stands over its first event in the line.
  const headers = events.map((event, index) => {
    const before = events.slice(0, index).reverse().find((entry) => entry.era)?.era ?? null;
    return event.era && event.era !== before ? event.era : null;
  });
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center gap-2" aria-label={t("workshop.world.timeline.calendars")}>
        <span className="eyebrow text-[10px] text-stone-500">{t("workshop.world.timeline.calendars")}</span>
        {doc.calendars.map((entry) => (
          <span key={entry.id} className="pk-chip motion-pop group text-[11px]">
            <span className="text-amber-100">{entry.abbrev || entry.name}</span>
            <span className="text-stone-500">{entry.name}{entry.epochOffset ? `, ${t("workshop.world.timeline.calendar.yearZero", { year: entry.epochOffset })}` : ""}</span>
            <button type="button" aria-label={t("workshop.world.timeline.calendar.edit", { name: entry.name })} onClick={() => setCalendar(entry)} className="reveal-on-hover text-stone-500 hover:text-amber-200">
              <Pencil className="size-3" />
            </button>
            <button type="button" aria-label={t("workshop.world.timeline.calendar.remove.aria", { name: entry.name })} onClick={() => dropCalendar(entry)} className="reveal-on-hover text-stone-500 hover:text-red-300">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <KitButton tone="link" onClick={() => setCalendar({ id: "", name: "", abbrev: "", epochOffset: 0, notes: "" })}>
          <CalendarPlus className="size-3.5" /> {t("workshop.world.timeline.calendar.add")}
        </KitButton>
      </section>
      {calendar ? <CalendarForm calendar={calendar} onSave={saveCalendar} onCancel={() => setCalendar(null)} /> : null}
      <p className="text-[11px] text-stone-500">
        {t("workshop.world.timeline.explanation")}
      </p>

      <div className="flex justify-between">
        <h3 className="eyebrow text-[10px] text-amber-400/80">{tp("workshop.world.timeline.events", events.length)}</h3>
        <KitButton tone="primary" onClick={() => setEditing(blankEvent(doc.calendars[0]?.id ?? ""))} data-tour="world-new-event">
          <Plus className="size-3.5" /> {t("workshop.world.timeline.event.add")}
        </KitButton>
      </div>
      {editing && !editing.id ? <EventForm event={editing} world={world} eras={eras} onSave={saveEvent} onCancel={() => setEditing(null)} /> : null}

      <ol className="relative flex flex-col gap-2 border-l border-amber-500/25 pl-5 motion-rule" aria-label={t("workshop.world.timeline.heading")}>
        {events.length === 0 ? <li className="text-sm text-stone-500">{t("workshop.world.timeline.empty")}</li> : null}
        {events.map((event, index) => {
          const header = headers[index];
          const year = formatYear(event.when, doc.calendars);
          const at = absoluteYear(event.when, doc.calendars);
          const issues = event.refs
            .map((ref) => byRef.get(ref))
            .filter((entity) => entity !== undefined)
            .map((entity) => {
              const span = lifespan(typeOf(doc, entity), entity.entry, doc.calendars);
              const issue = !Number.isFinite(at) ? "" : span.birth !== null && at < span.birth ? tp("workshop.world.timeline.lifespan.beforeBirth", span.birth - at) : span.death !== null && at > span.death ? tp("workshop.world.timeline.lifespan.afterDeath", at - span.death) : "";
              return { entity, issue };
            })
            .filter((entry) => entry.issue);
          if (editing?.id === event.id) {
            return (
              <li key={event.id}>
                <EventForm event={editing} world={world} eras={eras} onSave={saveEvent} onCancel={() => setEditing(null)} />
              </li>
            );
          }
          return (
            <li key={event.id} className="wf-rise group relative" style={{ "--i": index } as React.CSSProperties}>
              {header ? <p className="eyebrow mb-1.5 mt-2 text-[10px] text-amber-400/80">{header}</p> : null}
              <span className={cn("absolute -left-[1.62rem] size-2.5 rounded-full border border-amber-400 bg-stone-950", header ? "top-9" : "top-3.5")} aria-hidden="true" />
              <div className="panel rounded-lg p-2.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-sm text-amber-200">{year.primary || t("workshop.world.timeline.undated")}</span>
                  <span className="text-sm text-stone-100">{event.title}</span>
                  {event.canon !== "canon" ? <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">{t(`workshop.world.timeline.canon.${event.canon}`)}</span> : null}
                  <span className="ml-auto flex gap-1">
                    <KitButton tone="icon" aria-label={t("workshop.world.timeline.event.edit", { name: event.title })} onClick={() => setEditing(event)}>
                      <Pencil className="size-3.5" />
                    </KitButton>
                    <KitButton tone="iconDanger" aria-label={t("workshop.world.timeline.event.delete", { name: event.title })} onClick={() => api.patch({ events: doc.events.filter((entry) => entry.id !== event.id) })}>
                      <Trash2 className="size-3.5" />
                    </KitButton>
                  </span>
                </div>
                {year.conversions ? <p className="text-[11px] text-stone-500">{year.conversions}</p> : null}
                {event.body ? <p className="mt-1 whitespace-pre-wrap text-sm text-stone-300">{event.body}</p> : null}
                {event.refs.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {event.refs.map((ref) => {
                      const entity = byRef.get(ref);
                      return entity ? (
                        <button key={ref} type="button" onClick={() => onOpen(ref)} className="pk-chip motion-press text-[11px]">
                          <EntityAvatar entity={entity} type={typeOf(doc, entity)} size="size-4" /> {entity.name}
                        </button>
                      ) : null;
                    })}
                  </div>
                ) : null}
                {issues.map(({ entity, issue }) => (
                  <p key={entity.ref} className="mt-1 text-xs text-ember-400 motion-pop">
                    {entity.name}: {issue}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CalendarForm({ calendar, onSave, onCancel }: { calendar: Calendar; onSave: (calendar: Calendar) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(calendar);
  return (
    <form className="panel motion-pop grid gap-2 rounded-lg p-3 @lg:grid-cols-[1fr_6rem_8rem]" onSubmit={(event) => { event.preventDefault(); if (draft.name.trim()) onSave(draft); }}>
      <input className={ui.input} placeholder={t("workshop.world.timeline.calendar.exampleName")} aria-label={t("workshop.world.timeline.calendar.name")} maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus />
      <input className={ui.input} placeholder={t("workshop.world.timeline.calendar.exampleAbbrev")} aria-label={t("workshop.world.timeline.calendar.abbreviation")} maxLength={12} value={draft.abbrev} onChange={(event) => setDraft({ ...draft, abbrev: event.target.value })} />
      <input className={ui.input} type="number" aria-label={t("workshop.world.timeline.calendar.yearZeroAria")} value={draft.epochOffset} onChange={(event) => setDraft({ ...draft, epochOffset: Math.round(Number(event.target.value) || 0) })} />
      <p className="text-[11px] text-stone-500 @lg:col-span-3">{t("workshop.world.timeline.calendar.yearZeroExplanation")}</p>
      <div className="flex justify-end gap-1.5 @lg:col-span-3">
        <KitButton tone="small" onClick={onCancel}><X className="size-3.5" /> {t("workshop.cancel")}</KitButton>
        <KitButton tone="primary" type="submit" disabled={!draft.name.trim()}><Check className="size-3.5" /> {t("workshop.world.timeline.calendar.save")}</KitButton>
      </div>
    </form>
  );
}

function EventForm({ event, world, eras, onSave, onCancel }: { event: WorldEvent; world: WorldState; eras: string[]; onSave: (event: WorldEvent) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const { doc, entities } = world;
  const [draft, setDraft] = useState(event);
  const [picking, setPicking] = useState(false);
  const toggle = (ref: string) => setDraft((current) => ({ ...current, refs: current.refs.includes(ref) ? current.refs.filter((entry) => entry !== ref) : [...current.refs, ref] }));
  return (
    <form className="panel motion-pop flex flex-col gap-2 rounded-lg p-3" onSubmit={(submit) => { submit.preventDefault(); if (draft.title.trim()) onSave(draft); }}>
      <div className="grid gap-2 @lg:grid-cols-[1fr_7rem_9rem]">
        <input className={ui.input} placeholder={t("workshop.world.timeline.event.exampleTitle")} aria-label={t("workshop.world.timeline.event.title")} maxLength={120} value={draft.title} onChange={(change) => setDraft({ ...draft, title: change.target.value })} autoFocus />
        <input className={ui.input} type="number" aria-label={t("workshop.world.timeline.year")} placeholder={t("workshop.world.timeline.year")} value={draft.when.yearNum ?? ""} onChange={(change) => setDraft({ ...draft, when: { ...draft.when, yearNum: change.target.value === "" ? null : Math.round(Number(change.target.value)) } })} />
        {doc.calendars.length ? (
          <Select label={t("workshop.world.timeline.calendar.label")} value={draft.when.calendarId} onChange={(calendarId) => setDraft({ ...draft, when: { ...draft.when, calendarId } })} options={doc.calendars.map((entry) => ({ value: entry.id, label: entry.abbrev || entry.name, hint: entry.name }))} />
        ) : (
          <span className="self-center text-[11px] text-stone-500">{t("workshop.world.timeline.noCalendar")}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <input className={cn(ui.input, "max-w-48 text-xs")} placeholder={t("workshop.world.timeline.event.exampleEra")} aria-label={t("workshop.world.timeline.event.era")} maxLength={60} value={draft.era} onChange={(change) => setDraft({ ...draft, era: change.target.value })} />
        {eras.filter((era) => era !== draft.era).map((era) => (
          <button key={era} type="button" onClick={() => setDraft({ ...draft, era })} className="rounded-md border border-stone-700 px-1.5 py-0.5 text-[11px] text-stone-400 hover:text-amber-100 motion-press">{era}</button>
        ))}
        <div className="ml-auto flex gap-1" role="radiogroup" aria-label={t("workshop.world.timeline.event.canon")}>
          {CANON_STATES.map((state) => (
            <button key={state} type="button" role="radio" aria-checked={draft.canon === state} onClick={() => setDraft({ ...draft, canon: state })} className={cn("rounded-md border border-stone-700 px-1.5 py-0.5 text-[11px] motion-press", draft.canon === state ? "bg-amber-400/10 text-amber-100" : "text-stone-500")}>{t(`workshop.world.timeline.canon.${state}`)}</button>
          ))}
        </div>
      </div>
      <textarea className={cn(ui.input, "min-h-16")} placeholder={t("workshop.world.timeline.event.bodyPlaceholder")} aria-label={t("workshop.world.timeline.event.body")} maxLength={4_000} value={draft.body} onChange={(change) => setDraft({ ...draft, body: change.target.value })} />
      <div className="flex flex-wrap items-center gap-1">
        <span className="eyebrow text-[10px] text-stone-500">{t("workshop.world.timeline.event.whoWhere")}</span>
        {draft.refs.map((ref) => {
          const entity = entities.find((entry) => entry.ref === ref);
          return entity ? (
            <button key={ref} type="button" onClick={() => toggle(ref)} className="pk-chip motion-pop text-[11px]" aria-label={t("workshop.world.timeline.event.removeEntity", { name: entity.name })}>
              <EntityAvatar entity={entity} type={typeOf(doc, entity)} size="size-4" /> {entity.name} <X className="size-3" />
            </button>
          ) : null;
        })}
        <KitButton tone="link" onClick={() => setPicking((value) => !value)}><Plus className="size-3.5" /> {t("workshop.world.timeline.add")}</KitButton>
      </div>
      {picking ? <EntityPicker doc={doc} entities={entities} chosen={draft.refs} label={t("workshop.world.timeline.event.whoWhere")} onPick={(entity) => toggle(entity.ref)} /> : null}
      <div className="flex justify-end gap-1.5">
        <KitButton tone="small" onClick={onCancel}><X className="size-3.5" /> {t("workshop.cancel")}</KitButton>
        <KitButton tone="primary" type="submit" disabled={!draft.title.trim()}><Check className="size-3.5" /> {t("workshop.world.timeline.event.save")}</KitButton>
      </div>
    </form>
  );
}
