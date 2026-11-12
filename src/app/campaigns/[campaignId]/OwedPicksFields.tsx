"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { InfoButton } from "@/components/ui/InfoDialog";
import { cn } from "@/lib/cn";
import { describeSkill } from "@/lib/help";
import { findSkill } from "@/lib/srd";
import { subclassBlurb } from "@/lib/srd/features";
import { authoredFeatDesc, featAbilityIncrease } from "@/lib/srd/feat-effects";
import { featGrantSpec, type FeatChoices, type FeatPicks } from "@/lib/srd/feat-grants";
import { grantsForHeldTraining, subclassGrants } from "@/lib/srd/subclass-training";
import { textKey } from "@/lib/language/text-logic";
import { featChoice, withFeatChoice, type AsiChoice } from "@/lib/schemas/sheet";
import type { OwedPicks, SeatPicks } from "@/lib/characters/seat-picks";
import AsiFeatEditor from "@/app/characters/builder/AsiFeatEditor";
import FeatChoicesFields from "@/app/characters/builder/FeatChoicesFields";
import { useFeatDescs } from "@/app/characters/builder/useFeatDescs";

// The confirm sheet's pickers for the choices a hero owes as it sits down
// (JoinConfirmDialog.tsx, src/lib/characters/seat-picks.ts): the subclass
// its level is due, the Ability Score Improvements (or feats) the level
// earned, the class skills and the expertise left open. They are the
// level-up dialog's own pieces (LevelUpDialog.tsx): the builder's
// improvement editor and the picks a feat or a subclass leaves open. Every
// pick may be left; what is left stays owed for the first level-up.

export type PicksDraft = {
  subclasses: Record<string, string>;
  asiChoices: Array<AsiChoice | null>;
  featChoices: FeatChoices;
  skills: string[];
  expertise: string[];
};

export const EMPTY_DRAFT: PicksDraft = { subclasses: {}, asiChoices: [], featChoices: {}, skills: [], expertise: [] };

type Translate = ReturnType<typeof useI18n>["t"];

const SKILL_KEYS: Record<string, string> = {
  acrobatics: "builder.multi.skill.acrobatics",
  animal_handling: "builder.multi.skill.animalHandling",
  arcana: "builder.multi.skill.arcana",
  athletics: "builder.multi.skill.athletics",
  deception: "builder.multi.skill.deception",
  history: "builder.multi.skill.history",
  insight: "builder.multi.skill.insight",
  intimidation: "builder.multi.skill.intimidation",
  investigation: "builder.multi.skill.investigation",
  medicine: "builder.multi.skill.medicine",
  nature: "builder.multi.skill.nature",
  perception: "builder.multi.skill.perception",
  performance: "builder.multi.skill.performance",
  persuasion: "builder.multi.skill.persuasion",
  religion: "builder.multi.skill.religion",
  sleight_of_hand: "builder.multi.skill.sleightOfHand",
  stealth: "builder.multi.skill.stealth",
  survival: "builder.multi.skill.survival",
};

const skillName = (id: string, t: Translate) => {
  const key = SKILL_KEYS[id];
  return key ? t(key as never) : findSkill(id)?.name ?? id.replace(/_/g, " ");
};

function skillHint(id: string, label: string, t: Translate): string | undefined {
  const skill = findSkill(id);
  if (!skill) return describeSkill(id) ?? undefined;
  const abilityKey = `charSheet.ability.${skill.ability}`;
  const ability = t(abilityKey as never);
  return ability === abilityKey
    ? describeSkill(id) ?? undefined
    : t("builder.multi.skill.info", { skill: label, ability });
}

const className = (id: string, fallback: string, t: Translate) => {
  const key = `charSheet.class.${id}`;
  const translated = t(key as never);
  return translated === key ? fallback : translated;
};

const subclassName = (classId: string, name: string, t: Translate) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const key = `workshop.monsterEditor.kit.subclass.${classId}.${slug}`;
  const translated = t(key as never);
  return translated === key ? name : translated;
};

// The pressable itself is the whole chip, a finger-sized target with a focus
// ring of its own; a skill's ⓘ sits beside it, never inside it.
const chip = (picked: boolean) =>
  cn(
    "inline-flex min-h-11 items-center rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
    picked ? "border-amber-600 bg-stone-900 text-amber-100" : "border-stone-700 hover:border-amber-800 hover:bg-stone-900",
  );

// The training a subclass picked here brings at the class's level (a Lore
// bard's three skills), which the server asks to be named in full.
function trainingFor(owed: OwedPicks, draft: PicksDraft) {
  return owed.subclasses.flatMap((entry) => {
    const chosen = draft.subclasses[entry.classId];
    return chosen
      ? grantsForHeldTraining(subclassGrants([{ id: entry.classId, subclass: chosen, level: entry.classLevel }]), owed.known)
      : [];
  });
}

// What the draft sends: the picks made, nothing for what was left. A
// half-feat with a choice of score raises the first it offers when the
// player left the choice, as the level-up dialog sends it.
export function picksFromDraft(owed: OwedPicks | null, draft: PicksDraft, featDescOf: (name: string) => string): SeatPicks | null {
  if (!owed) {
    return null;
  }
  const subclasses = Object.fromEntries(Object.entries(draft.subclasses).filter(([, name]) => name));
  const asiChoices = draft.asiChoices.flatMap((choice) => {
    if (!choice) {
      return [];
    }
    if (choice.mode !== "feat" || choice.ability) {
      return [choice];
    }
    const from = featAbilityIncrease(choice.feat, featDescOf(choice.feat))?.from ?? [];
    return [from.length > 1 ? { ...choice, ability: from[0] } : choice];
  });
  const named = [
    ...asiChoices.flatMap((choice) => (choice.mode === "feat" ? [choice.feat] : [])),
    ...trainingFor(owed, draft).map((grant) => grant.name),
  ];
  const featChoices = Object.fromEntries(
    named.flatMap((name) => {
      const picks = featChoice(draft.featChoices, name);
      return picks ? [[name, picks] as const] : [];
    }),
  );
  const picks: SeatPicks = {
    ...(Object.keys(subclasses).length ? { subclasses } : {}),
    ...(asiChoices.length ? { asiChoices } : {}),
    ...(Object.keys(featChoices).length ? { featChoices } : {}),
    ...(draft.skills.length ? { skills: draft.skills } : {}),
    ...(draft.expertise.length ? { expertise: draft.expertise } : {}),
  };
  return Object.keys(picks).length ? picks : null;
}

export function useFeatDescOf(draft: PicksDraft) {
  const feats = draft.asiChoices.flatMap((choice) => (choice?.mode === "feat" ? [choice.feat] : []));
  const descs = useFeatDescs(feats);
  return (name: string) => descs[textKey(name)] ?? authoredFeatDesc(name) ?? "";
}

export function OwedPicksFields({
  owed,
  name,
  draft,
  onChange,
  featDescOf,
}: {
  owed: OwedPicks;
  name: string;
  draft: PicksDraft;
  onChange: (draft: PicksDraft) => void;
  featDescOf: (name: string) => string;
}) {
  const { t, tp } = useI18n();
  const training = useMemo(() => trainingFor(owed, draft), [owed, draft]);
  const setFeatPicks = (feat: string, picks: FeatPicks) =>
    onChange({ ...draft, featChoices: withFeatChoice(draft.featChoices, feat, picks) });
  const toggle = (list: string[], id: string, cap: number) =>
    list.includes(id) ? list.filter((entry) => entry !== id) : list.length < cap ? [...list, id] : list;
  // Training a subclass picked here brings counts as held for the pickers
  // after it, as the server applies it first.
  const skillsHeld = [...owed.known.skills, ...draft.skills];

  return (
    <div className="space-y-4" data-owed-pickers>
      {owed.subclasses.map((entry) => (
        <fieldset key={entry.classId} className="space-y-1.5" data-owed-subclass={entry.classId}>
          <legend className="text-stone-200">
            {t("campaign.joinConfirm.owed.subclass.label", { className: className(entry.classId, entry.className, t) })} <span className="text-xs text-stone-400">{t("campaign.joinConfirm.owed.subclass.dueAt", { className: className(entry.classId, entry.className, t), level: entry.dueAt })}</span>
          </legend>
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {entry.options.map((option) => {
              const picked = textKey(draft.subclasses[entry.classId] ?? "") === textKey(option);
              return (
                <div key={option} className={cn("flex items-center gap-2 rounded-md border px-2 text-sm", picked ? "border-amber-600 bg-stone-900 text-amber-100" : "border-stone-700 hover:border-amber-800 hover:bg-stone-900")}>
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() => onChange({ ...draft, subclasses: { ...draft.subclasses, [entry.classId]: picked ? "" : option } })}
                    className="min-h-11 grow rounded py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                  >
                    {subclassName(entry.classId, option, t)}
                  </button>
                  <InfoButton label={subclassName(entry.classId, option, t)} text={subclassBlurb(entry.classId, option) || undefined} />
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      {training.length ? (
        <div className="space-y-2" data-owed-training>
          {training.map((grant) => (
            <FeatChoicesFields
              key={grant.name}
              feat={grant.name}
              spec={grant.spec}
              picks={featChoice(draft.featChoices, grant.name)}
              known={owed.known}
              onChange={(picks) => setFeatPicks(grant.name, picks)}
              source="subclass"
            />
          ))}
        </div>
      ) : null}

      {owed.skills.count ? (
        <fieldset className="space-y-1.5" data-owed-skills>
          <legend className="text-stone-200">
            {t("campaign.joinConfirm.owed.classSkills", { count: owed.skills.count })}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {owed.skills.options.map((id) => {
              const picked = draft.skills.includes(id);
              return (
                <span key={id} className="inline-flex items-center">
                  <button type="button" aria-pressed={picked} className={chip(picked)} onClick={() => onChange({ ...draft, skills: toggle(draft.skills, id, owed.skills.count) })}>
                    {skillName(id, t)}
                  </button>
                  <InfoButton label={skillName(id, t)} text={skillHint(id, skillName(id, t), t)} />
                </span>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {owed.asi ? (
        <div className="space-y-1.5" data-owed-asi>
          <p className="text-stone-200">
            {tp("campaign.joinConfirm.owed.asi", owed.asi)}
          </p>
          <AsiFeatEditor
            slotLevels={owed.asiLevels}
            baseScores={owed.scores}
            choices={owed.asiLevels.map((_, index) => draft.asiChoices[index] ?? null)}
            onChange={(asiChoices) => onChange({ ...draft, asiChoices })}
            featSpecOf={(feat) => featGrantSpec(featDescOf(feat))}
            featDescOf={featDescOf}
            featChoices={draft.featChoices}
            onFeatPicks={setFeatPicks}
            known={owed.known}
          />
        </div>
      ) : null}

      {owed.expertise.count ? (
        <fieldset className="space-y-1.5" data-owed-expertise>
          <legend className="text-stone-200">
            {t("campaign.joinConfirm.owed.expertise", { count: owed.expertise.count, name })}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...owed.expertise.options, ...draft.skills.filter((id) => skillsHeld.includes(id))])].map((id) => {
              const picked = draft.expertise.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={picked}
                  className={chip(picked)}
                  onClick={() => onChange({ ...draft, expertise: toggle(draft.expertise, id, owed.expertise.count) })}
                >
                  {skillName(id, t)}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
