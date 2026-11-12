"use client";

import { useI18n } from "@/lib/i18n/provider";

import { applyHalfDragon, DRAGON_COLORS, type DragonColor } from "@/lib/bestiary/half-dragon";
import { Plus, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Select as KitSelect } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { OptionGlossary } from "@/components/ui/OptionGlossary";
import type { GlossaryEntry } from "@/lib/help/terms";
import {
  ANCESTRY_OPTIONS,
  CLASS_KIT_OPTIONS,
  MOVEMENT_MODES,
  DAMAGE_TYPES,
  addTrait,
  applyAncestry,
  applyArmor,
  applyClassChassis,
  addAttack,
  armorOptionsFor,
  classFeatureLines,
  chassisDescription,
  findWeapon,
  formatSpeed,
  hasTerm,
  parseSpeed,
  parseTerms,
  subclassOptionsFor,
  toggleTerm,
  weaponAttack,
  weaponOptionsFor,
} from "@/lib/bestiary/kit";
import { MAX_TRAITS, type MonsterDraft } from "@/lib/bestiary/monster-draft";
import { proficiencyBonus } from "@/lib/srd";
import { textKey } from "@/lib/language/text-logic";

// The half of the monster editor that picks rather than types.
//
// Split out of MonsterFields for the reason every panel here is split: that
// file is the fields of a stat block, and this is the catalogue over them.
// Nothing in here decides anything either. Every control below produces an
// ordinary MonsterDraft through src/lib/bestiary/kit.ts, lands in a field
// MonsterFields already renders, and can be renamed, retyped or deleted
// afterwards like anything hand-written.

const input =
  "rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-200 focus:border-amber-500/50 focus:outline-none";

const chip =
  "rounded-full border px-2 py-0.5 text-[10px] transition-colors duration-150";

const ANCESTRY_LABEL_KEYS: Record<string, string> = {
  hill_dwarf: "workshop.monsterEditor.kit.ancestry.hill_dwarf",
  mountain_dwarf: "workshop.monsterEditor.kit.ancestry.mountain_dwarf",
  high_elf: "workshop.monsterEditor.kit.ancestry.high_elf",
  wood_elf: "workshop.monsterEditor.kit.ancestry.wood_elf",
  drow: "workshop.monsterEditor.kit.ancestry.drow",
  lightfoot_halfling: "workshop.monsterEditor.kit.ancestry.lightfoot_halfling",
  stout_halfling: "workshop.monsterEditor.kit.ancestry.stout_halfling",
  human: "workshop.monsterEditor.kit.ancestry.human",
  variant_human: "workshop.monsterEditor.kit.ancestry.variant_human",
  dragonborn: "workshop.monsterEditor.kit.ancestry.dragonborn",
  rock_gnome: "workshop.monsterEditor.kit.ancestry.rock_gnome",
  forest_gnome: "workshop.monsterEditor.kit.ancestry.forest_gnome",
  deep_gnome: "workshop.monsterEditor.kit.ancestry.deep_gnome",
  half_elf: "workshop.monsterEditor.kit.ancestry.half_elf",
  half_orc: "workshop.monsterEditor.kit.ancestry.half_orc",
  tiefling: "workshop.monsterEditor.kit.ancestry.tiefling",
  aasimar: "workshop.monsterEditor.kit.ancestry.aasimar",
  goliath: "workshop.monsterEditor.kit.ancestry.goliath",
  firbolg: "workshop.monsterEditor.kit.ancestry.firbolg",
  tabaxi: "workshop.monsterEditor.kit.ancestry.tabaxi",
  kenku: "workshop.monsterEditor.kit.ancestry.kenku",
  tortle: "workshop.monsterEditor.kit.ancestry.tortle",
  fire_genasi: "workshop.monsterEditor.kit.ancestry.fire_genasi",
  water_genasi: "workshop.monsterEditor.kit.ancestry.water_genasi",
  air_genasi: "workshop.monsterEditor.kit.ancestry.air_genasi",
  earth_genasi: "workshop.monsterEditor.kit.ancestry.earth_genasi",
  changeling: "workshop.monsterEditor.kit.ancestry.changeling",
  warforged: "workshop.monsterEditor.kit.ancestry.warforged",
  goblin: "workshop.monsterEditor.kit.ancestry.goblin",
  bugbear: "workshop.monsterEditor.kit.ancestry.bugbear",
  lizardfolk: "workshop.monsterEditor.kit.ancestry.lizardfolk",
  orc: "workshop.monsterEditor.kit.ancestry.orc",
};

const TRANSLATABLE_CLASSES = new Set([
  "barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin",
  "ranger", "rogue", "sorcerer", "warlock", "wizard", "artificer",
]);

const CREATURE_TYPE_IDS = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental",
  "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead",

] as const;

const ARMOUR_NAME_KEYS: Record<string, string> = {
  "Padded": "workshop.monsterEditor.kit.catalog.armour.padded",
  "Leather": "workshop.monsterEditor.kit.catalog.armour.leather",
  "Studded Leather": "workshop.monsterEditor.kit.catalog.armour.studdedLeather",
  "Hide": "workshop.monsterEditor.kit.catalog.armour.hide",
  "Chain Shirt": "workshop.monsterEditor.kit.catalog.armour.chainShirt",
  "Scale Mail": "workshop.monsterEditor.kit.catalog.armour.scaleMail",
  "Breastplate": "workshop.monsterEditor.kit.catalog.armour.breastplate",
  "Half Plate": "workshop.monsterEditor.kit.catalog.armour.halfPlate",
  "Ring Mail": "workshop.monsterEditor.kit.catalog.armour.ringMail",
  "Chain Mail": "workshop.monsterEditor.kit.catalog.armour.chainMail",
  "Splint": "workshop.monsterEditor.kit.catalog.armour.splint",
  "Plate": "workshop.monsterEditor.kit.catalog.armour.plate",
  "Shield": "workshop.monsterEditor.kit.catalog.armour.shield",
  "Armorweave Vest": "workshop.monsterEditor.kit.catalog.armour.armorweaveVest",
  "Kevlar Vest": "workshop.monsterEditor.kit.catalog.armour.kevlarVest",
  "Riot Plating": "workshop.monsterEditor.kit.catalog.armour.riotPlating",
  "Brass Carapace": "workshop.monsterEditor.kit.catalog.armour.brassCarapace",
  "Scrap Plate": "workshop.monsterEditor.kit.catalog.armour.scrapPlate",
  "Ballistic Shield": "workshop.monsterEditor.kit.catalog.armour.ballisticShield",
};

const WEAPON_NAME_KEYS: Record<string, string> = {
  "Club": "workshop.monsterEditor.kit.catalog.weapon.club",
  "Dagger": "workshop.monsterEditor.kit.catalog.weapon.dagger",
  "Greatclub": "workshop.monsterEditor.kit.catalog.weapon.greatclub",
  "Handaxe": "workshop.monsterEditor.kit.catalog.weapon.handaxe",
  "Javelin": "workshop.monsterEditor.kit.catalog.weapon.javelin",
  "Light Hammer": "workshop.monsterEditor.kit.catalog.weapon.lightHammer",
  "Mace": "workshop.monsterEditor.kit.catalog.weapon.mace",
  "Quarterstaff": "workshop.monsterEditor.kit.catalog.weapon.quarterstaff",
  "Sickle": "workshop.monsterEditor.kit.catalog.weapon.sickle",
  "Spear": "workshop.monsterEditor.kit.catalog.weapon.spear",
  "Light Crossbow": "workshop.monsterEditor.kit.catalog.weapon.lightCrossbow",
  "Dart": "workshop.monsterEditor.kit.catalog.weapon.dart",
  "Shortbow": "workshop.monsterEditor.kit.catalog.weapon.shortbow",
  "Sling": "workshop.monsterEditor.kit.catalog.weapon.sling",
  "Battleaxe": "workshop.monsterEditor.kit.catalog.weapon.battleaxe",
  "Flail": "workshop.monsterEditor.kit.catalog.weapon.flail",
  "Glaive": "workshop.monsterEditor.kit.catalog.weapon.glaive",
  "Greataxe": "workshop.monsterEditor.kit.catalog.weapon.greataxe",
  "Greatsword": "workshop.monsterEditor.kit.catalog.weapon.greatsword",
  "Halberd": "workshop.monsterEditor.kit.catalog.weapon.halberd",
  "Lance": "workshop.monsterEditor.kit.catalog.weapon.lance",
  "Longsword": "workshop.monsterEditor.kit.catalog.weapon.longsword",
  "Maul": "workshop.monsterEditor.kit.catalog.weapon.maul",
  "Morningstar": "workshop.monsterEditor.kit.catalog.weapon.morningstar",
  "Pike": "workshop.monsterEditor.kit.catalog.weapon.pike",
  "Rapier": "workshop.monsterEditor.kit.catalog.weapon.rapier",
  "Scimitar": "workshop.monsterEditor.kit.catalog.weapon.scimitar",
  "Shortsword": "workshop.monsterEditor.kit.catalog.weapon.shortsword",
  "Trident": "workshop.monsterEditor.kit.catalog.weapon.trident",
  "War Pick": "workshop.monsterEditor.kit.catalog.weapon.warPick",
  "Warhammer": "workshop.monsterEditor.kit.catalog.weapon.warhammer",
  "Whip": "workshop.monsterEditor.kit.catalog.weapon.whip",
  "Blowgun": "workshop.monsterEditor.kit.catalog.weapon.blowgun",
  "Hand Crossbow": "workshop.monsterEditor.kit.catalog.weapon.handCrossbow",
  "Heavy Crossbow": "workshop.monsterEditor.kit.catalog.weapon.heavyCrossbow",
  "Longbow": "workshop.monsterEditor.kit.catalog.weapon.longbow",
  "Net": "workshop.monsterEditor.kit.catalog.weapon.net",
  "Pistol": "workshop.monsterEditor.kit.catalog.weapon.pistol",
  "Revolver": "workshop.monsterEditor.kit.catalog.weapon.revolver",
  "Sawed-off Scattergun": "workshop.monsterEditor.kit.catalog.weapon.sawedOffScattergun",
  "Hunting Rifle": "workshop.monsterEditor.kit.catalog.weapon.huntingRifle",
  "Musket": "workshop.monsterEditor.kit.catalog.weapon.musket",
  "Hand Cannon": "workshop.monsterEditor.kit.catalog.weapon.handCannon",
  "Monoblade": "workshop.monsterEditor.kit.catalog.weapon.monoblade",
  "Chainblade": "workshop.monsterEditor.kit.catalog.weapon.chainblade",
  "Shock Baton": "workshop.monsterEditor.kit.catalog.weapon.shockBaton",
  "Vibroknife": "workshop.monsterEditor.kit.catalog.weapon.vibroknife",
  "Ripper Gauntlet": "workshop.monsterEditor.kit.catalog.weapon.ripperGauntlet",
  "Heavy Spanner": "workshop.monsterEditor.kit.catalog.weapon.heavySpanner",
  "Sword Cane": "workshop.monsterEditor.kit.catalog.weapon.swordCane",
  "Machete": "workshop.monsterEditor.kit.catalog.weapon.machete",
  "Crowbar": "workshop.monsterEditor.kit.catalog.weapon.crowbar",
  "Silvered Stake": "workshop.monsterEditor.kit.catalog.weapon.silveredStake",
  "Censer Mace": "workshop.monsterEditor.kit.catalog.weapon.censerMace",
  "Hurled Vial": "workshop.monsterEditor.kit.catalog.weapon.hurledVial",
};

// A term list stored as one comma-joined string. The catalogue is offered as
// chips; anything not in it stays typeable, because a monster immune to
// "sunlight" is a real monster and no list of ours will ever hold every
// answer.
export function TermPicker({
  label,
  value,
  known,
  onChange,
  glossary,
}: {
  label: string;
  value: string;
  known: readonly string[];
  onChange: (value: string) => void;
  // What the known terms mean, one line each, behind a ⓘ in the caption.
  glossary?: readonly GlossaryEntry[];
}) {
  const { t } = useI18n();
  const termLabel = (term: string) => {
    if (DAMAGE_TYPES.includes(term as (typeof DAMAGE_TYPES)[number])) {
      return t(`workshop.monsterEditor.defence.damageType.${term}` as never);
    }
    if (CONDITIONS.includes(term as (typeof CONDITIONS)[number])) {
      return t(`workshop.monsterEditor.defence.condition.${term}` as never);
    }
    return term;
  };
  const extras = parseTerms(value).filter(
    (term) => !known.some((entry) => textKey(entry) === textKey(term)),
  );
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-stone-500">
        {label}
        {glossary ? <OptionGlossary title={label} entries={glossary} /> : null}
      </span>
      <div className="stagger-pop flex flex-wrap gap-1">
        {known.map((term) => {
          const on = hasTerm(value, term);
          return (
            <button
              key={term}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(toggleTerm(value, term))}
              className={cn(
                chip,
                on
                  ? "border-amber-500/50 bg-stone-800 text-amber-100"
                  : "border-stone-700 text-stone-500 hover:text-stone-200",
              )}
            >
              {termLabel(term)}
            </button>
          );
        })}
        {extras.map((term) => (
          <button
            key={term}
            type="button"
            aria-pressed
            onClick={() => onChange(toggleTerm(value, term))}
            title={t("workshop.monsterEditor.kit.removeOwn")}
            className={cn(chip, "border-amber-500/50 bg-stone-800 text-amber-100")}
          >
            {term}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("workshop.monsterEditor.kit.ownTerms")}
        className={cn(input, "w-full")}
      />
    </div>
  );
}

// Speed is one printed string ("30, fly 60") because that is what a stat
// block says and what the fight reads. Nobody should have to know the comma
// convention to give a dragon a fly speed.
export function SpeedPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const speeds = parseSpeed(value);
  const set = (mode: "walk" | (typeof MOVEMENT_MODES)[number], feet: number) =>
    onChange(formatSpeed({ ...speeds, [mode]: feet }));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-stone-500">{t("workshop.monsterEditor.kit.speed")}</span>
      <div className="flex flex-wrap gap-2">
        {(["walk", ...MOVEMENT_MODES] as const).map((mode) => (
          <div key={mode} className="flex flex-col gap-0.5">
            <span className="text-[10px] capitalize text-stone-600">{t(`workshop.monsterEditor.kit.${mode}` as never)}</span>
            <NumberStepper
              min={0}
              max={999}
              step={5}
              value={speeds[mode] ?? 0}
              onChange={(feet) => set(mode, feet)}
              label={t("workshop.monsterEditor.kit.speedMode", { mode: t(`workshop.monsterEditor.kit.${mode}` as never) })}
              size="sm"
            />
          </div>
        ))}
      </div>
      <span className="text-[10px] text-stone-600">{t("workshop.monsterEditor.kit.readsAs", { value: value || "0" })}</span>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  // The first row is the "" choice ("Pick one", "None"), still pickable so a
  // choice can be taken back, as the blank option of the old list was.
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-stone-500">{label}</span>
      <KitSelect value={value} onChange={onChange} options={options} label={label} size="sm" className={className ?? "w-40"} />
    </label>
  );
}

// The catalogue, aimed at the block. Four independent moves: what it is,
// what it trained as, what it is holding, and which of that class's
// abilities it actually brought.
export function MonsterKitPanel({
  draft,
  onChange,
}: {
  draft: MonsterDraft;
  onChange: (draft: MonsterDraft) => void;
}) {
  const { t } = useI18n();
  const [ancestryId, setAncestryId] = useState("");
  const [classId, setClassId] = useState("");
  const [subclass, setSubclass] = useState("");
  const [level, setLevel] = useState(5);
  const [con, setCon] = useState(14);
  const [armorName, setArmorName] = useState("");
  const [shield, setShield] = useState(false);
  const [weaponName, setWeaponName] = useState("");
  const [weaponMod, setWeaponMod] = useState(3);
  const [dragon, setDragon] = useState<DragonColor | "">("");
  const [templateNote, setTemplateNote] = useState("");

  const subclasses = subclassOptionsFor(classId);
  const features = classFeatureLines(classId, subclass, level);
  const chassis = { classId, subclass, level, con, ancestryId };
  const chassisDetails = chassisDescription(chassis);
  const traitsFull = draft.stats.traits.length >= MAX_TRAITS;
  const attacksFull = draft.stats.attacks.length >= 4;
  const armourLabel = (name: string) =>
    ARMOUR_NAME_KEYS[name] ? t(ARMOUR_NAME_KEYS[name] as never) : name;
  const weaponLabel = (name: string) =>
    WEAPON_NAME_KEYS[name] ? t(WEAPON_NAME_KEYS[name] as never) : name;
  const weaponDamageLabel = (damage: string) => {
    const match = /^(\\d+d\\d+|\\d+)\\s+([a-z]+)$/i.exec(damage.trim());
    if (match && (DAMAGE_TYPES as readonly string[]).includes(match[2].toLowerCase())) {
      return `${match[1]} ${t(`workshop.monsterEditor.defence.damageType.${match[2].toLowerCase()}` as never).toLowerCase()}`;
    }
    if (damage === "0 (restrains)") {
      return t("workshop.monsterEditor.kit.catalog.weaponDamage.restrains");
    }
    return damage;
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-800 bg-stone-950/50 p-3">
      <h4 className="flex items-center gap-1.5 text-xs text-amber-100">
        <Wand2 className="size-3.5" /> {t("workshop.monsterEditor.kit.title")}
      </h4>
      <p className="text-[10px] text-stone-600">
        {t("workshop.monsterEditor.kit.description")}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label={t("workshop.monsterEditor.kit.ancestry")}
          value={ancestryId}
          onChange={setAncestryId}
          options={[{ value: "", label: t("workshop.monsterEditor.kit.pickOne") }, ...ANCESTRY_OPTIONS.map((ancestry) => ({ value: ancestry.id as string, label: ANCESTRY_LABEL_KEYS[ancestry.id] ? t(ANCESTRY_LABEL_KEYS[ancestry.id] as never) : ancestry.name }))]}
        />
        <button
          type="button"
          disabled={!ancestryId}
          onClick={() => onChange(applyAncestry(draft, ancestryId))}
          className="rounded-md border border-stone-700 px-2 py-1 text-[11px] text-stone-300 hover:text-amber-100 disabled:opacity-40"
        >
          {t("workshop.monsterEditor.kit.takeAncestry")}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label={t("workshop.monsterEditor.kit.class")}
          value={classId}
          onChange={(next) => {
            setClassId(next);
            setSubclass("");
          }}
          options={[{ value: "", label: t("workshop.monsterEditor.kit.pickOne") }, ...CLASS_KIT_OPTIONS.map((klass) => ({ value: klass.id as string, label: TRANSLATABLE_CLASSES.has(klass.id) ? t(`charSheet.class.${klass.id}` as never) : klass.name }))]}
        />
        <Select
          label={t("workshop.monsterEditor.kit.subclass")}
          value={subclass}
          onChange={setSubclass}
          options={[{ value: "", label: subclasses.length ? t("workshop.monsterEditor.kit.none") : t("workshop.monsterEditor.kit.noneAvailable") }, ...subclasses.map((name) => ({ value: name, label: name }))]}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">{t("workshop.monsterEditor.kit.level")}</span>
          <NumberStepper min={1} max={20} value={level} onChange={setLevel} label={t("workshop.monsterEditor.kit.level")} size="sm" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">{t("workshop.monsterEditor.kit.con")}</span>
          <NumberStepper min={1} max={30} value={con} onChange={setCon} label={t("workshop.monsterEditor.kit.con")} size="sm" />
        </div>
        <button
          type="button"
          disabled={!classId}
          onClick={() => onChange(applyClassChassis(draft, chassis))}
          className="rounded-md border border-stone-700 px-2 py-1 text-[11px] text-stone-300 hover:text-amber-100 disabled:opacity-40"
        >
          {t("workshop.monsterEditor.kit.takeClass")}
        </button>
      </div>
      {classId && chassisDetails ? (
        <p className="reveal text-[10px] text-stone-600">
          {t("workshop.monsterEditor.kit.chassisSummary", {
            hitDie: `d${chassisDetails.hitDie}`,
            hitPoints: chassisDetails.hitPoints,
            saves: chassisDetails.saves.map((ability) => t(`workshop.monsterEditor.stats.ability.${ability}` as never)).join(", "),
            proficiency: chassisDetails.proficiency,
          })}
        </p>
      ) : null}

      {features.length ? (
        <div className="reveal flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">
            {t("workshop.monsterEditor.kit.featuresAtLevel")} {traitsFull ? t("workshop.monsterEditor.kit.traitsFull") : t("workshop.monsterEditor.kit.clickToAdd")}
          </span>
          <div className="stagger-pop flex flex-wrap gap-1">
            {features.map((feature) => {
              const on = draft.stats.traits.some(
                (trait) => textKey(trait) === textKey(feature.line),
              );
              return (
                <button
                  key={`${feature.name}-${feature.level}`}
                  type="button"
                  disabled={on || traitsFull}
                  title={feature.text || t("workshop.monsterEditor.kit.gainedAtLevel", { level: feature.level })}
                  onClick={() => onChange(addTrait(draft, feature.line))}
                  className={cn(
                    chip,
                    on
                      ? "border-amber-500/50 bg-stone-800 text-amber-100"
                      : "border-stone-700 text-stone-400 hover:text-amber-100 disabled:opacity-40",
                  )}
                >
                  {on ? null : <Plus className="mr-0.5 inline size-2.5" />}
                  {feature.name}
                  <span className="ml-1 text-stone-600">{feature.level}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label={t("workshop.monsterEditor.kit.halfDragon")}
          value={dragon}
          onChange={(value) => setDragon(value as DragonColor | "")}
          options={[{ value: "", label: t("workshop.monsterEditor.kit.dragonHalf") }, ...DRAGON_COLORS.map((color) => ({ value: color as string, label: t(`workshop.monsterEditor.kit.dragonColor.${color}` as never) }))]}
        />
        <button
          type="button"
          disabled={!dragon}
          onClick={() => {
            if (!dragon) return;
            const made = applyHalfDragon(draft, dragon);
            if ("error" in made) {
              const type = (CREATURE_TYPE_IDS as readonly string[]).includes(made.creatureType)
                ? t(`workshop.monsterEditor.defence.creatureType.${made.creatureType}` as never)
                : made.creatureType;
              setTemplateNote(t("workshop.monsterEditor.kit.halfDragon.unsupportedType", { type }));
              return;
            }
            setTemplateNote(t(`workshop.monsterEditor.kit.halfDragon.${made.noteCode}` as never, {
              color: t(`workshop.monsterEditor.kit.dragonColor.${made.color}` as never).toLowerCase(),
              cr: made.cr,
              challenge: made.prerequisite,
            }));
            onChange(made.draft);
          }}
          className="rounded-md border border-stone-700 px-2 py-1 text-[11px] text-stone-300 hover:text-amber-100 disabled:opacity-40"
        >
          {t("workshop.monsterEditor.kit.makeHalfDragon")}
        </button>
        {templateNote ? <span className="live-in basis-full text-[10px] text-stone-500">{templateNote}</span> : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label={t("workshop.monsterEditor.kit.armour")}
          value={armorName}
          onChange={setArmorName}
          options={[
            { value: "", label: t("workshop.monsterEditor.kit.unarmoured") },
            ...armorOptionsFor(classId)
              .filter((armor) => armor.category !== "shield")
              .map((armor) => ({ value: armor.name, label: `${armourLabel(armor.name)} (${armor.baseAc})` })),
          ]}
        />
        <label className="flex items-center gap-1.5 pb-1 text-[11px] text-stone-400">
          <Switch on={shield} onChange={setShield} label={t("workshop.monsterEditor.kit.shield")} />
          {t("workshop.monsterEditor.kit.shield")}
        </label>
        <button
          type="button"
          onClick={() => onChange(applyArmor(draft, armorName, shield))}
          className="rounded-md border border-stone-700 px-2 py-1 text-[11px] text-stone-300 hover:text-amber-100"
        >
          {t("workshop.monsterEditor.kit.setAc")}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label={t("workshop.monsterEditor.kit.weapon")}
          value={weaponName}
          onChange={setWeaponName}
          className="w-44"
          options={[{ value: "", label: t("workshop.monsterEditor.kit.pickOne") }, ...weaponOptionsFor(classId).map((weapon) => ({ value: weapon.name, label: `${weaponLabel(weapon.name)} (${weaponDamageLabel(weapon.damage)})` }))]}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-stone-500">{t("workshop.monsterEditor.kit.abilityMod")}</span>
          <NumberStepper min={0} max={10} value={weaponMod} onChange={setWeaponMod} label={t("workshop.monsterEditor.kit.abilityMod")} size="sm" />
        </div>
        <button
          type="button"
          disabled={!weaponName || attacksFull}
          onClick={() => {
            const weapon = findWeapon(weaponName);
            if (weapon) {
              onChange(
                addAttack(
                  draft,
                  weaponAttack(weapon, {
                    profBonus: proficiencyBonus(level),
                    abilityMod: weaponMod,
                  }),
                ),
              );
            }
          }}
          className="rounded-md border border-stone-700 px-2 py-1 text-[11px] text-stone-300 hover:text-amber-100 disabled:opacity-40"
        >
          {attacksFull ? t("workshop.monsterEditor.kit.attackFull") : t("workshop.monsterEditor.kit.addAttack")}
        </button>
        <span className="pb-1 text-[10px] text-stone-600">
          {t("workshop.monsterEditor.kit.toHit", { bonus: proficiencyBonus(level) + Math.max(0, weaponMod), level })}
        </span>
      </div>
    </div>
  );
}
