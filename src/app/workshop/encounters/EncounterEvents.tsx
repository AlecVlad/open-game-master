"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select, type SelectOption } from "@/components/ui/Select";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { DictateField } from "@/components/DictateField";
import { appendDictation } from "@/lib/dictation";
import { Field, FieldLabel, addChip, chipRow, rowIcon } from "@/app/workshop/kit";
import { MonsterRosterPicker } from "@/app/campaigns/[campaignId]/MonsterRosterPicker";
import { GroundEditor, type GroundMap } from "@/app/workshop/encounters/EncounterGround";
import { hostOffers, useCapabilities } from "@/lib/use-capabilities";
import { CONDITION_VALUES } from "@/lib/dm/catalog-vocab";
import { formatRoster, parseRoster, type RosterSlot } from "@/lib/dm/encounter-template-logic";
import {
  FIGHT_EVENT_LIMITS,
  fitArrivals,
  type FightAction,
  type FightEvent,
  type FightTrigger,
} from "@/lib/dm/fight-event-logic";
import { useI18n } from "@/lib/i18n/provider";

// Events in a prepared fight. Translate only the editor's UI; trigger/action
// values remain stable engine identifiers.
type Slots = RosterSlot[];
type ActionOf<K extends FightAction["kind"]> = Extract<FightAction, { kind: K }>;

const TRIGGER_KEYS: Record<FightTrigger["kind"], { label: string; hint?: string }> = {
  start: {
    label: "campaign.session.encounterEvents.trigger.start",
    hint: "campaign.session.encounterEvents.trigger.startHint",
  },
  round: { label: "campaign.session.encounterEvents.trigger.round" },
  bloodied: {
    label: "campaign.session.encounterEvents.trigger.bloodied",
    hint: "campaign.session.encounterEvents.trigger.bloodiedHint",
  },
  falls: {
    label: "campaign.session.encounterEvents.trigger.falls",
    hint: "campaign.session.encounterEvents.trigger.fallsHint",
  },
};

// label heads the action and names its add button; noun is used by
// accessibility text inside a sentence.
const ACTIONS: Record<FightAction["kind"], { label: string; noun: string }> = {
  reinforce: {
    label: "campaign.session.encounterEvents.action.reinforce",
    noun: "campaign.session.encounterEvents.action.reinforceNoun",
  },
  hurt: {
    label: "campaign.session.encounterEvents.action.hurt",
    noun: "campaign.session.encounterEvents.action.hurtNoun",
  },
  condition: {
    label: "campaign.session.encounterEvents.action.condition",
    noun: "campaign.session.encounterEvents.action.conditionNoun",
  },
  visibility: {
    label: "campaign.session.encounterEvents.action.visibility",
    noun: "campaign.session.encounterEvents.action.visibilityNoun",
  },
  ground: {
    label: "campaign.session.encounterEvents.action.ground",
    noun: "campaign.session.encounterEvents.action.groundNoun",
  },
  say: {
    label: "campaign.session.encounterEvents.action.say",
    noun: "campaign.session.encounterEvents.action.sayNoun",
  },
};
const ACTION_KINDS = Object.keys(ACTIONS) as Array<FightAction["kind"]>;

function newTrigger(kind: FightTrigger["kind"], slots: Slots): FightTrigger {
  if (kind === "round") return { kind, round: FIGHT_EVENT_LIMITS.roundMin + 1 };
  if (kind === "bloodied" || kind === "falls") return { kind, slot: slots[0]?.slot ?? 0 };
  return { kind: "start" };
}

function newAction(kind: FightAction["kind"], slots: Slots): FightAction {
  const slot = slots[0]?.slot ?? 0;
  switch (kind) {
    case "reinforce":
      return { kind, enemies: [], at: "any" };
    case "hurt":
      return { kind, slot, to: "half" };
    case "condition":
      return { kind, slot, condition: "prone", remove: false };
    case "visibility":
      return { kind, slot, hidden: false };
    case "ground":
      return { kind, tiles: [], terrain: "wall" };
    case "say":
      return { kind, text: "" };
  }
}

const removeButton = cn(ui.iconAction, rowIcon, "hover:text-red-300");
const slotName = (label: string) =>
  label.replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`);

export function EncounterEvents({
  campaignId,
  slots,
  hasEntry,
  map,
  value,
  onChange,
}: {
  campaignId: string;
  slots: Slots;
  hasEntry: boolean;
  map: GroundMap | null;
  value: FightEvent[];
  onChange: (next: FightEvent[]) => void;
}) {
  const { t } = useI18n();
  const capabilities = useCapabilities();
  if (!slots.length || !hostOffers(capabilities, "fightEvents")) return null;

  const groundHost = hostOffers(capabilities, "fightGround");
  const kinds = ACTION_KINDS.filter((kind) => kind !== "ground" || Boolean(groundHost && map));
  const triggers: SelectOption<FightTrigger["kind"]>[] = (["start", "round", "bloodied", "falls"] as const).map((kind) => ({
    value: kind,
    label: t(TRIGGER_KEYS[kind].label as never),
    ...(TRIGGER_KEYS[kind].hint ? { hint: t(TRIGGER_KEYS[kind].hint as never) } : {}),
  }));
  const setEvent = (index: number, next: FightEvent) =>
    onChange(value.map((event, at) => (at === index ? next : event)));

  return (
    <div className="space-y-1.5 text-sm">
      <SectionHead title={t("campaign.session.encounterEvents.title")} glyph="cue-gong" className="mb-1" />
      <p className="text-[11px] text-stone-500">{t("campaign.session.encounterEvents.description")}</p>
      {groundHost && !map ? (
        <p className="text-[11px] text-stone-500">{t("campaign.session.encounterEvents.groundNeedsMap")}</p>
      ) : null}
      {value.length ? (
        <ul className="stagger space-y-2">
          {value.map((event, index) => (
            <li key={index} className="rounded-lg border border-stone-700/70 p-2">
              <EventEditor
                campaignId={campaignId}
                event={event}
                number={index + 1}
                slots={slots}
                hasEntry={hasEntry}
                map={map}
                kinds={kinds}
                triggers={triggers}
                onChange={(next) => setEvent(index, next)}
                onRemove={() => onChange(value.filter((_, at) => at !== index))}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {value.length < FIGHT_EVENT_LIMITS.events ? (
        <button
          type="button"
          onClick={() => onChange([...value, { trigger: { kind: "start" }, actions: [] }])}
          className={cn(ui.btnSmall, addChip)}
        >
          <Plus className="size-3" aria-hidden="true" /> {t("campaign.session.encounterEvents.addEvent")}
        </button>
      ) : null}
    </div>
  );
}

function EventEditor({
  campaignId,
  event,
  number,
  slots,
  hasEntry,
  map,
  kinds,
  triggers,
  onChange,
  onRemove,
}: {
  campaignId: string;
  event: FightEvent;
  number: number;
  slots: Slots;
  hasEntry: boolean;
  map: GroundMap | null;
  kinds: Array<FightAction["kind"]>;
  triggers: SelectOption<FightTrigger["kind"]>[];
  onChange: (next: FightEvent) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const name = t("campaign.session.encounterEvents.eventName", { number });
  const trigger = event.trigger;
  const slotOptions = slots.map((slot) => ({ value: String(slot.slot), label: slotName(slot.label) }));
  const setAction = (index: number, next: FightAction) =>
    onChange({ ...event, actions: event.actions.map((action, at) => (at === index ? next : action)) });

  return (
    <div role="group" aria-label={name} className="space-y-2">
      <div className="flex items-end gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-1.5">
          <Field label={t("campaign.session.encounterEvents.when")} className="min-w-48 flex-1">
            <Select
              label={t("campaign.session.encounterEvents.whenForEvent", { event: name })}
              value={trigger.kind}
              options={triggers}
              onChange={(kind) => onChange({ ...event, trigger: newTrigger(kind, slots) })}
            />
          </Field>
          {trigger.kind === "round" ? (
            <Field label={t("campaign.session.encounterEvents.round")}>
              <NumberStepper
                label={t("campaign.session.encounterEvents.roundForEvent", { event: name })}
                value={trigger.round}
                min={FIGHT_EVENT_LIMITS.roundMin}
                max={FIGHT_EVENT_LIMITS.roundMax}
                onChange={(round) => onChange({ ...event, trigger: { kind: "round", round } })}
              />
            </Field>
          ) : null}
          {trigger.kind === "bloodied" || trigger.kind === "falls" ? (
            <Field label={t("campaign.session.encounterEvents.whichCreature")} className="min-w-40 flex-1">
              <Select
                label={t("campaign.session.encounterEvents.whichCreatureForEvent", { event: name })}
                value={String(trigger.slot)}
                options={slotOptions}
                onChange={(slot) => onChange({ ...event, trigger: { kind: trigger.kind, slot: Number(slot) } })}
              />
            </Field>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={t("campaign.session.encounterEvents.removeEvent", { number })}
          title={t("campaign.session.encounterEvents.removeEventTitle")}
          onClick={onRemove}
          className={removeButton}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {event.actions.length ? (
        <ol className="space-y-2">
          {event.actions.map((action, index) => {
            const noun = t(ACTIONS[action.kind].noun as never);
            return (
              <li key={index} className="flex items-start gap-1.5 border-l-2 border-amber-500/30 pl-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <FieldLabel>{t(ACTIONS[action.kind].label as never)}</FieldLabel>
                  <ActionEditor
                    campaignId={campaignId}
                    action={action}
                    name={noun}
                    slots={slots}
                    slotOptions={slotOptions}
                    hasEntry={hasEntry}
                    map={map}
                    onChange={(next) => setAction(index, next)}
                  />
                </div>
                <button
                  type="button"
                  aria-label={t("campaign.session.encounterEvents.removeAction", { action: noun, number })}
                  title={t("campaign.session.encounterEvents.removeActionTitle")}
                  onClick={() => onChange({ ...event, actions: event.actions.filter((_, at) => at !== index) })}
                  className={removeButton}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[11px] text-amber-300/85">{t("campaign.session.encounterEvents.emptyActions")}</p>
      )}
      {event.actions.length < FIGHT_EVENT_LIMITS.actions ? (
        <div role="group" aria-label={t("campaign.session.encounterEvents.addActionAria", { event: name })} className={chipRow}>
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onChange({ ...event, actions: [...event.actions, newAction(kind, slots)] })}
              className={cn(ui.btnSmall, addChip)}
            >
              <Plus className="size-3" aria-hidden="true" /> {t(ACTIONS[kind].label as never)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActionEditor({
  campaignId,
  action,
  name,
  slots,
  slotOptions,
  hasEntry,
  map,
  onChange,
}: {
  campaignId: string;
  action: FightAction;
  name: string;
  slots: Slots;
  slotOptions: SelectOption<string>[];
  hasEntry: boolean;
  map: GroundMap | null;
  onChange: (next: FightAction) => void;
}) {
  const { t } = useI18n();
  const conditionOptions: SelectOption<string>[] = CONDITION_VALUES.map((condition) => ({
    value: condition,
    label: t(`campaign.session.encounterEvents.condition.option.${condition}` as never),
  }));
  const who = (slot: number, set: (slot: number) => void) => (
    <Field label={t("campaign.session.encounterEvents.who")} className="min-w-40 flex-1">
      <Select
        label={t("campaign.session.encounterEvents.whoForAction", { action: name })}
        value={String(slot)}
        options={slotOptions}
        onChange={(next) => set(Number(next))}
      />
    </Field>
  );

  switch (action.kind) {
    case "reinforce":
      return <ReinforceEditor campaignId={campaignId} action={action} name={name} slots={slots} hasEntry={hasEntry} onChange={onChange} />;
    case "hurt":
      return (
        <div className="flex flex-wrap items-end gap-1.5">
          {who(action.slot, (slot) => onChange({ ...action, slot }))}
          <Field label={t("campaign.session.encounterEvents.hurt.downTo")} className="min-w-48 flex-1">
            <Select<"half" | "hp">
              label={t("campaign.session.encounterEvents.hurt.downToForAction", { action: name })}
              value={action.to}
              options={[
                { value: "half", label: t("campaign.session.encounterEvents.hurt.half") },
                { value: "hp", label: t("campaign.session.encounterEvents.hurt.hitPoints") },
              ]}
              onChange={(to) => onChange(to === "hp" ? { ...action, to, hp: action.hp ?? 1 } : { kind: "hurt", slot: action.slot, to })}
            />
          </Field>
          {action.to === "hp" ? (
            <Field label={t("campaign.session.encounterEvents.hurt.hitPointsLeft")}>
              <NumberStepper
                label={t("campaign.session.encounterEvents.hurt.hitPointsLeftForAction", { action: name })}
                value={action.hp ?? 1}
                min={1}
                max={FIGHT_EVENT_LIMITS.hp}
                onChange={(hp) => onChange({ ...action, hp })}
              />
            </Field>
          ) : null}
        </div>
      );
    case "condition":
      return (
        <div className="flex flex-wrap items-end gap-1.5">
          {who(action.slot, (slot) => onChange({ ...action, slot }))}
          <Field label={t("campaign.session.encounterEvents.condition.gainsOrLoses")} className="min-w-32">
            <Select<"gains" | "loses">
              label={t("campaign.session.encounterEvents.condition.gainsOrLosesForAction", { action: name })}
              value={action.remove ? "loses" : "gains"}
              options={[
                { value: "gains", label: t("campaign.session.encounterEvents.condition.gains") },
                { value: "loses", label: t("campaign.session.encounterEvents.condition.loses") },
              ]}
              onChange={(next) => onChange({ ...action, remove: next === "loses" })}
            />
          </Field>
          <Field label={t("campaign.session.encounterEvents.condition.condition")} className="min-w-40 flex-1">
            <Select
              label={t("campaign.session.encounterEvents.condition.conditionForAction", { action: name })}
              value={action.condition}
              options={conditionOptions}
              onChange={(condition) => onChange({ ...action, condition })}
            />
          </Field>
        </div>
      );
    case "visibility":
      return (
        <div className="flex flex-wrap items-end gap-1.5">
          {who(action.slot, (slot) => onChange({ ...action, slot }))}
          <Field label={t("campaign.session.encounterEvents.visibility.label")} className="min-w-48 flex-1">
            <Select<"appears" | "hides">
              label={t("campaign.session.encounterEvents.visibility.forAction", { action: name })}
              value={action.hidden ? "hides" : "appears"}
              options={[
                {
                  value: "appears",
                  label: t("campaign.session.encounterEvents.visibility.appears"),
                  hint: t("campaign.session.encounterEvents.visibility.appearsHint"),
                },
                {
                  value: "hides",
                  label: t("campaign.session.encounterEvents.visibility.hides"),
                  hint: t("campaign.session.encounterEvents.visibility.hidesHint"),
                },
              ]}
              onChange={(next) => onChange({ ...action, hidden: next === "hides" })}
            />
          </Field>
        </div>
      );
    case "ground":
      return map ? (
        <GroundEditor action={action} name={name} map={map} onChange={onChange} />
      ) : (
        <p className="text-[11px] text-amber-300/85">{t("campaign.session.encounterEvents.groundNeedsMap")}</p>
      );
    case "say":
      return (
        <Field as="label" label={t("campaign.session.encounterEvents.say.words")}>
          <DictateField
            label={t("campaign.session.encounterEvents.say.wordsForAction", { action: name })}
            onTranscript={(text) => onChange({ ...action, text: appendDictation(action.text, text, FIGHT_EVENT_LIMITS.say) })}
          >
            <textarea
              value={action.text}
              maxLength={FIGHT_EVENT_LIMITS.say}
              rows={2}
              placeholder={t("campaign.session.encounterEvents.say.placeholder")}
              onChange={(next) => onChange({ ...action, text: next.target.value })}
              className={ui.input}
            />
          </DictateField>
        </Field>
      );
  }
}

function ReinforceEditor({
  campaignId,
  action,
  name,
  slots,
  hasEntry,
  onChange,
}: {
  campaignId: string;
  action: ActionOf<"reinforce">;
  name: string;
  slots: Slots;
  hasEntry: boolean;
  onChange: (next: FightAction) => void;
}) {
  const { t } = useI18n();
  const where: SelectOption<string>[] = [
    { value: "any", label: t("campaign.session.encounterEvents.reinforce.whereAny") },
    ...(hasEntry ? [{ value: "entry", label: t("campaign.session.encounterEvents.reinforce.whereEntry") }] : []),
    ...slots.map((slot) => ({
      value: `slot:${slot.slot}`,
      label: t("campaign.session.encounterEvents.reinforce.whereBeside", { creature: slotName(slot.label) }),
    })),
  ];
  const whereValue =
    action.at === "slot" && action.slot !== undefined
      ? `slot:${action.slot}`
      : action.at === "entry" && !hasEntry
        ? "any"
        : action.at;
  const setEnemies = (enemies: ActionOf<"reinforce">["enemies"]) =>
    onChange({ ...action, enemies: fitArrivals(enemies) });

  return (
    <div className="space-y-1.5">
      <MonsterRosterPicker campaignId={campaignId} roster={formatRoster(action.enemies)} onChange={(roster) => setEnemies(parseRoster(roster))} />
      {action.enemies.length ? (
        <ul className={chipRow} aria-label={t("campaign.session.encounterEvents.reinforce.whoArrives", { action: name })}>
          {action.enemies.map((row, index) => (
            <li key={`${row.monster}-${index}`} className="flex items-center gap-1 rounded-lg border border-stone-700/70 py-0.5 pl-2">
              <span className="text-stone-200">{row.monster}</span>
              <NumberStepper
                label={t("campaign.session.encounterEvents.reinforce.howMany", { monster: row.monster })}
                value={row.count}
                min={1}
                max={FIGHT_EVENT_LIMITS.arrivals}
                size="sm"
                onChange={(count) => setEnemies(action.enemies.map((entry, at) => (at === index ? { ...entry, count } : entry)))}
              />
              <button
                type="button"
                aria-label={t("campaign.session.encounterEvents.reinforce.removeMonster", { monster: row.monster })}
                onClick={() => setEnemies(action.enemies.filter((_, at) => at !== index))}
                className={removeButton}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-stone-500">{t("campaign.session.encounterEvents.reinforce.searchAndPick")}</p>
      )}
      <Field label={t("campaign.session.encounterEvents.reinforce.whereTheyEnter")}>
        <Select
          label={t("campaign.session.encounterEvents.reinforce.whereTheyEnterForAction", { action: name })}
          value={whereValue}
          options={where}
          onChange={(next) =>
            onChange(
              next.startsWith("slot:")
                ? { ...action, at: "slot", slot: Number(next.slice(5)) }
                : { kind: "reinforce", enemies: action.enemies, at: next === "entry" ? "entry" : "any" },
            )
          }
        />
      </Field>
    </div>
  );
}
