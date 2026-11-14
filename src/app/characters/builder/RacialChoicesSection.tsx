"use client";

import { asiPickAmount, asiPickWords } from "@/lib/srd/race-asi";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import CatalogBrowser from "@/app/characters/builder/CatalogBrowser";
import ContentPicker from "@/app/characters/builder/ContentPicker";
import type { RaceOption } from "@/app/characters/builder/useBuilderOptions";
import { GameTerm } from "@/components/ui/GameTerm";
import { InfoButton } from "@/components/ui/InfoDialog";
import { Select } from "@/components/ui/Select";
import { ALL_SKILLS } from "@/lib/content/mechanics";
import { KNOWN_TOOLS } from "@/lib/srd/feat-grant-text";
import { toolLabel, toolPickOptions } from "@/lib/srd/tool-choices";
import { contentSlug, describeSkill, glossaryTerm } from "@/lib/help";
import { SRD_SKILLS } from "@/lib/srd";
import { ABILITIES, type Ability } from "@/lib/schemas/sheet";
import { featAbilityIncrease } from "@/lib/srd/feat-effects";
import type { FeatChoices, FeatGrantSpec, FeatPicks } from "@/lib/srd/feat-grants";
import FeatChoicesFields, { type KnownTraining } from "./FeatChoicesFields";
import { SelectedPrerequisite } from "./AsiFeatEditor";
import { judgeEntry, useFeatJudge } from "./featPrereqs";
import { racialFeatCount } from "@/lib/srd/race-id";
import { DRACONIC_ANCESTRIES, takesDraconicAncestry } from "@/lib/srd/racial-grants";
import { variantGivesAnything, variantShort, variantSummary } from "@/lib/content/species-variants";
import { Chip } from "./steps/shared";
import { RacialCantripPicker } from "./RacialCantripPicker";
import { featChoice } from "@/lib/schemas/sheet";

const ABILITY_NAMES: Record<Ability, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

function skillName(skillId: string) {
  return SRD_SKILLS.find((skill) => skill.id === skillId)?.name ?? skillId;
}

// The picks a race offers instead of fixing: half-elf's two +1 ability
// bumps and two skills, high elf's wizard cantrip, hill dwarf's tool, the
// variant human's feat. Until these existed the grants were silently
// dropped, leaving those characters weaker than the rules allow.
export function RacialChoicesSection({
  race,
  grantedSkills,
  asi,
  onAsiChange,
  skills,
  onSkillsChange,
  cantrips,
  onCantripsChange,
  tool,
  onToolChange,
  weapons = [],
  onWeaponsChange,
  training = [],
  onTrainingChange,
  expertise = "",
  onExpertiseChange,
  ancestry = "",
  onAncestryChange,
  variant = "",
  onVariantChange,
  repeated = [],
  repeatSkills = [],
  onRepeatChange,
  feats = [],
  onFeatsChange,
  featAbility = "",
  onFeatAbilityChange,
  featSpecOf,
  featDescOf,
  featChoices,
  onFeatPicks,
  known,
}: {
  race: RaceOption;
  // Skills already granted by class and background, so they are not offered
  // twice (a duplicate pick would waste the racial choice).
  grantedSkills: string[];
  asi: Array<Ability | "">;
  onAsiChange: (index: number, ability: Ability | "") => void;
  skills: string[];
  onSkillsChange: (index: number, skill: string) => void;
  cantrips: string[];
  onCantripsChange: (cantrips: string[]) => void;
  tool: string;
  onToolChange: (tool: string) => void;
  // The weapons the race lets the player name (a hobgoblin's two martial
  // weapons), slot by slot.
  weapons?: string[];
  onWeaponsChange?: (index: number, weapon: string) => void;
  // Skills or tools in any mix (a human chassis's Adaptable Acumen), slot by
  // slot, and the skill its expertise doubles.
  training?: string[];
  onTrainingChange?: (index: number, pick: string) => void;
  expertise?: string;
  onExpertiseChange?: (skill: string) => void;
  // A dragonborn's draconic ancestry, by id.
  ancestry?: string;
  onAncestryChange?: (ancestry: string) => void;
  // The option of a workshop species' choice (a Half-Dragon's ancestry), by
  // id, for a race that offers one.
  variant?: string;
  onVariantChange?: (variant: string) => void;
  // Skills the race and the background both give, and the ones chosen in
  // their place.
  repeated?: string[];
  repeatSkills?: string[];
  onRepeatChange?: (index: number, skill: string) => void;
  // The variant human's feat, picked here with the race's other choices
  // (issue #124: it sat four steps away and no gate asked for it), and the
  // score a half-feat raises where it offers one (Resilient, Athlete).
  feats?: string[];
  onFeatsChange?: (feats: string[]) => void;
  featAbility?: Ability | "";
  onFeatAbilityChange?: (ability: Ability | "") => void;
  // What the feat grants beyond its point and the picks it leaves open
  // (src/lib/srd/feat-grants.ts), picked right under the feat.
  featSpecOf?: (name: string) => FeatGrantSpec;
  // The feat's text where known, for a content pack half-feat's score.
  featDescOf?: (name: string) => string;
  featChoices?: FeatChoices;
  onFeatPicks?: (feat: string, picks: FeatPicks) => void;
  known?: KnownTraining;
  inputClass: string;
}) {
  const { t, tp } = useI18n();
  const abilityName = (ability: Ability) => t(`builder.race.ability.${ability}` as MessageKey);
  const draconic = takesDraconicAncestry(race.id);
  const racialFeats = onFeatsChange ? racialFeatCount(race.id) : 0;
  const hasChoices = Boolean(
    race.asiChoice || race.skillChoice || race.cantripChoice || race.toolChoice || race.weaponChoice || race.trainingChoice || race.expertiseChoice || draconic || race.variants || repeated.length || racialFeats,
  );
  const chosen = race.variants?.options.find((option) => option.id === variant) ?? null;
  // The half-feat's choice of score, offered once the feat is picked.
  const featScores = racialFeats ? (featAbilityIncrease(feats[0] ?? "", featDescOf?.(feats[0] ?? ""))?.from ?? []) : [];
  // The builder's prerequisite check (featPrereqs.ts): read off each row,
  // and rechecked on the feat once picked.
  const judge = useFeatJudge();
  const noteId = useId();
  const pickFeat = (name: string) => {
    if (!onFeatsChange || feats.includes(name) || feats.length >= racialFeats) {
      return;
    }
    onFeatsChange([...feats, name]);
  };
  if (!hasChoices) {
    return null;
  }

  // A half-elf's +1s go to abilities other than the one the race already
  // raises, per the SRD.
  const fixedAbilities = new Set(Object.keys(race.asi) as Ability[]);
  // An either-or increase ("Strength or Dexterity") offers only its two.
  const asiFrom = race.asiChoice?.from;

  return (
    <div className="space-y-3 rounded-lg border border-amber-900/40 bg-amber-950/10 p-3">
      <p className="text-xs text-amber-200/90">{t("builder.race.title", { race: race.name })}</p>

      {/* First: what it gives changes what the picks below may be. */}
      {race.variants && onVariantChange ? (
        <div data-builder-target="variant">
          <label className="block">
            <span className="mb-1 block text-stone-400">
              {t("builder.race.variant.explainer", { label: race.variants.label, race: race.name })}
            </span>
            <Select<string>
              value={variant}
              onChange={onVariantChange}
              className="w-full"
              label={race.variants.label}
              placeholder={t("builder.race.variant.choose")}
              options={[
                { value: "", label: t("builder.race.variant.choose") },
                ...race.variants.options.map((option) => ({
                  value: option.id,
                  label: variantGivesAnything(option) ? `${option.name} (${variantShort(option)})` : option.name,
                })),
              ]}
            />
          </label>
          {/* What the pick gives, when its own fields give anything: a pick
              the species' rules read from itself (a size, an ability) says
              nothing more than its name. */}
          {chosen && (variantGivesAnything(chosen) || chosen.description) ? (
            <p className="live-in mt-1 whitespace-pre-line text-xs text-stone-400" data-variant-summary>
              {[variantGivesAnything(chosen) ? variantSummary(chosen) : "", chosen.description ?? ""].filter(Boolean).join("\n")}
            </p>
          ) : null}
        </div>
      ) : null}

      {race.asiChoice ? (
        <div data-builder-target="racialAsi">
          <span className="mb-1 block text-stone-400">
            {race.asiChoice.amounts
              ? t("builder.race.ability.amounts", { amounts: asiPickWords(race.asiChoice) })
              : t("builder.race.abilityIncrease", { count: race.asiChoice.amount })}
            {asiFrom
              ? ` ${asiFrom.map(abilityName).join(t("builder.feat.choice.spellSlot.schoolJoin"))}`
              : ` ${tp("builder.race.ability.ofChoice", race.asiChoice.count, { count: race.asiChoice.count })}`}
            )
          </span>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: race.asiChoice.count }, (_, index) => (
              <span key={index} className="flex items-center gap-1">
                <Select<Ability | "">
                  value={asi[index] ?? ""}
                  onChange={(next) => onAsiChange(index, next)}
                  className="min-w-0 grow"
                  label={race.asiChoice!.amounts ? t("builder.race.ability.labelAmount", { index: index + 1, amount: asiPickAmount(race.asiChoice!, index) }) : t("builder.race.ability.label", { index: index + 1 })}
                  options={[
                    // Still a row of its own, so a pick can be taken back.
                    { value: "" as const, label: t("builder.race.ability.placeholder") },
                    ...ABILITIES.filter(
                      (ability) =>
                        !fixedAbilities.has(ability) &&
                        (!asiFrom || asiFrom.includes(ability)) &&
                        (asi[index] === ability || !asi.includes(ability)),
                    ).map((ability) => ({ value: ability, label: abilityName(ability) })),
                  ]}
                />
                {/* The ability's glossary entry as the skills' ⓘ: the words
                    "what is this?" squeezed the pick beside them to two
                    letters on a phone. */}
                {asi[index] ? <AbilityInfo ability={asi[index] as Ability} /> : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {race.skillChoice ? (
        <div data-builder-target="racialSkills">
          <span className="mb-1 block text-stone-400">
            <GameTerm id="skill">{t("builder.race.skill.term")}</GameTerm> {tp("builder.race.skill.proficiencies", race.skillChoice.count, { count: race.skillChoice.count })}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: race.skillChoice.count }, (_, index) => (
              <span key={index} className="flex items-center gap-1">
                <Select<string>
                  value={skills[index] ?? ""}
                  onChange={(next) => onSkillsChange(index, next)}
                  className="min-w-0 grow"
                  label={t("builder.race.skill.label", { index: index + 1 })}
                  placeholder={t("builder.race.skill.placeholder")}
                  options={[
                    { value: "", label: t("builder.race.skill.placeholder") },
                    ...(race.skillChoice?.from?.length ? race.skillChoice.from : ALL_SKILLS).filter(
                      (skill) => skills[index] === skill || (!skills.includes(skill) && !grantedSkills.includes(skill)),
                    ).map((skill) => ({ value: skill as string, label: skillName(skill) })),
                  ]}
                />
                {skills[index] ? (
                  <InfoButton
                    label={skillName(skills[index])}
                    text={describeSkill(skills[index])}
                  />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {draconic && onAncestryChange ? (
        <label className="block" data-builder-target="ancestry">
          <span className="mb-1 block text-stone-400">
{t("builder.race.draconic.help")}
          </span>
          <Select<string>
            value={ancestry}
            onChange={onAncestryChange}
            className="w-full"
            label={t("builder.race.draconic.label")}
            placeholder={t("builder.race.draconic.placeholder")}
            options={[
              { value: "", label: t("builder.race.draconic.placeholder") },
              ...DRACONIC_ANCESTRIES.map((entry) => ({
                value: entry.id,
                label: `${entry.dragon} (${entry.damageType}, ${entry.area}, ${abilityName(entry.save as Ability)} saving throw)`,
              })),
            ]}
          />
        </label>
      ) : null}

      {repeated.length && onRepeatChange ? (
        <div data-builder-target="repeatSkills">
          <span className="mb-1 flex flex-wrap items-center gap-1 text-stone-400">
            {tp("builder.race.repeat.help", repeated.length, { skills: repeated.map(skillName).join(", "), count: repeated.length })}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {repeated.map((_, index) => (
              <span key={index} className="flex items-center gap-1">
                <Select<string>
                  value={repeatSkills[index] ?? ""}
                  onChange={(next) => onRepeatChange(index, next)}
                  className="min-w-0 grow"
                  label={t("builder.race.repeat.label", { index: index + 1 })}
                  placeholder={t("builder.race.repeat.placeholder")}
                  options={[
                    { value: "", label: t("builder.race.repeat.placeholder") },
                    ...ALL_SKILLS.filter(
                      (skill) =>
                        repeatSkills[index] === skill ||
                        (!repeatSkills.includes(skill) && !grantedSkills.includes(skill) && !skills.includes(skill)),
                    ).map((skill) => ({ value: skill as string, label: skillName(skill) })),
                  ]}
                />
                {repeatSkills[index] ? (
                  <InfoButton label={skillName(repeatSkills[index])} text={describeSkill(repeatSkills[index])} />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {racialFeats > 0 && onFeatsChange ? (
        <div data-builder-target="racialFeat">
          <span className="mb-1 flex flex-wrap items-center gap-1 text-stone-400">
            {tp("builder.race.feat.label", racialFeats, { count: racialFeats })}
          </span>
          <p className="mb-1.5 text-xs text-stone-500">
            {t("builder.race.feat.description", { race: race.name })}
            Browse the list (tap ⓘ to read what each does), or search by name if you already have
            one in mind.
          </p>
          {feats.length ? (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {feats.map((feat) => (
                <Chip
                  key={feat}
                  label={feat}
                  info={{ reference: { kind: "feats", slug: contentSlug(feat), name: feat } }}
                  onRemove={() => onFeatsChange(feats.filter((entry) => entry !== feat))}
                />
              ))}
            </div>
          ) : null}
          {feats.map((feat, index) => (
            <SelectedPrerequisite key={feat} id={`${noteId}-${index}`} check={judge?.checkFeat(feat) ?? null} />
          ))}
          {feats.length < racialFeats ? (
            <>
              <CatalogBrowser
                kind="feats"
                buttonLabel={t("builder.race.feat.browse")}
                selectedNames={feats}
                judge={judge ? (entry) => judgeEntry(judge, entry) : undefined}
                onPick={(entry) => pickFeat(entry.name)}
                onUnpick={(featName) => onFeatsChange(feats.filter((entry) => entry !== featName))}
                sections={[{ key: "feats:all", label: t("builder.race.feat.all") }]}
              />
              <p className="mt-2 mb-1 text-xs text-stone-500">{t("builder.race.feat.searchHint")}</p>
              <ContentPicker
                kind="feats"
                placeholder={t("builder.race.feat.search")}
                judge={judge ? (entry) => judgeEntry(judge, entry) : undefined}
                onPick={(entry) => pickFeat(entry.name)}
              />
            </>
          ) : null}
          {featSpecOf && onFeatPicks && known
            ? feats.slice(0, racialFeats).map((feat) => (
                <FeatChoicesFields
                  key={feat}
                  feat={feat}
                  desc={featDescOf?.(feat)}
                  spec={featSpecOf(feat)}
                  picks={featChoice(featChoices, feat)}
                  known={known}
                  onChange={(picks) => onFeatPicks(feat, picks)}
                />
              ))
            : null}
          {featScores.length > 1 && onFeatAbilityChange ? (
            <label className="mt-2 block sm:w-64">
              <span className="mb-1 block text-xs text-stone-500">{t("builder.race.feat.raises", { feat: feats[0] })}</span>
              <Select<Ability>
                value={featScores.includes(featAbility as Ability) ? (featAbility as Ability) : featScores[0]}
                onChange={(ability) => onFeatAbilityChange(ability)}
                label={t("builder.race.feat.raises", { feat: feats[0] })}
                className="w-full"
                options={featScores.map((ability) => ({ value: ability, label: abilityName(ability) }))}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {race.toolChoice ? (
        <label className="block" data-builder-target="racialTool">
          <span className="mb-1 block text-stone-400">{t("builder.race.tool.help")}</span>
          <Select<string>
            value={tool}
            onChange={onToolChange}
            className="w-full"
            label={t("builder.race.tool.label")}
            placeholder={t("builder.race.tool.placeholder")}
            options={[{ value: "", label: t("builder.race.tool.placeholder") }, ...toolPickOptions(race.toolChoice.from)]}
          />
        </label>
      ) : null}

      {race.weaponChoice && onWeaponsChange ? (
        <div data-builder-target="racialWeapons">
          <span className="mb-1 block text-stone-400">
            {t("builder.race.weapon.title", { count: race.weaponChoice.count })}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: race.weaponChoice.count }, (_, index) => (
              <Select<string>
                key={index}
                value={weapons[index] ?? ""}
                onChange={(next) => onWeaponsChange(index, next)}
                className="min-w-0"
                label={t("builder.race.weapon.label", { index: index + 1 })}
                placeholder={t("builder.race.weapon.placeholder")}
                options={[
                  { value: "", label: t("builder.race.weapon.placeholder") },
                  ...race.weaponChoice!.from
                    .filter((weapon) => weapons[index] === weapon || !weapons.includes(weapon))
                    .map((weapon) => ({ value: weapon, label: weapon })),
                ]}
              />
            ))}
          </div>
        </div>
      ) : null}

      {race.trainingChoice && onTrainingChange ? (
        <div data-builder-target="racialTraining">
          <span className="mb-1 block text-stone-400">
            {t("builder.race.training.title", { count: race.trainingChoice.count })}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: race.trainingChoice.count }, (_, index) => (
              <Select<string>
                key={index}
                value={training[index] ?? ""}
                onChange={(next) => onTrainingChange(index, next)}
                className="min-w-0"
                label={t("builder.race.training.label", { index: index + 1 })}
                placeholder={t("builder.race.training.placeholder")}
                options={[
                  { value: "", label: t("builder.race.training.placeholder") },
                  ...ALL_SKILLS.filter((skill) => training[index] === skill || (!training.includes(skill) && !grantedSkills.includes(skill) && !skills.includes(skill))).map(
                    (skill) => ({ value: skill as string, label: skillName(skill) }),
                  ),
                  ...toolPickOptions(KNOWN_TOOLS.filter((tool) => training[index] === tool || !training.includes(tool))),
                ]}
              />
            ))}
          </div>
        </div>
      ) : null}

      {race.expertiseChoice && onExpertiseChange ? (
        <label className="block" data-builder-target="racialExpertise">
          <span className="mb-1 block text-stone-400">
            {t("builder.race.expertise.help")}
          </span>
          <Select<string>
            value={expertise}
            onChange={onExpertiseChange}
            className="w-full"
            label={t("builder.race.expertise.label")}
            placeholder={t("builder.race.expertise.placeholder")}
            options={[
              { value: "", label: "Choose a skill or tool..." },
              ...[...new Set([...grantedSkills, ...skills.filter(Boolean), ...training.filter((pick) => (ALL_SKILLS as readonly string[]).includes(pick))])].map((skill) => ({
                value: skill,
                label: skillName(skill),
              })),
              // The tools the lineage trains (Adaptable Acumen's picks, its own list).
              ...[...new Set([...(race.tools ?? []), ...(tool ? [tool] : []), ...training.filter((pick) => KNOWN_TOOLS.includes(pick))])].map((held) => ({
                value: held,
                label: toolLabel(held),
              })),
            ]}
          />
        </label>
      ) : null}

      <RacialCantripPicker race={race} cantrips={cantrips} onChange={onCantripsChange} />
    </div>
  );
}

// An ability's glossary entry behind an ⓘ, as a skill pick's is.
function AbilityInfo({ ability }: { ability: Ability }) {
  const entry = glossaryTerm(ability);
  return entry ? <InfoButton label={entry.term} text={[entry.short, entry.long].filter(Boolean).join("\n\n")} /> : null;
}
