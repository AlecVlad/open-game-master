"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { CONDITIONS } from "@/lib/bestiary/kit";
import { CREATURE_TYPES } from "@/lib/bestiary/creature-type";
import { checkSpellMech } from "@/lib/homebrew/spell-mech-schema";
import { CheckField, NumberField, SelectField, TextField, ToggleChips } from "@/app/workshop/homebrew/fields";
import { DAMAGE_TYPES } from "@/app/workshop/homebrew/types";
import { ABILITY_OPTIONS, MechGroup, clean, list, num, sub, type Mech, type MechProps } from "@/app/workshop/homebrew/MechGroup";

// The rarer groups of a spell's block: what a failed save does besides
// damage, a buff's numbers, healing and revival, an aura, a hit point pool,
// and the whole block as text for whatever the form has no field for.

const CREATURE_WORDS = CREATURE_TYPES.map((type) => type as string);
const BUFF_WORDS = ["blessed", "hasted", "shielded", "invisible", "inspired", "aided", "heroic", "warded"];

export function RidersGroup({ mech, setMech }: MechProps) {
  const t = useT();
  const riders = sub(mech.riders);
  const set = (patch: Mech) => setMech({ riders: clean({ ...riders, ...patch }) });
  const summary = [
    riders.pushFeet ? t("workshop.homebrew.mech.riders.pushSummary", { feet: num(riders.pushFeet) }) : "",
    riders.losesAction ? t("workshop.homebrew.mech.riders.actionSummary") : "",
    riders.disintegrates ? t("workshop.homebrew.mech.riders.disintegratesSummary") : "",
    riders.concentrationSave ? t("workshop.homebrew.mech.riders.concentrationSummary") : "",
    riders.hpFloor !== undefined ? t("workshop.homebrew.mech.riders.hpSummary") : "",
    riders.damageIgnoresSave ? t("workshop.homebrew.mech.riders.damageSummary") : "",
  ].filter(Boolean).join(", ");
  return (
    <MechGroup title={t("workshop.homebrew.mech.riders.title")} summary={summary || t("workshop.homebrew.mech.riders.none")} open={Object.keys(riders).length > 0}>
      <NumberField label={t("workshop.homebrew.mech.riders.pushed")} value={riders.pushFeet === undefined ? "" : num(riders.pushFeet)} min={0} max={120} step={5} onChange={(pushFeet) => set({ pushFeet: pushFeet === "" ? undefined : pushFeet })} />
      <NumberField label={t("workshop.homebrew.mech.riders.hpFloor")} value={riders.hpFloor === undefined ? "" : num(riders.hpFloor)} min={0} max={1000} onChange={(hpFloor) => set({ hpFloor: hpFloor === "" ? undefined : hpFloor })} hint={t("workshop.homebrew.mech.riders.hpFloorHint")} />
      <div className="col-span-2 flex flex-wrap items-end gap-3 pb-1">
        <CheckField label={t("workshop.homebrew.mech.riders.action")} checked={riders.losesAction === true} onChange={(on) => set({ losesAction: on || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.riders.shrinkHp")} checked={riders.shrinksMaxHp === true} onChange={(on) => set({ shrinksMaxHp: on || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.riders.concentration")} checked={riders.concentrationSave === "con"} onChange={(on) => set({ concentrationSave: on ? "con" : undefined })} />
        <CheckField label={t("workshop.homebrew.mech.riders.disintegrates")} checked={riders.disintegrates === true} onChange={(on) => set({ disintegrates: on || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.riders.advantage")} checked={riders.advantageInFight === true} onChange={(on) => set({ advantageInFight: on || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.riders.damage")} checked={riders.damageIgnoresSave === true} onChange={(on) => set({ damageIgnoresSave: on || undefined })} />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.riders.disadvantage")}</span>
        <ToggleChips options={CREATURE_WORDS} selected={list(riders.saveDisadvantageFor)} onChange={(next) => set({ saveDisadvantageFor: next.length ? next : undefined })} />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.riders.maxDamage")}</span>
        <ToggleChips options={CREATURE_WORDS} selected={list(riders.maxDamageFor)} onChange={(next) => set({ maxDamageFor: next.length ? next : undefined })} />
      </div>
    </MechGroup>
  );
}

export function BuffGroup({ mech, setMech }: MechProps) {
  const t = useT();
  const buff = sub(mech.buff);
  const tempHp = sub(buff.tempHp);
  const maxHp = sub(buff.maxHp);
  const set = (patch: Mech) => setMech({ buff: clean({ target: "self", rounds: 10, ...buff, ...patch }) });
  return (
    <MechGroup title={t("workshop.homebrew.mech.buff.title")} summary={buff.condition ? t("workshop.homebrew.mech.buff.summary", { condition: String(buff.condition), target: t(`workshop.homebrew.mech.buff.${String(buff.target ?? "self")}`), rounds: num(buff.rounds, 10) }) : t("workshop.homebrew.mech.buff.none")} open>
      <TextField label={t("workshop.homebrew.mech.buff.condition")} value={String(buff.condition ?? "")} onChange={(condition) => set({ condition: condition || undefined })} suggestions={[...BUFF_WORDS, ...CONDITIONS]} maxLength={40} />
      <SelectField label={t("workshop.homebrew.mech.buff.target")} value={String(buff.target ?? "self")} options={[{ value: "self", label: t("workshop.homebrew.mech.buff.self") }, { value: "ally", label: t("workshop.homebrew.mech.buff.ally") }, { value: "allies", label: t("workshop.homebrew.mech.buff.allies") }]} onChange={(target) => set({ target })} />
      <NumberField label={t("workshop.homebrew.mech.buff.rounds")} value={num(buff.rounds, 10)} min={1} max={144000} onChange={(rounds) => set({ rounds: rounds === "" ? 10 : rounds })} />
      <div className="flex items-end pb-1">
        <CheckField label={t("workshop.homebrew.mech.buff.tempEachTurn")} checked={buff.tempHpEachTurn === true} onChange={(on) => set({ tempHpEachTurn: on || undefined })} />
      </div>
      <NumberField label={t("workshop.homebrew.mech.buff.tempHp")} value={tempHp.base === undefined ? "" : num(tempHp.base)} min={0} max={500} onChange={(base) => set({ tempHp: base === "" ? undefined : clean({ ...tempHp, base }) })} />
      <TextField label={t("workshop.homebrew.mech.buff.tempDice")} value={String(tempHp.dice ?? "")} onChange={(dice) => set({ tempHp: clean({ base: num(tempHp.base), ...tempHp, dice: dice || undefined }) })} placeholder="1d4" maxLength={40} />
      <NumberField label={t("workshop.homebrew.mech.buff.maxHp")} value={maxHp.base === undefined ? "" : num(maxHp.base)} min={0} max={500} onChange={(base) => set({ maxHp: base === "" ? undefined : clean({ ...maxHp, base }) })} hint={t("workshop.homebrew.mech.buff.maxHpHint")} />
      <NumberField label={t("workshop.homebrew.mech.buff.morePerSlot")} value={maxHp.perSlotLevel === undefined ? "" : num(maxHp.perSlotLevel)} min={0} max={100} onChange={(perSlotLevel) => set({ maxHp: maxHp.base === undefined ? undefined : clean({ ...maxHp, perSlotLevel: perSlotLevel === "" ? undefined : perSlotLevel }) })} />
    </MechGroup>
  );
}

export function HealGroup({ mech, setMech }: MechProps) {
  const t = useT();
  const healing = sub(mech.healing);
  const revive = sub(mech.revive);
  const cures = sub(mech.cures);
  const has = Boolean(mech.healing || mech.healPool || mech.revive || mech.cures || mech.dispel || mech.regainEachTurn || mech.maxHpDice);
  const summary = [
    healing.flat ? t("workshop.homebrew.mech.heal.sumFlat", { amount: num(healing.flat) }) : "",
    mech.healPool ? t("workshop.homebrew.mech.heal.sumPool", { amount: num(mech.healPool) }) : "",
    revive.hp ? t("workshop.homebrew.mech.heal.sumRevive") : "",
    list(cures.conditions).length ? `${t("workshop.homebrew.mech.heal.sumEnds")}: ${list(cures.conditions).join("/")}` : "",
    mech.dispel ? t("workshop.homebrew.mech.heal.sumDispel") : "",
  ].filter(Boolean).join(", ");
  return (
    <MechGroup title={t("workshop.homebrew.mech.heal.title")} summary={summary || t("workshop.homebrew.mech.heal.fromProse")} open={has}>
      <NumberField label={t("workshop.homebrew.mech.heal.flat")} value={healing.flat === undefined ? "" : num(healing.flat)} min={1} max={1000} onChange={(flat) => setMech({ healing: flat === "" ? undefined : clean({ ...healing, flat }) })} hint={t("workshop.homebrew.mech.heal.flatHint")} />
      <NumberField label={t("workshop.homebrew.mech.heal.morePerSlot")} value={healing.perSlotLevel === undefined ? "" : num(healing.perSlotLevel)} min={0} max={100} onChange={(perSlotLevel) => setMech({ healing: healing.flat === undefined ? undefined : clean({ ...healing, perSlotLevel: perSlotLevel === "" ? undefined : perSlotLevel }) })} />
      <NumberField label={t("workshop.homebrew.mech.heal.pool")} value={mech.healPool === undefined ? "" : num(mech.healPool)} min={1} max={2000} onChange={(healPool) => setMech({ healPool: healPool === "" ? undefined : healPool })} hint={t("workshop.homebrew.mech.heal.poolHint")} />
      <NumberField label={t("workshop.homebrew.mech.heal.regained")} value={mech.regainEachTurn === undefined ? "" : num(mech.regainEachTurn)} min={1} max={100} onChange={(regainEachTurn) => setMech({ regainEachTurn: regainEachTurn === "" ? undefined : regainEachTurn })} />
      <SelectField label={t("workshop.homebrew.mech.heal.revive")} value={String(revive.hp ?? "")} options={[{ value: "", label: t("workshop.homebrew.mech.heal.no") }, { value: "one", label: t("workshop.homebrew.mech.heal.one") }, { value: "all", label: t("workshop.homebrew.mech.heal.all") }]} onChange={(hp) => setMech({ revive: hp ? clean({ withinMinutes: 1, ...revive, hp }) : undefined })} />
      {revive.hp ? (
        <NumberField label={t("workshop.homebrew.mech.heal.minutes")} value={num(revive.withinMinutes, 1)} min={1} max={200000000} onChange={(withinMinutes) => setMech({ revive: clean({ ...revive, withinMinutes: withinMinutes === "" ? 1 : withinMinutes }) })} hint={t("workshop.homebrew.mech.heal.minutesHint")} />
      ) : null}
      <div className="col-span-2 flex flex-wrap items-end gap-3 pb-1">
        <CheckField label={t("workshop.homebrew.mech.heal.dispel")} checked={mech.dispel === true} onChange={(on) => setMech({ dispel: on || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.heal.noModifier")} checked={mech.healNoModifier === true} onChange={(on) => setMech({ healNoModifier: on || undefined })} />
        <CheckField label={t("workshop.homebrew.mech.heal.allConditions")} checked={cures.all === true} onChange={(all) => setMech({ cures: list(cures.conditions).length ? clean({ ...cures, all: all || undefined }) : undefined })} />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.heal.endsTarget")}</span>
        <ToggleChips options={[...CONDITIONS, "cursed", "diseased"]} selected={list(cures.conditions)} onChange={(next) => setMech({ cures: next.length ? clean({ ...cures, conditions: next }) : undefined })} />
      </div>
    </MechGroup>
  );
}

export function AuraGroup({ mech, setMech }: MechProps) {
  const t = useT();
  const aura = sub(mech.aura);
  const set = (patch: Mech) => setMech({ aura: clean({ radiusFeet: 15, save: "wis", dice: "3d8", baseLevel: num(mech.level, 3), type: "radiant", halfOnSave: true, ...aura, ...patch }) });
  return (
    <MechGroup title={t("workshop.homebrew.mech.aura.title")} summary={aura.dice ? `${num(aura.radiusFeet)} ft, ${String(aura.dice)} ${t(`workshop.homebrew.item.damage.${String(aura.type ?? "radiant")}`)}` : t("workshop.homebrew.mech.aura.none")} open={Boolean(mech.aura)}>
      <div className="col-span-2 flex items-end pb-1">
        <CheckField label={t("workshop.homebrew.mech.aura.damage")} checked={Boolean(mech.aura)} onChange={(on) => (on ? set({}) : setMech({ aura: undefined }))} />
      </div>
      {mech.aura ? (
        <>
          <NumberField label={t("workshop.homebrew.mech.aura.radius")} value={num(aura.radiusFeet, 15)} min={5} max={120} step={5} onChange={(radiusFeet) => set({ radiusFeet: radiusFeet === "" ? 15 : radiusFeet })} />
          <SelectField label={t("workshop.homebrew.mech.aura.save")} value={String(aura.save ?? "wis")} options={ABILITY_OPTIONS.filter((option) => option.value)} onChange={(save) => set({ save })} />
          <TextField label={t("workshop.homebrew.mech.aura.dice")} value={String(aura.dice ?? "")} onChange={(dice) => set({ dice })} maxLength={40} />
          <TextField label={t("workshop.homebrew.mech.aura.perSlot")} value={String(aura.perSlotLevel ?? "")} onChange={(perSlotLevel) => set({ perSlotLevel: perSlotLevel || undefined })} maxLength={40} />
          <SelectField label={t("workshop.homebrew.mech.aura.type")} value={String(aura.type ?? "radiant")} options={DAMAGE_TYPES.map((value) => ({ value, label: t(`workshop.homebrew.item.damage.${value}`) }))} onChange={(type) => set({ type })} />
          <div className="flex items-end pb-1">
            <CheckField label={t("workshop.homebrew.mech.aura.half")} checked={aura.halfOnSave === true} onChange={(halfOnSave) => set({ halfOnSave })} />
          </div>
        </>
      ) : null}
    </MechGroup>
  );
}

export function PoolGroup({ mech, setMech }: MechProps) {
  const t = useT();
  const pool = sub(mech.hitPointPool);
  const set = (patch: Mech) => setMech({ hitPointPool: clean({ dice: "5d8", perSlotLevel: "2d8", condition: "unconscious", rounds: 10, ...pool, ...patch }) });
  return (
    <MechGroup title={t("workshop.homebrew.mech.pool.title")} summary={pool.dice ? `${String(pool.dice)}, ${String(pool.condition ?? "")}` : t("workshop.homebrew.mech.pool.none")} open={Boolean(mech.hitPointPool)}>
      <div className="col-span-2 flex items-end pb-1">
        <CheckField label={t("workshop.homebrew.mech.pool.sleep")} checked={Boolean(mech.hitPointPool)} onChange={(on) => (on ? set({}) : setMech({ hitPointPool: undefined }))} />
      </div>
      {mech.hitPointPool ? (
        <>
          <TextField label={t("workshop.homebrew.mech.pool.dice")} value={String(pool.dice ?? "")} onChange={(dice) => set({ dice })} maxLength={40} />
          <TextField label={t("workshop.homebrew.mech.pool.perSlot")} value={String(pool.perSlotLevel ?? "")} onChange={(perSlotLevel) => set({ perSlotLevel })} maxLength={40} />
          <TextField label={t("workshop.homebrew.mech.pool.condition")} value={String(pool.condition ?? "")} onChange={(condition) => set({ condition })} suggestions={CONDITIONS} maxLength={40} />
          <NumberField label={t("workshop.homebrew.mech.pool.rounds")} value={num(pool.rounds, 10)} min={1} max={144000} onChange={(rounds) => set({ rounds: rounds === "" ? 10 : rounds })} />
          <div className="col-span-2 sm:col-span-4">
            <span className="text-[11px] text-stone-400">{t("workshop.homebrew.mech.pool.passes")}</span>
            <ToggleChips options={CREATURE_WORDS} selected={list(pool.immuneTypes)} onChange={(next) => set({ immuneTypes: next.length ? next : undefined })} />
          </div>
        </>
      ) : null}
    </MechGroup>
  );
}

// The whole block as text: every field the engine reads, for the ones the
// form has no box for (Divine Word's tiers, Flesh to Stone's tally,
// Command's words). Checked by the same schema the server keeps it by.
export function AdvancedBlock({ mech, onChange }: { mech: Mech; onChange: (next: Mech | undefined) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");
  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setText(JSON.stringify(mech, null, 2));
          setProblem("");
          setOpen((value) => !value);
        }}
        className={cn(ui.btnSmall, "px-2 py-1 text-[11px]")}
      >
        {open ? t("workshop.homebrew.mech.advanced.close") : t("workshop.homebrew.mech.advanced.edit")}
      </button>
      {open ? (
        <div className="reveal space-y-1">
          <textarea value={text} rows={10} spellCheck={false} onChange={(event) => setText(event.target.value)} className={cn(ui.input, "w-full font-mono text-[11px]")} aria-label={t("workshop.homebrew.mech.advanced.aria")} />
          {problem ? <p className="motion-shake text-[11px] text-red-400">{problem}</p> : null}
          <button
            type="button"
            onClick={() => {
              let parsed: unknown;
              try {
                parsed = JSON.parse(text);
              } catch {
                setProblem(t("workshop.homebrew.mech.advanced.invalid"));
                return;
              }
              const checked = checkSpellMech(parsed);
              if ("error" in checked) {
                setProblem(checked.error);
                return;
              }
              onChange(checked.mech as Mech);
              setOpen(false);
            }}
            className={cn(ui.btnSecondary, "text-xs")}
          >
            {t("workshop.homebrew.mech.advanced.use")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
