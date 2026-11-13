import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages";

type Translator = (key: MessageKey, params?: Params) => string;

function countLine(t: Translator, label: string, count: number): string {
  return t("builder.block.feat.pickCount", { label, count });
}

export function featOwedText(params: Params | undefined, t: Translator): string {
  const p = params ?? {};
  const feat = String(p.feat ?? "");
  const details: string[] = [];
  const kind = (name: string) => t(("builder.block.feat.kind." + name) as MessageKey);
  if (p.kind === "picks") {
    for (const name of ["languages", "skills", "expertise", "weapons", "tools"]) {
      const count = Number(p[name] ?? 0);
      if (count > 0) details.push(countLine(t, kind(name), count));
    }
    const shared = Number(p.shared ?? 0);
    if (shared > 0) {
      const kinds = String(p.sharedKinds ?? "").split(",").filter(Boolean).map(kind).join(" / ");
      details.push(t("builder.block.feat.shared", { count: shared, kinds }));
    }
    if (p.sharedKinds && String(p.sharedKinds).split(",").includes("armor")) kind("armor");
    if (p.damageType === "yes") details.push(kind("damageType"));
  } else if (p.kind === "spells") {
    if (p.listChoice === "yes") details.push(kind("classList"));
    if (p.abilityChoice === "yes") details.push(kind("spellAbility"));
    const cantrips = Number(p.cantrips ?? 0);
    if (cantrips > 0) details.push(countLine(t, kind(p.attackCantrip === "yes" ? "attackCantrip" : "cantrip"), cantrips));
    const spells = Number(p.spells ?? 0);
    if (spells > 0) {
      const level = Number(p.spellLevel ?? 1);
      const spellKind = p.ritualBook === "yes" ? "ritualSpell" : "spell";
      const label = t("builder.block.feat.spellLevel", { kind: kind(spellKind), level });
      details.push(countLine(t, label, spells));
      if (p.schools) {
        const schools = String(p.schools).split(",").map((school) =>
          t(("builder.block.feat.school." + school.trim()) as MessageKey),
        );
        details.push(t("builder.block.feat.schools", { schools: schools.join(", ") }));
      }
    }
  }
  return t("builder.block.feat.choices", { feat, details: details.join("; ") });
}
