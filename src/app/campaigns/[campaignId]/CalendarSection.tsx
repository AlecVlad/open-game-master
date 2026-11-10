"use client";

import { readLoad, useLoadStatus } from "@/lib/load-state";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { GameIcon } from "@/components/ui/GameIcon";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { KitButton, LoadFailed, panelField, PanelLoading } from "./PanelKit";
import type { CalendarDefinition, CampaignClock } from "@/lib/dm/calendar";
import { DictateField } from "@/components/DictateField";
import { appendDictation } from "@/lib/dictation";
import { useI18n } from "@/lib/i18n/provider";

// The Calendar section of the Rules panel (docs/vtt-parity-implementation-plan.md
// 7.1 and 7.2): the year's months, the week's days, the sky's moons and the
// year's festivals, picked from a preset and then edited by hand; below
// them, the events the clock will bring round.

type Preset = { id: string; name: string };
type EventView = { id: string; title: string; body: string; when: string; visibility: "party" | "dm"; repeat: "none" | "yearly" | "monthly"; fired: boolean };
type EventDraft = { title: string; body: string; month: number; day: number; hour: number; visibility: "party" | "dm"; repeat: "none" | "yearly" | "monthly" };

const field = cn(panelField, "w-auto");
function blankEvent(): EventDraft {
  return { title: "", body: "", month: 1, day: 1, hour: 8, visibility: "party", repeat: "none" };
}

export function CalendarSection({ campaignId }: { campaignId: string }) {
  const { t } = useI18n();
  const presetLabels: Record<string, string> = {
    seasons: t("campaign.calendar.preset.seasons"),
    generic: t("campaign.calendar.preset.generic"),
    daycount: t("campaign.calendar.preset.daycount"),
  };
  const repeatLabels: Record<EventDraft["repeat"], string> = {
    none: t("campaign.calendar.event.repeat.once"),
    monthly: t("campaign.calendar.event.repeat.monthly"),
    yearly: t("campaign.calendar.event.repeat.yearly"),
  };
  const REPEAT_OPTIONS: Array<{ value: EventDraft["repeat"]; label: string }> = [
    { value: "none", label: repeatLabels.none },
    { value: "monthly", label: repeatLabels.monthly },
    { value: "yearly", label: repeatLabels.yearly },
  ];
  const VISIBILITY_OPTIONS: Array<{ value: EventDraft["visibility"]; label: string }> = [
    { value: "party", label: t("campaign.calendar.event.visibility.party") },
    { value: "dm", label: t("campaign.calendar.event.visibility.gm") },
  ];
  const [clock, setClock] = useState<CampaignClock | null>(null);
  const [reads, setReads] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [draft, setDraft] = useState<CalendarDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<EventView[]>([]);
  // A refused or failed read is shown in the server's words with a way to
  // ask again, never as "nothing here yet" (issue 140).
  const { loaded, loadError, settle } = useLoadStatus();
  const [reloads, setReloads] = useState(0);
  const [eventDraft, setEventDraft] = useState<EventDraft>(blankEvent());
  const [addingEvent, setAddingEvent] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      readLoad<{ clock?: CampaignClock; reads?: string; presets?: Preset[] }>(fetch(`/api/campaigns/${campaignId}/dm/clock`), t("campaign.calendar.error.clock")),
      readLoad<{ events?: EventView[] }>(fetch(`/api/campaigns/${campaignId}/calendar/events`), t("campaign.calendar.error.events")),
    ]).then(([clockLoad, eventLoad]) => {
      if (cancelled) {
        return;
      }
      settle(clockLoad.error ? clockLoad : eventLoad);
      const clockData = clockLoad.payload ?? {};
      if (clockLoad.payload) {
        setClock(clockData.clock ?? null);
        setReads(clockData.reads ?? "");
        setPresets(clockData.presets ?? []);
        setDraft(clockData.clock ? { ...clockData.clock.calendar, moons: clockData.clock.calendar.moons ?? [], festivals: clockData.clock.calendar.festivals ?? [] } : null);
      }
      if (eventLoad.payload) {
        setEvents(eventLoad.payload.events ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, reload, reloads, settle, t]);

  async function applyPreset(preset: string) {
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${campaignId}/dm/clock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ do: "calendar", preset }) });
      setReload((current) => current + 1);
    } finally {
      setSaving(false);
    }
  }

  async function saveDefinition() {
    if (!draft || !draft.months.length) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/dm/clock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ do: "calendar", definition: { ...draft, id: "custom", name: draft.name || t("campaign.calendar.customName") } }),
      });
      if (response.ok) {
        setReload((current) => current + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  async function addEvent() {
    if (!eventDraft.title.trim()) {
      return;
    }
    setAddingEvent(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/calendar/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventDraft),
      });
      if (response.ok) {
        setEventDraft(blankEvent());
        setReload((current) => current + 1);
      }
    } finally {
      setAddingEvent(false);
    }
  }

  async function removeEvent(id: string) {
    await fetch(`/api/campaigns/${campaignId}/calendar/events/${id}`, { method: "DELETE" });
    setReload((current) => current + 1);
  }

  if (!clock || !draft) {
    return <PanelLoading label={t("campaign.calendar.loading")} rows={2} />;
  }
  const moons = draft.moons ?? [];
  const festivals = draft.festivals ?? [];
  const update = (patch: Partial<CalendarDefinition>) => setDraft({ ...draft, ...patch });
  const monthOptions = draft.months.map((month, at) => ({ value: String(at + 1), label: month.name }));

  return (
    <div className="panel space-y-3 rounded-lg p-3">
      <SectionHead title={t("campaign.calendar.title")} glyph="daypart-day" />
      <p className="flex items-center gap-1.5 text-xs text-stone-400">
        <GameIcon icon={{ kind: "glyph", key: "daypart-dawn" }} size="size-5" /> {t("campaign.calendar.now", { reads })}
      </p>
      <div data-pill-group="" role="group" aria-label={t("campaign.calendar.preset.label")} className="flex flex-wrap items-center gap-1">
        <span className="eyebrow mr-1 text-[10px] text-amber-400/80">{t("campaign.calendar.preset.label")}</span>
        {presets.map((preset) => (
          <button key={preset.id} type="button" disabled={saving} aria-busy={saving} data-on={clock.calendar.id === preset.id ? "" : undefined} aria-pressed={clock.calendar.id === preset.id} onClick={() => void applyPreset(preset.id)} className="pk-pill pk-tap motion-press">
            {presetLabels[preset.id] ?? preset.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-stone-400">
        <label className="flex min-w-[9rem] flex-1 items-center gap-1.5">
          {t("campaign.calendar.name")}
          <input value={draft.name} onChange={(event) => update({ name: event.target.value })} maxLength={60} className={cn(field, "min-w-0 flex-1")} />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-stone-500">{t("campaign.calendar.yearSuffix")}</span>
          <input value={draft.yearSuffix} onChange={(event) => update({ yearSuffix: event.target.value })} maxLength={20} className={cn(field, "w-20")} />
        </label>
      </div>
      <div className="space-y-1.5">
        <SectionHead title={t("campaign.calendar.months")} glyph="daypart-morning" level="h4" aside={draft.months.length} />
        {draft.months.map((month, index) => (
          <div key={index} className="group flex items-center gap-1.5">
            <input value={month.name} aria-label={t("campaign.calendar.month.nameAria", { index: index + 1 })} onChange={(event) => update({ months: draft.months.map((entry, at) => (at === index ? { ...entry, name: event.target.value } : entry)) })} maxLength={40} className={cn(field, "min-w-0 flex-1")} />
            <NumberStepper size="sm" min={1} max={400} value={month.days} label={t("campaign.calendar.month.days", { month: month.name || t("campaign.calendar.month.fallback", { index: index + 1 }) })} onChange={(days) => update({ months: draft.months.map((entry, at) => (at === index ? { ...entry, days: days || 1 } : entry)) })} />
            <KitButton tone="iconDanger" always aria-label={t("campaign.calendar.month.remove")} disabled={draft.months.length <= 1} onClick={() => update({ months: draft.months.filter((_, at) => at !== index) })} className="disabled:opacity-30">
              <Trash2 className="size-3.5" />
            </KitButton>
          </div>
        ))}
        {draft.months.length < 24 ? (
          <KitButton onClick={() => update({ months: [...draft.months, { name: t("campaign.calendar.month.defaultName", { index: draft.months.length + 1 }), days: 30 }] })}>
            <Plus className="size-3.5" /> {t("campaign.calendar.month.add")}
          </KitButton>
        ) : null}
      </div>
      <label className="block text-xs text-stone-400">
        {t("campaign.calendar.weekdays")}
        <input value={draft.weekdays.join(", ")} onChange={(event) => update({ weekdays: event.target.value.split(",").map((day) => day.trim()).filter(Boolean).slice(0, 12) })} className={cn(panelField, "mt-1")} />
      </label>
      <div className="space-y-1.5">
        <SectionHead title={t("campaign.calendar.moons")} glyph="daypart-night" level="h4" aside={moons.length || null} />
        {moons.map((moon, index) => (
          <div key={index} className="flex flex-wrap items-center gap-1.5">
            <input value={moon.name} placeholder={t("campaign.calendar.name")} aria-label={t("campaign.calendar.moon.nameAria")} onChange={(event) => update({ moons: moons.map((entry, at) => (at === index ? { ...entry, name: event.target.value } : entry)) })} maxLength={40} className={cn(field, "min-w-[7rem] flex-1")} />
            <span title={t("campaign.calendar.moon.cycle")}>
              <NumberStepper size="sm" min={2} max={400} value={moon.cycleDays} label={t("campaign.calendar.moon.cycle")} onChange={(cycleDays) => update({ moons: moons.map((entry, at) => (at === index ? { ...entry, cycleDays: cycleDays || 28 } : entry)) })} />
            </span>
            <span title={t("campaign.calendar.moon.offset")}>
              <NumberStepper size="sm" min={0} max={400} value={moon.offset} label={t("campaign.calendar.moon.offset")} onChange={(offset) => update({ moons: moons.map((entry, at) => (at === index ? { ...entry, offset: offset || 0 } : entry)) })} />
            </span>
            <KitButton tone="iconDanger" always aria-label={t("campaign.calendar.moon.remove")} onClick={() => update({ moons: moons.filter((_, at) => at !== index) })}>
              <Trash2 className="size-3.5" />
            </KitButton>
          </div>
        ))}
        {moons.length < 6 ? (
          <KitButton onClick={() => update({ moons: [...moons, { name: t("campaign.calendar.moon.defaultName"), cycleDays: 28, offset: 0 }] })}>
            <Plus className="size-3.5" /> {t("campaign.calendar.moon.add")}
          </KitButton>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <SectionHead title={t("campaign.calendar.festivals")} glyph="cue-festive" level="h4" aside={festivals.length || null} />
        {festivals.map((festival, index) => (
          <div key={index} className="flex flex-wrap items-center gap-1.5">
            <Select size="sm" label={t("campaign.calendar.festival.month")} value={String(festival.month)} options={monthOptions} onChange={(value) => update({ festivals: festivals.map((entry, at) => (at === index ? { ...entry, month: Number(value) } : entry)) })} className="pk-w-28" />
            <NumberStepper size="sm" min={1} max={400} value={festival.day} label={t("campaign.calendar.festival.day")} onChange={(day) => update({ festivals: festivals.map((entry, at) => (at === index ? { ...entry, day: day || 1 } : entry)) })} />
            <input value={festival.name} placeholder={t("campaign.calendar.name")} aria-label={t("campaign.calendar.festival.nameAria")} onChange={(event) => update({ festivals: festivals.map((entry, at) => (at === index ? { ...entry, name: event.target.value } : entry)) })} maxLength={60} className={cn(field, "min-w-[7rem] flex-1")} />
            <KitButton tone="iconDanger" always aria-label={t("campaign.calendar.festival.remove")} onClick={() => update({ festivals: festivals.filter((_, at) => at !== index) })}>
              <Trash2 className="size-3.5" />
            </KitButton>
          </div>
        ))}
        {festivals.length < 40 ? (
          <KitButton onClick={() => update({ festivals: [...festivals, { month: 1, day: 1, name: "" }] })}>
            <Plus className="size-3.5" /> {t("campaign.calendar.festival.add")}
          </KitButton>
        ) : null}
      </div>
      <KitButton tone="primary" disabled={saving} busy={saving} onClick={() => void saveDefinition()}>
        {saving ? null : <Save className="size-3.5" />} {t("campaign.calendar.save")}
      </KitButton>

      <div className="space-y-1.5 pt-1">
        <SectionHead title={t("campaign.calendar.events")} glyph="tab-timeline" level="h4" aside={events.length || null} />
        {events.length ? (
          <ul className="stagger space-y-1">
            {events.map((event) => (
              <li key={event.id} className="group flex items-start gap-1.5 text-xs">
                <GameIcon icon={{ kind: "glyph", key: event.fired ? "quest-done" : "quest-active" }} size="size-5" className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-5">
                  <span className={cn("font-medium", event.fired ? "text-stone-500 line-through" : "text-stone-200")}>{event.title}</span>
                  <span className="text-stone-500"> {event.when}</span>
                  {event.repeat !== "none" ? <span className="pk-chip ml-1 px-1.5">{repeatLabels[event.repeat]}</span> : null}
                  {event.visibility === "dm" ? <span className="pk-chip ml-1 border-violet-500/40 px-1.5 text-violet-300">{t("campaign.calendar.event.gmOnly")}</span> : null}
                </span>
                <KitButton tone="iconDanger" always aria-label={t("campaign.calendar.event.remove", { title: event.title })} onClick={() => void removeEvent(event.id)}>
                  <Trash2 className="size-3.5" />
                </KitButton>
              </li>
            ))}
          </ul>
        ) : (
          (loadError ? (
            <LoadFailed
              error={loadError}
              onRetry={() => setReloads((current) => current + 1)}
            />
          ) : loaded ? (
            <EmptyState
              size="sm"
              art="scrolls"
              title={t("campaign.calendar.event.empty")}
            />
          ) : null)
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <input value={eventDraft.title} placeholder={t("campaign.calendar.event.title")} aria-label={t("campaign.calendar.event.title")} onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })} maxLength={120} className={cn(field, "min-w-[9rem] flex-1")} />
          <Select size="sm" label={t("campaign.calendar.event.month")} value={String(eventDraft.month)} options={monthOptions} onChange={(value) => setEventDraft({ ...eventDraft, month: Number(value) })} className="pk-w-28" />
          <NumberStepper size="sm" min={1} max={400} value={eventDraft.day} label={t("campaign.calendar.event.day")} onChange={(day) => setEventDraft({ ...eventDraft, day: day || 1 })} />
          <Select size="sm" label={t("campaign.calendar.event.repeats")} value={eventDraft.repeat} options={REPEAT_OPTIONS} onChange={(repeat) => setEventDraft({ ...eventDraft, repeat })} className="pk-w-24" />
          <Select size="sm" label={t("campaign.calendar.event.visibility")} value={eventDraft.visibility} options={VISIBILITY_OPTIONS} onChange={(visibility) => setEventDraft({ ...eventDraft, visibility })} className="pk-w-24" />
          <KitButton disabled={addingEvent || !eventDraft.title.trim()} busy={addingEvent} onClick={() => void addEvent()}>
            {addingEvent ? null : <Plus className="size-3.5" />} {t("campaign.calendar.event.add")}
          </KitButton>
        </div>
        <DictateField label={t("campaign.calendar.event.body.label")} onTranscript={(text) => setEventDraft((current) => ({ ...current, body: appendDictation(current.body, text, 600) }))}>
          <textarea value={eventDraft.body} placeholder={t("campaign.calendar.event.body.placeholder")} aria-label={t("campaign.calendar.event.body.placeholder")} rows={2} maxLength={600} onChange={(event) => setEventDraft({ ...eventDraft, body: event.target.value })} className={panelField} />
        </DictateField>
      </div>
    </div>
  );
}
