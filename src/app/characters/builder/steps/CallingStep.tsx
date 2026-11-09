"use client";

import { useMemo, useState, type ReactNode } from "react";
import { GameTerm } from "@/components/ui/GameTerm";
import { InfoButton, InfoDialog } from "@/components/ui/InfoDialog";
import { describeFeature, describeSkill } from "@/lib/help";
import { useClassFeatureText } from "@/lib/classes/use-feature-text";
import { firstSentence } from "@/lib/help/rules-text";
import { CLASS_ROLES, classRoles, type ClassRole } from "@/lib/srd/class-roles";
import { subclassBlurb } from "@/lib/srd/features";
import { SRD_SKILLS } from "@/lib/srd";
import { displayName, type Reskinned } from "@/lib/worlds/reskin-logic";
import type { WorldPack } from "@/lib/worlds/types";
import { classCard } from "../cardFaces";
import { abilityName, hitDieChip } from "../lineage";
import { useShowNumbers } from "../numbersPref";
import { OptionCardGrid, type CardFacet, type OptionCardGroup } from "../OptionCardGrid";
import OptionPicker, { type PickerGroup } from "../OptionPicker";
import { classInfoText } from "../usePickerGroups";
import { grantedSkillSources, grantingTrait } from "../reconcile";
import type { ArchetypeOption, BackgroundOption, ClassOption, RaceOption } from "../useBuilderOptions";
import type { BuilderActions, BuilderDerived } from "../useBuilderDerived";
import type { BuilderState } from "../useBuilderState";
import { ClassChoices } from "./ClassChoices";
import { MulticlassSection } from "./MulticlassSection";
import { PlaystylePicker } from "../PlaystylePicker";
import { fillClassSkills, type PlaystyleId } from "../playstyles";
import FeatChoicesFields, { knownTraining } from "../FeatChoicesFields";
import { Field, PickForMe, PickPill, StepPanel, inputClass } from "./shared";
import { featChoice } from "@/lib/schemas/sheet";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";

// Step 1 (backlog F4: how you want to play comes first): the setting's
// notices, then the class (the playstyle question and "Help me build" over
// painted cards in the picker's groups and order, the setting's callings
// first and badged, each with its emblem and a ? that opens its write-up),
// the level, its subclass once the level allows one, what the pair grants at
// this level, and the class skill picks. Expertise, fighting styles and
// option lists (invocations and the like) follow in ClassChoices.
export function CallingStep({
  state,
  derived,
  actions,
  klass,
  race,
  background,
  pack,
  classes,
  classGroups,
  subclassGroups,
  offersSubclass,
  subclassLockedAt,
  chosenArchetype,
  playstyle,
  onPickForMe,
  classNote = null,
  subclassNote = null,
  notices = null,
  genderField = null,
  levelField = null,
  multiclassAllowed = true,
}: {
  state: BuilderState;
  derived: BuilderDerived;
  actions: BuilderActions;
  klass: ClassOption | undefined;
  race: RaceOption | undefined;
  background: BackgroundOption | undefined;
  pack: WorldPack | null;
  classes: Array<Reskinned<ClassOption>>;
  classGroups: PickerGroup[];
  subclassGroups: PickerGroup[];
  offersSubclass: boolean;
  // The level the class picks a subclass at, while this level is below it.
  subclassLockedAt: number | null;
  chosenArchetype: ArchetypeOption | null;
  // A new character's answer to "how do you want to play", held by the
  // builder so the background's hints and the quiz follow it. The question
  // is in its door's words (a player's job, or what the party needs), and
  // "Help me build" (QuickBuildQuiz.tsx) carries the job picked so far.
  playstyle?: {
    value: PlaystyleId | null;
    onChange: (style: PlaystyleId | null) => void;
    question?: string;
    intro?: string;
    onHelpMeBuild?: (style: PlaystyleId | null) => void;
  };
  // The setting's notices (ContentNotices), the gender (GenderField), which
  // the class cards' art follows, so it is asked above them, and the level
  // (LevelField): the level decides what this step and every later one
  // offers, so it is set here, under the class.
  notices?: ReactNode;
  genderField?: ReactNode;
  levelField?: ReactNode;
  // "Pick for me" on the subclass (quickBuild.ts), offered once the level
  // asks for one.
  onPickForMe?: (target: "subclass") => void;
  // Why the class or subclass list may be short (TableScopeNote): the
  // asker's own Homebrew the table leaves out, or a list that did not load.
  classNote?: ReactNode;
  subclassNote?: ReactNode;
  // Whether a second class may be added here (backlog F9): the table's
  // multiclassing setting, always true in the library.
  multiclassAllowed?: boolean;
}) {
  const { t } = useI18n();
  const { subclass } = state;
  const { effectiveLevel } = derived;
  // The first class's own levels and features: a class taken after it
  // shows its own in its card (MulticlassSection).
  const primaryLevel = derived.primaryLevel ?? effectiveLevel;
  const grantedFeatures = derived.multiclass ? (derived.featuresByClass[0]?.features ?? []) : derived.grantedFeatures;
  const { gender } = state;
  // A genre class's feature text arrives on demand (issue 411).
  useClassFeatureText([klass?.id]);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  // "Show rules and numbers" (backlog F11): the cards add the hit die.
  const numbers = useShowNumbers();
  // What "Suggest the rest" picked, said until the player changes a pick.
  const [suggested, setSuggested] = useState<string[] | null>(null);
  // The skills already the character's from race or background, and the
  // source each came from: the same map the toggle refuses by, so every
  // greyed pill says why (issue #109).
  const skillSources = useMemo(
    () =>
      grantedSkillSources({
        race,
        background,
        racialSkills: state.racialSkills,
        backgroundSkills: state.backgroundSkills,
      }),
    [race, background, state.racialSkills, state.backgroundSkills],
  );

  // Each class's job in a fight and which of the core four it plays like
  // (src/lib/srd/class-roles.ts).
  const readings = useMemo(
    () =>
      new Map(
        classGroups.flatMap((group) =>
          group.options.map((option) => [
            option.id,
            classRoles(classes.find((candidate) => candidate.id === option.id) ?? { id: option.id }),
          ]),
        ),
      ),
    [classGroups, classes],
  );
  // Each card's face: its play line, its job, its HP in words, its caster
  // (cardFaces.ts, backlog F11).
  const cardGroups = useMemo<OptionCardGroup[]>(
    () =>
      classGroups.map((group) => ({
        label: group.label,
        recommended: group.recommended,
        options: group.options.map((option) =>
          classCard({
            option,
            entry: classes.find((candidate) => candidate.id === option.id),
            reading: readings.get(option.id),
            gender,
            numbers,
          }),
        ),
      })),
    [classGroups, classes, gender, readings, numbers],
  );
  // The class grid's filters (OptionCardGrid): its job in a fight, how much
  // magic it has, which of the core four it plays like, and its book or
  // setting. Each offers only the values some class has, so a veteran can
  // ask for the tanks among the setting's classes.
  const classFacets = useMemo<CardFacet[]>(() => {
    const entryOf = (id: string) => classes.find((candidate) => candidate.id === id);
    const magicOf = (id: string) => {
      const type = entryOf(id)?.casterType ?? "none";
      return type === "none" ? "None" : type === "half" || type === "artificer" ? "Half caster" : "Full caster";
    };
    const bookOf = (id: string) => {
      const entry = entryOf(id);
      return entry?.genres?.length ? entry.genres.map(genreWords).join(", ") : entry?.source || "Core rules";
    };
    const ids = [...readings.keys()];
    const present = (values: string[]) => [...new Set(values)].sort().map((value) => ({ value, label: value }));
    return [
      {
        key: "role",
        label: t("builder.call.facet.role"),
        options: CLASS_ROLES.filter((role) => ids.some((id) => readings.get(id)?.roles.includes(role))).map((role) => ({ value: role, label: role })),
        test: (id, role) => Boolean(readings.get(id)?.roles.includes(role as ClassRole)),
      },
      {
        key: "magic",
        label: t("builder.call.facet.magic"),
        options: ["None", "Half caster", "Full caster"].filter((kind) => ids.some((id) => magicOf(id) === kind)).map((kind) => ({ value: kind, label: t(`builder.call.magic.${kind}` as MessageKey) })),
        test: (id, kind) => magicOf(id) === kind,
      },
      {
        key: "plays",
        label: t("builder.call.facet.plays"),
        options: ["Fighter", "Wizard", "Cleric", "Rogue"].map((core) => ({ value: core, label: core })),
        test: (id, core) => Boolean(readings.get(id)?.playsLike.includes(core)),
      },
      {
        key: "book",
        label: t("builder.call.facet.book"),
        options: present(ids.map(bookOf)).map((option) => ({ ...option, label: option.value === "Core rules" ? t("builder.call.core") : option.label })),
        test: (id, book) => bookOf(id) === book,
      },
    ];
  }, [classes, readings, t]);
  const details = detailsFor
    ? classGroups.flatMap((group) => group.options).find((option) => option.id === detailsFor)
    : undefined;

  return (
    <div className="space-y-4">
      {notices}
      <StepPanel title={t("builder.call.choose")} ornate anchor="class">
        {/* A plain-language way in, above the full catalog it points into.
            "Easy to learn" there and the setting's star in the grid mean
            different things: one is about play, the other about the world. */}
        <PlaystylePicker
          offered={classGroups.flatMap((group) =>
            group.options.map((option) => {
              const reading = readings.get(option.id);
              return { id: option.id, name: option.name, roles: reading?.roles ?? [], playsLike: reading?.playsLike ?? "" };
            }),
          )}
          chosen={klass?.id ?? ""}
          onChoose={state.changeClass}
          style={playstyle?.value}
          onStyle={playstyle?.onChange}
          question={playstyle?.question}
          intro={playstyle?.intro}
          onHelpMeBuild={playstyle?.onHelpMeBuild}
        />
        {genderField}
        <Field label={t("builder.call.class")} className="mt-4">
          {klass ? (
            <span className="mb-3 flex flex-wrap items-center gap-x-1 text-xs text-stone-500">
              <span className="text-amber-200">{klass.name}:</span>{" "}
              {/* In words first (backlog F11); the die joins them with "Show rules and numbers" on. */}
              <GameTerm id="hit_dice">{hitDieChip(klass.hitDie, numbers)}</GameTerm> ·{" "}
              <GameTerm id="saving_throw">{t("builder.call.saves")}</GameTerm>{" "}
              {klass.saves.map(abilityName).join(", ")}
              {klass.spellAbility ? (
                <>
                  {" · "}
                  <GameTerm id={klass.spellAbility}>{abilityName(klass.spellAbility)}</GameTerm>{" "}
                  {t("builder.call.caster")}
                  {klass.castingLabel ? ` ${t("builder.call.flavored", { x: klass.castingLabel })}` : ""}
                </>
              ) : null}
              <InfoButton
                label={klass.name}
                text={classInfoText(klass)}
                reference={{ kind: "classes", slug: klass.id }}
              />
            </span>
          ) : null}
          <OptionCardGrid
            groups={cardGroups}
            value={klass?.id ?? ""}
            onChoose={state.changeClass}
            onDetails={setDetailsFor}
            noun="class"
            facets={classFacets}
            compact
            numbersSwitch
          />
          {classNote}
          {/* The same write-up the dropdown's info button opened: the pack's
              blurb, the catalog blurb or the content pack's entry. */}
          <InfoDialog
            open={Boolean(details)}
            onOpenChange={(open) => (open ? undefined : setDetailsFor(null))}
            title={details?.name ?? ""}
            // The card's role and "plays like", said again where the class
            // is read about at length.
            meta={
              details
                ? classDetailsMeta({
                    id: details.id,
                    meta: details.meta,
                    saves: classes.find((candidate) => candidate.id === details.id)?.saves,
                    reading: readings.get(details.id),
                  }, t).join(" · ")
                : undefined
            }
            text={details?.infoText}
            reference={details?.reference}
          />
        </Field>
        {levelField}
        {offersSubclass ? (
          <Field label={t("builder.call.subclass")} className="mt-3" anchor="subclass">
            <OptionPicker
              value={subclass}
              groups={subclassGroups}
              placeholder={t("builder.call.none")}
              className={inputClass}
              onChange={state.changeSubclass}
            />
            <span className="mt-1 flex items-start gap-1 text-xs text-stone-500">
              {subclass ? (
                <>
                  <span className="grow">
                    {firstSentence(chosenArchetype?.desc || subclassBlurb(klass?.id ?? "", subclass)) ??
                      t("builder.call.spec")}
                  </span>
                  <InfoButton
                    label={subclass}
                    text={chosenArchetype?.desc || subclassBlurb(klass?.id ?? "", subclass) || undefined}
                    reference={
                      chosenArchetype ? { kind: "archetypes", slug: chosenArchetype.id } : undefined
                    }
                  />
                </>
              ) : (
                <>
                  <span className="grow">
                    <span className="text-amber-300">{t("builder.call.still")}</span>
                    {t("builder.call.sub.pre")}<GameTerm id="subclass">{t("builder.call.sub.term")}</GameTerm>{t("builder.call.sub.post")}
                  </span>
                  {onPickForMe ? <PickForMe what={t("builder.call.sub.what")} onPick={() => onPickForMe("subclass")} /> : null}
                </>
              )}
            </span>
            {subclassNote}
            {/* What the subclass trains the character in (issue 251): its
                armor and weapons said outright, and its picks asked for here,
                as a feat's are. */}
            {derived.subclassTraining.filter((grant) => !grant.optional).map((grant) => (
              <FeatChoicesFields
                key={grant.name}
                feat={grant.name}
                spec={grant.spec}
                picks={featChoice(state.featChoices, grant.name)}
                known={knownTraining(derived)}
                onChange={(picks) => state.setFeatPicks(grant.name, picks)}
                source="subclass"
              />
            ))}
          </Field>
        ) : subclassLockedAt !== null && klass ? (
          // Below the class's subclass level the menu stays shut and says
          // when the choice comes, instead of listing picks that vanished.
          <Field label={t("builder.call.subclass")} className="mt-3">
            <p className="rounded-lg border border-dashed border-stone-700/70 bg-stone-950/40 px-3 py-2 text-xs text-stone-400">
              {t("builder.call.lock.pre", { klass: klass.name.toLowerCase() })}<GameTerm id="subclass">{t("builder.call.sub.term")}</GameTerm>
              {t("builder.call.lock.post", {
                n: subclassLockedAt,
                at: derived.multiclass ? t("builder.call.at.klass", { klass: klass.name.toLowerCase() }) : t("builder.call.at.plain"),
                m: primaryLevel,
              })}
            </p>
            {subclassNote}
          </Field>
        ) : null}
      </StepPanel>

      {klass ? (
        <MulticlassSection
          state={state}
          derived={derived}
          klass={klass}
          classes={classes}
          classGroups={classGroups}
          allowed={multiclassAllowed}
          numbers={numbers}
        />
      ) : null}

      {grantedFeatures.length ? (
        <StepPanel
          title={
            derived.multiclass
              ? t("builder.call.gain.multi", { klass: klass?.name.toLowerCase() ?? t("builder.call.noun.class"), n: primaryLevel })
              : t("builder.call.gain", { n: effectiveLevel })
          }
          help={t("builder.call.gain.help")}
        >
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {grantedFeatures.map((feature) => (
              <span
                key={`${feature.name}-${feature.level ?? 0}`}
                className="flex items-center gap-1 text-xs text-stone-300"
              >
                {displayName(pack, "features", feature.name)}
                <InfoButton
                  label={feature.name}
                  meta={feature.level ? t("builder.call.level", { n: feature.level }) : undefined}
                  text={klass ? describeFeature(klass.id, subclass, feature.name) : null}
                />
              </span>
            ))}
          </div>
        </StepPanel>
      ) : null}

      {klass ? (
        <StepPanel
          anchor="classSkills"
          title={t("builder.call.skills", { n: klass.skillChoices.count })}
          help={
            <>
              {klass.skillChoices.count - state.chosenSkills.length > 0 ? (
                <span className="text-amber-300">
                  {t("builder.call.left", { n: klass.skillChoices.count - state.chosenSkills.length })}
                  <button
                    type="button"
                    onClick={() => {
                      const filled = fillClassSkills({
                        classId: klass.id,
                        from: klass.skillChoices.from,
                        count: klass.skillChoices.count,
                        chosen: state.chosenSkills,
                        granted: new Set(skillSources.keys()),
                      });
                      setSuggested(filled.filter((id) => !state.chosenSkills.includes(id)));
                      state.setChosenSkills(filled);
                    }}
                    className="underline-offset-2 hover:underline"
                    data-suggest-skills
                  >
                    {t("builder.call.suggest")}
                  </button>{" "}
                </span>
              ) : suggested?.length && suggested.every((id) => state.chosenSkills.includes(id)) ? (
                <span key={suggested.join()} className="reveal block text-amber-200/90">
                  {t("builder.call.suggested", {
                    klass: klass.name.toLowerCase(),
                    names: suggested.map((id) => SRD_SKILLS.find((entry) => entry.id === id)?.name ?? id).join(", "),
                  })}{" "}
                </span>
              ) : null}
              {t("builder.call.skill.pre")}<GameTerm id="skill">{t("builder.call.skill.term")}</GameTerm>{t("builder.call.skill.mid")}
              <GameTerm id="proficiency_bonus">{t("builder.call.skill.term2")}</GameTerm>{t("builder.call.skill.post")}
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            {klass.skillChoices.from.map((skillId) => {
              const skill = SRD_SKILLS.find((entry) => entry.id === skillId);
              const name = skill?.name ?? skillId;
              const source = skillSources.get(skillId.trim().toLowerCase());
              const grantedBy = source === "race" ? race?.name : source === "background" ? background?.name : "";
              const trait = source === "race" && race ? grantingTrait(race.id, name) : null;
              const info = source
                ? `${t("builder.call.src.info", {
                    name,
                    source: t(`builder.call.src.${source}` as MessageKey),
                    by: grantedBy ? ` (${grantedBy})` : "",
                    through: trait ? t("builder.call.src.through", { trait }) : "",
                  })}\n\n${describeSkill(skillId) ?? ""}`.trim()
                : describeSkill(skillId);
              return (
                <PickPill
                  key={skillId}
                  label={name}
                  selected={state.chosenSkills.includes(skillId)}
                  disabled={Boolean(source)}
                  onClick={() => actions.toggleSkill(skillId)}
                  info={{ text: info }}
                >
                  {name}
                  {source ? ` (${t(`builder.call.src.${source}` as MessageKey)})` : ""}
                </PickPill>
              );
            })}
          </div>
        </StepPanel>
      ) : null}

      <ClassChoices state={state} derived={derived} actions={actions} klass={klass} />
    </div>
  );
}

// A genre id as the filter reads it ("dark-fantasy" is "Dark fantasy").
function genreWords(genre: string): string {
  const words = genre.replace(/[-_]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// The parts of the line over a class's write-up, joined with " · ": its
// book, its saves, its job in a fight and which of the core four it plays
// like. The card's details dialog and the build math panel's picks both
// read it.
export function classDetailsMeta(
  {
    id,
    meta,
    saves,
    reading,
  }: {
    id: string;
    meta?: string;
    saves?: string[];
    reading?: ReturnType<typeof classRoles>;
  },
  say?: ReturnType<typeof useI18n>["t"],
): string[] {
  const s = (key: MessageKey, english: string, params?: Record<string, string | number>) => (say ? say(key, params) : english);
  return [
    meta,
    saves?.length ? s("builder.call.meta.saves", `Saves ${saves.map(abilityName).join(", ")}`, { list: saves.map(abilityName).join(", ") }) : "",
    reading ? s("builder.call.meta.role", `Role: ${reading.roles.join(" / ")}`, { roles: reading.roles.join(" / ") }) : "",
    reading
      ? reading.playsLike.toLowerCase() === id.toLowerCase()
        ? s("builder.call.meta.core", "One of the core four")
        : s("builder.call.meta.plays", `Plays like ${reading.playsLike}`, { x: reading.playsLike }) +
          (reading.suggested ? s("builder.call.meta.suggested", " (suggested)") : "")
      : "",
  ].filter((part): part is string => Boolean(part));
}
