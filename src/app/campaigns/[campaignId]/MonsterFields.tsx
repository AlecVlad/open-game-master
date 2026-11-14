"use client";

import { useI18n } from "@/lib/i18n/provider";

import { useId, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Select } from "@/components/ui/Select";
import { CONDITION_BLURBS, DAMAGE_TYPE_BLURBS, glossaryFor } from "@/lib/help/terms";
import {
  MAX_ATTACKS,
  SAVE_ABILITIES,
  SIZES,
  type MonsterDraft,
  type MonsterReadout,
} from "@/lib/bestiary/monster-draft";
import { CONDITIONS, DAMAGE_TYPES } from "@/lib/bestiary/kit";
import { CREATURE_TYPES, creatureTypeOf } from "@/lib/bestiary/creature-type";
import { SpeedPicker, TermPicker } from "@/app/campaigns/[campaignId]/MonsterKitFields";
import { crLabel, type CrPart } from "@/lib/bestiary/derive-cr";
import { Reveal } from "@/components/ui/Reveal";
import { AttackDetails } from "@/app/workshop/bestiary/AttackDetails";

// The parts of a stat block that are more than one number in a box, split
// out of DmBestiaryPanel the way NpcFields was split out of the NPC forge:
// the panel around them fetches and saves, and these are the fields.
//
// Nothing here decides anything. Every edit produces a draft the server
// re-checks through src/lib/bestiary/monster-draft.ts, which is also where
// the rule that matters lives: a damage expression the dice engine cannot
// roll is refused rather than repaired.

const input =
  "rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-200 focus:border-amber-500/50 focus:outline-none";

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-stone-500">{label}</span>
      <NumberStepper min={min} max={max} value={value} onChange={onChange} label={label} size="sm" className="w-fit" />
      {hint ? <span className="text-[10px] text-stone-600">{hint}</span> : null}
    </div>
  );
}

// The attack list. This is where a monster's whole offensive rating comes
// from, and where the only refusal in the editor lives.
export function AttackEditor({
  draft,
  onChange,
}: {
  draft: MonsterDraft;
  onChange: (draft: MonsterDraft) => void;
}) {
  const { t } = useI18n();
  // One list per mounted editor: a fixed id collided when two were open.
  const damageListId = useId();
  // Which rows show their reach, range, riders and on-hit effect.
  const [opened, setOpened] = useState<Set<number>>(() => new Set());
  const toggle = (index: number) =>
    setOpened((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const attacks = draft.stats.attacks;
  const setAttacks = (next: typeof attacks) =>
    onChange({ ...draft, stats: { ...draft.stats, attacks: next } });

  return (
    <div className="flex flex-col gap-1.5">
      <datalist id={damageListId}>
        {DAMAGE_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      {attacks.map((attack, index) => (
        <div key={index} className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={attack.name}
            onChange={(event) =>
              setAttacks(
                attacks.map((row, at) =>
                  at === index ? { ...row, name: event.target.value } : row,
                ),
              )
            }
            placeholder={t("workshop.monsterEditor.attack.bite")}
            className={cn(input, "w-28")}
          />
          <span className="flex items-center gap-1 text-[10px] text-stone-500">
            {t("workshop.monsterEditor.attack.toHit")}
            <NumberStepper
              min={-5}
              max={20}
              value={attack.toHit}
              onChange={(toHit) => setAttacks(attacks.map((row, at) => (at === index ? { ...row, toHit } : row)))}
              label={t("workshop.monsterEditor.attack.toHitLabel", { name: attack.name || t("workshop.monsterEditor.attack.attack") })}
              size="sm"
            />
          </span>
          <input
            value={attack.damage}
            onChange={(event) =>
              setAttacks(
                attacks.map((row, at) =>
                  at === index ? { ...row, damage: event.target.value } : row,
                ),
              )
            }
            placeholder="2d6+3"
            className={cn(input, "w-24")}
          />
          {/* A list rather than a select: the thirteen types the engine
              knows are one keystroke away, and "chitin-shredding" is still
              typeable for a monster that wants it. */}
          <input
            list={damageListId}
            value={attack.type}
            onChange={(event) =>
              setAttacks(
                attacks.map((row, at) =>
                  at === index ? { ...row, type: event.target.value } : row,
                ),
              )
            }
            placeholder={t("workshop.monsterEditor.attack.damageType")}
            className={cn(input, "w-24")}
          />
          <button
            type="button"
            aria-expanded={opened.has(index)}
            onClick={() => toggle(index)}
            className="inline-flex items-center gap-1 rounded-md border border-stone-700 px-1.5 py-0.5 text-[10px] text-stone-400 hover:text-amber-100"
          >
            {attackExtras(attack, t)}
            <ChevronDown className={cn("size-3 transition-transform duration-200", opened.has(index) && "rotate-180")} />
          </button>
          <button
            type="button"
            onClick={() => {
              setAttacks(attacks.filter((_, at) => at !== index));
              setOpened(new Set());
            }}
            className="text-stone-600 hover:text-red-300"
            aria-label={t("workshop.monsterEditor.attack.remove", { name: attack.name || t("workshop.monsterEditor.attack.attack") })}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <Reveal open={opened.has(index)}>
          {opened.has(index) ? (
            <AttackDetails
              attack={attack}
              onChange={(next) => setAttacks(attacks.map((row, at) => (at === index ? next : row)))}
            />
          ) : null}
        </Reveal>
        </div>
      ))}
      {attacks.length < MAX_ATTACKS ? (
        <button
          type="button"
          onClick={() =>
            setAttacks([...attacks, { name: "", toHit: 3, damage: "1d6+1", type: "untyped" }])
          }
          className="inline-flex w-fit items-center gap-1 rounded-md border border-stone-700 px-2 py-0.5 text-[11px] text-stone-400 hover:text-amber-100"
        >
          <Plus className="size-3" /> {t("workshop.monsterEditor.attack.attack")}
        </button>
      ) : null}
      <p className="text-[10px] text-stone-600">
        {t("workshop.monsterEditor.attack.engineRoutine")}
      </p>
    </div>
  );
}

// The word on an attack's details button: what it carries beyond its dice,
// or "Details" when it carries nothing yet.
function attackExtras(attack: MonsterDraft["stats"]["attacks"][number], t: (key: never, params?: Record<string, string | number>) => string): string {
  const riders = attack.riders?.map((rider) =>
    DAMAGE_TYPES.includes(rider.type as (typeof DAMAGE_TYPES)[number])
      ? t(`workshop.monsterEditor.defence.damageType.${rider.type}` as never)
      : rider.type,
  );
  const condition = attack.onHit?.condition;
  const conditionLabel = condition && CONDITIONS.includes(condition as (typeof CONDITIONS)[number])
    ? t(`workshop.monsterEditor.defence.condition.${condition}` as never)
    : condition;
  const bits = [
    attack.bonusAction ? t("workshop.monsterEditor.attack.bonusAction" as never) : "",
    attack.range ? `${attack.range.normal}/${attack.range.long} ${t("workshop.monsterEditor.attack.feet" as never)}` : attack.reach === 0 || (attack.reach && attack.reach > 5) ? `${t("workshop.monsterEditor.attack.reach" as never)} ${attack.reach}` : "",
    riders?.length ? `+${riders.join(", ")}` : "",
    conditionLabel ?? (attack.onHit?.damage ? t("workshop.monsterEditor.attack.onHit" as never) : ""),
    attack.alternatives?.some((entry) => entry.when === "bloodied") ? t("workshop.monsterEditor.attack.bloodied" as never) : "",
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : t("workshop.monsterEditor.attack.details" as never);
}

export function SaveEditor({
  draft,
  onChange,
}: {
  draft: MonsterDraft;
  onChange: (draft: MonsterDraft) => void;
}) {
  const { t } = useI18n();
  const saves = draft.stats.saveMods ?? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  return (
    // A stepper is wider than the bare box it replaced, so the columns are as
    // many as the container holds (the 320px side panel, the workshop's half
    // page); the rows still read in the familiar stat order.
    <div className="stagger-up grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-1">
      {SAVE_ABILITIES.map((ability) => (
        <div key={ability} className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase text-stone-500">{t(`workshop.monsterEditor.stats.ability.${ability}` as never)}</span>
          <NumberStepper
            min={-5}
            max={20}
            value={saves[ability]}
            onChange={(next) =>
              onChange({
                ...draft,
                stats: {
                  ...draft.stats,
                  saveMods: { ...saves, [ability]: next },
                },
              })
            }
            label={t("workshop.monsterEditor.stats.saveLabel", { ability: t(`workshop.monsterEditor.stats.ability.${ability}` as never) })}
            size="sm"
            className="w-fit"
          />
        </div>
      ))}
    </div>
  );
}

export function SizeAndDefences({
  draft,
  onChange,
}: {
  draft: MonsterDraft;
  onChange: (draft: MonsterDraft) => void;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<MonsterDraft["stats"]>) =>
    onChange({ ...draft, stats: { ...draft.stats, ...patch } });
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">{t("workshop.monsterEditor.defence.size")}</span>
          <Select
            value={draft.stats.size ?? "Medium"}
            onChange={(size) => set({ size })}
            options={SIZES.map((size) => ({ value: size as string, label: t(`workshop.monsterEditor.defence.size.${String(size).toLowerCase()}` as never) }))}
            label={t("workshop.monsterEditor.defence.size")}
            size="sm"
            className="w-32"
          />
        </label>
        {/* What it is, in the SRD's fourteen words. This is also the
            thumbnail: every list the monster appears in draws the plate for
            its type until somebody paints it a portrait. */}
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">{t("workshop.monsterEditor.defence.type")}</span>
          <Select
            value={creatureTypeOf(draft.stats) as string}
            onChange={(type) => set({ type })}
            options={CREATURE_TYPES.map((type) => ({ value: type as string, label: t(`workshop.monsterEditor.defence.creatureType.${type}` as never) }))}
            label={t("workshop.monsterEditor.defence.type")}
            size="sm"
            className="w-32"
          />
        </label>
        <SpeedPicker value={draft.stats.speed} onChange={(speed) => set({ speed })} />
      </div>
      {/* The three damage fields offer the thirteen types the fight actually
          resists, and the condition field the fifteen condition-logic.ts
          enforces. Anything else still goes in by hand, because a monster
          immune to "being seen" is a fine monster and no chip list of ours
          will hold every answer. */}
      {/* Black Flag's resistance and vulnerability to a condition (advantage
          or disadvantage on the save) show only on a block that has them: a
          copy keeps them editable, and no other book prints them. */}
      {(
        [
          ["resist", t("workshop.monsterEditor.defence.resist"), DAMAGE_TYPES],
          ["immune", t("workshop.monsterEditor.defence.immune"), DAMAGE_TYPES],
          ["vulnerable", t("workshop.monsterEditor.defence.vulnerable"), DAMAGE_TYPES],
          ["conditionImmune", t("workshop.monsterEditor.defence.conditionImmune"), CONDITIONS],
          ...(draft.stats.conditionResist ? [["conditionResist", t("workshop.monsterEditor.defence.conditionResist"), CONDITIONS] as const] : []),
          ...(draft.stats.conditionVulnerable ? [["conditionVulnerable", t("workshop.monsterEditor.defence.conditionVulnerable"), CONDITIONS] as const] : []),
        ] as const
      ).map(([field, label, known]) => (
        <TermPicker
          key={field}
          label={label}
          value={draft.stats[field] ?? ""}
          known={known}
          onChange={(value) => set({ [field]: value })}
          glossary={glossaryFor(
            known,
            known === CONDITIONS ? CONDITION_BLURBS : DAMAGE_TYPE_BLURBS,
          )}
        />
      ))}
    </div>
  );
}

// Say why. Every derived number, with the sentence that produced it. A DM
// will not trust a difficulty rating they cannot audit, and the ratings
// worth auditing are exactly the ones that disagree with their instinct.
export function Working({ parts, notes }: { parts: CrPart[]; notes: string[] }) {
  const { t, tp } = useI18n();
  const labelKeys: Record<string, string> = {
    "Hit points": "hitPoints",
    "Armour class": "armourClass",
    "Damage per round": "damageRound",
    "Attack bonus": "attackBonus",
    Toughness: "toughness",
    "The routine": "routine",
    "The average": "average",
  };
  const translateText = (value: string): string => {
    let match = value.match(/^(\d+) hit points is the CR ([\d/]+) band \((\d+) to (\d+)\)\.$/);
    if (match) return t("workshop.monsterEditor.rating.hpBand", { hp: Number(match[1]), cr: match[2], min: Number(match[3]), max: Number(match[4]) });
    match = value.match(/^AC (\d+) is what CR ([\d/]+) expects, so it moves nothing\.$/);
    if (match) return t("workshop.monsterEditor.rating.acMatches", { ac: Number(match[1]), cr: match[2] });
    match = value.match(/^AC (\d+) against the expected (\d+) is ([+-]?\d+) ratings?, one per 2 points\.$/);
    if (match) return tp("workshop.monsterEditor.rating.acAdjust", Math.abs(Number(match[3])), { ac: Number(match[1]), expected: Number(match[2]), adjustment: match[3] });
    match = value.match(/^(\d+) damage a round is the CR ([\d/]+) band \((\d+) to (\d+)\)\.$/);
    if (match) return t("workshop.monsterEditor.rating.dprBand", { dpr: Number(match[1]), cr: match[2], min: Number(match[3]), max: Number(match[4]) });
    match = value.match(/^([+-]?\d+) is what CR ([\d/]+) expects, so it moves nothing\.$/);
    if (match) return t("workshop.monsterEditor.rating.attackMatches", { bonus: match[1], cr: match[2] });
    match = value.match(/^([+-]?\d+) against the expected ([+-]?\d+) is ([+-]?\d+) ratings?, one per 2 points\.$/);
    if (match) return tp("workshop.monsterEditor.rating.attackAdjust", Math.abs(Number(match[3])), { bonus: match[1], expected: match[2], adjustment: match[3] });
    match = value.match(/^(\d+) swings? of (.+) at ([\d.]+) average(, plus (\d+) added by hand)?\.$/);
    if (match) {
      const extra = match[5] ? t("workshop.monsterEditor.rating.extra", { extra: Number(match[5]) }) : "";
      return tp("workshop.monsterEditor.rating.routine", Number(match[1]), { swings: Number(match[1]), name: match[2], average: match[3], extra });
    }
    match = value.match(/^Defensive CR ([\d/]+) and offensive CR ([\d/]+), averaged and rounded up\.$/);
    if (match) return t("workshop.monsterEditor.rating.averageDetail", { defensive: match[1], offensive: match[2] });
    match = value.match(/^Immune to (\d+) common damage types, worth x([\d.]+) hit points around CR ([\d/]+)\.$/);
    if (match) return t("workshop.monsterEditor.rating.note.immune", { count: Number(match[1]), multiplier: match[2], cr: match[3] });
    match = value.match(/^Resistant to (\d+) common damage types, worth x([\d.]+) hit points around CR ([\d/]+)\.$/);
    if (match) return t("workshop.monsterEditor.rating.note.resist", { count: Number(match[1]), multiplier: match[2], cr: match[3] });
    if (value.startsWith("This one casts spells") || value.startsWith("This creature casts spells")) return t("workshop.monsterEditor.rating.note.spells");
    if (value.startsWith("There are dice in the traits")) return t("workshop.monsterEditor.rating.note.traits");
    if (value === "No attacks, so the offensive rating rests on nothing.") return t("workshop.monsterEditor.rating.note.noAttacks");
    if (value.startsWith("The engine caps a multiattack")) return t("workshop.monsterEditor.rating.note.capped");
    return value;
  };
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-stone-800 bg-stone-950/60 p-2">
      {parts.map((part) => (
        <div key={part.label} className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
          <span className="w-28 shrink-0 text-stone-500">{labelKeys[part.label] ? t(`workshop.monsterEditor.rating.${labelKeys[part.label]}` as never) : part.label}</span>
          <span className="w-16 shrink-0 text-amber-100">{part.value}</span>
          <span className="flex-1 text-stone-500">{translateText(part.detail)}</span>
        </div>
      ))}
      {notes.map((note) => (
        <p key={note} className="text-[10px] text-amber-300/70">
          {translateText(note)}
        </p>
      ))}
    </div>
  );
}

export function RatingLine({ readout }: { readout: MonsterReadout }) {
  const { t } = useI18n();
  return (
    <p className={cn("text-[11px]", readout.agrees ? "text-stone-500" : "text-amber-300/80")}>
      {readout.agrees
        ? t("workshop.monsterEditor.rating.agrees", { cr: crLabel(readout.statedCr) })
        : t("workshop.monsterEditor.rating.statedVsDerived", {
            stated: crLabel(readout.statedCr),
            derived: crLabel(readout.derived.cr),
          })}
    </p>
  );
}
