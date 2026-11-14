import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages";

type Translator = (key: MessageKey, params?: Params) => string;

export function multiclassPrerequisiteText(params: Params | undefined, t: Translator): string {
  const p = params ?? {};
  let alternatives: string[][] = [];
  try {
    const parsed: unknown = JSON.parse(String(p.alternatives ?? "[]"));
    if (Array.isArray(parsed)) alternatives = parsed as string[][];
  } catch {
    alternatives = [];
  }
  const and = t("builder.block.feat.requirement.and");
  const or = t("builder.block.feat.requirement.or");
  const minimum = Number(p.minimum ?? 13);
  const requirements = alternatives.map((group) =>
    group.map((ability) => t(("builder.block.feat.ability." + ability) as MessageKey) + " " + minimum).join(and),
  ).join(or);
  return t("builder.block.abilities.multiclassPrerequisite", { className: String(p.className ?? ""), requirements });
}
