"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { useT, useI18n } from "@/lib/i18n/provider";
import { CONDITIONS } from "@/lib/bestiary/kit";
import { CREATURE_TYPES } from "@/lib/bestiary/creature-type";
import { CheckField, NumberField, SelectField, TextField, ToggleChips } from "@/app/workshop/homebrew/fields";
import { DAMAGE_TYPES } from "@/app/workshop/homebrew/types";
import { CONDITION_BLURBS, glossaryFor } from "@/lib/help/terms";
import { AdvancedBlock, AuraGroup, BuffGroup, HealGroup, PoolGroup, RidersGroup } from "@/app/workshop/homebrew/SpellMechMore";
import { ABILITY_OPTIONS, MechGroup, clean, list, num, sub, type Mech, type MechProps } from "@/app/workshop/homebrew/MechGroup";

// The engine's whole block for a spell (src/lib/srd/spell-mech-types.ts), as
// groups a DM opens when the spell needs them: who it reaches, what it rolls,
// the condition it lays, what a failed save does besides, a buff, healing,
// an aura, a hit point pool. A copy of a published spell arrives with its
// block filled from the book (catalog-mechanics.ts), so the groups it uses
// open themselves; anything the form has no field for is still kept, and
// the advanced box at the bottom edits the block as text.

const RESOLUTION_VALUES = ["", "attack", "save", "auto", "heal", "buff", "summon", "utility"] as const;
const CREATURE_WORDS = CREATURE_TYPES.map((type) => type as string);

function ReachGroup({ mech, setMech }: MechProps) {
  const { t, tp } = useI18n();
  const targets = sub(mech.targets);
  const has = Boolean(mech.attack || mech.targets || mech.area || mech.areaFeet || mech.repeat || mech.targetTypes || mech.immuneTypes || mech.immuneIfImmuneTo);
  const summary = [
    mech.attack ? t("workshop.homebrew.mech.reach.spellAttack", { kind: t(`workshop.homebrew.mech.reach.attack.${String(mech.attack)}`) }) : "",
    mech.area ? t("workshop.homebrew.mech.reach.area", { size: num(mech.areaFeet) ? t("workshop.homebrew.mech.reach.areaSize", { feet: num(mech.areaFeet) }) : "" }) : "",
    targets.count ? tp("workshop.homebrew.mech.reach.targets", num(targets.count)) : "",
    mech.repeat ? t("workshop.homebrew.mech.reach.repeat", { action: t(`workshop.homebrew.mech.reach.repeat.${String(mech.repeat)}`) }) : "",
  ].filter(Boolean).join(", ");
  return (
    <MechGroup title={t("workshop.homebrew.mech.reach.title")} summary={summary || t("workshop.homebrew.mech.reach.oneCreature")} open={has}>
      {mech.resolution === "attack" ? (
        <SelectField label={t("workshop.homebrew.mech.reach.attack.label")} value={String(mech.attack ?? "")} options={[{ value: "", label: t("workshop.homebrew.mech.reach.attack.ranged") }, { value: "melee", label: t("workshop.homebrew.mech.reach.attack.melee") }, { value: "ranged", label: t("workshop.homebrew.mech.reach.attack.ranged") }]} onChange={(attack) => setMech({ attack: attack || undefined })} />
      ) : null}
      <NumberField label={t("workshop.homebrew.mech.reach.targets.label")} value={targets.count === undefined ? "" : num(targets.count)} min={1} max={100} onChange={(count) => setMech({ targets: count === "" ? undefined : clean({ ...targets, count }) })} hint={t("workshop.homebrew.mech.reach.targets.hint")} />
      <NumberField label={t("workshop.homebrew.mech.reach.morePerSlot")} value={targets.perSlotLevel === undefined ? "" : num(targets.perSlotLevel)} min={0} max={10} onChange={(perSlotLevel) => setMech({ targets: targets.count === undefined ? undefined : clean({ ...targets, perSlotLevel: perSlotLevel === "" ? undefined : perSlotLevel }) })} />
      <div className="flex items-end pb-1">
        <CheckField label={t("workshop.homebrew.mech.reach.area.toggle")} checked={mech.area === true} onChange={(area) => setMech({ area: area || undefined })} />
      </div>
      <NumberField label={t("workshop.homebrew.mech.reach.areaSize.label")} value={mech.areaFeet === undefined ? "" : num(mech.areaFeet)} min={0} max={5280} step={5} onChange={(areaFeet) => setMech({ areaFeet: areaFeet === "" ? undefined : areaFeet })} hint={t("workshop.homebrew.mech.reach.areaSize.hint")} />
      <SelectField
        label={t("workshop.homebrew.mech.reach.repeat.label")}
        value={String(mech.repeat ?? "")}
        options={[{ value: "", label: t("workshop.homebrew.mech.reach.repeat.no") }, { value: "action", label: t("workshop.homebrew.mech.reach.repeat.action") }, { value: "bonus", label: t("workshop.homebrew.mech.reach.repeat.bonus") }, { value: "free", label: t("workshop.homebrew.mech.reach.repeat.free") }]}
        onChange={(repeat) => setMech({ repeat: repeat || undefined })}
      />
      <TextField label={t("workshop.homebrew.mech.reach.immuneIf")} value={String(mech.immuneIfImmuneTo ?? "")} onChange={(value) => setMech({ immuneIfImmuneTo: value || undefined })} suggestions={CONDITIONS} maxLength={40} />
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.reach.onlyWorksOn")}</span>
        <ToggleChips options={CREATURE_WORDS} selected={list(mech.targetTypes)} onChange={(next) => setMech({ targetTypes: next.length ? next : undefined })} />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.reach.noEffectOn")}</span>
        <ToggleChips options={CREATURE_WORDS} selected={list(mech.immuneTypes)} onChange={(next) => setMech({ immuneTypes: next.length ? next : undefined })} />
      </div>
    </MechGroup>
  );
}

function DamageGroup({ mech, setMech }: MechProps) {
  const t = useT();
  const typeOptions = [{ value: "", label: t("workshop.homebrew.mech.damage.fromProseOption") }, ...DAMAGE_TYPES.map((value) => ({ value, label: t(`workshop.homebrew.item.damage.${value}`) }))];
  const dice = sub(mech.dice);
  const darts = sub(mech.darts);
  const attacks = sub(mech.attacks);
  const has = Boolean(mech.damageType || mech.secondType || mech.dice || mech.darts || mech.attacks || mech.noDamage);
  const summary = mech.noDamage
    ? t("workshop.homebrew.mech.damage.noDamage")
    : [dice.base ? `${String(dice.base)}${dice.perSlotLevel ? ` +${String(dice.perSlotLevel)}/slot` : ""}` : t("workshop.homebrew.mech.damage.fromProse"), mech.damageType ? t(`workshop.homebrew.item.damage.${String(mech.damageType)}`) : "", mech.secondType ? t("workshop.homebrew.mech.damage.and", { type: t(`workshop.homebrew.item.damage.${String(mech.secondType)}`) }) : ""].filter(Boolean).join(" ");
  return (
    <MechGroup title={t("workshop.homebrew.mech.damage.title")} summary={summary} open={has}>
      <SelectField label={t("workshop.homebrew.mech.damage.type")} value={String(mech.damageType ?? "")} options={typeOptions} onChange={(damageType) => setMech({ damageType: damageType || undefined })} />
      <SelectField label={t("workshop.homebrew.mech.damage.secondType")} value={String(mech.secondType ?? "")} options={[{ value: "", label: t("workshop.homebrew.mech.damage.none") }, ...DAMAGE_TYPES.map((value) => ({ value, label: t(`workshop.homebrew.item.damage.${value}`) }))]} onChange={(secondType) => setMech({ secondType: secondType || undefined })} />
      <div className="col-span-2 flex items-end pb-1">
        <CheckField label={t("workshop.homebrew.mech.damage.noDamageToggle")} checked={mech.noDamage === true} onChange={(noDamage) => setMech({ noDamage: noDamage || undefined })} />
      </div>
      <TextField label={t("workshop.homebrew.mech.damage.dice")} value={String(dice.base ?? "")} onChange={(base) => setMech({ dice: base ? clean({ ...dice, base, baseLevel: num(dice.baseLevel, num(mech.level, 1)) }) : undefined })} placeholder="8d6" maxLength={40} hint={t("workshop.homebrew.mech.damage.dice.hint")} />
      <TextField label={t("workshop.homebrew.mech.damage.perSlot")} value={String(dice.perSlotLevel ?? "")} onChange={(perSlotLevel) => setMech({ dice: dice.base ? clean({ ...dice, perSlotLevel: perSlotLevel || undefined }) : undefined })} placeholder="1d6" maxLength={40} />
      <NumberField label={t("workshop.homebrew.mech.damage.darts")} value={darts.count === undefined ? "" : num(darts.count)} min={1} max={20} onChange={(count) => setMech({ darts: count === "" ? undefined : clean({ perSlotLevel: 1, each: "1d4+1", ...darts, count }) })} hint={t("workshop.homebrew.mech.damage.darts.hint")} />
      {darts.count !== undefined ? (
        <TextField label={t("workshop.homebrew.mech.damage.eachDart")} value={String(darts.each ?? "")} onChange={(each) => setMech({ darts: clean({ ...darts, each }) })} maxLength={40} />
      ) : null}
      <NumberField label={t("workshop.homebrew.mech.damage.attackRolls")} value={attacks.count === undefined ? "" : num(attacks.count)} min={1} max={10} onChange={(count) => setMech({ attacks: count === "" ? undefined : clean({ ...attacks, count }) })} hint={t("workshop.homebrew.mech.damage.attackRolls.hint")} />
      {attacks.count !== undefined ? (
        <div className="flex items-end pb-1">
          <CheckField label={t("workshop.homebrew.mech.damage.grows")} checked={attacks.byCasterLevel === true} onChange={(byCasterLevel) => setMech({ attacks: clean({ ...attacks, byCasterLevel: byCasterLevel || undefined }) })} />
        </div>
      ) : null}
    </MechGroup>
  );
}

function ConditionGroup({ mech, setMech }: MechProps) {
  const t = useT();
  const condition = sub(mech.condition);
  const set = (patch: Mech) => setMech({ condition: condition.name || patch.name ? clean({ ...condition, ...patch }) : undefined });
  const escape = list(condition.escape);
  const summary = condition.name
    ? [String(condition.name), condition.rounds ? t("workshop.homebrew.mech.condition.rounds", { count: num(condition.rounds) }) : "", condition.saveEnds ? t("workshop.homebrew.mech.condition.saveEnds") : "", escape.length ? t("workshop.homebrew.mech.condition.escape", { abilities: escape.join("/").toUpperCase() }) : ""].filter(Boolean).join(", ")
    : t("workshop.homebrew.mech.condition.none");
  return (
    <MechGroup title={t("workshop.homebrew.mech.condition.title")} summary={summary} open={Boolean(condition.name)}>
      <TextField label={t("workshop.homebrew.mech.condition.label")} value={String(condition.name ?? "")} onChange={(name) => set({ name: name || undefined })} suggestions={CONDITIONS} maxLength={40} glossary={{ title: t("workshop.homebrew.mech.condition.glossary"), entries: glossaryFor(CONDITIONS, CONDITION_BLURBS) }} />
      <NumberField label={t("workshop.homebrew.mech.condition.rounds.label")} value={condition.rounds === undefined ? "" : num(condition.rounds)} min={1} max={144000} onChange={(rounds) => set({ rounds: rounds === "" ? undefined : rounds })} hint={t("workshop.homebrew.mech.condition.rounds.hint")} />
      <div className="col-span-2 flex flex-wrap items-end gap-3 pb-1">
        <CheckField label={t("workshop.homebrew.mech.condition.saveAgain")} checked={condition.saveEnds === true} onChange={(saveEnds) => set({ saveEnds: saveEnds || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.condition.endsOnDamage")} checked={condition.endsOnDamage === true} onChange={(endsOnDamage) => set({ endsOnDamage: endsOnDamage || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.condition.noInitialSave")} checked={condition.noInitialSave === true} onChange={(noInitialSave) => set({ noInitialSave: noInitialSave || undefined })} />
      </div>
      <SelectField label={t("workshop.homebrew.mech.condition.saveOnDamage")} value={String(condition.saveOnDamage ?? "")} options={[{ value: "", label: t("workshop.homebrew.mech.condition.repeat.no") }, { value: "normal", label: t("workshop.homebrew.mech.condition.yes") }, { value: "advantage", label: t("workshop.homebrew.mech.condition.advantage") }]} onChange={(saveOnDamage) => set({ saveOnDamage: saveOnDamage || undefined })} />
      <SelectField label={t("workshop.homebrew.mech.condition.lastsUntil")} value={String(condition.endsWith ?? "")} options={[{ value: "", label: t("workshop.homebrew.mech.condition.roundsRunOut") }, { value: "target turn end", label: t("workshop.homebrew.mech.condition.nextTargetTurn") }, { value: "caster turn start", label: t("workshop.homebrew.mech.condition.casterNextTurn") }]} onChange={(endsWith) => set({ endsWith: endsWith || undefined })} />
      <NumberField label={t("workshop.homebrew.mech.condition.hpAtMost")} value={condition.hpAtMost === undefined ? "" : num(condition.hpAtMost)} min={1} max={1000} onChange={(hpAtMost) => set({ hpAtMost: hpAtMost === "" ? undefined : hpAtMost })} hint={t("workshop.homebrew.mech.condition.hp.hint")} />
      <NumberField label={t("workshop.homebrew.mech.condition.escapeDC")} value={condition.escapeDc === undefined ? "" : num(condition.escapeDc)} min={1} max={30} onChange={(escapeDc) => set({ escapeDc: escapeDc === "" ? undefined : escapeDc })} hint={t("workshop.homebrew.mech.condition.escapeDC.hint")} />
      <div className="col-span-2">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.condition.breaksFree")}</span>
        <ToggleChips options={["str", "dex", "int"] as const} selected={escape} onChange={(next) => set({ escape: next.length ? next : undefined })} labels={{ str: "STR", dex: "DEX", int: "INT" }} />
      </div>
      <div className="col-span-2">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.condition.comesWith")}</span>
        <ToggleChips options={CONDITIONS} selected={list(condition.also)} onChange={(next) => set({ also: next.length ? next : undefined })} />
      </div>
    </MechGroup>
  );
}

export function SpellMechFields({ data, onChange }: { data: Mech; onChange: (next: Mech) => void }) {
  const t = useT();
  const resolutions = RESOLUTION_VALUES.map((value) => ({ value, label: t(`workshop.homebrew.mech.resolution.${value || "prose"}`) }));
  const mech = sub(data.mech);
  const setMech = (patch: Mech) => {
    const next = { ...mech, ...patch };
    for (const key of Object.keys(next)) {
      if (next[key] === undefined) delete next[key];
    }
    onChange({ ...data, mech: next.resolution ? next : undefined });
  };
  const resolution = String(mech.resolution ?? "");
  const props = { mech: { ...mech, level: data.level }, setMech };
  return (
    <div className="panel space-y-2 rounded-xl p-3">
      <SectionHead title={t("workshop.homebrew.mech.title")} glyph="cue-arcane" className="mb-1" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SelectField label={t("workshop.homebrew.mech.resolve.label")} value={resolution} options={resolutions} onChange={(next) => setMech({ resolution: next || undefined })} hint={t("workshop.homebrew.mech.resolve.hint")} className="col-span-2" />
        {resolution === "save" ? (
          <>
            <SelectField label={t("workshop.homebrew.mech.save")} value={String(mech.save ?? "")} options={ABILITY_OPTIONS} onChange={(save) => setMech({ save: save || undefined })} />
            <div className="flex items-end pb-1">
              <CheckField label={t("workshop.homebrew.mech.halfOnSave")} checked={mech.halfOnSave === true} onChange={(halfOnSave) => setMech({ halfOnSave: halfOnSave || undefined })} />
            </div>
          </>
        ) : null}
      </div>
      {resolution ? (
        <div className="reveal space-y-2">
          <ReachGroup {...props} />
          {["attack", "save", "auto"].includes(resolution) ? <DamageGroup {...props} /> : null}
          {["attack", "save", "auto", "utility"].includes(resolution) ? <ConditionGroup {...props} /> : null}
          {resolution === "save" ? <RidersGroup {...props} /> : null}
          {resolution === "buff" ? <BuffGroup {...props} /> : null}
          {["heal", "utility", "buff"].includes(resolution) ? <HealGroup {...props} /> : null}
          {["save", "utility", "buff"].includes(resolution) ? <AuraGroup {...props} /> : null}
          {["save", "utility"].includes(resolution) ? <PoolGroup {...props} /> : null}
          <TextField label={t("workshop.homebrew.mech.note")} value={String(mech.note ?? "")} onChange={(note) => setMech({ note: note || undefined })} placeholder={t("workshop.homebrew.mech.note.placeholder")} maxLength={400} />
          <AdvancedBlock mech={mech} onChange={(next) => onChange({ ...data, mech: next })} />
        </div>
      ) : null}
    </div>
  );
}
