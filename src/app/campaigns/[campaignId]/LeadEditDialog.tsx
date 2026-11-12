"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { returnFocus } from "@/components/ui/return-focus";
import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { offerCorrectionReason } from "@/lib/correction-offer";
import { ui } from "@/lib/ui";
import { GameIcon } from "@/components/ui/GameIcon";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { SectionHead } from "@/components/ui/SectionHead";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import { KitButton, PanelError } from "./PanelKit";
import { GiveStats, useUnknownGear } from "./GiveStats";
import {
  ChipList,
  ItemFlags,
  SlotSteppers,
  editedSpellSlots,
  equipmentFrom,
  highestStoredSlot,
  itemRowsOf,
  levelMeta,
  spellListOf,
  syncCasterLists,
  type ItemRow,
  type SlotEdits,
} from "./LeadEditParts";
import { coinCorrection, coinFields, earnedExpertise, expertiseOverCap, EXPERTISE_MAX, OLDER_HOST_EXPERTISE_MAX, skillLevelsOf, trainingFrom, type SkillLevel } from "./lead-edit-logic";
import { acBreakdownFor, effectiveAcFor, SRD_SKILLS } from "@/lib/srd";

import { isCantripName } from "@/lib/srd/spell-lists";
import { spellStyleFor } from "@/lib/srd/spell-prep";
import MultiContentPicker from "@/app/characters/builder/MultiContentPicker";
import { ABILITIES, type Ability, type CharacterSheet, type Proficiencies } from "@/lib/schemas/sheet";
import { hostOffers, useCapabilities } from "@/lib/use-capabilities";

// Party lead correction of any character's numbers, scores, training, items
// and spells, for
// when the AI DM gets something wrong. Server clamps values and writes an
// audit entry.
export function LeadEditDialog({
  campaignId,
  sheet,
  onClose,
}: {
  campaignId: string;
  sheet: CharacterSheet;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const abilityNames: Record<Ability, string> = {
    str: t("campaign.session.leadEdit.ability.str"),
    dex: t("campaign.session.leadEdit.ability.dex"),
    con: t("campaign.session.leadEdit.ability.con"),
    int: t("campaign.session.leadEdit.ability.int"),
    wis: t("campaign.session.leadEdit.ability.wis"),
    cha: t("campaign.session.leadEdit.ability.cha"),
  };
  const abilityShort: Record<Ability, string> = {
    str: t("campaign.session.leadEdit.ability.short.str"),
    dex: t("campaign.session.leadEdit.ability.short.dex"),
    con: t("campaign.session.leadEdit.ability.short.con"),
    int: t("campaign.session.leadEdit.ability.short.int"),
    wis: t("campaign.session.leadEdit.ability.short.wis"),
    cha: t("campaign.session.leadEdit.ability.short.cha"),
  };
  const skillNames: Record<string, string> = {
    acrobatics: t("campaign.session.leadEdit.skill.acrobatics"),
    animal_handling: t("campaign.session.leadEdit.skill.animalHandling"),
    arcana: t("campaign.session.leadEdit.skill.arcana"),
    athletics: t("campaign.session.leadEdit.skill.athletics"),
    deception: t("campaign.session.leadEdit.skill.deception"),
    history: t("campaign.session.leadEdit.skill.history"),
    insight: t("campaign.session.leadEdit.skill.insight"),
    intimidation: t("campaign.session.leadEdit.skill.intimidation"),
    investigation: t("campaign.session.leadEdit.skill.investigation"),
    medicine: t("campaign.session.leadEdit.skill.medicine"),
    nature: t("campaign.session.leadEdit.skill.nature"),
    perception: t("campaign.session.leadEdit.skill.perception"),
    performance: t("campaign.session.leadEdit.skill.performance"),
    persuasion: t("campaign.session.leadEdit.skill.persuasion"),
    religion: t("campaign.session.leadEdit.skill.religion"),
    sleight_of_hand: t("campaign.session.leadEdit.skill.sleightOfHand"),
    stealth: t("campaign.session.leadEdit.skill.stealth"),
    survival: t("campaign.session.leadEdit.skill.survival"),
  };
  const skillLevelOptions: Array<{ value: SkillLevel; label: string }> = [
    { value: "none", label: t("campaign.session.leadEdit.skillLevel.none") },
    { value: "trained", label: t("campaign.session.leadEdit.skillLevel.trained") },
    { value: "expert", label: t("campaign.session.leadEdit.skillLevel.expert") },
  ];
  const spellMeta = (entry: { level?: number }) => levelMeta(entry, {
    cantrip: t("campaign.session.leadEdit.spell.cantrip"),
    level: (value) => t("campaign.session.leadEdit.spell.level", { level: value }),
  });
  const heldText = (line: string) => {
    const resource = line.match(/^(.+) has ([0-9]+), so ([0-9]+) are spent, not ([0-9]+)$/);
    if (resource) {
      return t("campaign.session.leadEdit.held.resource", { name: resource[1], max: resource[2], used: resource[4] });
    }
    const classDice = line.match(/^(.+) has ([0-9]+) hit dice, so ([0-9]+) are spent, not ([0-9]+)$/);
    if (classDice) {
      return t("campaign.session.leadEdit.held.classHitDice", { name: classDice[1], count: classDice[2], used: classDice[4] });
    }
    const hitDice = line.match(/^there are ([0-9]+) hit dice, so ([0-9]+) are spent, not ([0-9]+)$/);
    if (hitDice) {
      return t("campaign.session.leadEdit.held.hitDice", { count: hitDice[1], used: hitDice[3] });
    }
    const slots = line.match(/^there are ([0-9]+) level ([0-9]+) slots, so ([0-9]+) are spent, not ([0-9]+)$/);
    if (slots) {
      return t("campaign.session.leadEdit.held.slots", { max: slots[1], level: slots[2], used: slots[4] });
    }
    const pactSlots = line.match(/^there are ([0-9]+) pact slots, so ([0-9]+) are spent, not ([0-9]+)$/);
    if (pactSlots) {
      return t("campaign.session.leadEdit.held.pactSlots", { max: pactSlots[1], used: pactSlots[3] });
    }
    return t("campaign.session.leadEdit.held.generic");
  };
  const [currentHp, setCurrentHp] = useState(String(sheet.currentHp));
  const [tempHp, setTempHp] = useState(String(sheet.tempHp));
  const [maxHp, setMaxHp] = useState(String(sheet.maxHp));
  const [ac, setAc] = useState(String(sheet.ac));
  // A pinned armor class stays where a person put it; unpinned, the armor
  // engine sets it from what is worn on every write. The lead can hand a
  // pinned one back (U:UC7), which before this could never be undone.
  const [pinned, setPinned] = useState(sheet.acOverride);
  // What the armor engine would set, for the switch's label.
  const derived = acBreakdownFor({ ...sheet, classes: sheet.classes.length ? sheet.classes : undefined });
  // What attacks would face with the draft as it stands, Shield and Haste included.
  const facing = effectiveAcFor({ ...sheet, ac: pinned ? Number(ac) || 0 : derived.ac, acOverride: pinned });
  // Lines the server held when it saved (a counter cannot hold more spent
  // than it has); shown before the dialog closes (U:UC12).
  const [held, setHeld] = useState<string[]>([]);
  const [gold, setGold] = useState(String(coinFields(sheet).gold));
  const [silver, setSilver] = useState(String(coinFields(sheet).silver));
  const [copper, setCopper] = useState(String(coinFields(sheet).copper));
  const [xp, setXp] = useState(String(sheet.xp));
  const [conditions, setConditions] = useState(sheet.conditions.join(", "));
  const [items, setItems] = useState<ItemRow[]>(() => itemRowsOf(sheet.equipment));
  const [prepared, setPrepared] = useState<string[]>(sheet.spellcasting?.prepared ?? []);
  const [known, setKnown] = useState<string[]>(sheet.spellcasting?.known ?? []);
  const [cantrips, setCantrips] = useState<string[]>(sheet.spellcasting?.cantrips ?? []);
  const [pending, setPending] = useState<string[]>(sheet.spellcasting?.pending ?? []);
  // Which lists this class actually uses (src/lib/srd/spell-prep.ts), so the
  // dialog never offers a cleric a "known" list or a bard a "prepared" one.
  // Anything already on the sheet stays editable whatever the class says.
  const style = spellStyleFor(sheet.class);
  // The list and the level the pickers search: the class's own list (the
  // wizard's for a third caster) up to the highest slot the sheet stores.
  const listClass = spellListOf(sheet);
  const topLevel = String(highestStoredSlot(sheet.spellcasting));
  // A wizard's prepared spells are in the book even on a sheet written
  // before the book was kept.
  const [spellbook, setSpellbook] = useState<string[]>(() =>
    style === "spellbook" && sheet.spellcasting
      ? [...new Set([...(sheet.spellcasting.spellbook ?? []), ...sheet.spellcasting.prepared])]
      : (sheet.spellcasting?.spellbook ?? []),
  );
  // A cantrip is recognised by the level its search row carries, or by name
  // for one typed in by hand.
  const isCantrip = (entry: { name: string; level?: number }) =>
    entry.level === 0 || (entry.level === undefined && isCantripName(entry.name));
  // A cantrip picked from any levelled search still lands in the cantrip
  // list; the other lists hold levelled spells only.
  const addCantrips = (entries: Array<{ name: string; level?: number }>) => {
    const picked = entries.filter(isCantrip).map((entry) => entry.name);
    if (picked.length) {
      setCantrips((list) => [...list, ...picked.filter((name) => !list.includes(name))]);
    }
  };
  const spellNamesOf = (entries: Array<{ name: string; level?: number }>) =>
    entries.filter((entry) => !isCantrip(entry)).map((entry) => entry.name);
  const pact = sheet.spellcasting?.pact;
  const [slots, setSlots] = useState<SlotEdits>(() => ({
    ...Object.fromEntries(
      Object.entries(sheet.spellcasting?.slots ?? {}).map(([level, slot]) => [
        level,
        { max: String(slot.max), used: String(slot.used) },
      ]),
    ),
    ...(pact ? { pact: { max: String(pact.max), used: String(pact.used) } } : {}),
  }));
  const [feats, setFeats] = useState<string[]>(sheet.feats);
  // Scores and training: what a GM-made companion or a model's update can
  // get wrong and nothing in play puts right.
  const [abilities, setAbilities] = useState(sheet.abilities);
  const [saves, setSaves] = useState<Ability[]>(sheet.proficiencies.saves);
  const [skillLevels, setSkillLevels] = useState(() => skillLevelsOf(sheet.proficiencies));
  const experts = Object.values(skillLevels).filter((level) => level === "expert").length;
  const earned = earnedExpertise(sheet);
  // An older host's sheet schema holds six expertise at most and refuses
  // more with its own raw message (SERVER_FEATURES moreExpertise).
  const holdsMoreExpertise = hostOffers(useCapabilities(), "moreExpertise");
  // Items the table has no stats for, each offered a workshop entry.
  const unknownGear = useUnknownGear(campaignId, sheet.id);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function setItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function splitList(raw: string): string[] {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  // The fields this correction changes, as the route takes them: what Save
  // sends, and what is lost if the dialog is left without saving.
  function correction(): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    const numbers: Array<[string, string, number]> = [
      ["currentHp", currentHp, sheet.currentHp],
      ["tempHp", tempHp, sheet.tempHp],
      ["maxHp", maxHp, sheet.maxHp],
      // An unpinned AC is the armor engine's; only a pinned one is sent.
      ...(pinned ? ([["ac", ac, sheet.ac]] as Array<[string, string, number]>) : []),
      ["xp", xp, sheet.xp],
    ];
    for (const [key, raw, previous] of numbers) {
      const value = Number(raw);
      if (Number.isFinite(value) && value !== previous) {
        patch[key] = value;
      }
    }
    Object.assign(patch, coinCorrection({ gold, silver, copper }, sheet));
    if (pinned !== sheet.acOverride) {
      patch.acOverride = pinned;
    }
    const nextConditions = splitList(conditions);
    if (nextConditions.join("|") !== sheet.conditions.join("|")) {
      patch.conditions = nextConditions;
    }
    const nextEquipment = equipmentFrom(items);
    if (JSON.stringify(nextEquipment) !== JSON.stringify(sheet.equipment)) {
      patch.equipment = nextEquipment;
    }
    if (sheet.spellcasting) {
      const nextSpellcasting: NonNullable<CharacterSheet["spellcasting"]> = {
        ...sheet.spellcasting,
        ability: sheet.spellcasting.ability,
        slots: editedSpellSlots(sheet.spellcasting.slots, slots),
        prepared,
        known,
        cantrips,
      };
      // Pact slots are one level, kept apart from the shared pool.
      if (pact) {
        const max = Math.min(4, Math.max(0, Math.round(Number(slots.pact?.max)) || 0));
        nextSpellcasting.pact = {
          level: pact.level,
          max,
          used: Math.min(max, Math.max(0, Math.round(Number(slots.pact?.used ?? "0")) || 0)),
        };
      }
      // The optional lists stay off a sheet that never had them.
      if (pending.length) {
        nextSpellcasting.pending = pending;
      } else {
        delete nextSpellcasting.pending;
      }
      if (spellbook.length || sheet.spellcasting.spellbook) {
        nextSpellcasting.spellbook = spellbook;
      }
      // A sheet that keeps per-class lists (casters) is read from them by the
      // spell book; editing only the top-level lists left the two telling
      // different stories. The edit goes into the class lists too.
      if (sheet.spellcasting.casters?.length) {
        Object.assign(
          nextSpellcasting,
          syncCasterLists(sheet.spellcasting, nextSpellcasting, sheet),
        );
      }
      if (JSON.stringify(nextSpellcasting) !== JSON.stringify(sheet.spellcasting)) {
        patch.spellcasting = nextSpellcasting;
      }
    }
    if (feats.join("|") !== sheet.feats.join("|")) {
      patch.feats = feats;
    }
    if (ABILITIES.some((ability) => abilities[ability] !== sheet.abilities[ability])) {
      patch.abilities = abilities;
    }
    const savesChanged = [...saves].sort().join("|") !== [...sheet.proficiencies.saves].sort().join("|");
    if (savesChanged || JSON.stringify(skillLevels) !== JSON.stringify(skillLevelsOf(sheet.proficiencies))) {
      patch.proficiencies = trainingFrom(sheet.proficiencies, skillLevels, ABILITIES.filter((ability) => saves.includes(ability)));
    }
    return patch;
  }
  // What the dialog would send as it opened: a sheet the dialog tidies on
  // the way (a wizard's prepared spells written into the book) is not an
  // edit until the lead makes one.
  const [opened] = useState(() => JSON.stringify(correction()));
  const unsaved = JSON.stringify(correction()) !== opened;

  function save() {
    setBusy(true);
    setError("");
    const patch: Record<string, unknown> = { reason, ...correction() };
    const over = expertiseOverCap((patch.proficiencies as Proficiencies | undefined)?.expertise?.length ?? 0, holdsMoreExpertise);
    if (over) {
      const cap = holdsMoreExpertise ? EXPERTISE_MAX : OLDER_HOST_EXPERTISE_MAX;
      setError(t(holdsMoreExpertise ? "campaign.session.leadEdit.error.expertiseCap" : "campaign.session.leadEdit.error.expertiseLegacy", { cap }));
      setBusy(false);
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/sheets/${sheet.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string; errorCode?: string; held?: string[] };
        if (!response.ok) {
          setError(data.errorCode === "CHARACTER_NOT_FOUND" ? t("campaign.session.leadEdit.error.characterNotFound") : t("campaign.session.leadEdit.error.save"));
          return;
        }
        offerCorrectionReason(campaignId, data);
        if (Array.isArray(data.held) && data.held.length) {
          setHeld(data.held);
          return;
        }
        onClose();
      } catch {
        setError(t("campaign.session.leadEdit.error.network"));
      } finally {
        setBusy(false);
      }
    })();
  }

  const field =
    cn(ui.input, "px-2.5 py-1.5");

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[#05030d]/70 backdrop-blur-sm" />
        <Dialog.Content {...returnFocus}
          className={cn(
            ui.dialog,
            "fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2 font-display text-lg tracking-wide">
              <GameIcon icon={{ kind: "glyph", key: "tab-lead" }} size="size-7" />
              <span className="gold-title">{t("campaign.session.leadEdit.title", { name: sheet.name })}</span>
            </Dialog.Title>
            <Dialog.Close aria-label={t("campaign.session.leadEdit.close")} className="pk-tap rounded p-1 text-stone-500 hover:text-amber-200 motion-nudge">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <p className="mb-3 text-xs text-stone-500">
            {t("campaign.session.leadEdit.description")}
          </p>
          <SectionHead title={t("campaign.session.leadEdit.numbers")} glyph="rest-hp" level="h3" />
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {(
              [
                [t("campaign.session.leadEdit.number.hp"), currentHp, setCurrentHp, "rest-hp"],
                [t("campaign.session.leadEdit.number.tempHp"), tempHp, setTempHp, "rest-temp-hp"],
                [t("campaign.session.leadEdit.number.maxHp"), maxHp, setMaxHp, "rest-hp"],
                // A purse holds no fewer than none of a coin: stepping
                // Silver below 0 showed "-1" and saved as nothing.
                [t("campaign.session.leadEdit.number.gold"), gold, setGold, "coin-gp", 0],
                [t("campaign.session.leadEdit.number.silver"), silver, setSilver, "coin-sp", 0],
                [t("campaign.session.leadEdit.number.copper"), copper, setCopper, "coin-cp", 0],
                [t("campaign.session.leadEdit.number.xp"), xp, setXp, "rest-xp"],
              ] as Array<[string, string, (value: string) => void, string, number?]>
            ).map(([label, value, setter, glyph, min]) => (
              <div key={label} className="space-y-1">
                <span className="flex items-center gap-1 text-stone-400">
                  <GameIcon icon={{ kind: "glyph", key: glyph }} size="size-4" /> {label}
                </span>
                <NumberStepper size="sm" value={Number(value) || 0} min={min} onChange={(next) => setter(String(next))} label={label} />
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1.5 rounded-lg border border-stone-700/50 bg-stone-950/40 p-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-stone-400">
                <GameIcon icon={{ kind: "glyph", key: "rest-ac" }} size="size-4" /> {t("campaign.session.leadEdit.ac.short")}
              </span>
              <Switch on={pinned} onChange={setPinned} label={t("campaign.session.leadEdit.ac.pin")} />
            </div>
            {pinned ? (
              <div className="reveal flex flex-wrap items-center gap-2">
                <NumberStepper size="sm" value={Number(ac) || 0} min={1} max={40} onChange={(next) => setAc(String(next))} label={t("campaign.session.leadEdit.ac.short")} />
                <span className="text-[11px] text-stone-500">
                  {t("campaign.session.leadEdit.ac.pinned", { armor: derived.ac })}
                </span>
              </div>
            ) : (
              <p className="reveal text-[11px] text-stone-400">
                {t("campaign.session.leadEdit.ac.automatic", { ac: derived.ac })}
                {derived.parts.length ? ` (${derived.parts.join(", ")})` : ""}
              </p>
            )}
            {facing !== (pinned ? Number(ac) : derived.ac) ? (
              <p className="live-in text-[11px] text-sky-300/90">
                {t("campaign.session.leadEdit.ac.facing", { ac: facing })}
              </p>
            ) : null}
          </div>
          <label className="mt-2 block space-y-1 text-xs">
            <span className="text-stone-400">{t("campaign.session.leadEdit.conditions.label")}</span>
            <input
              value={conditions}
              onChange={(event) => setConditions(event.target.value)}
              placeholder={t("campaign.session.leadEdit.conditions.placeholder")}
              className={field}
            />
          </label>

          <div className="mt-3 space-y-2 text-xs">
            <SectionHead title={t("campaign.session.leadEdit.scoresAndTraining")} glyph="rest-level-up" level="h3" />
            <div className="grid grid-cols-3 gap-2">
              {ABILITIES.map((ability) => (
                <div key={ability} className="space-y-1">
                  <span className="text-stone-400">{abilityNames[ability]}</span>
                  <NumberStepper
                    size="sm"
                    value={abilities[ability]}
                    min={1}
                    max={30}
                    onChange={(next) => setAbilities((scores) => ({ ...scores, [ability]: next }))}
                    label={abilityNames[ability]}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <span className="text-stone-400">{t("campaign.session.leadEdit.savingThrows")}</span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
                {ABILITIES.map((ability) => (
                  // The whole row is the switch's label, a finger's height
                  // on a phone (pk-tap), where the switch alone is 24 px.
                  <label key={ability} className="pk-tap flex items-center gap-2">
                    <Switch
                      on={saves.includes(ability)}
                      onChange={(on) => setSaves((list) => (on ? [...list, ability] : list.filter((entry) => entry !== ability)))}
                      label={t("campaign.session.leadEdit.savingThrowLabel", { ability: abilityNames[ability] })}
                    />
                    <span className="text-stone-300">{abilityNames[ability]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="flex items-baseline justify-between gap-2 text-stone-400">
                {t("campaign.session.leadEdit.skills")}
                <span className="text-[11px] text-stone-500">
                  {t("campaign.session.leadEdit.expertise.summary", { count: experts, earned: earned || t("campaign.session.leadEdit.expertise.none") })}
                </span>
              </span>
              <ul className="divide-y divide-stone-800/60">
                {SRD_SKILLS.map((skill) => (
                  <li key={skill.id} className="flex items-center justify-between gap-2 py-1">
                    <span className="min-w-0 text-stone-200">
                      {skillNames[skill.id] ?? skill.name} <span className="text-stone-500">{abilityShort[skill.ability]}</span>
                    </span>
                    <SegmentedControl
                      options={skillLevelOptions}
                      value={skillLevels[skill.id] ?? "none"}
                      onChange={(level) => setSkillLevels((levels) => ({ ...levels, [skill.id]: level }))}
                      size="sm"
                      label={skillNames[skill.id] ?? skill.name}
                      className="shrink-0"
                      optionClassName="pointer-coarse:min-h-10"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-xs">
            <SectionHead title={t("campaign.session.leadEdit.items")} glyph="tab-loot" level="h3" aside={items.length || null} />
            {items.map((row, index) => (
              <div key={index} className="live-in space-y-0.5">
              <div className="flex items-center gap-2">
                <GameIcon icon={{ kind: "item", key: row.name, family: "item-gear" }} size="size-6" className="shrink-0" />
                {row.base.slug ? (
                  <span className={cn(field, "truncate")}>{row.name}</span>
                ) : (
                  <input
                    value={row.name}
                    onChange={(event) => setItem(index, { name: event.target.value })}
                    placeholder={t("campaign.session.leadEdit.itemName")}
                    className={field}
                  />
                )}
                <NumberStepper size="sm" min={1} value={Number(row.qty) || 1} onChange={(next) => setItem(index, { qty: String(next) })} label={t("campaign.session.leadEdit.quantityLabel", { name: row.name || t("campaign.session.leadEdit.item") })} className="shrink-0" />
                <KitButton tone="iconDanger" always onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))} className="shrink-0" aria-label={t("campaign.session.leadEdit.removeItem")}>
                  <Trash2 className="size-4" />
                </KitButton>
              </div>
              <ItemFlags item={row.base} />
              <GiveStats name={row.base.name} gear={unknownGear} unsaved={unsaved} />
              </div>
            ))}
            <div className="mt-1">
              <MultiContentPicker
                kind="items"
                placeholder={t("campaign.session.leadEdit.searchItems")}
                selectedNames={items.map((row) => row.name)}
                onAdd={(entries) =>
                  setItems((rows) => [
                    ...rows,
                    ...entries.map((entry) => ({
                      name: entry.name,
                      qty: "1",
                      base: { name: entry.name, qty: 1, ...(entry.slug ? { slug: entry.slug } : {}) },
                    })),
                  ])
                }
                renderMeta={(entry) =>
                  [entry.kind, entry.rarity ?? entry.cost].filter(Boolean).join(" · ")
                }
              />
            </div>
          </div>

          {sheet.spellcasting ? (
            <div className="reveal mt-3 space-y-2 text-xs">
              <SectionHead title={t("campaign.session.leadEdit.spells")} glyph="rest-spell-slot" level="h3" />
              <div className="space-y-1">
                <span className="eyebrow text-[10px] text-amber-400/80">{t("campaign.session.leadEdit.spell.cantrips")}</span>
                <ChipList
                  values={cantrips}
                  onRemove={(value) =>
                    setCantrips((list) => list.filter((entry) => entry !== value))
                  }
                />
                <MultiContentPicker
                  kind="spells"
                  extraParams={{ class: listClass, level: "0" }}
                  placeholder={t("campaign.session.leadEdit.spell.searchCantrips")}
                  selectedNames={cantrips}
                  onAdd={(entries) => addCantrips(entries)}
                  renderMeta={() => t("campaign.session.leadEdit.spell.cantrip")}
                />
              </div>
              {style === "known" || known.length ? (
              <div className="space-y-1">
                <span className="eyebrow text-[10px] text-amber-400/80">{t("campaign.session.leadEdit.spell.known")}</span>
                <ChipList
                  values={known}
                  onRemove={(value) => setKnown((list) => list.filter((entry) => entry !== value))}
                />
                <MultiContentPicker
                  kind="spells"
                  extraParams={{ class: listClass, level: topLevel }}
                  placeholder={t("campaign.session.leadEdit.spell.searchKnown")}
                  selectedNames={known}
                  onAdd={(entries) => {
                    addCantrips(entries);
                    setKnown((list) => [...list, ...spellNamesOf(entries)]);
                  }}
                  renderMeta={spellMeta}
                />
              </div>
              ) : null}
              {style === "spellbook" || spellbook.length ? (
                <div className="space-y-1">
                  <span className="eyebrow text-[10px] text-amber-400/80">{t("campaign.session.leadEdit.spell.spellbook")}</span>
                  <ChipList
                    values={spellbook}
                    onRemove={(value) => {
                      setSpellbook((list) => list.filter((entry) => entry !== value));
                      setPrepared((list) => list.filter((entry) => entry !== value));
                    }}
                  />
                  <MultiContentPicker
                    kind="spells"
                    extraParams={{ class: listClass, level: topLevel }}
                    placeholder={t("campaign.session.leadEdit.spell.searchSpellbook")}
                    selectedNames={spellbook}
                    onAdd={(entries) => {
                      addCantrips(entries);
                      setSpellbook((list) => [...list, ...spellNamesOf(entries)]);
                    }}
                    renderMeta={spellMeta}
                  />
                </div>
              ) : null}
              {style !== "known" || prepared.length ? (
              <div className="space-y-1">
                <span className="eyebrow text-[10px] text-amber-400/80">{t("campaign.session.leadEdit.spell.prepared")}</span>
                <ChipList
                  values={prepared}
                  onRemove={(value) =>
                    setPrepared((list) => list.filter((entry) => entry !== value))
                  }
                />
                <MultiContentPicker
                  kind="spells"
                  extraParams={{ class: listClass, level: topLevel }}
                  placeholder={t("campaign.session.leadEdit.spell.searchPrepared")}
                  selectedNames={prepared}
                  onAdd={(entries) => {
                    addCantrips(entries);
                    const names = spellNamesOf(entries);
                    setPrepared((list) => [...list, ...names]);
                    // A wizard's prepared spell is written in the book too.
                    if (style === "spellbook") {
                      setSpellbook((list) => [...list, ...names.filter((name) => !list.includes(name))]);
                    }
                  }}
                  renderMeta={spellMeta}
                />
              </div>
              ) : null}
              {pending.length ? (
                <div className="space-y-1">
                  <span className="eyebrow text-[10px] text-sky-300/80">{t("campaign.session.leadEdit.spell.pending")}</span>
                  <ChipList
                    values={pending}
                    onRemove={(value) => setPending((list) => list.filter((entry) => entry !== value))}
                  />
                </div>
              ) : null}
              <SlotSteppers levels={[...Object.keys(sheet.spellcasting.slots), ...(pact ? ["pact"] : [])]} slots={slots} onChange={setSlots} />
            </div>
          ) : null}

          <div className="mt-3 space-y-1 text-xs">
            <SectionHead title={t("campaign.session.leadEdit.feats")} glyph="rest-level-up" level="h3" aside={feats.length || null} />
            <ChipList
              values={feats}
              onRemove={(value) => setFeats((list) => list.filter((entry) => entry !== value))}
            />
            <MultiContentPicker
              kind="feats"
              placeholder={t("campaign.session.leadEdit.searchFeats")}
              selectedNames={feats}
              onAdd={(entries) =>
                setFeats((list) => [...list, ...entries.map((entry) => entry.name)])
              }
            />
          </div>
          <label className="mt-2 block space-y-1 text-xs">
            <span className="text-stone-400">{t("campaign.session.leadEdit.reason.label")}</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
              placeholder={t("campaign.session.leadEdit.reason.placeholder")}
              className={field}
            />
          </label>
          {error ? <PanelError className="mt-2">{error}</PanelError> : null}
          {held.length ? (
            <div role="status" className="reveal mt-2 space-y-1 rounded-lg border border-amber-500/30 bg-amber-950/20 p-2 text-xs text-amber-100">
              <p>{t("campaign.session.leadEdit.held.title")}</p>
              <ul className="stagger list-disc space-y-0.5 pl-4 text-amber-200/90">
                {held.map((line) => (
                  <li key={line}>{heldText(line)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            {held.length ? (
              <KitButton tone="primary" onClick={onClose} className="h-10 px-4 text-[13px]">
                {t("campaign.session.leadEdit.done")}
              </KitButton>
            ) : (
              <>
                <button type="button" onClick={onClose} className={ui.btnSmall}>
                  {t("campaign.session.leadEdit.cancel")}
                </button>
                <KitButton tone="primary" onClick={save} disabled={busy} busy={busy} className="h-10 px-4 text-[13px]">
                  {t("campaign.session.leadEdit.save")}
                </KitButton>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
