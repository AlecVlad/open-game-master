import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages";

type Translator = (key: MessageKey, params?: Params) => string;
type Requirement = Record<string, string | number | string[]>;

export function featPrerequisiteText(params: Params | undefined, t: Translator): string {
  const p = params ?? {};
  let requirements: Requirement[] = [];
  try {
    const parsed: unknown = JSON.parse(String(p.requirements ?? "[]"));
    if (Array.isArray(parsed)) requirements = parsed as Requirement[];
  } catch {
    requirements = [];
  }
  const and = t("builder.block.feat.requirement.and");
  const or = t("builder.block.feat.requirement.or");
  const lines = requirements.map((entry) => {
    switch (entry.code) {
      case "abilityScore": {
        const abilities = Array.isArray(entry.abilities) ? entry.abilities.map((id) => t(("builder.block.feat.ability." + String(id)) as MessageKey)) : [];
        const actual = Array.isArray(entry.actual) ? entry.actual.join(" / ") : "";
        return t("builder.block.feat.requirement.abilityScore", { abilities: abilities.join(or), minimum: Number(entry.minimum ?? 13), actual });
      }
      case "armor":
        return t("builder.block.feat.requirement.armor", { armor: t(("builder.block.feat.armor." + String(entry.armorType)) as MessageKey) });
      case "spellcasting":
        return t("builder.block.feat.requirement.spellcasting");
      case "race":
        return t("builder.block.feat.requirement.race");
      case "level":
        return t("builder.block.feat.requirement.level", { minimum: Number(entry.minimum ?? 1), actual: Number(entry.actual ?? 1) });
      case "skills": {
        const skills = Array.isArray(entry.skills) ? entry.skills.join(", ") : "";
        return t("builder.block.feat.requirement.skills", { skills });
      }
      case "vehicle":
        return t("builder.block.feat.requirement.vehicle");
      case "weapon": {
        const parts = [entry.weaponType, entry.subtype].filter(Boolean).map((name) => t(("builder.block.feat.weapon." + String(name)) as MessageKey));
        return t("builder.block.feat.requirement.weapon", { weapon: parts.join(" ") });
      }
      default:
        return "";
    }
  }).filter(Boolean);
  return t("builder.block.feat.prerequisite", { feat: String(p.feat ?? ""), requirements: lines.join(and) });
}
