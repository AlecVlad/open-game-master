// The numbers the server derives for a new character (hit points, armor
// class, coin), each with the one line that says where it comes from. The
// builder shows them; it never lets them be typed, because the server works
// them out again from the same choices when the character is saved.
import { fixedDieValue, type HpMethod } from "@/lib/srd/hit-points";
import { formatPrice } from "@/lib/srd/currency";
import { describeWealthDice, startingWealthDice } from "@/lib/srd/starting-wealth";
import type { PurseView } from "./EquipmentSection";
import type { TableRulesState } from "./useTableRules";
import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages";

export type DerivedLine = { value: string; reason: string };

export type BuildMathMessages = {
  t?: (key: MessageKey, params?: Params) => string;
  tp?: (key: string, count: number, params?: Params) => string;
};

export function hitPointsLine(input: {
  hitDie: number;
  level: number;
  maxHp: number;
  range: { min: number; max: number };
  method: HpMethod;
  kept: boolean;
  atTable: boolean;
  dice?: number[];
}, messages?: BuildMathMessages): DerivedLine {
  const { hitDie, level, maxHp, range, method } = input;
  const mixed = new Set(input.dice ?? []).size > 1;
  if (input.kept) {
    return {
      value: String(maxHp),
      reason: messages?.t?.("builder.extra.buildMath.reason.hp.kept") ?? "Kept from the stored character while its level and Constitution stand.",
    };
  }
  const firstFallback = "1st level is the d" + hitDie + "'s maximum plus Constitution";
  const first = messages?.t?.("builder.extra.buildMath.reason.hp.first", { die: hitDie }) ?? firstFallback;
  if (level <= 1) {
    return { value: String(maxHp), reason: firstFallback + "." };
  }
  if (mixed) {
    const dice = [...new Set(input.dice ?? [])].map((die) => "d" + die).join(", ");
    const methodId = method === "rolled" ? "rolled" : method === "max" ? "max" : "average";
    const methodFallback = method === "rolled" ? "rolled by the server when you save" : method === "max" ? "at its highest face" : "at the table's average";
    const methodText = messages?.t?.(("builder.extra.buildMath.reason.hp.method." + methodId) as MessageKey) ?? methodFallback;
    const fallback = firstFallback + "; each later level its own class's die (" + dice + "), " + methodFallback + ", plus Constitution (at least 1).";
    return {
      value: method === "rolled" ? range.min + " to " + range.max : String(maxHp),
      reason: messages?.t?.("builder.extra.buildMath.reason.hp.mixed", { first, dice, method: methodText }) ?? fallback,
    };
  }
  if (method === "rolled") {
    const fallback = firstFallback + "; the server rolls a d" + hitDie + " for each later level when you save (every level adds at least 1).";
    return {
      value: range.min + " to " + range.max,
      reason: messages?.t?.("builder.extra.buildMath.reason.hp.rolled", { first, die: hitDie }) ?? fallback,
    };
  }
  const laterFallback = method === "max"
    ? "each later level the die's highest face, " + hitDie
    : "each later level the table's average, " + fixedDieValue(hitDie);
  const later = method === "max"
    ? (messages?.t?.("builder.extra.buildMath.reason.hp.later.max", { die: hitDie }) ?? laterFallback)
    : (messages?.t?.("builder.extra.buildMath.reason.hp.later.average", { face: fixedDieValue(hitDie) }) ?? laterFallback);
  const tableNoteFallback = " A table that rolls or maximises hit points works them its own way when this character joins.";
  const tableNote = input.atTable ? "" : (messages?.t?.("builder.extra.buildMath.reason.hp.tableNote") ?? tableNoteFallback);
  const fallback = firstFallback + "; " + laterFallback + ", plus Constitution (at least 1)." + (input.atTable ? "" : tableNoteFallback);
  return {
    value: String(maxHp),
    reason: messages?.t?.("builder.extra.buildMath.reason.hp.fixed", { first, later, tableNote }) ?? fallback,
  };
}

export function armorClassLine(ac: number, parts: string[] | undefined): DerivedLine {
  return {
    value: String(ac),
    reason: parts?.length
      ? `From what is worn: ${parts.join(" + ")}.`
      : "10 plus Dexterity with nothing worn.",
  };
}

// The purse as the gear step and the review show it.
export function purseViewFor(input: {
  purse: {
    gold: number;
    copper: number;
    spentCopper: number;
    problems: string[];
    method: string;
    receipt?: PurseView["receipt"];
  };
  keepsStoredGear: boolean;
  backgroundName: string;
  backgroundPurse: number;
  classId: string;
  className: string;
  table: TableRulesState;
}): PurseView {
  const { purse, table } = input;
  const spent = purse.spentCopper ? ` Bought: ${formatPrice(purse.spentCopper)}.` : "";
  const rolledTable = !input.keepsStoredGear && purse.method === "rolled";
  const dice = describeWealthDice(startingWealthDice(input.classId));
  const source = input.keepsStoredGear
    ? `The coin this character already carries; gear added now is paid from it.${spent}`
    : rolledTable
      ? table.wealth
        ? `This table rolls a ${input.className}'s starting wealth in place of the class kit, and every item is bought from it.${spent}`
        : `This table rolls a ${input.className}'s starting wealth (${dice}) in place of the class kit. Roll it, then buy your gear.`
      : `The ${input.backgroundName} background's purse of ${input.backgroundPurse} gp. The class and background kit is free; anything more is bought from the purse.${spent}`;
  return {
    gold: purse.gold,
    copper: purse.copper,
    source,
    problems: [...new Set(purse.problems)],
    ...(purse.receipt ? { receipt: purse.receipt } : {}),
    wealth: rolledTable
      ? {
          dice,
          rolled: table.wealth ? { faces: table.wealth.faces, gold: table.wealth.gold } : null,
          busy: table.wealthBusy,
          error: table.wealthError,
          onRoll: table.rollWealth,
        }
      : null,
  };
}

