"use client";

import { Plus, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { ContentPick } from "@/components/ui/ContentPick";
import { CREATURE_TYPES } from "@/lib/bestiary/creature-type";
import { CLASS_WORDS, SKILL_IDS } from "@/lib/homebrew/item-magic-schema";
import { CheckField, NumberField, SelectField, TextField, ToggleChips } from "@/app/workshop/homebrew/fields";
import { DAMAGE_TYPES } from "@/app/workshop/homebrew/types";
import { MechGroup, list, num, sub, type Mech } from "@/app/workshop/homebrew/MechGroup";
import { addChip, rowIcon } from "@/app/workshop/kit";
import { textKey } from "@/lib/language/text-logic";

// The rest of a magic item's magic, in the words the engines read the SRD's
// by (src/lib/homebrew/item-magic-schema.ts): what a magic weapon adds to a
// hit, what magic armour forgives, charges and how they come back, the
// spells charges cast, what it adds to checks, who may attune, a curse. A
// copy of a published item arrives with these filled from the book.

type Props = { data: Mech; set: (patch: Mech) => void };

const CREATURE_WORDS = CREATURE_TYPES.map((type) => type as string);

const optional = (value: number | ""): number | undefined => (value === "" || value === 0 ? undefined : value);
const clean = (value: Mech): Mech | undefined => {
  const out = Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "" && !(Array.isArray(entry) && !entry.length)));
  return Object.keys(out).length ? out : undefined;
};

function DiceRows({ title, rows, onChange }: { title: string; rows: Mech[]; onChange: (next: Mech[]) => void }) {
  const t = useT();
  const riderTypes = [{ value: "weapon", label: t("workshop.homebrew.itemMagic.dice.weaponType") }, ...DAMAGE_TYPES.map((value) => ({ value, label: t(`workshop.homebrew.item.damage.${value}`) }))];
  return (
    <div className="col-span-2 space-y-1.5 sm:col-span-4">
      <span className="text-[11px] text-stone-400">{title}</span>
      {rows.map((row, index) => (
        <div key={index} className="live-in flex flex-wrap items-end gap-2">
          <TextField label={t("workshop.homebrew.itemMagic.dice.dice")} value={String(row.dice ?? "")} onChange={(dice) => onChange(rows.map((entry, at) => (at === index ? { ...entry, dice } : entry)))} maxLength={40} className="w-24" />
          <SelectField label={t("workshop.homebrew.itemMagic.dice.type")} value={String(row.type ?? "weapon")} options={riderTypes} onChange={(type) => onChange(rows.map((entry, at) => (at === index ? { ...entry, type } : entry)))} className="w-40" />
          <CheckField label={t("workshop.homebrew.itemMagic.dice.ranged")} checked={row.ranged === true} onChange={(ranged) => onChange(rows.map((entry, at) => (at === index ? { ...entry, ranged: ranged || undefined } : entry)))} />
          <button type="button" aria-label={t("workshop.homebrew.itemMagic.dice.remove")} onClick={() => onChange(rows.filter((_, at) => at !== index))} className={cn(ui.iconAction, rowIcon, "hover:text-red-300")}>
            <Trash2 className="size-3.5" />
          </button>
          <div className="basis-full">
            <span className="text-[11px] text-stone-500">{t("workshop.homebrew.itemMagic.dice.onlyAgainst")}</span>
            <ToggleChips options={CREATURE_WORDS} labels={Object.fromEntries(CREATURE_WORDS.map((type) => [type, t(`workshop.monsterEditor.defence.creatureType.${type}`)]))} selected={list(row.vs)} onChange={(vs) => onChange(rows.map((entry, at) => (at === index ? { ...entry, vs: vs.length ? vs : undefined } : entry)))} />
          </div>
        </div>
      ))}
      {rows.length < 4 ? (
        <button type="button" onClick={() => onChange([...rows, { dice: "1d6", type: "fire" }])} className={cn(ui.btnSmall, addChip, "w-fit")}>
          <Plus className="size-3" /> {t("workshop.homebrew.itemMagic.dice.add")}
        </button>
      ) : null}
    </div>
  );
}

export function WeaponRidersBlock({ data, set }: Props) {
  const t = useT();
  const riders = sub(data.weaponRiders);
  const put = (patch: Mech) => set({ weaponRiders: clean({ ...riders, ...patch }) });
  const extra = Array.isArray(riders.extra) ? (riders.extra as Mech[]) : [];
  const crit = Array.isArray(riders.critExtra) ? (riders.critExtra as Mech[]) : [];
  const bonusVs = sub(riders.bonusVs);
  const summary = [num(riders.bonus) ? `+${num(riders.bonus)}` : "", ...extra.map((row) => `+${String(row.dice)} ${t(`workshop.homebrew.item.damage.${String(row.type)}`)}`)].filter(Boolean).join(", ");
  return (
    <MechGroup title={t("workshop.homebrew.itemMagic.magic.weaponRiders.title")} summary={summary || t("workshop.homebrew.itemMagic.magic.nothing")} open={Object.keys(riders).length > 0}>
      <NumberField label={t("workshop.homebrew.itemMagic.magic.weaponRiders.bonus")} value={num(riders.bonus)} min={0} max={3} onChange={(bonus) => put({ bonus: optional(bonus) })} />
      <SelectField label={t("workshop.homebrew.itemMagic.magic.damageTypeBecomes")} value={String(riders.damageType ?? "")} options={[{ value: "", label: t("workshop.homebrew.itemMagic.magic.unchanged") }, ...DAMAGE_TYPES.map((value) => ({ value, label: t(`workshop.homebrew.item.damage.${value}`) }))]} onChange={(damageType) => put({ damageType: damageType || undefined })} />
      <NumberField label={t("workshop.homebrew.itemMagic.magic.thrownRange")} value={num(riders.rangeFt)} min={0} max={600} step={5} onChange={(rangeFt) => put({ rangeFt: optional(rangeFt) })} />
      <NumberField label={t("workshop.homebrew.itemMagic.magic.longRange")} value={num(riders.longRangeFt)} min={0} max={1200} step={5} onChange={(longRangeFt) => put({ longRangeFt: optional(longRangeFt) })} />
      <DiceRows title={t("workshop.homebrew.itemMagic.magic.extraHitDice")} rows={extra} onChange={(next) => put({ extra: next.length ? next : undefined })} />
      <DiceRows title={t("workshop.homebrew.itemMagic.magic.extraCritDice")} rows={crit} onChange={(next) => put({ critExtra: next.length ? next : undefined })} />
      <NumberField label={t("workshop.homebrew.itemMagic.magic.bonusAgainst")} value={num(bonusVs.bonus)} min={0} max={3} onChange={(bonus) => put({ bonusVs: bonus ? { types: list(bonusVs.types), bonus } : undefined })} />
      {riders.bonusVs ? (
        <div className="col-span-2 sm:col-span-3">
          <ToggleChips options={CREATURE_WORDS} labels={Object.fromEntries(CREATURE_WORDS.map((type) => [type, t(`workshop.monsterEditor.defence.creatureType.${type}`)]))} selected={list(bonusVs.types)} onChange={(types) => put({ bonusVs: { ...bonusVs, types } })} />
        </div>
      ) : null}
    </MechGroup>
  );
}

export function ArmorRidersBlock({ data, set }: Props) {
  const t = useT();
  const riders = sub(data.armorRiders);
  const put = (patch: Mech) => set({ armorRiders: clean({ ...riders, ...patch }) });
  return (
    <MechGroup title={t("workshop.homebrew.itemMagic.magic.armorRiders.title")} summary={num(riders.bonus) ? `+${num(riders.bonus)} AC` : t("workshop.homebrew.itemMagic.magic.nothing")} open={Object.keys(riders).length > 0}>
      <NumberField label={t("workshop.homebrew.itemMagic.magic.armorBonus")} value={num(riders.bonus)} min={0} max={3} onChange={(bonus) => put({ bonus: optional(bonus) })} />
      <div className="col-span-2 flex flex-wrap items-end gap-3 pb-1 sm:col-span-3">
        <CheckField label={t("workshop.homebrew.itemMagic.magic.noStrength")} checked={riders.noStrength === true} onChange={(on) => put({ noStrength: on || undefined })} />
        <CheckField label={t("workshop.homebrew.itemMagic.magic.noStealthDisadvantage")} checked={riders.noStealthPenalty === true} onChange={(on) => put({ noStealthPenalty: on || undefined })} />
        <CheckField label={t("workshop.homebrew.itemMagic.magic.wornAsTrained")} checked={riders.proficientAnyway === true} onChange={(on) => put({ proficientAnyway: on || undefined })} />
        <CheckField label={t("workshop.homebrew.itemMagic.magic.critBecomeNormal")} checked={riders.critProof === true} onChange={(on) => put({ critProof: on || undefined })} />
      </div>
    </MechGroup>
  );
}

export function ChargesBlock({ data, set }: Props) {
  const t = useT();
  const charges = sub(data.charges);
  const put = (patch: Mech) => set({ charges: clean({ ...charges, ...patch }) });
  const regain = String(charges.regain ?? "");
  const summary = !charges.max ? t("workshop.homebrew.itemMagic.charges.none") : regain ? t("workshop.homebrew.itemMagic.charges.summary.regain", { count: String(charges.max), regain: regain === "all" ? t("workshop.homebrew.itemMagic.charges.all") : regain, time: t(charges.regainAtDusk === true ? "workshop.homebrew.itemMagic.charges.dusk" : "workshop.homebrew.itemMagic.charges.dawn") }) : t("workshop.homebrew.itemMagic.charges.summary.never", { count: String(charges.max) });
  return (
    <MechGroup title={t("workshop.homebrew.itemMagic.charges.title")} summary={summary} open={Boolean(charges.max)}>
      <TextField label={t("workshop.homebrew.itemMagic.charges.most")} value={String(charges.max ?? "")} onChange={(max) => (max ? put({ max: /^\d+$/.test(max) ? Number(max) : max }) : set({ charges: undefined }))} placeholder={t("workshop.homebrew.itemMagic.charges.most.placeholder")} maxLength={20} hint={t("workshop.homebrew.itemMagic.charges.most.hint")} />
      <SelectField label={t("workshop.homebrew.itemMagic.charges.atDawn")} value={regain === "all" ? "all" : regain ? "dice" : ""} options={[{ value: "", label: t("workshop.homebrew.itemMagic.charges.noneRegain") }, { value: "all", label: t("workshop.homebrew.itemMagic.charges.everyCharge") }, { value: "dice", label: t("workshop.homebrew.itemMagic.charges.diceCharges") }]} onChange={(next) => put({ regain: next === "all" ? "all" : next === "dice" ? "1d6+1" : undefined })} />
      {regain && regain !== "all" ? <TextField label={t("workshop.homebrew.itemMagic.charges.regains")} value={regain} onChange={(dice) => put({ regain: dice || undefined })} maxLength={20} /> : null}
      <div className="col-span-2 flex flex-wrap items-end gap-3 pb-1">
        <CheckField label={t("workshop.homebrew.itemMagic.charges.lastD20")} checked={charges.lastChargeD20 === true} onChange={(on) => put({ lastChargeD20: on || undefined })} />
        <CheckField label={t("workshop.homebrew.itemMagic.charges.spentAway")} checked={charges.spentAway === true} onChange={(on) => put({ spentAway: on || undefined })} />
        {regain ? <CheckField label={t("workshop.homebrew.itemMagic.charges.duskToggle")} checked={charges.regainAtDusk === true} onChange={(on) => put({ regainAtDusk: on || undefined })} /> : null}
      </div>
      {/* The staffs' last-charge d20 (SRD 5.1): a 1 can leave a plain item, a 20 refill it. */}
      <TextField label={t("workshop.homebrew.itemMagic.charges.lastOneBecomes")} value={String(charges.lastChargeBecomes ?? "")} onChange={(item) => put({ lastChargeBecomes: item || undefined })} placeholder={t("workshop.homebrew.itemMagic.charges.lastOneBecomes.placeholder")} maxLength={60} hint={t("workshop.homebrew.itemMagic.charges.lastOneBecomes.hint")} />
      <TextField label={t("workshop.homebrew.itemMagic.charges.lastOneRegains")} value={String(charges.lastChargeRegain ?? "")} onChange={(dice) => put({ lastChargeRegain: dice || undefined })} placeholder={t("workshop.homebrew.itemMagic.charges.lastOneRegains.placeholder")} maxLength={20} hint={t("workshop.homebrew.itemMagic.charges.lastOneRegains.hint")} />
      <TextField label={t("workshop.homebrew.itemMagic.charges.daily")} value={String(charges.daily ?? "")} onChange={(daily) => put({ daily: daily || undefined })} placeholder={t("workshop.homebrew.itemMagic.charges.daily.placeholder")} maxLength={200} className="col-span-2 sm:col-span-4" />
    </MechGroup>
  );
}

export function ItemSpellsBlock({ data, set }: Props) {
  const t = useT();
  const spells = Array.isArray(data.spells) ? (data.spells as Mech[]) : [];
  const put = (next: Mech[]) => set({ spells: next.length ? next : undefined });
  return (
    <MechGroup title={t("workshop.homebrew.itemMagic.spells.title")} summary={spells.length ? spells.map((row) => String(row.spell)).join(", ") : t("workshop.homebrew.itemMagic.spells.none")} open={spells.length > 0}>
      {spells.map((row, index) => (
        <div key={index} className="live-in col-span-2 flex flex-wrap items-end gap-2 sm:col-span-4">
          <span className="min-w-32 pb-2 text-xs text-stone-200">{String(row.spell)}</span>
          <NumberField label={t("workshop.homebrew.itemMagic.spells.charges")} value={num(row.charges, 1)} min={0} max={50} onChange={(charges) => put(spells.map((entry, at) => (at === index ? { ...entry, charges: charges === "" ? 1 : charges } : entry)))} className="w-24" />
          <NumberField label={t("workshop.homebrew.itemMagic.spells.castLevel")} value={num(row.level, 1)} min={0} max={9} onChange={(level) => put(spells.map((entry, at) => (at === index ? { ...entry, level: level === "" ? 1 : level } : entry)))} className="w-24" />
          <CheckField label={t("workshop.homebrew.itemMagic.spells.perCharge")} checked={row.perCharge === true} onChange={(perCharge) => put(spells.map((entry, at) => (at === index ? { ...entry, perCharge: perCharge || undefined } : entry)))} />
          {/* A row with no DC of its own (a copied Staff of Healing's) shows
              empty, as its hint reads, not the 0 the number's fallback made. */}
          <NumberField label={t("workshop.homebrew.itemMagic.spells.saveDC")} value={num(row.dc) >= 1 ? num(row.dc) : ""} min={1} max={30} onChange={(dc) => put(spells.map((entry, at) => (at === index ? { ...entry, dc: optional(dc) } : entry)))} hint={t("workshop.homebrew.itemMagic.spells.saveDC.empty")} className="w-28" />
          <button type="button" aria-label={t("workshop.homebrew.itemMagic.spells.remove", { name: String(row.spell) })} onClick={() => put(spells.filter((_, at) => at !== index))} className={cn(ui.iconAction, rowIcon, "hover:text-red-300")}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <div className="col-span-2 sm:col-span-4">
        <ContentPick
          kind="spells"
          label={t("workshop.homebrew.itemMagic.spells.find")}
          placeholder={t("workshop.homebrew.itemMagic.spells.addPlaceholder")}
          onPick={(entry) => {
            if (spells.some((row) => textKey(String(row.spell)) === textKey(entry.name))) return;
            put([...spells, { spell: entry.name, charges: 1, level: typeof entry.level === "number" ? entry.level : 1 }]);
          }}
        />
      </div>
    </MechGroup>
  );
}

export function ChecksBlock({ data, set }: Props) {
  const t = useT();
  const checks = sub(data.checks);
  const skillBonus = sub(checks.skillBonus) as Record<string, number>;
  const put = (patch: Mech) => set({ checks: clean({ ...checks, ...patch }) });
  const bonused = Object.keys(skillBonus);
  return (
    <MechGroup title={t("workshop.homebrew.itemMagic.checks.title")} summary={[num(checks.bonus) ? `+${num(checks.bonus)} ${t("workshop.homebrew.itemMagic.checks.every")}` : "", ...bonused.map((skill) => `+${skillBonus[skill]} ${t(`workshop.homebrew.skill.${skill}`)}`), list(checks.advantage).length ? `${t("workshop.homebrew.itemMagic.checks.advantage")}: ${list(checks.advantage).map((skill) => t(`workshop.homebrew.skill.${skill}`)).join(", ")}` : ""].filter(Boolean).join(", ") || t("workshop.homebrew.itemMagic.checks.nothing")} open={Object.keys(checks).length > 0}>
      <NumberField label={t("workshop.homebrew.itemMagic.checks.every")} value={num(checks.bonus)} min={-5} max={5} onChange={(bonus) => put({ bonus: optional(bonus) })} />
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.itemMagic.checks.skillBonus")}</span>
        <ToggleChips options={SKILL_IDS} labels={Object.fromEntries(SKILL_IDS.map((id) => [id, t(`workshop.homebrew.skill.${id}`)]))} selected={bonused} onChange={(next) => put({ skillBonus: clean(Object.fromEntries(next.map((skill) => [skill, skillBonus[skill] ?? 2]))) })} />
      </div>
      {bonused.map((skill) => (
        <NumberField key={skill} label={t(`workshop.homebrew.skill.${skill}`)} value={skillBonus[skill]} min={-10} max={10} onChange={(value) => put({ skillBonus: clean({ ...skillBonus, [skill]: value === "" ? undefined : value }) })} />
      ))}
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.itemMagic.checks.advantage")}</span>
        <ToggleChips options={SKILL_IDS} labels={Object.fromEntries(SKILL_IDS.map((id) => [id, t(`workshop.homebrew.skill.${id}`)]))} selected={list(checks.advantage)} onChange={(next) => put({ advantage: next.length ? next : undefined })} />
      </div>
    </MechGroup>
  );
}

export function AttunementBlock({ data, set }: Props) {
  const t = useT();
  const rule = sub(data.attunedBy);
  const classes = list(rule.classes);
  const put = (patch: Mech) => {
    const next = { ...rule, ...patch };
    const who = [
      ...list(next.classes).map((name) => `a ${name}`),
      next.spellcaster ? "a spellcaster" : "",
      next.race ? `a ${String(next.race)}` : "",
      next.alignment ? `a creature of ${String(next.alignment)} alignment` : "",
    ].filter(Boolean);
    set({ attunedBy: who.length ? clean({ ...next, text: who.join(" or ") }) : undefined });
  };
  return (
    <MechGroup title={t("workshop.homebrew.itemMagic.attunement.title")} summary={[String(rule.text ?? ""), data.cursed ? t("workshop.homebrew.itemMagic.attunement.cursed") : "", data.carried ? t("workshop.homebrew.itemMagic.attunement.worksPack") : ""].filter(Boolean).join(", ") || t("workshop.homebrew.itemMagic.attunement.anyone")} open={Boolean(data.attunedBy || data.cursed || data.carried)}>
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.itemMagic.attunement.onlyClasses")}</span>
        <ToggleChips options={CLASS_WORDS} labels={Object.fromEntries(CLASS_WORDS.map((id) => [id, t(`workshop.homebrew.class.ui.name.${id}`)]))} selected={classes} onChange={(next) => put({ classes: next.length ? next : undefined })} />
      </div>
      <div className="flex items-end pb-1">
        <CheckField label={t("workshop.homebrew.itemMagic.attunement.spellcaster")} checked={rule.spellcaster === true} onChange={(on) => put({ spellcaster: on || undefined })} />
      </div>
      <TextField label={t("workshop.homebrew.itemMagic.attunement.race")} value={String(rule.race ?? "")} onChange={(race) => put({ race: race || undefined })} placeholder="dwarf" maxLength={40} />
      <TextField label={t("workshop.homebrew.itemMagic.attunement.alignment")} value={String(rule.alignment ?? "")} onChange={(alignment) => put({ alignment: alignment || undefined })} placeholder="good" maxLength={40} />
      <div className="col-span-2 flex flex-wrap items-end gap-3 pb-1 sm:col-span-4">
        <CheckField label={t("workshop.homebrew.itemMagic.attunement.cursed.hint")} checked={data.cursed === true} onChange={(on) => set({ cursed: on || undefined })} />
        <CheckField label={t("workshop.homebrew.itemMagic.attunement.carried")} checked={data.carried === true} onChange={(on) => set({ carried: on || undefined })} />
      </div>
    </MechGroup>
  );
}
