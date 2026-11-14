import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages";
import type { GearProblemDetail } from "@/lib/srd/gear-problems";

export type GearProblemTranslator = (key: MessageKey, params?: Params) => string;

export function gearProblemText(detail: GearProblemDetail, t: GearProblemTranslator): string {
  const p = detail.params;
  const name = String(p.name ?? "");
  switch (detail.code) {
    case "homebrew":
      return t("builder.gear.problem.homebrew", { name });
    case "magic":
      return t("builder.gear.problem.magic", { name });
    case "unpriced":
      return t("builder.gear.problem.unpriced", { name });
    case "insufficientFunds":
      return t("builder.gear.problem.insufficientFunds", {
        cost: String(p.cost ?? ""),
        available: String(p.available ?? ""),
        shortfall: String(p.shortfall ?? ""),
      });
    case "invalidOption":
      return t("builder.gear.problem.invalidOption", {
        className: String(p.className ?? ""),
        options: String(p.options ?? ""),
      });
    case "notProficient":
      return t("builder.gear.problem.notProficient", {
        className: String(p.className ?? ""),
        option: String(p.option ?? ""),
        alternatives: String(p.alternatives ?? ""),
      });
    case "invalidSlot": {
      const slotKeys: Record<string, string> = {
        simple: "simple",
        "simple-melee": "simpleMelee",
        martial: "martial",
        "martial-melee": "martialMelee",
        instrument: "instrument",
      };
      const suffix = slotKeys[String(p.slotFilter ?? "")];
      const slot = suffix ? t(("builder.extra.classKit.slot." + suffix) as MessageKey) : String(p.slotFilter ?? "");
      const described = p.except
        ? t("builder.extra.classKit.slot.except", { slot, except: String(p.except) })
        : slot;
      return t("builder.gear.problem.invalidSlot", {
        name,
        slot: described,
        className: String(p.className ?? ""),
        option: String(p.option ?? ""),
      });
    }
    case "invalidBackgroundChoice":
      return t("builder.gear.problem.invalidBackgroundChoice", {
        options: String(p.options ?? ""),
        choice: String(p.choice ?? ""),
      });
    default:
      return detail.code;
  }
}
