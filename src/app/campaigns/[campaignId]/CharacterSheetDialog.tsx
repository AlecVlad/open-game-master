"use client";

import { owedChoices } from "@/lib/srd/owed-choices";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import * as Dialog from "@radix-ui/react-dialog";
import { returnFocus } from "@/components/ui/return-focus";
import { GameIcon } from "@/components/ui/GameIcon";
import { FileDown, Minus, Plus, PawPrint, Wrench, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { CharacterPortrait, ui } from "@/lib/ui";
import { downloadCharacterSheetPdf } from "@/lib/pdf/download";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import { formatFeet, formatMeasurementText, formatPounds, type MeasurementSystem } from "@/lib/measurement-system";
import type { TableLanguage } from "@/lib/schemas/game-settings-options";
import {
  acBreakdownFor,
  computeSheetDerived,
  formatModifier,
  sizeForRace,
  type DerivedPart,
} from "@/lib/srd";
import { attunementSlotsFor } from "@/lib/srd/armor";
import { formatPrice, purseCoins, purseCopper } from "@/lib/srd/currency";
import { encumbranceFor } from "@/lib/srd/encumbrance";
import { magicItemRiders } from "@/lib/srd/magic-items";
import type { WearConflict } from "@/lib/srd/wear-slots";
import { resourceDef, resourceName } from "@/lib/srd/class-resources";
import { foretoldLeft } from "@/lib/dm/foretold-logic";
import { GameTerm } from "@/components/ui/GameTerm";
import {
  AbilityTiles,
  ConditionChips,
  EquipmentChips,
  FeatChips,
  FeatureChips,
  HpBar,
  PortraitMedallion,
  SheetBlock,
  SkillRows,
  VitalTiles, TrainingLines } from "@/components/sheet/SheetParts";
import { SheetSpells } from "@/components/sheet/SheetSpells";
import { speciesSpellsShown } from "@/lib/srd/species-spell-view";
import { SummonDoor } from "@/app/campaigns/[campaignId]/SummonDoor";
import { DefensesLine, HitDiceSpend, StateTags } from "@/components/sheet/SheetState";
import { SheetBetween } from "@/components/sheet/SheetBetween";
import { conditionDetail, hitDiceLine, itemStatus, maxHpView, speedView, wearableGear } from "@/components/sheet/sheet-state";
import { FeatureChoicePicker, OtherSpeeds } from "@/components/sheet/SheetChoices";
import { OwedPicks } from "@/components/sheet/OwedPicks";
import { SheetGearRows, type PendingWear } from "@/components/sheet/SheetGearRow";
import { LoadBreakdown } from "@/components/sheet/LoadBreakdown";
import { ResourceRow, SlotRow, STEP_BUTTON } from "@/components/sheet/SheetCounters";
import { namesLookup } from "@/lib/battlemap/condition-notes";
import { workshopClassName } from "@/lib/classes/workshop-registry";
import { StoryHopes } from "@/app/campaigns/[campaignId]/StoryHopes";
import { classWordsAfterLevel, isSplit } from "@/lib/characters/class-words";

function titleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Every resource already carries a line explaining what spending it does; it
// was written for the DM model and reads just as well for the player.
// A counter made from its id (a race's spell, a feat's free cast) is no
// row of the table: its help is read from its id too.
const resourceHelp = (id: string) => resourceDef(id)?.guidance;

// Full character sheet, opened by selecting any party member. Read-only,
// except the owner may mark counters their class actually has as spent
// (spell slots, hit dice, resource pools) and change which gear they wear or
// are attuned to, via /sheet/usage. Handing a use back is a correction, so
// those controls are drawn only for the DM and the party lead, on any sheet.
// Notes stay private to the sheet's owner.
// Every derived number's working, the way AC has always shown its own.
// computeSheetDerived returns the parts it summed, so a hover can say where a
// +7 came from without this file knowing a single rule.
function explainParts(parts: DerivedPart[]): string {
  return parts.map((part) => `${formatModifier(part.value)} ${part.label}`).join(", ");
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

type SheetTranslator = ReturnType<typeof useI18n>["t"];

function hpMaximumNote(note: string | null, t: SheetTranslator): string | null {
  if (!note) return null;
  const exhaustion = note.match(/^Hit point maximum halved by exhaustion (\d+) \((\d+) without it\)\.$/);
  if (exhaustion) return t("charSheet.hp.note.exhaustion", { level: exhaustion[1], max: exhaustion[2] });
  const gear = note.match(/^Raised by worn, attuned gear that sets Constitution \((\d+) without it\)\.$/);
  if (gear) return t("charSheet.hp.note.gear", { max: gear[1] });
  const rules = note.match(/^The rules put the maximum at (\d+) right now \((\d+) on the sheet\)\.$/);
  if (rules) return t("charSheet.hp.note.rules", { max: rules[1], sheet: rules[2] });
  return t("charSheet.hp.note.generic");
}

function usageErrorText(message: string, t: SheetTranslator, name: string): string {
  if (message === "Character not found.") return t("charSheet.error.characterNotFound");
  if (message === "You have no character in this campaign.") return t("charSheet.error.noCharacter");
  if (message === "Nothing to adjust.") return t("charSheet.error.nothingToAdjust");
  if (message === "Invalid adjustment.") return t("charSheet.error.invalidAdjustment");
  if (message.startsWith(name + " is dead and spends nothing.")) return t("charSheet.error.deadSpend");
  if (message.startsWith("Spell slots, hit dice and class features come back at rests")) return t("charSheet.error.onlySpend");
  if (message.startsWith("Hit dice are spent at the end of a short rest")) return t("charSheet.error.hitDiceRest");
  if (message.startsWith(name + " does not carry one of those items.")) return t("charSheet.error.itemMissing");
  if (message.startsWith(name + " is dead and cannot change what they wear")) return t("charSheet.error.deadGear");
  if (message.startsWith("Armor takes minutes to put on or take off")) return t("charSheet.error.armorInCombat");
  if (message.startsWith("Attuning to an item, or ending it, takes a short rest")) return t("charSheet.error.attuneInCombat");
  if (message.startsWith("Putting on or taking off a shield takes an action")) return t("charSheet.error.shieldAction");
  if (message.startsWith("Drawing, stowing or putting something on happens on")) return t("charSheet.error.gearOwnTurn");
  return t("charSheet.error.refused");
}

function timePassedText(message: string, t: SheetTranslator): string {
  return message.split(/(?<=\.)\s+/).map((line) => {
    const attune = line.match(/^Ending the attunement to (.+) takes a short rest spent with it \(1 hour\)\.$/);
    if (attune) return t("charSheet.gear.time.attunement", { name: attune[1] });
    const puttingOn = line.match(/^Putting on (.+) takes ([0-9.]+) minutes?\.$/);
    if (puttingOn) return t("charSheet.gear.time.putOn", { name: puttingOn[1], minutes: puttingOn[2] });
    const takingOff = line.match(/^Taking off (.+?)(?: with help)? takes ([0-9.]+) minutes?\.$/);
    if (takingOff) return t(line.includes(" with help ") ? "charSheet.gear.time.takeOffHelp" : "charSheet.gear.time.takeOff", { name: takingOff[1], minutes: takingOff[2] });
    return t("charSheet.gear.time.generic");
  }).join(" ");
}
export function CharacterSheetDialog({
  sheet,
  mine,
  steersStory,
  measurementSystem = "si",
  tableLanguage = "english",
  corrects = false,
  encumbranceRule = false,
  inCombat = false,
  myTurn = false,
  names = [],
  portraitFallback,
  onAdjust,
  onClose,
}: {
  sheet: CharacterSheet;
  mine: boolean;
  steersStory: boolean;
  measurementSystem?: MeasurementSystem;
  tableLanguage?: TableLanguage;
  // The viewer is the DM or the party lead: they may hand uses back, on
  // this sheet whoever owns it. A player only ever spends.
  corrects?: boolean;
  // The world pack's picture for this character's class or race, drawn
  // before the generic plate when nobody has painted a portrait.
  portraitFallback?: string | null;
  // The table's optional encumbrance rule.
  encumbranceRule?: boolean;
  // 5e timing, which the server enforces too: in a fight armor does not go
  // on or off and nothing is attuned. A shield costs the action of the turn.
  // (Hit dice belong to a short rest in or out of a fight; see below.)
  inCombat?: boolean;
  // Whether the fight's pointer rests on this character (a shield is handled
  // with the action, on their own turn).
  myTurn?: boolean;
  // Who a condition's "until X's turn" or "from X" may name: the party and
  // the enemies the viewer can see.
  names?: Array<{ id: string; name: string }>;
  onAdjust?: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const abilityLabels: Record<string, string> = {
    str: t("charSheet.ability.str"),
    dex: t("charSheet.ability.dex"),
    con: t("charSheet.ability.con"),
    int: t("charSheet.ability.int"),
    wis: t("charSheet.ability.wis"),
    cha: t("charSheet.ability.cha"),
  };
  const derived = computeSheetDerived(sheet);
  const armor = acBreakdownFor(sheet);
  const attunedCount = sheet.equipment.filter((item) => item.attuned).length;
  // Only gear worth a toggle: armor, shields, magic and anything with a
  // place on the body (src/components/sheet/sheet-state.ts wearableGear).
  const wearable = wearableGear(sheet.equipment);
  const magic = magicItemRiders(sheet.equipment, sheet);
  // Carried weight is always worth showing once the pack has weights on it;
  // the thresholds and their penalties only mean something when the table
  // turned the variant rule on.
  // The speed the server will actually let them move: armor gates the class
  // bonuses, heavy armor below its Strength minimum costs 10 feet, and a
  // heavy pack costs more when the table plays with encumbrance.
  // speedFor, then the conditions, then exhaustion: the speed the move route
  // lets them walk (src/components/sheet/sheet-state.ts).
  const speedState = speedView(sheet, { encumbrance: encumbranceRule });
  const speed = speedState.speed;
  const hp = maxHpView(sheet);
  const hpNote = hpMaximumNote(hp.note, t);
  const nameOf = namesLookup(names);
  const dead = Boolean(sheet.deathSaves?.dead);
  // The same load speedFor weighs (size and a Belt of Giant Strength count),
  // so the tile and the speed beside it agree.
  const load = encumbranceFor({
    strength: sheet.abilities.str,
    equipment: sheet.equipment,
    coins: purseCoins(sheet),
    size: sizeForRace(sheet.race),
    wearer: sheet,
  });
  const speedNote = speedState.notes.length
    ? speedState.notes.map((note) => {
        const base = note.match(/^Base (\d+) ft, (\d+) ft with what they wear and carry\.$/);
        if (base) return t("charSheet.speed.worn", { base: base[1], worn: base[2] });
        const zero = note.match(/^(.+): speed 0\.$/);
        if (zero) return t("charSheet.speed.conditionZero", { condition: zero[1] });
        const changed = note.match(/^Effects on them change it to (\d+) ft\.$/);
        if (changed) return t("charSheet.speed.changed", { speed: changed[1] });
        const tired = note.match(/^Exhaustion (\d+): (speed 0|speed halved)\.$/);
        if (tired) return t("charSheet.speed.exhaustion", {
          level: tired[1],
          effect: t(tired[2] === "speed 0" ? "charSheet.speed.zero" : "charSheet.speed.halved"),
        });
        return t("charSheet.speed.note");
      }).join(" ")
    : t("charSheet.speed.walk");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  // The Carried tile's breakdown (issue #206), drawn from the same sheet and
  // load as the tile, so a change to either redraws both.
  const [loadOpen, setLoadOpen] = useState(false);
  // The server's reason when it refuses an adjustment, shown under the
  // counters so the player knows what would be accepted.
  // It is kept beside the control that was used (the counters or the gear).
  const [refusal, setRefusal] = useState<{ text: string; at: "usage" | "gear" } | null>(null);
  // The route's line after armor went on or off outside a fight: the minutes
  // it took, already on the clock.
  const [timeNote, setTimeNote] = useState<string | null>(null);
  // Putting on what fills a full place (a second cloak) asks first: the swap,
  // or for the DM and the lead the SRD's exception (issue 412).
  const [pendingWear, setPendingWear] = useState<PendingWear | null>(null);
  const spends = mine || corrects;
  // The usage route's own refusal for a dead character's spend.
  const deadNote = dead && !corrects ? t("charSheet.error.deadNoSpend", { name: sheet.name }) : null;

  async function handleDownloadPdf() {
    setPdfBusy(true);
    try {
      await downloadCharacterSheetPdf(sheet);
    } finally {
      setPdfBusy(false);
    }
  }

  // Fire-and-forget: the sheet_updated SSE event refreshes the sheet prop,
  // so the new counts render without local reconciliation.
  async function adjustUsage(body: Record<string, unknown>, at: "usage" | "gear" = "usage") {
    setBusy(true);
    setRefusal(null);
    setTimeNote(null);
    try {
      const response = await fetch(`/api/campaigns/${sheet.campaignId}/sheet/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A correction names the sheet; a player is answered on their own.
        body: JSON.stringify({ ...body, characterId: sheet.id }),
      });
      const data = await response.json().catch(() => null);
      const conflict = data?.wearConflict as WearConflict | undefined;
      if (!response.ok && conflict?.item) {
        // The server saw a fuller place than this sheet did: ask the same way.
        setPendingWear({ name: conflict.item, conflict, change: { equipped: true } });
      } else if (!response.ok) {
        setRefusal({ text: typeof data?.error === "string" ? usageErrorText(data.error, t, sheet.name) : t("charSheet.error.refused"), at });
      } else if (typeof data?.timePassed === "string") {
        // Out of a fight armor takes minutes to put on or take off, and the
        // route moved the table's clock by them (src/lib/dm/don-doff.ts).
        setTimeNote(data.timePassed);
      }
    } catch {
      setRefusal({ text: t("charSheet.error.network"), at });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[#05030d]/70 backdrop-blur-sm" />
        <Dialog.Content {...returnFocus}
          className={cn(
            ui.dialog,
            "fixed left-1/2 top-1/2 z-50 max-h-[88dvh] w-[min(52rem,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <PortraitMedallion classId={sheet.class} level={sheet.level}>
                {sheet.portrait ? (
                  <ImageLightbox
                    src={sheet.portrait.url}
                    alt={sheet.name}
                    caption={sheet.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <CharacterPortrait
                    fallback={portraitFallback}
                    look={{ race: sheet.race, class: sheet.class, gender: sheet.gender }}
                    alt={sheet.name}
                    size="size-full"
                  />
                )}
              </PortraitMedallion>
              <div>
                <Dialog.Title className="gold-title font-display text-2xl tracking-wide">
                  {sheet.name}
                </Dialog.Title>
                <p className="text-xs text-stone-400">
                  {t("charSheet.levelLine", { level: sheet.level, race: sheet.raceLabel ?? titleCase(sheet.race) })}{" "}
                  {isSplit(sheet)
                    ? classWordsAfterLevel(sheet, (id) => workshopClassName(id) ?? titleCase(id))
                    : `${workshopClassName(sheet.class) ?? titleCase(sheet.class)}${sheet.subclass ? ` (${titleCase(sheet.subclass)})` : ""}`}
                  {sheet.background ? ` · ${sheet.backgroundLabel ?? titleCase(sheet.background)}` : ""}
                  {sheet.alignment ? ` · ${sheet.alignment}` : ""}
                </p>
              </div>
            </div>
            {/* The kit's own close button: a 40px target on phones. */}
            <Dialog.Close
              aria-label={t("charSheet.close")}
              className="pk-tap -m-1 flex shrink-0 items-center justify-center rounded-md p-2 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-1.5">
            <HpBar current={sheet.currentHp} max={hp.max} temp={sheet.tempHp ?? 0} note={hpNote} />
            <VitalTiles
              vitals={[
                {
                  glyph: "rest-ac",
                  label: <GameTerm id="armor_class">Armor class</GameTerm>,
                  value: sheet.ac,
                  title: sheet.acOverride ? t("charSheet.ac.pinned") : armor.parts.join(" + "),
                },
                {
                  glyph: "rest-speed",
                  label: t("charSheet.speed"),
                  value: formatFeet(speed, measurementSystem, tableLanguage),
                  title: formatMeasurementText([
                    speedNote,
                    ...(derived.speeds?.fly ? [t("charSheet.speed.other", { type: t("charSheet.speed.fly"), speed: derived.speeds.fly })] : []),
                    ...(derived.speeds?.swim ? [t("charSheet.speed.other", { type: t("charSheet.speed.swim"), speed: derived.speeds.swim })] : []),
                    ...(derived.speeds?.climb ? [t("charSheet.speed.other", { type: t("charSheet.speed.climb"), speed: derived.speeds.climb })] : []),
                  ].join(" "), measurementSystem, tableLanguage),
                  tone: speed < speedState.base ? "warn" : "plain",
                },
                {
                  glyph: "rest-initiative",
                  label: <GameTerm id="initiative">Initiative</GameTerm>,
                  value: formatModifier(derived.initiative),
                  title: explainParts(derived.parts.initiative),
                },
                {
                  glyph: "sense-passive-perception",
                  label: <GameTerm id="passive_perception">Passive perception</GameTerm>,
                  value: derived.passivePerception,
                  title: explainParts(derived.parts.passivePerception),
                },
                { glyph: "rest-proficiency", label: t("charSheet.prof"), value: formatModifier(derived.proficiencyBonus) },
                { glyph: "coin-gp", label: t("charSheet.coin"), value: formatPrice(purseCopper(sheet)) },
                { glyph: "rest-xp", label: t("charSheet.experience"), value: `${sheet.xp} XP` },
                {
                  glyph: `die-${sheet.hitDice.die}`,
                  label: <GameTerm id="hit_dice">Hit dice</GameTerm>,
                  // Every pool of a multiclass character, not only the first.
                  value: hitDiceLine(sheet),
                },
                {
                  glyph: "coin-purse",
                  label: t("charSheet.carried"),
                  value: formatPounds(load.carriedLb, measurementSystem, tableLanguage) + (load.unweighed ? "+" : "") + "/" + formatPounds(load.capacityLb, measurementSystem, tableLanguage),
                  tone: load.overCapacity || (encumbranceRule && load.tier !== "unencumbered") ? "warn" : "plain",
                  // Past the capacity (Strength x 15) the load can only be
                  // dragged at 5 feet, whatever the table's encumbrance rule
                  // (src/lib/dm/load-rules.ts, speedFor).
                  title: formatMeasurementText(t(
                    load.overCapacity
                      ? "charSheet.load.overCapacity"
                      : encumbranceRule
                        ? "charSheet.load.encumbered"
                        : "charSheet.load.unencumbered",
                    {
                      capacity: load.capacityLb,
                      note: load.note ? t("charSheet.load.encumbrance", { tier: load.note }) : t("charSheet.load.notEncumbered"),
                      unweighed: load.unweighed,
                      unweighedWord: load.unweighed === 1 ? t("charSheet.load.item") : t("charSheet.load.items"),
                    },
                  ), measurementSystem, tableLanguage),
                  onOpen: () => setLoadOpen(true),
                  opens: t("charSheet.load.showBreakdown"),
                },
              ]}
            />
            <LoadBreakdown
              open={loadOpen}
              onOpenChange={setLoadOpen}
              name={sheet.name}
              equipment={sheet.equipment}
              purse={sheet}
              load={load}
              measurementSystem={measurementSystem}
              tableLanguage={tableLanguage}
            />
            <OtherSpeeds speeds={derived.speeds} measurementSystem={measurementSystem} tableLanguage={tableLanguage} />
          </div>

          {sheet.wildShape ? (
            <div className="reveal mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-lime-800/60 bg-lime-950/40 px-3 py-2 text-sm text-lime-200">
              <span className="flex items-center gap-1.5 font-medium capitalize">
                <PawPrint className="size-4" /> {t("charSheet.wildShape.title", { form: sheet.wildShape.form })}
              </span>
              <span className="font-mono text-xs">
                {t("charSheet.wildShape.hp", { current: sheet.wildShape.beastHp, maximum: sheet.wildShape.beastMaxHp })}
              </span>
              <span className="font-mono text-xs">{t("charSheet.wildShape.ac", { ac: sheet.wildShape.beastAc })}</span>
              <span className="w-full text-xs text-lime-400/80">
                {t("charSheet.wildShape.damageNote", { name: sheet.name, current: sheet.currentHp, maximum: hp.max })}
              </span>
            </div>
          ) : null}

          <StateTags sheet={sheet} className="mt-2" />
          <SheetBetween sheet={sheet} className="mt-2" />
          {sheet.conditions.length ? (
            <div className="reveal mt-2">
              <ConditionChips
                conditions={sheet.conditions}
                rounds={sheet.conditionMeta}
                detail={(condition) => conditionDetail(sheet, condition, nameOf)}
              />
            </div>
          ) : null}
          <DefensesLine sheet={sheet} />

          <SheetBlock
            className="mt-4"
            title={t("charSheet.abilities")}
            aside={
              <>
                <GameTerm id="saving_throw">Saving throws</GameTerm> {t("charSheet.savingThrowsHint")}
              </>
            }
          >
            <AbilityTiles
              abilities={sheet.abilities}
              mods={derived.abilityMods}
              saves={derived.saves}
              saveProficiencies={sheet.proficiencies.saves}
              explainSave={(ability) => explainParts(derived.parts.saves[ability])}
            />
          </SheetBlock>

          <SheetBlock className="mt-4" title={<GameTerm id="skill">Skills</GameTerm>}>
            <SkillRows
              skills={derived.skills}
              proficient={sheet.proficiencies.skills}
              explain={(skillId) => explainParts(derived.parts.skills[skillId])}
            />
          </SheetBlock>

          <SheetBlock className="mt-4" title={t("charSheet.training")}>
            <TrainingLines proficiencies={sheet.proficiencies} />
          </SheetBlock>

          {sheet.spellcasting ? (
            <SheetBlock
              className="mt-4"
              title={t("charSheet.spellcasting")}
              hint={
                derived.parts.spellSaveDc.length
                  ? t("charSheet.spellcasting.hint", { save: explainParts(derived.parts.spellSaveDc), attack: explainParts(derived.parts.spellAttack) })
                  : undefined
              }
              aside={
                <>
                  {sheet.spellcasting.ability.toUpperCase()}
                  {derived.spellSaveDc ? ` · ${t("charSheet.spellcasting.dc", { dc: derived.spellSaveDc })}` : ""}
                  {derived.spellAttack !== null ? ` · ${t("charSheet.spellcasting.toHit", { modifier: formatModifier(derived.spellAttack) })}` : ""}
                </>
              }
            >
              {Object.keys(sheet.spellcasting.slots).length || sheet.spellcasting.pact ? (
                <div className="reveal space-y-1.5 text-xs text-stone-300">
                  <p className="flex items-center gap-1 text-stone-400">
                    <GameIcon icon={{ kind: "glyph", key: "rest-spell-slot" }} size="size-5" />
                    <GameTerm id="spell_slot">Spell slots</GameTerm>
                    <span className="text-stone-500">: {t("charSheet.spellSlots.remaining")}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(sheet.spellcasting.slots).map(([slotLevel, slot]) => (
                      <SlotRow
                        key={slotLevel}
                        label={t("charSheet.spellSlots.level", { level: ROMAN[Number(slotLevel)] ?? slotLevel })}
                        left={slot.max - slot.used}
                        max={slot.max}
                        spends={spends}
                        corrects={corrects}
                        busy={busy || Boolean(deadNote)}
                        onSpend={() => adjustUsage({ slots: { [slotLevel]: slot.used + 1 } })}
                        onRecover={() => adjustUsage({ slots: { [slotLevel]: slot.used - 1 } })}
                      />
                    ))}
                    {sheet.spellcasting.pact ? (
                      <SlotRow
                        label={t("charSheet.spellSlots.pact", { level: ROMAN[sheet.spellcasting.pact.level] ?? sheet.spellcasting.pact.level })}
                        left={sheet.spellcasting.pact.max - sheet.spellcasting.pact.used}
                        max={sheet.spellcasting.pact.max}
                        spends={spends}
                        corrects={corrects}
                        busy={busy || Boolean(deadNote)}
                        onSpend={() => adjustUsage({ pactUsed: (sheet.spellcasting?.pact?.used ?? 0) + 1 })}
                        onRecover={() => adjustUsage({ pactUsed: (sheet.spellcasting?.pact?.used ?? 0) - 1 })}
                      />
                    ) : null}
                  </div>
                  <p className="text-[11px] leading-snug text-stone-500">
                    {t("charSheet.spellSlots.explanation")}{" "}
                    {sheet.class === "warlock" || sheet.spellcasting.pact ? t("charSheet.spellSlots.warlockRest") + " " : ""}
                    {corrects
                      ? t("charSheet.spellSlots.dmCorrection")
                      : mine
                        ? t("charSheet.spellSlots.playerCorrection")
                        : ""}
                  </p>
                </div>
              ) : null}
              <div className="reveal mt-3">
                <SheetSpells sheet={sheet} editable={mine} />
                {/* Summoning spells cast from here, the creature picked (issue 685). */}
                <SummonDoor sheet={sheet} mine={mine} inCombat={inCombat} />
              </div>
            </SheetBlock>
          ) : null}

          {/* A character with no Spellcasting may still cast its species'
              spells (issue #833): a tiefling fighter's hellish rebuke. */}
          {!sheet.spellcasting && speciesSpellsShown(sheet).length ? (
            <SheetBlock className="mt-4" title={t("charSheet.spells")}>
              <div className="reveal">
                <SheetSpells sheet={sheet} editable={mine} />
              </div>
            </SheetBlock>
          ) : null}

          {spends || Object.keys(sheet.resources).length ? (
            <SheetBlock className="mt-4" title={t("charSheet.hitDiceAndResources")}>
              <div className="space-y-1.5 text-xs text-stone-300">
                <div className="flex items-start gap-2">
                  <span className="w-36 shrink-0 pt-1 text-stone-400">
                    <GameTerm id="hit_dice">Hit dice</GameTerm>
                  </span>
                  {/* SRD 5.1: hit dice are spent at the end of a short rest.
                      A player at the table chooses their own while the rest's
                      window is open (POST /sheet/hit-dice, which rolls and
                      heals); the DM seats and the lead correct the count. */}
                  <HitDiceSpend sheet={sheet} mine={mine} inCombat={inCombat} />
                  {corrects && !(sheet.hitDicePools?.length ?? 0) ? (
                    <button
                      type="button"
                      className={STEP_BUTTON}
                      disabled={busy || sheet.hitDice.spent >= sheet.hitDice.total}
                      title={t("charSheet.hitDice.correctSpend")}
                      onClick={() => adjustUsage({ hitDiceSpent: sheet.hitDice.spent + 1 })}
                    >
                      <Minus className="size-3" />
                    </button>
                  ) : null}
                  {corrects && !(sheet.hitDicePools?.length ?? 0) ? (
                    <button
                      type="button"
                      className={STEP_BUTTON}
                      disabled={busy || sheet.hitDice.spent <= 0}
                      title={t("charSheet.hitDice.correctRecover")}
                      onClick={() => adjustUsage({ hitDiceSpent: sheet.hitDice.spent - 1 })}
                    >
                      <Plus className="size-3" />
                    </button>
                  ) : null}
                </div>
                {Object.entries(sheet.resources).map(([id, pool]) => (
                  <ResourceRow
                    key={id}
                    id={id}
                    pool={pool}
                    name={resourceName(id)}
                    help={resourceHelp(id)}
                    spends={spends}
                    corrects={corrects}
                    busy={busy}
                    deadNote={deadNote}
                    onSpend={() => adjustUsage({ resources: { [id]: pool.used + 1 } })}
                    onRecover={() => adjustUsage({ resources: { [id]: pool.used - 1 } })}
                  />
                ))}
                {foretoldLeft(sheet).length ? (
                  <p className="text-xs">{t("charSheet.foretoldRolls", { rolls: foretoldLeft(sheet).join(", ") })}</p>
                ) : null}
              </div>
              {spends ? (
                <p className="reveal mt-1.5 text-[11px] text-stone-500">
                  {corrects ? t("charSheet.resources.correction") : t("charSheet.resources.player")}{" "}
                  {t("charSheet.resources.logged")}
                </p>
              ) : null}
              {refusal?.at === "usage" ? (
                <p role="alert" className="reveal mt-1.5 text-[11px] text-amber-300">
                  {refusal.text}
                </p>
              ) : null}
            </SheetBlock>
          ) : null}

          {sheet.equipment.length ? (
            <SheetBlock className="mt-4" title={t("charSheet.equip")} aside={t("charSheet.equipment.attuned", { count: attunedCount, max: attunementSlotsFor(sheet) })}>
              <EquipmentChips
                equipment={sheet.equipment}
                extra={(index) => {
                  const item = sheet.equipment[index];
                  return item ? itemStatus(sheet, item).charges : null;
                }}
              />
              {(mine || corrects) && wearable.length ? (
                <div className="reveal mt-2 space-y-1">
                  <p className="text-[11px] text-stone-500">
                    {t("charSheet.gear.wornSummary", {
                      ac: sheet.acOverride ? t("charSheet.gear.pinned") : armor.parts.join(" + "),
                      count: attunedCount,
                      max: attunementSlotsFor(sheet),
                    })}
                  </p>
                  {magic.sources.length ? (
                    <p className="reveal text-[11px] text-sky-400/80">
                      {t("charSheet.gear.activeMagic")}:{" "}
                      {[
                        magic.acBonus ? t("charSheet.gear.acBonus", { bonus: magic.acBonus }) : null,
                        magic.saveBonus ? t("charSheet.gear.saveBonus", { bonus: magic.saveBonus }) : null,
                        ...Object.entries(magic.abilitySet).map(
                          ([ability, score]) => t("charSheet.gear.abilitySet", { ability: (abilityLabels[ability] ?? ability.toUpperCase()), score }),
                        ),
                        magic.resistances.length ? t("charSheet.gear.resistances", { types: magic.resistances.join(", ") }) : null,
                      ]
                        .filter(Boolean)
                        .join(" \u00b7 ") || t("charSheet.gear.worn")}
                    </p>
                  ) : null}
                  <SheetGearRows
                    sheet={sheet}
                    items={wearable}
                    armor={armor}
                    corrects={corrects}
                    inCombat={inCombat}
                    myTurn={myTurn}
                    dead={dead}
                    busy={busy}
                    pending={pendingWear}
                    onPending={setPendingWear}
                    onGear={(gear) => void adjustUsage({ gear }, "gear")}
                  />
                  {refusal?.at === "gear" ? (
                    <p role="alert" className="reveal text-[11px] text-amber-300">
                      {refusal.text}
                    </p>
                  ) : null}
                  {timeNote ? (
                    <p key={timeNote} role="status" className="animate-fade-up text-[11px] text-sky-200/90">
                      {timeNote}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </SheetBlock>
          ) : null}

          {owedChoices(sheet).length ? (
            <SheetBlock className="mt-4" title={t("charSheet.choicesOwed")}>
              <OwedPicks sheet={sheet} mine={mine} />
            </SheetBlock>
          ) : null}
          {sheet.features.length ? (
            <SheetBlock className="mt-4" title={t("charSheet.features")}>
              <FeatureChips features={sheet.features} classId={sheet.class} subclass={sheet.subclass} />
              <FeatureChoicePicker sheet={sheet} mine={mine} inCombat={inCombat} />
            </SheetBlock>
          ) : null}

          {sheet.feats.length ? (
            <SheetBlock className="mt-4" title={t("charSheet.feats")}>
              <FeatChips feats={sheet.feats} classId={sheet.class} subclass={sheet.subclass} />
            </SheetBlock>
          ) : null}

          {sheet.backstory ? (
            <SheetBlock className="mt-4" title={t("charSheet.backstory")}>
              <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-300">{sheet.backstory}</p>
            </SheetBlock>
          ) : null}

          {sheet.isCompanion ? null : <StoryHopes sheet={sheet} mine={mine} />}

          {mine && sheet.notes ? (
            <SheetBlock className="mt-4" title={t("charSheet.notes")} aside={t("charSheet.notesPrivate")}>
              <p className="whitespace-pre-wrap text-xs text-stone-300">{sheet.notes}</p>
            </SheetBlock>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfBusy}
              className={ui.btnSmall}
              title={t("charSheet.pdf.title")}
            >
              <FileDown className="size-3.5" /> {pdfBusy ? t("charSheet.pdf.preparing") : t("charSheet.pdf.download")}
            </button>
            {steersStory && onAdjust ? (
              <button
                type="button"
                onClick={onAdjust}
                className={ui.btnSmall}
                title={t("charSheet.adjust.title")}
              >
                <Wrench className="size-3.5" /> {t("charSheet.adjust.label")}
              </button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
