"use client";

import { Shield } from "lucide-react";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { contentSlug } from "@/lib/help";
import {
  kitSlotsByLine,
  optionAllowed,
  slotChoices,
  describeSlot,
  type ClassKit,
  type KitChoices,
  type KitTraining,
} from "@/lib/srd/starting-kit";
import { SRD_WEAPONS } from "@/lib/srd/weapons";
import type { DerivedLine } from "./derivedReasons";
import OptionPicker from "./OptionPicker";
import { PickPill, inputClass } from "./steps/shared";

const LETTERS = "abcdef";
const damageOf = new Map(SRD_WEAPONS.map((weapon) => [weapon.name, weapon.damage]));
const capital = (text: string) => text.replace(/^./, (first) => first.toUpperCase());

const SLOT_LABEL_KEYS: Record<string, string> = {
  simple: "builder.extra.classKit.slot.simple",
  "simple-melee": "builder.extra.classKit.slot.simpleMelee",
  martial: "builder.extra.classKit.slot.martial",
  "martial-melee": "builder.extra.classKit.slot.martialMelee",
  instrument: "builder.extra.classKit.slot.instrument",
};

function slotLabel(slot: { filter: string; except?: string[] }, t: ReturnType<typeof useI18n>["t"]): string {
  const key = SLOT_LABEL_KEYS[slot.filter];
  const label = key ? t(key as never) : describeSlot(slot);
  return slot.except?.length
    ? t("builder.extra.classKit.slot.except", { slot: label, except: slot.except.join(", ") })
    : capital(label);
}


// The class's starting equipment as the book prints it, one line at a time:
// an either-or line is a row of pills, an "any simple weapon" a picker over
// the weapons that qualify, and a line with no choice is simply read out.
// What the choices come to is on the chips below, and the armor class
// follows from them.
export default function KitChoicesSection({
  kit,
  choices,
  training,
  className,
  armorClass,
  onOption,
  onPick,
}: {
  kit: ClassKit;
  choices: KitChoices;
  training: KitTraining;
  className: string;
  // The armor engine's number for the gear as it stands (derivedReasons.ts).
  armorClass: DerivedLine;
  onOption: (line: number, option: number) => void;
  onPick: (slot: number, name: string) => void;
}) {
  const { t } = useI18n();
  const slotLines = kitSlotsByLine(kit, choices.options);
  const captionId = useId();
  return (
    <div className="mb-3 space-y-2.5">
      <p className="text-xs text-stone-500">
        {kit.source === "odm"
          ? t("builder.extra.classKit.summary.odm", { name: className })
          : t("builder.extra.classKit.summary.book", { name: className })}
      </p>
      {kit.lines.map((line, lineIndex) => {
        const chosen = choices.options[lineIndex] ?? 0;
        const { start, slots } = slotLines[lineIndex];
        return (
          <div key={lineIndex} className="space-y-1.5">
            {line.options.length > 1 ? (
              <div role="group" aria-label={t("builder.extra.classKit.choice.aria", { count: lineIndex + 1 })} className="flex flex-wrap gap-1.5">
                {line.options.map((option, optionIndex) => {
                  const allowed = optionAllowed(option, training);
                  return (
                    <PickPill
                      key={option.label}
                      selected={chosen === optionIndex}
                      disabled={!allowed}
                      onClick={() => onOption(lineIndex, optionIndex)}
                    >
                      <span className="text-stone-500">({LETTERS[optionIndex]})</span> {option.label}
                    </PickPill>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-300">{capital(line.options[0].label)}</p>
            )}
            {slots.length ? (
              <div key={`${lineIndex}-${chosen}`} className="reveal grid gap-1.5 sm:grid-cols-2">
                {slots.map((slot, at) => (
                  <div key={at}>
                    <span id={`${captionId}-${start + at}`} className="mb-1 block text-sm text-stone-400">{slotLabel(slot, t)}</span>
                    <OptionPicker
                      labelledBy={`${captionId}-${start + at}`}
                      value={choices.picks[start + at] ?? slot.default}
                      onChange={(name) => onPick(start + at, name)}
                      className={inputClass}
                      groups={[
                        {
                          label: null,
                          options: slotChoices(slot).map((name) => ({
                            id: name,
                            name,
                            meta: damageOf.get(name) ?? "",
                            reference: { kind: "items" as const, slug: contentSlug(name), name },
                          })),
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="flex items-baseline gap-2">
        <Shield className="size-3.5 self-center text-amber-300/80" aria-hidden="true" />
        <span className="text-xs text-stone-400">{t("builder.kit.armorClassWithKit")}</span>
        <span key={armorClass.value} className="reveal font-mono text-sm text-amber-200">
          {armorClass.value}
        </span>
      </div>
      <p className="text-sm text-stone-500">{armorClass.reason}</p>
    </div>
  );
}
