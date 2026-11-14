"use client";

import { GameIcon } from "@/components/ui/GameIcon";
import { cn } from "@/lib/cn";
import { changeWears, gearWornState, isWeaponRow, isWornGear, itemStatus } from "@/components/sheet/sheet-state";
import { armorChangeMinutes } from "@/lib/dm/don-doff";
import { guessStands, matchArmor } from "@/lib/srd/armor";
import { matchMagicItem } from "@/lib/srd/magic-items";
import { swapQuestion, wearConflict, type WearConflict } from "@/lib/srd/wear-slots";
import type { CharacterSheet, EquipmentItem } from "@/lib/schemas/sheet";
import { useT } from "@/lib/i18n/provider";

// One wearable item on the character sheet: its charges, whether it is
// attuning or cursed, and the wear and attune toggles with the engine's
// reasons on them (who may, when, and what the clock is charged). Split from
// CharacterSheetDialog.tsx, which posts the change. Putting it on where its
// kind is already worn (a second cloak) asks first, with the swap and, for
// the DM and the party lead, the SRD's exception of wearing both (issue 412).
export function SheetGearRow({
  sheet,
  item,
  worn,
  idle = null,
  inCombat,
  myTurn,
  dead,
  busy,
  onGear,
  conflict = null,
  canLayer = false,
  onSwap,
  onLayer,
  onDismiss,
}: {
  sheet: CharacterSheet;
  item: EquipmentItem;
  worn: boolean;
  // Worn, but its place is full and its magic does not count: "one cloak at
  // a time" (src/lib/srd/wear-slots.ts).
  idle?: string | null;
  inCombat: boolean;
  myTurn: boolean;
  dead: boolean;
  busy: boolean;
  onGear: (change: { equipped?: boolean; attuned?: boolean }) => void;
  // The question asked before a swap, while it is open on this row.
  conflict?: WearConflict | null;
  canLayer?: boolean;
  onSwap?: () => void;
  onLayer?: () => void;
  onDismiss?: () => void;
}) {
  const t = useT();
  // Magic gear works only while worn, so every row here can
  // be put on; only body armor is barred in a fight.
  const isArmor = matchArmor(item) !== null;
  const isShield = matchArmor(item)?.category === "shield";
  const armorLocked = inCombat && isArmor && !isShield;
  // A shield takes the action, on the character's own turn.
  const shieldLocked = inCombat && isShield && !myTurn;
  // A weapon reads "In hand" or "Packed", as the Hand's cards do, so a
  // player can say which is out before a fight (held-default.ts). In one,
  // drawing or stowing it is the turn's free object interaction, on their
  // own turn; while nobody has said, the first change is free.
  const isWeapon = !isArmor && isWeaponRow(item);
  const weaponLocked = inCombat && isWeapon && !myTurn;
  const weaponHint = !isWeapon
    ? undefined
    : weaponLocked
      ? t("charSheet.gear.weaponNotYourTurn")
      : guessStands(sheet.equipment)
        ? t("charSheet.gear.weaponFirstFree")
        : inCombat
          ? t("charSheet.gear.weaponFreeInteraction")
          : undefined;
  const wearLabel = isWeapon ? t(worn ? "charSheet.gear.inHand" : "charSheet.gear.packed") : worn ? t("charSheet.gear.worn") : t("charSheet.gear.wear");
  const status = itemStatus(sheet, item);
  // Only an item that asks for attunement offers it; plain
  // armor and "+1" gear work without one, and the server
  // refuses the rest (srd/magic-items.ts attunementProblem).
  // One already attuned keeps the control so it can end.
  const def = matchMagicItem(item);
  const attunable =
    Boolean(item.attuned) ||
    Boolean(item.gear?.magic?.requiresAttunement) ||
    Boolean(def?.requiresAttunement);
  return (
    <>
    <div data-gear-row={item.name} className="flex items-center gap-2 text-xs text-stone-300">
      <GameIcon icon={{ kind: "item", key: item.name, family: "item-gear" }} size="size-6" />
      <span className="min-w-0 grow truncate">{item.name}</span>
      {idle ? (
        <span className="motion-pop shrink-0 rounded-full border border-stone-700 px-1.5 text-[10px] text-stone-400" title={t("charSheet.gear.wornNotEffective", { item: idle })}>
          {t("charSheet.gear.notInEffect")}
        </span>
      ) : item.layered && worn ? (
        <span className="motion-pop shrink-0 rounded-full border border-amber-800/60 px-1.5 text-[10px] text-amber-300" title={t("charSheet.gear.wornLayered")}>
          {t("charSheet.gear.besideAnother")}
        </span>
      ) : null}
      {status.charges ? (
        <span key={status.charges} className="motion-pop shrink-0 font-mono text-[10px] text-sky-300">
          {status.charges}
        </span>
      ) : null}
      {status.attuning ? (
        <span className="motion-pop shrink-0 rounded-full border border-sky-800/60 px-1.5 text-[10px] text-sky-300" title={t("charSheet.gear.attuneRestTitle")}>
          {/* A phone's row has no room for the whole sentence beside a name; the sheet's item chip above says it in full. */}
          <span className="sm:hidden">{t("charSheet.gear.attuningShort")}</span>
          <span className="hidden sm:inline">{t("charSheet.gear.attuning")}</span>
        </span>
      ) : null}
      {status.cursed ? (
        <span className="motion-pop shrink-0 rounded-full border border-red-800/60 px-1.5 text-[10px] text-red-300" title={status.attuneRefusal ?? t("charSheet.gear.cursedTitle")}>
          {t("charSheet.gear.cursed")}
        </span>
      ) : null}
      {/* Only what is worn or wielded offers it: a wand is held, a potion carried. */}
      {isWornGear(item) ? (
      <button
        type="button"
        disabled={busy || armorLocked || shieldLocked || weaponLocked || dead}
        aria-busy={busy}
        aria-label={isWeapon ? t("charSheet.gear.weaponToggleAria", { item: item.name, status: wearLabel, action: t(worn ? "charSheet.gear.packAway" : "charSheet.gear.takeInHand") }) : undefined}
        title={
          dead
            ? t("charSheet.gear.deadTitle", { name: sheet.name })
            : weaponHint
              ? weaponHint
              : !inCombat
              ? // What the route will charge the clock (don-doff.ts), before the press.
                armorChangeMinutes(sheet.equipment, { [item.name]: { equipped: !worn } }).lines.join(" ") || undefined
              : !isArmor
                ? undefined
                : isShield
                  ? shieldLocked
                    ? t("charSheet.gear.shieldActionNotTurn")
                    : t("charSheet.gear.shieldAction")
                  : t("charSheet.gear.armorCombat")
        }
        onClick={() => onGear({ equipped: !worn })}
        className={cn(
          // A finger-sized target on a phone, the size of the kit's controls.
          "motion-press min-h-[40px] min-w-[40px] shrink-0 rounded border px-1.5 py-0.5 disabled:opacity-40 sm:min-h-0 sm:min-w-0",
          worn
            ? "border-amber-700/70 bg-amber-950/40 text-amber-200"
            : "border-stone-700 text-stone-400",
        )}
      >
        <span key={wearLabel} className="motion-pop inline-block">{wearLabel}</span>
      </button>
      ) : null}
      {attunable ? (
      <button
        type="button"
        disabled={busy || inCombat || dead || Boolean(status.attuneRefusal)}
        // The engine's refusal (attunementRefusal: a curse,
        // the three-item cap, who may attune).
        title={
          inCombat
            ? t("charSheet.gear.attuneCombat")
            : (status.attuneRefusal ??
              // Ending it on purpose moves the clock an hour (don-doff.ts).
              (item.attuned
                ? armorChangeMinutes(sheet.equipment, { [item.name]: { attuned: false } }).lines.join(" ")
                : undefined))
        }
        onClick={() => onGear({ attuned: !(item.attuned || item.attuning) })}
        className={cn(
          "motion-press min-h-[40px] min-w-[40px] shrink-0 rounded border px-1.5 py-0.5 disabled:opacity-40 sm:min-h-0 sm:min-w-0",
          item.attuned
            ? "border-sky-800/70 bg-sky-950/40 text-sky-200"
            : "border-stone-700 text-stone-400",
        )}
      >
        {item.attuned ? t("charSheet.gear.attuned") : item.attuning ? t("charSheet.gear.cancel") : t("charSheet.gear.attune")}
      </button>
      ) : null}
    </div>
    {status.stored ? <p className="ml-8 text-[11px] text-stone-400">{status.stored}</p> : null}
    {conflict ? (
      <div role="group" aria-label={t("charSheet.gear.swap.aria", { item: item.name })} className="reveal ml-8 space-y-1.5 rounded border border-amber-800/60 bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-100">
        <p>{swapQuestion(conflict)}</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={busy} onClick={onSwap} className="motion-press rounded border border-amber-700/70 bg-amber-950/40 px-1.5 py-0.5 text-amber-200 disabled:opacity-40">
            {t("charSheet.gear.swap.takeOff", { wearing: conflict.wearing.join(", "), item: item.name })}
          </button>
          {canLayer ? (
            <button type="button" disabled={busy} onClick={onLayer} title={t("charSheet.gear.swap.bothTitle")} className="motion-press rounded border border-stone-600 px-1.5 py-0.5 text-stone-200 disabled:opacity-40">
              {t("charSheet.gear.swap.both")}
            </button>
          ) : null}
          <button type="button" onClick={onDismiss} className="motion-press rounded border border-stone-700 px-1.5 py-0.5 text-stone-400">
            {t("charSheet.gear.swap.keep")}
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}

type GearChange = { equipped?: boolean; attuned?: boolean };
type GearAsk = Record<string, GearChange & { layered?: boolean }>;

// The swap question open on one row: what was asked, and what fills its place.
export type PendingWear = { name: string; conflict: WearConflict; change: GearChange };

// Every wearable row of a sheet. A press that would put a row on where its
// kind is already worn opens the question instead of posting; the server
// refuses the same change with the same conflict (src/lib/dm/usage-rules.ts
// gearPatch), which opens it too. The swap takes the others off and puts
// this one on in one request; "wear both" is the DM's and the lead's.
export function SheetGearRows({
  sheet,
  items,
  armor,
  corrects,
  inCombat,
  myTurn,
  dead,
  busy,
  pending,
  onPending,
  onGear,
}: {
  sheet: CharacterSheet;
  items: EquipmentItem[];
  armor: { armorName: string | null; shieldName: string | null };
  corrects: boolean;
  inCombat: boolean;
  myTurn: boolean;
  dead: boolean;
  busy: boolean;
  pending: PendingWear | null;
  onPending: (pending: PendingWear | null) => void;
  onGear: (gear: GearAsk) => void;
}) {
  return items.map((item) => {
    const state = gearWornState(item, sheet.equipment, armor);
    const open = pending?.name === item.name ? pending : null;
    return (
      <SheetGearRow
        key={item.name}
        sheet={sheet}
        item={item}
        worn={state.worn}
        idle={state.idle}
        inCombat={inCombat}
        myTurn={myTurn}
        dead={dead}
        busy={busy}
        onGear={(change) => {
          const conflict = changeWears(item, sheet.equipment, change) ? wearConflict(item, sheet.equipment) : null;
          onPending(conflict ? { name: item.name, conflict, change } : null);
          if (!conflict) {
            onGear({ [item.name]: change });
          }
        }}
        conflict={open?.conflict ?? null}
        canLayer={corrects}
        onSwap={() => {
          if (!open) return;
          onPending(null);
          const off = Object.fromEntries(open.conflict.wearing.map((name) => [name, { equipped: false }]));
          onGear({ ...off, [item.name]: { ...open.change, equipped: true } });
        }}
        onLayer={() => {
          if (!open) return;
          onPending(null);
          onGear({ [item.name]: { ...open.change, equipped: true, layered: true } });
        }}
        onDismiss={() => onPending(null)}
      />
    );
  });
}
