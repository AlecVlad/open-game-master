"use client";

import { useId, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Trash2 } from "lucide-react";
import { InfoButton } from "@/components/ui/InfoDialog";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { describeSkill } from "@/lib/help";
import { SRD_SKILLS } from "@/lib/srd";
import { subclassBlurb, subclassLevelFor, subclassNamesFor } from "@/lib/srd/features";
import { MULTICLASS_CAP, multiclassGrantsFor, multiclassPrereq, meetsPrereq } from "@/lib/srd/multiclass";
import { textKey } from "@/lib/language/text-logic";
import { classSplitWords, multiclassChoices } from "../multiclassBuild";
import OptionPicker, { type PickerGroup } from "../OptionPicker";
import { useRovingGroup } from "../roving";
import { useArchetypeOptions, type ClassOption } from "../useBuilderOptions";
import type { BuilderDerived, ExtraClassRow } from "../useBuilderDerived";
import type { BuilderState } from "../useBuilderState";
import { Field, PickPill, StepPanel, inputClass } from "./shared";

const ABILITY_KEYS: Record<string, string> = {
  str: "charSheet.ability.str",
  dex: "charSheet.ability.dex",
  con: "charSheet.ability.con",
  int: "charSheet.ability.int",
  wis: "charSheet.ability.wis",
  cha: "charSheet.ability.cha",
};

const GRANT_KEYS: Record<string, string> = {
  "light armor": "builder.multi.grant.lightArmor",
  "medium armor": "builder.multi.grant.mediumArmor",
  shields: "builder.multi.grant.shields",
  "simple weapons": "builder.multi.grant.simpleWeapons",
  "martial weapons": "builder.multi.grant.martialWeapons",
  shortswords: "builder.multi.grant.shortswords",
  "one musical instrument": "builder.multi.grant.musicalInstrument",
  "thieves' tools": "builder.multi.grant.thievesTools",
  "tinker's tools": "builder.multi.grant.tinkersTools",
};

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

type Translate = ReturnType<typeof useI18n>["t"];

function prerequisiteLabel(classId: string, t: Translate): string {
  const groups = multiclassPrereq(classId);
  if (!groups) return t("builder.multi.noPrerequisite");
  return groups
    .map((group) => group.map((ability) => `${t(ABILITY_KEYS[ability] as never)} 13`).join(t("builder.multi.and")))
    .join(t("builder.multi.or"));
}

function grantLabel(grant: ReturnType<typeof multiclassGrantsFor>, t: Translate): string {
  const parts = [...grant.armor, ...grant.weapons, ...grant.tools].map((entry) =>
    GRANT_KEYS[entry] ? t(GRANT_KEYS[entry] as never) : entry,
  );
  if (grant.skillChoice) {
    parts.push(t(grant.skillChoice.from.length ? "builder.multi.grant.skillFromClass" : "builder.multi.grant.skillAny"));
  }
  return parts.length ? parts.join(t("builder.multi.comma")) : t("builder.multi.noGrants");
}

function hitDieLabel(hitDie: number, numbers: boolean, t: Translate): string {
  const key = hitDie >= 12 ? "builder.multi.hitDie.veryHigh" : hitDie >= 10 ? "builder.multi.hitDie.high" : hitDie >= 8 ? "builder.multi.hitDie.medium" : hitDie >= 6 ? "builder.multi.hitDie.low" : "builder.multi.hitDie.veryLow";
  return `${t(key as never)}${numbers ? `, d${hitDie}` : ""}`;
}

function choiceReasonLabel(
  reason: string | null,
  classId: string,
  classList: BuilderDerived["classList"],
  abilities: BuilderDerived["shownAbilities"],
  nameOf: (id: string) => string,
  t: Translate,
): string {
  if (!reason) return "";
  if (reason.startsWith("A character holds at most")) {
    return t("builder.multi.reason.classLimit", { max: MULTICLASS_CAP });
  }
  if (reason.includes("can only be a first class here")) {
    return t("builder.multi.reason.firstClassOnly", { klass: nameOf(classId) });
  }
  if (reason.startsWith("Needs ")) {
    return t("builder.multi.reason.needsScores", { needs: prerequisiteLabel(classId, t) });
  }
  if (reason.startsWith("Taking a second class means your ") && abilities) {
    const held = classList.find((entry) => !meetsPrereq(abilities, entry.id));
    if (held) {
      return t("builder.multi.reason.bothClasses", {
        klass: nameOf(held.id),
        needs: prerequisiteLabel(held.id, t),
      });
    }
  }
  return t("builder.multi.reason.unavailable");
}

function skillLabel(skillId: string, fallback: string, t: Translate): string {
  const key = SKILL_KEYS[skillId];
  return key ? t(key as never) : fallback;
}


// The classes taken after the first (backlog F9), under the class pick and
// the level: each one's levels, its subclass once its own level reaches the
// pick, the skill its multiclass grant lets the player choose, what it adds
// and a way to take it off; then "Add a second class", which lists every
// class the character could add, the ones it may first, each refusal in
// words (the level-up dialog's list, LevelUpDialog.tsx). Offered from level
// 2 at a table that allows it, and always in the library, on a host that
// keeps a split made there (SERVER_FEATURES builderMulticlass).
export function MulticlassSection({
  state,
  derived,
  klass,
  classes,
  classGroups,
  allowed,
  numbers,
}: {
  state: BuilderState;
  derived: BuilderDerived;
  klass: ClassOption;
  classes: ClassOption[];
  // The class grid's own groups for this table (usePickerGroups): the list
  // offers the same classes in the same order, the grid's first group up
  // front and the rest (other books, other settings) folded, as the level-up
  // dialog folds them.
  classGroups: PickerGroup[];
  // The table's multiclassing setting (useTableRules); true in the library.
  // False on a host that has no builderMulticlass flag.
  allowed: boolean;
  // "Show rules and numbers" (backlog F11): the hit die joins its words.
  numbers: boolean;
}) {
  const { t, tp } = useI18n();
  const [adding, setAdding] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const listId = useId();
  const { extras, classList, primaryLevel, effectiveLevel } = derived;
  const nameOf = (id: string) => classes.find((entry) => entry.id === id)?.name ?? id;
  const { choices, first } = useMemo(() => {
    const ids = [...new Set(classGroups.flatMap((group) => group.options.map((option) => option.id)).filter(Boolean))];
    const rows = ids.flatMap((id) => classes.filter((row) => row.id === id).slice(0, 1));
    const up = new Set(classGroups.length > 1 ? classGroups[0].options.map((option) => option.id) : ids);
    return {
      choices: multiclassChoices({
        rows: rows.length ? rows : classes,
        classList,
        abilities: derived.shownAbilities,
        rowOf: (id) => classes.find((entry) => entry.id === id),
      }),
      first: up,
    };
  }, [classGroups, classes, classList, derived.shownAbilities]);
  const upFront = choices.filter((choice) => first.has(choice.row.id));
  const folded = choices.filter((choice) => !first.has(choice.row.id));
  // One tab stop for the list, the arrows between its classes (F16). A
  // class that may not be added still takes focus, so its reason is read.
  const shown = othersOpen ? [...upFront, ...folded] : upFront;
  const roving = useRovingGroup({ keys: shown.map((choice) => choice.row.id) });
  // A stored split shows at a table that turns multiclassing off (it keeps
  // what it has); a new class is offered only where the table allows it.
  const canAdd = allowed && extras.length < MULTICLASS_CAP - 1 && primaryLevel >= 2;
  if (!extras.length && (!allowed || effectiveLevel < 2)) {
    return null;
  }
  // The class the button adds: a second, or (with one already) a third.
  const next = extras.length === 0 ? "second" : "third";
  return (
    <StepPanel
      anchor="multiclass"
      title={extras.length ? t("builder.multi.title.classes", { classes: classSplitWords(classList, nameOf) }) : t("builder.multi.title.moreThanOne")}
      help={t("builder.multi.help", { klass: klass.name })}
    >
      {!allowed && extras.length && !classList.every((entry) => (state.storedClassIds ?? []).includes(entry.id)) ? (
        <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t("builder.multi.disabledNotice")}
        </p>
      ) : null}
      <p className="mb-3 text-xs text-stone-400">
        {t("builder.multi.primarySummary", {
          klass: klass.name,
          primary: primaryLevel,
          primaryWord: tp("builder.multi.levelWord", primaryLevel),
          total: effectiveLevel,
          extra: extras.length ? t("builder.multi.primaryExtra") : ".",
        })}
      </p>
      {extras.map((entry) => (
        <ExtraClassCard
          key={entry.classId}
          state={state}
          derived={derived}
          entry={entry}
          index={state.extraClasses.findIndex((held) => held.classId === entry.classId)}
          numbers={numbers}
        />
      ))}
      {canAdd ? (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={adding}
            aria-controls={listId}
            onClick={() => setAdding((open) => !open)}
            data-add-class=""
            className="inline-flex min-h-11 items-center rounded-lg border border-amber-500/40 px-3 text-sm text-amber-200 transition-colors hover:bg-amber-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {adding ? t("builder.multi.add.close") : t("builder.multi.add.button", { ordinal: next === "second" ? t("builder.multi.ordinal.second") : t("builder.multi.ordinal.third") })}
          </button>
          <div id={listId} hidden={!adding} className="mt-2">
            <p className="mb-2 text-xs text-stone-500">
              {t("builder.multi.add.help", { klass: klass.name })}
              {derived.shownAbilities ? "" : ` ${t("builder.multi.add.help.scoresPending")}`}
            </p>
            <ul
              aria-label={t("builder.multi.add.aria", { ordinal: next === "second" ? t("builder.multi.ordinal.second") : t("builder.multi.ordinal.third") })}
              className="grid gap-1.5 sm:grid-cols-2"
              onKeyDown={roving.onKeyDown}
              onFocus={roving.onFocus}
            >
              {shown.map((choice) => (
                <li key={choice.row.id}>
                  <button
                    type="button"
                    aria-disabled={!choice.ok || undefined}
                    aria-describedby={`${listId}-${choice.row.id}`}
                    tabIndex={roving.tabIndex(choice.row.id)}
                    data-roving-item={choice.row.id}
                    onClick={() => {
                      if (!choice.ok) {
                        return;
                      }
                      state.addExtraClass(choice.row.id);
                      setAdding(false);
                    }}
                    className={cn(
                      "block min-h-11 w-full rounded-lg border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400",
                      choice.ok
                        ? "border-stone-600/60 text-stone-200 hover:border-amber-500/40 hover:bg-stone-900/70"
                        : "cursor-not-allowed border-stone-800 text-stone-500",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span>{choice.row.name}</span>
                      <span className="text-xs text-stone-500">{hitDieLabel(classes.find((entry) => entry.id === choice.row.id)?.hitDie ?? 8, numbers, t)}</span>
                    </span>
                    <span id={`${listId}-${choice.row.id}`} className="block text-xs">
                      {choice.ok
                        ? t("builder.multi.choice.adds", { grants: grantLabel(multiclassGrantsFor(choice.row.id), t) })
                        : choiceReasonLabel(choice.reason, choice.row.id, classList, derived.shownAbilities, nameOf, t)}{" "}
                      <span className="text-stone-500">{t("builder.multi.choice.needs", { needs: prerequisiteLabel(choice.row.id, t) })}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {folded.length ? (
              <button
                type="button"
                aria-expanded={othersOpen}
                onClick={() => setOthersOpen((open) => !open)}
                data-add-class-more=""
                className="mt-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm text-sky-300 transition-colors hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                {othersOpen ? t("builder.multi.showFewer") : t("builder.multi.showMore", { count: folded.length })}
              </button>
            ) : null}
          </div>
        </div>
      ) : allowed && extras.length < MULTICLASS_CAP - 1 && extras.length ? (
        <p className="mt-3 text-xs text-stone-500">
          {t("builder.multi.noLevel", { klass: klass.name, ordinal: next === "second" ? t("builder.multi.ordinal.second") : t("builder.multi.ordinal.third") })}
        </p>
      ) : null}
    </StepPanel>
  );
}

// One class taken after the first: its levels, its subclass, its skill pick,
// what it adds, its features at its level, and a way to take it off.
function ExtraClassCard({
  state,
  derived,
  entry,
  index,
  numbers,
}: {
  state: BuilderState;
  derived: BuilderDerived;
  entry: ExtraClassRow;
  // Its place in state.extraClasses, which the actions take.
  index: number;
  numbers: boolean;
}) {
  const { t, tp } = useI18n();
  const row = entry.klass;
  const name = row.name;
  // As many levels as it has plus all but one of the first class's.
  const most = entry.level + Math.max(0, derived.primaryLevel - 1);
  const grant = multiclassGrantsFor(row.id);
  const pickLevel = subclassLevelFor(row.id);
  const features = derived.featuresByClass.find((held) => held.classId === row.id)?.features ?? [];
  // The skills it may teach, greyed where the character already has one
  // from elsewhere.
  const skillPool = grant.skillChoice
    ? grant.skillChoice.from.length
      ? grant.skillChoice.from
      : SRD_SKILLS.map((skill) => skill.id)
    : [];
  const elsewhere = new Set(
    derived.proficientSkills.filter((skill) => !entry.skills.some((own) => textKey(own) === textKey(skill))).map(textKey),
  );
  return (
    <section
      aria-label={t("builder.multi.class.aria", { name, level: entry.level, levelWord: tp("builder.multi.levelWord", entry.level) })}
      className="mb-3 rounded-lg border border-stone-700/70 bg-stone-950/40 p-3"
      data-extra-class={row.id}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="grow text-sm text-amber-100">
          {name}{" "}
          <span className="text-xs text-stone-500">
            {hitDieLabel(row.hitDie, numbers, t)}
          </span>
        </h3>
        <button
          type="button"
          onClick={() => state.removeExtraClass(index)}
          aria-label={t("builder.multi.remove")}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-xs text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {t("builder.multi.remove")}
        </button>
      </div>
      <Field label={t("builder.multi.class.levels", { name })} className="mt-2">
        <Select<string>
          value={String(entry.level)}
          onChange={(value) => state.changeExtraLevel(index, Number(value))}
          label={t("builder.multi.class.levels", { name })}
          className="w-full"
          options={Array.from({ length: Math.max(1, most) }, (_, at) => ({ value: String(at + 1), label: String(at + 1) }))}
        />
      </Field>
      <p className="mt-2 text-xs text-stone-400">{t("builder.multi.extra.adds", { grants: grantLabel(grant, t) })} {t("builder.multi.extra.noSaves")}</p>
      {pickLevel !== null ? (
        entry.level >= pickLevel ? (
          <ExtraSubclassField state={state} entry={entry} index={index} />
        ) : (
          <p className="mt-2 text-xs text-stone-500">
            {t("builder.multi.subclass.wait", { klass: name, pickLevel, level: entry.level })}
          </p>
        )
      ) : null}
      {grant.skillChoice ? (
        <Field label={t("builder.multi.skill.fromLevels", { klass: name, count: grant.skillChoice.count })} className="mt-3">
          <div className="flex flex-wrap gap-2">
            {skillPool.map((skillId) => {
              const skill = SRD_SKILLS.find((candidate) => candidate.id === skillId);
              const selected = entry.skills.some((own) => textKey(own) === textKey(skillId));
              const taken = elsewhere.has(textKey(skillId));
              const label = skillLabel(skillId, skill?.name ?? skillId, t);
              return (
                <PickPill
                  key={skillId}
                  label={label}
                  selected={selected}
                  disabled={taken}
                  info={{ text: taken ? t("builder.multi.skill.alreadyYours", { skill: label }) : describeSkill(skillId) }}
                  onClick={() => {
                    const count = grant.skillChoice?.count ?? 1;
                    const next = selected
                      ? entry.skills.filter((own) => textKey(own) !== textKey(skillId))
                      : count === 1
                        ? [skillId]
                        : entry.skills.length < count
                          ? [...entry.skills, skillId]
                          : entry.skills;
                    state.changeExtraSkills(index, next);
                  }}
                >
                  {label}
                  {taken ? ` ${t("builder.multi.skill.yours")}` : ""}
                </PickPill>
              );
            })}
          </div>
        </Field>
      ) : null}
      {features.length ? (
        <p className="mt-3 text-xs text-stone-400">
          {t("builder.multi.featuresAt", { klass: name, level: entry.level, features: features.map((feature) => feature.name).join(", ") })}
        </p>
      ) : null}
    </section>
  );
}

// The subclass of a class taken after the first: the bundled tables first,
// then the workshop's and the content pack's, as the first class's picker
// offers them (usePickerGroups.ts).
function ExtraSubclassField({ state, entry, index }: { state: BuilderState; entry: ExtraClassRow; index: number }) {
  const { t } = useI18n();
  const { archetypes } = useArchetypeOptions(entry.klass.id);
  const groups = useMemo<PickerGroup[]>(() => {
    const builtIn = subclassNamesFor(entry.klass.id);
    const known = new Set(builtIn.map(textKey));
    const others = archetypes.filter((archetype) => !known.has(textKey(archetype.name)));
    return [
      { label: null, options: [{ id: "", name: t("builder.multi.subclass.noneYet") }] },
      ...(builtIn.length
        ? [
            {
              label: t("builder.multi.subclass.fullFeatures"),
              options: builtIn.map((subclassName) => ({
                id: subclassName,
                name: subclassName,
                infoText: subclassBlurb(entry.klass.id, subclassName) || undefined,
              })),
            },
          ]
        : []),
      ...(others.length
        ? [{ label: t("builder.multi.subclass.more"), options: others.map((archetype) => ({ id: archetype.name, name: archetype.name, infoText: archetype.desc })) }]
        : []),
    ];
  }, [entry.klass.id, archetypes, t]);
  const blurb = entry.subclass ? subclassBlurb(entry.klass.id, entry.subclass) : "";
  return (
    <Field label={t("builder.multi.subclass.label", { klass: entry.klass.name })} className="mt-3">
      <OptionPicker
        value={entry.subclass}
        groups={groups}
        placeholder={t("builder.multi.subclass.noneYet")}
        className={inputClass}
        onChange={(name) => state.changeExtraSubclass(index, name)}
      />
      {entry.subclass ? (
        <span className="mt-1 flex items-start gap-1 text-xs text-stone-500">
          <span className="grow">{blurb || t("builder.multi.subclass.specialization")}</span>
          {blurb ? <InfoButton label={entry.subclass} text={blurb} /> : null}
        </span>
      ) : (
        <span className="mt-1 block text-xs text-amber-300">{t("builder.multi.subclass.still")}</span>
      )}
    </Field>
  );
}
