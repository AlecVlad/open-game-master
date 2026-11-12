"use client";

import { Plus, X } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { NumberField, SelectField, TextArea, TextField } from "@/app/workshop/homebrew/fields";
import { ChipList } from "@/app/workshop/plugin/fields";
import { MechGroup, list, num, sub, type Mech } from "@/app/workshop/homebrew/MechGroup";
import { addChip, rowIcon } from "@/app/workshop/kit";
import type { Data } from "@/app/workshop/homebrew/draft";

// A hazard: a trap apply_hazard springs by name, a poison or a disease the
// afflict tool lays on by name (src/lib/homebrew/hazard-data.ts). The blocks
// are the SRD's own shapes, so a copy of the Poison Needle or Wyvern Poison
// starts exact and stays editable.

type Props = { data: Data; onChange: (next: Data) => void };
type Translate = ReturnType<typeof useT>;
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_KEYS = { str: "workshop.homebrew.species.ability.str", dex: "workshop.homebrew.species.ability.dex", con: "workshop.homebrew.species.ability.con", int: "workshop.homebrew.species.ability.int", wis: "workshop.homebrew.species.ability.wis", cha: "workshop.homebrew.species.ability.cha" } as const;
const DAMAGE = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"] as const;
const DAMAGE_KEYS = { acid: "workshop.homebrew.item.damage.acid", bludgeoning: "workshop.homebrew.item.damage.bludgeoning", cold: "workshop.homebrew.item.damage.cold", fire: "workshop.homebrew.item.damage.fire", force: "workshop.homebrew.item.damage.force", lightning: "workshop.homebrew.item.damage.lightning", necrotic: "workshop.homebrew.item.damage.necrotic", piercing: "workshop.homebrew.item.damage.piercing", poison: "workshop.homebrew.item.damage.poison", psychic: "workshop.homebrew.item.damage.psychic", radiant: "workshop.homebrew.item.damage.radiant", slashing: "workshop.homebrew.item.damage.slashing", thunder: "workshop.homebrew.item.damage.thunder" } as const;
const CONDITIONS = ["blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"] as const;
const CONDITION_KEYS = { blinded: "workshop.homebrew.item.condition.blinded", charmed: "workshop.homebrew.item.condition.charmed", deafened: "workshop.homebrew.item.condition.deafened", frightened: "workshop.homebrew.item.condition.frightened", grappled: "workshop.homebrew.item.condition.grappled", incapacitated: "workshop.homebrew.item.condition.incapacitated", paralyzed: "workshop.homebrew.item.condition.paralyzed", petrified: "workshop.homebrew.item.condition.petrified", poisoned: "workshop.homebrew.item.condition.poisoned", prone: "workshop.homebrew.item.condition.prone", restrained: "workshop.homebrew.item.condition.restrained", stunned: "workshop.homebrew.item.condition.stunned", unconscious: "workshop.homebrew.item.condition.unconscious" } as const;
const SPOT_SKILLS = ["perception", "investigation", "arcana"] as const;
const SPOT_SKILL_KEYS = { perception: "workshop.homebrew.skill.perception", investigation: "workshop.homebrew.skill.investigation", arcana: "workshop.homebrew.skill.arcana" } as const;
const KINDS = ["trap", "poison", "disease"] as const;
const KIND_KEYS = { trap: "workshop.homebrew.hazard.trap", poison: "workshop.homebrew.hazard.poison", disease: "workshop.homebrew.hazard.disease" } as const;
const abilityLabel = (value: string, t: Translate) => { const key = ABILITY_KEYS[value as keyof typeof ABILITY_KEYS]; return key ? t(key) : value.toUpperCase(); };
const damageLabel = (value: string, t: Translate) => { const key = DAMAGE_KEYS[value as keyof typeof DAMAGE_KEYS]; return key ? t(key) : value; };
const conditionLabel = (value: string, t: Translate) => { const key = CONDITION_KEYS[value as keyof typeof CONDITION_KEYS]; return key ? t(key) : value; };
const skillLabel = (value: string, t: Translate) => { const key = SPOT_SKILL_KEYS[value as keyof typeof SPOT_SKILL_KEYS]; return key ? t(key) : value; };
const optional = (value: number | "") => (value === "" ? undefined : value);
// A block with its emptied fields dropped, so the stored row stays clean.
const tidy = (block: Mech): Mech => Object.fromEntries(Object.entries(block).filter(([, value]) => value !== undefined && !(Array.isArray(value) && !value.length)));

function DamageParts({ title, parts, onChange }: { title: string; parts: Mech[]; onChange: (next: Mech[]) => void }) {
  const t = useT();
  const damageOptions = DAMAGE.map((value) => ({ value, label: damageLabel(value, t) }));
  return (
    <div className="col-span-2 space-y-1 sm:col-span-4">
      <span className="text-[11px] text-stone-400">{title}</span>
      {parts.map((part, index) => (
        <div key={index} className="live-in flex flex-wrap items-center gap-1.5">
          <input
            value={String(part.dice ?? "")}
            aria-label={t("workshop.homebrew.hazard.damageDice")}
            placeholder="2d10"
            maxLength={40}
            onChange={(event) => onChange(parts.map((entry, at) => (at === index ? { ...entry, dice: event.target.value } : entry)))}
            className={cn(ui.input, "w-24 text-sm")}
          />
          <SelectField label="" value={String(part.type ?? "piercing")} options={damageOptions} onChange={(type) => onChange(parts.map((entry, at) => (at === index ? { ...entry, type } : entry)))} className="w-36" />
          <button type="button" aria-label={t("workshop.homebrew.hazard.removeDamage")} onClick={() => onChange(parts.filter((_, at) => at !== index))} className={cn(ui.iconAction, rowIcon, "hover:text-red-300")}>
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {parts.length < 4 ? (
        <button type="button" onClick={() => onChange([...parts, { dice: "1d4", type: "piercing" }])} className={cn(ui.btnSmall, addChip)}>
          <Plus className="size-3" /> {t("workshop.homebrew.hazard.addDamage")}
        </button>
      ) : null}
    </div>
  );
}

function TrapBlock({ block, put }: { block: Mech; put: (patch: Mech) => void }) {
  const t = useT();
  const abilities = ABILITIES.map((value) => ({ value, label: abilityLabel(value, t) }));
  const damageOptions = DAMAGE.map((value) => ({ value, label: damageLabel(value, t) }));
  const conditions = CONDITIONS.map((value) => ({ value, label: conditionLabel(value, t) }));
  const spotSkills = SPOT_SKILLS.map((value) => ({ value, label: skillLabel(value, t) }));
  const spot = sub(block.spot);
  const disarm = sub(block.disarm);
  const save = sub(block.save);
  const damage = sub(block.damage);
  const escape = sub(block.escape);
  return (
    <>
      <MechGroup title={t("workshop.homebrew.hazard.section.trapMechanism")} summary={String(block.trigger ?? "") || t("workshop.homebrew.hazard.summary.trigger")} open>
        <SelectField label={t("workshop.homebrew.hazard.kind")} value={String(block.kind ?? "mechanical")} options={[{ value: "mechanical", label: t("workshop.homebrew.hazard.kind.mechanical") }, { value: "magic", label: t("workshop.homebrew.hazard.kind.magic") }]} onChange={(kind) => put({ kind })} />
        <div className="col-span-2 sm:col-span-3">
          <TextField label={t("workshop.homebrew.hazard.trigger")} value={String(block.trigger ?? "")} onChange={(trigger) => put({ trigger })} placeholder={t("workshop.homebrew.hazard.trigger.placeholder")} maxLength={200} />
        </div>
        <NumberField label={t("workshop.homebrew.hazard.spotDC")} value={num(spot.dc, 0) || ""} min={1} max={30} onChange={(dc) => put({ spot: dc === "" ? undefined : { dc, skill: String(spot.skill ?? "perception") } })} />
        <SelectField label={t("workshop.homebrew.hazard.spottedWith")} value={String(spot.skill ?? "perception")} options={spotSkills} onChange={(skill) => put({ spot: { dc: num(spot.dc, 10), skill } })} />
        <NumberField label={t("workshop.homebrew.hazard.disarmDC")} value={num(disarm.dc, 0) || ""} min={1} max={30} onChange={(dc) => put({ disarm: dc === "" ? undefined : { dc, how: String(disarm.how ?? t("workshop.homebrew.hazard.disarmedBy.placeholder")) } })} />
        <TextField label={t("workshop.homebrew.hazard.disarmedBy")} value={String(disarm.how ?? "")} onChange={(how) => put({ disarm: { dc: num(disarm.dc, 15), how } })} placeholder={t("workshop.homebrew.hazard.disarmedBy.placeholder")} maxLength={200} />
      </MechGroup>
      <MechGroup title={t("workshop.homebrew.hazard.section.trapEffect")} summary={[save.dc ? t("workshop.homebrew.hazard.summary.dc") + " " + num(save.dc) + " " + abilityLabel(String(save.ability ?? ""), t) : "", damage.dice ? String(damage.dice) + " " + damageLabel(String(damage.type ?? ""), t) : "", block.condition ? conditionLabel(String(block.condition), t) : ""].filter(Boolean).join(", ") || t("workshop.homebrew.hazard.summary.noneYet")} open>
        <NumberField label={t("workshop.homebrew.hazard.attackBonus")} value={block.attackBonus === undefined ? "" : num(block.attackBonus)} min={-5} max={20} onChange={(value) => put({ attackBonus: optional(value), ...(value === "" ? { volley: undefined } : {}) })} hint={t("workshop.homebrew.hazard.attackBonus.hint")} />
        {block.attackBonus !== undefined ? (
          <NumberField label={t("workshop.homebrew.hazard.missiles")} value={num(block.volley, 0) || ""} min={1} max={20} onChange={(value) => put({ volley: optional(value) })} hint={t("workshop.homebrew.hazard.missiles.hint")} />
        ) : null}
        <NumberField label={t("workshop.homebrew.hazard.fallFeet")} value={num(block.fallFeet, 0) || ""} min={0} max={500} step={5} onChange={(value) => put({ fallFeet: optional(value) || undefined })} />
        <DamageParts title={t("workshop.homebrew.hazard.damageWithoutSave")} parts={Array.isArray(block.hit) ? (block.hit as Mech[]) : []} onChange={(hit) => put({ hit: hit.length ? hit : undefined })} />
        <SelectField label={t("workshop.homebrew.hazard.save")} value={String(save.ability ?? "")} options={[{ value: "", label: t("workshop.homebrew.hazard.save.none") }, ...abilities]} onChange={(ability) => put({ save: ability ? { ability, dc: num(save.dc, 13), halfOnSave: save.halfOnSave !== false } : undefined })} />
        {save.ability ? (
          <>
            <NumberField label={t("workshop.homebrew.hazard.saveDC")} value={num(save.dc, 13)} min={1} max={30} onChange={(dc) => put({ save: { ...save, dc: dc === "" ? 13 : dc } })} />
            <SelectField label={t("workshop.homebrew.hazard.onSuccess")} value={save.halfOnSave === false ? "none" : "half"} options={[{ value: "half", label: t("workshop.homebrew.hazard.save.halfDamage") }, { value: "none", label: t("workshop.homebrew.mech.damage.noDamage") }]} onChange={(value) => put({ save: { ...save, halfOnSave: value === "half" } })} />
            <TextField label={t("workshop.homebrew.hazard.damageDice")} value={String(damage.dice ?? "")} onChange={(dice) => put({ damage: dice ? { dice, type: String(damage.type ?? "piercing") } : undefined })} placeholder="4d10" maxLength={40} />
            <SelectField label={t("workshop.homebrew.hazard.damageType")} value={String(damage.type ?? "piercing")} options={damageOptions} onChange={(type) => put({ damage: { dice: String(damage.dice ?? "1d6"), type } })} />
            <SelectField label={t("workshop.homebrew.hazard.onFailureAlso")} value={String(block.condition ?? "")} options={[{ value: "", label: t("workshop.homebrew.mech.condition.none") }, ...conditions]} onChange={(condition) => put({ condition: condition || undefined })} />
          </>
        ) : null}
        <div className="col-span-2 space-y-1 sm:col-span-4">
          <span className="text-[11px] text-stone-400">{t("workshop.homebrew.hazard.conditions.always")}</span>
          <ChipList items={list(block.conditionsAlways)} onChange={(next) => put({ conditionsAlways: next.length ? next : undefined, ...(next.length ? {} : { escape: undefined }) })} options={conditions} prompt={t("workshop.homebrew.hazard.conditions.add")} labelFor={(value) => conditionLabel(value, t)} removeLabelFor={(label) => t("workshop.homebrew.hazard.conditions.remove") + " " + label} max={4} />
        </div>
        {list(block.conditionsAlways).length ? (
          <>
            <SelectField
              label={t("workshop.homebrew.hazard.escape.by")}
              value={String(escape.ability ?? "")}
              options={[{ value: "", label: t("workshop.homebrew.hazard.escape.strVsSaveDC") }, { value: "str", label: t("workshop.homebrew.hazard.escape.strCheck") }, { value: "dex", label: t("workshop.homebrew.hazard.escape.dexCheck") }]}
              onChange={(ability) => put({ escape: ability ? { ability, dc: num(escape.dc, num(save.dc, 10)) } : undefined })}
              hint={t("workshop.homebrew.hazard.escape.hint")}
            />
            {escape.ability ? <NumberField label={t("workshop.homebrew.hazard.escapeDC")} value={num(escape.dc, 10)} min={1} max={30} onChange={(dc) => put({ escape: { ...escape, dc: dc === "" ? 10 : dc } })} /> : null}
          </>
        ) : null}
        <NumberField label={t("workshop.homebrew.hazard.duration.rounds")} value={num(block.rounds, 0) || ""} min={1} max={14400} onChange={(value) => put({ rounds: optional(value) })} hint={t("workshop.homebrew.hazard.duration.roundsHint")} />
      </MechGroup>
    </>
  );
}

function PoisonBlock({ block, put }: { block: Mech; put: (patch: Mech) => void }) {
  const t = useT();
  const conditions = CONDITIONS.map((value) => ({ value, label: conditionLabel(value, t) }));
  const repeat = sub(block.repeat);
  return (
    <MechGroup title={t("workshop.homebrew.hazard.section.poison")} summary={[t("workshop.homebrew.hazard.summary.dc") + " " + num(block.dc, 10) + " " + abilityLabel("con", t), block.damage ? String(block.damage) : "", list(block.conditions).map((value) => conditionLabel(value, t)).join(", ")].filter(Boolean).join(", ")} open>
      <SelectField label={t("workshop.homebrew.hazard.poison.delivered")} value={String(block.type ?? "injury")} options={[{ value: "contact", label: t("workshop.homebrew.hazard.poison.contact") }, { value: "ingested", label: t("workshop.homebrew.hazard.poison.ingested") }, { value: "inhaled", label: t("workshop.homebrew.hazard.poison.inhaled") }, { value: "injury", label: t("workshop.homebrew.hazard.poison.injury") }]} onChange={(type) => put({ type })} hint={t("workshop.homebrew.hazard.poison.injuryHint")} />
      <NumberField label={t("workshop.homebrew.hazard.poison.conSaveDC")} value={num(block.dc, 10)} min={1} max={30} onChange={(dc) => put({ dc: dc === "" ? 10 : dc })} />
      <TextField label={t("workshop.homebrew.hazard.poison.damage")} value={String(block.damage ?? "")} onChange={(damage) => put({ damage: damage || undefined })} placeholder="3d6" maxLength={40} />
      <SelectField label={t("workshop.homebrew.hazard.onSuccess")} value={block.halfOnSave ? "half" : "none"} options={[{ value: "half", label: t("workshop.homebrew.hazard.save.halfDamage") }, { value: "none", label: t("workshop.homebrew.mech.damage.noDamage") }]} onChange={(value) => put({ halfOnSave: value === "half" || undefined })} />
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.hazard.onFail")}</span>
        <ChipList items={list(block.conditions)} onChange={(next) => put({ conditions: next.length ? next : undefined })} options={conditions} prompt={t("workshop.homebrew.hazard.conditions.add")} labelFor={(value) => conditionLabel(value, t)} removeLabelFor={(label) => t("workshop.homebrew.hazard.conditions.remove") + " " + label} max={4} />
      </div>
      <NumberField label={t("workshop.homebrew.hazard.duration.minutes")} value={num(block.minutes, 0) || ""} min={1} max={525600} onChange={(value) => put({ minutes: optional(value) })} />
      <TextField label={t("workshop.homebrew.hazard.poison.hoursOf")} value={String(block.hoursDice ?? "")} onChange={(hoursDice) => put({ hoursDice: hoursDice || undefined })} placeholder="4d6" maxLength={40} />
      <NumberField label={t("workshop.homebrew.hazard.poison.unconsciousIfFailBy")} value={num(block.unconsciousIfFailBy, 0) || ""} min={1} max={20} onChange={(value) => put({ unconsciousIfFailBy: optional(value) })} />
      <SelectField label={t("workshop.homebrew.hazard.poison.wakesOnDamage")} value={block.wakesOnDamage ? "yes" : "no"} options={[{ value: "no", label: t("workshop.homebrew.hazard.boolean.no") }, { value: "yes", label: t("workshop.homebrew.hazard.boolean.yes") }]} onChange={(value) => put({ wakesOnDamage: value === "yes" || undefined })} />
      <SelectField
        label={t("workshop.homebrew.hazard.poison.savesAgain")}
        value={String(repeat.every ?? "")}
        options={[{ value: "", label: t("workshop.homebrew.hazard.poison.never") }, { value: "turn_start", label: t("workshop.homebrew.hazard.poison.turnStart") }, { value: "turn_end", label: t("workshop.homebrew.hazard.poison.turnEnd") }, { value: "day", label: t("workshop.homebrew.hazard.poison.every24Hours") }]}
        onChange={(every) => put({ repeat: every ? { every, successes: num(repeat.successes, 1), ...(repeat.damage ? { damage: repeat.damage } : {}) } : undefined })}
      />
      {repeat.every ? (
        <>
          <NumberField label={t("workshop.homebrew.hazard.poison.successesToEnd")} value={num(repeat.successes, 1)} min={1} max={20} onChange={(successes) => put({ repeat: { ...repeat, successes: successes === "" ? 1 : successes } })} />
          <TextField label={t("workshop.homebrew.hazard.poison.damageEachFailure")} value={String(repeat.damage ?? "")} onChange={(damage) => put({ repeat: { ...repeat, damage: damage || undefined } })} placeholder="1d6" maxLength={40} />
        </>
      ) : null}
      <SelectField label={t("workshop.homebrew.hazard.poison.waitsForMidnight")} value={block.atMidnight ? "yes" : "no"} options={[{ value: "no", label: t("workshop.homebrew.hazard.boolean.no") }, { value: "yes", label: t("workshop.homebrew.hazard.boolean.yes") }]} onChange={(value) => put({ atMidnight: value === "yes" || undefined })} />
      <NumberField label={t("workshop.homebrew.hazard.poison.priceGp")} value={num(block.priceGp, 0)} min={0} max={100000} onChange={(priceGp) => put({ priceGp: priceGp === "" ? 0 : priceGp })} />
    </MechGroup>
  );
}

function DiseaseBlock({ block, put }: { block: Mech; put: (patch: Mech) => void }) {
  const t = useT();
  const abilities = ABILITIES.map((value) => ({ value, label: abilityLabel(value, t) }));
  const conditions = CONDITIONS.map((value) => ({ value, label: conditionLabel(value, t) }));
  const infect = sub(block.infect);
  const onset = sub(block.onset);
  const rest = sub(block.rest);
  return (
    <>
      <MechGroup title={t("workshop.homebrew.hazard.disease.catchingIt")} summary={t("workshop.homebrew.hazard.summary.dc") + " " + num(infect.dc, 11) + " " + abilityLabel(String(infect.ability ?? "con"), t) + ", " + t("workshop.homebrew.hazard.disease.symptomsIn") + " " + String(onset.dice ?? "1d4") + " " + t(onset.unit === "hours" ? "workshop.homebrew.hazard.disease.hours" : "workshop.homebrew.hazard.disease.days")} open>
        <SelectField label={t("workshop.homebrew.hazard.save")} value={String(infect.ability ?? "con")} options={abilities} onChange={(ability) => put({ infect: { ...infect, ability } })} />
        <NumberField label={t("workshop.homebrew.hazard.saveDC")} value={num(infect.dc, 11)} min={1} max={30} onChange={(dc) => put({ infect: { ability: infect.ability ?? "con", dc: dc === "" ? 11 : dc } })} />
        <TextField label={t("workshop.homebrew.hazard.disease.symptomsAfter")} value={String(onset.dice ?? "1d4")} onChange={(dice) => put({ onset: { unit: onset.unit ?? "days", dice } })} placeholder="1d4" maxLength={40} />
        <SelectField label={t("workshop.homebrew.hazard.disease.of")} value={String(onset.unit ?? "days")} options={[{ value: "hours", label: t("workshop.homebrew.hazard.disease.hours") }, { value: "days", label: t("workshop.homebrew.hazard.disease.days") }]} onChange={(unit) => put({ onset: { dice: onset.dice ?? "1d4", unit } })} />
      </MechGroup>
      <MechGroup title={t("workshop.homebrew.hazard.disease.symptoms")} summary={[String(block.condition ?? ""), num(block.exhaustion) ? t("workshop.homebrew.hazard.disease.exhaustionSummary") + ": " + num(block.exhaustion) : ""].filter(Boolean).join(", ") || t("workshop.homebrew.hazard.summary.noneYet")} open>
        <TextField label={t("workshop.homebrew.hazard.disease.conditionLabel")} value={String(block.condition ?? "")} onChange={(condition) => put({ condition })} placeholder={t("workshop.homebrew.hazard.disease.condition.placeholder")} maxLength={40} />
        <NumberField label={t("workshop.homebrew.hazard.disease.exhaustionLevels")} value={num(block.exhaustion)} min={0} max={5} onChange={(exhaustion) => put({ exhaustion: exhaustion === "" ? 0 : exhaustion })} />
        <div className="col-span-2 space-y-1">
          <span className="text-[11px] text-stone-400">{t("workshop.homebrew.hazard.disease.andWhileSick")}</span>
          <ChipList items={list(block.conditions)} onChange={(next) => put({ conditions: next.length ? next : undefined })} options={conditions} prompt={t("workshop.homebrew.hazard.conditions.add")} labelFor={(value) => conditionLabel(value, t)} removeLabelFor={(label) => t("workshop.homebrew.hazard.conditions.remove") + " " + label} max={4} />
        </div>
      </MechGroup>
      <MechGroup title={t("workshop.homebrew.hazard.disease.afterLongRest")} summary={rest.ability ? t("workshop.homebrew.hazard.summary.dc") + " " + num(rest.dc, 11) + " " + abilityLabel(String(rest.ability), t) : t("workshop.homebrew.hazard.summary.noSave")} open={Boolean(rest.ability)}>
        <SelectField label={t("workshop.homebrew.hazard.save")} value={String(rest.ability ?? "")} options={[{ value: "", label: t("workshop.homebrew.hazard.save.none") }, ...abilities]} onChange={(ability) => put({ rest: ability ? { ability, dc: num(rest.dc, 11), onSuccess: rest.onSuccess ?? "improve", onFail: rest.onFail ?? "worsen", successes: num(rest.successes, 1) } : undefined })} />
        {rest.ability ? (
          <>
            <NumberField label={t("workshop.homebrew.hazard.saveDC")} value={num(rest.dc, 11)} min={1} max={30} onChange={(dc) => put({ rest: { ...rest, dc: dc === "" ? 11 : dc } })} />
            <SelectField label={t("workshop.homebrew.hazard.disease.success")} value={String(rest.onSuccess ?? "improve")} options={[{ value: "improve", label: t("workshop.homebrew.hazard.disease.shedsLevel") }, { value: "recover", label: t("workshop.homebrew.hazard.disease.countsTowardCure") }]} onChange={(onSuccess) => put({ rest: { ...rest, onSuccess } })} />
            <SelectField label={t("workshop.homebrew.hazard.disease.failure")} value={String(rest.onFail ?? "worsen")} options={[{ value: "worsen", label: t("workshop.homebrew.hazard.disease.addsLevel") }, { value: "nothing", label: t("workshop.homebrew.hazard.disease.changesNothing") }]} onChange={(onFail) => put({ rest: { ...rest, onFail } })} />
            {rest.onSuccess === "recover" ? (
              <NumberField label={t("workshop.homebrew.hazard.disease.successesToCure")} value={num(rest.successes, 1)} min={1} max={10} onChange={(successes) => put({ rest: { ...rest, successes: successes === "" ? 1 : successes } })} />
            ) : null}
          </>
        ) : null}
      </MechGroup>
      <SelectField
        label={t("workshop.homebrew.hazard.disease.runsAs")}
        value={String(block.runsAs ?? "")}
        options={[{ value: "", label: t("workshop.homebrew.hazard.disease.ownBlock") }, { value: "cackle_fever", label: t("workshop.homebrew.hazard.disease.cackleFever") }, { value: "sewer_plague", label: t("workshop.homebrew.hazard.disease.sewerPlague") }, { value: "sight_rot", label: t("workshop.homebrew.hazard.disease.sightRot") }]}
        onChange={(runsAs) => put({ runsAs: runsAs || undefined })}
        hint={t("workshop.homebrew.hazard.disease.runsAsHint")}
        className="w-72"
      />
    </>
  );
}

export function HazardFields({ data, onChange }: Props) {
  const t = useT();
  const kind = String(data.hazardKind ?? "trap");
  const block = sub(data[kind]);
  const put = (patch: Mech) => onChange({ ...data, [kind]: tidy({ ...block, ...patch }) });
  return (
    <div className="space-y-3">
      <SelectField label={t("workshop.homebrew.hazard.type")} value={kind} options={KINDS.map((value) => ({ value, label: t(KIND_KEYS[value]) }))} onChange={(hazardKind) => onChange({ ...data, hazardKind })} className="w-48" />
      <div key={kind} className="reveal space-y-3">
        {kind === "trap" ? <TrapBlock block={block} put={put} /> : null}
        {kind === "poison" ? <PoisonBlock block={block} put={put} /> : null}
        {kind === "disease" ? <DiseaseBlock block={block} put={put} /> : null}
      </div>
      <TextArea label={t("workshop.homebrew.hazard.tableTold")} value={String(block.summary ?? "")} onChange={(summary) => put({ summary })} rows={2} maxLength={600} hint={t("workshop.homebrew.hazard.tableTold.hint")} />
    </div>
  );
}
