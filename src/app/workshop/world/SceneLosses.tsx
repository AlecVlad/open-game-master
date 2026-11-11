import { useI18n } from "@/lib/i18n/provider";
import type { SceneLoss } from "@/lib/worldforge/scenes";

// What each storyboard card loses as a WorldForge scene, or each scene as a
// card (audit WF-19), one card at a time, so the author can see which part
// of the adventure a file would not carry before it is written or applied.
const BEAT_KIND_KEYS: Record<string, string> = {
  setting: "workshop.world.sceneLoss.beatKind.setting",
  backstory: "workshop.world.sceneLoss.beatKind.backstory",
  event: "workshop.world.sceneLoss.beatKind.event",
  encounter: "workshop.world.sceneLoss.beatKind.encounter",
  hook: "workshop.world.sceneLoss.beatKind.hook",
  secret: "workshop.world.sceneLoss.beatKind.secret",
  npc_moment: "workshop.world.sceneLoss.beatKind.npcMoment",
};
const ROUTE_KIND_KEYS: Record<string, string> = {
  choice: "workshop.world.sceneLoss.routeKind.choice",
  optional: "workshop.world.sceneLoss.routeKind.optional",
};

export function SceneLosses({ scenes, label }: { scenes: SceneLoss[]; label: string }) {
  const { t } = useI18n();
  if (!scenes.length) return null;
  const detailText = (detail: NonNullable<SceneLoss["details"]>[number]) => {
    const params: Record<string, string | number> = { ...detail.params };
    for (const key of ["kind", "eventKind"]) {
      const value = params[key];
      if (typeof value === "string" && BEAT_KIND_KEYS[value]) params[key] = t(BEAT_KIND_KEYS[value] as never);
    }
    if (typeof params.routeKind === "string") {
      const routeKey = ROUTE_KIND_KEYS[params.routeKind];
      const label = typeof params.routeLabel === "string" ? params.routeLabel : "";
      params.meaning = routeKey ? t(routeKey as never) + (label ? `: ${label}` : "") : params.routeKind;
      delete params.routeKind;
      delete params.routeLabel;
    }
    if (typeof params.field === "string") {
      params.field = t((params.field === "pov" ? "workshop.world.sceneLoss.field.pov" : "workshop.world.sceneLoss.field.place") as never);
    }
    if (typeof params.expected === "string") {
      params.expected = t((params.expected === "npc" ? "workshop.world.sceneLoss.expected.npc" : "workshop.world.sceneLoss.expected.location") as never);
    }
    return t(detail.code as never, params);
  };
  return (
    <div className="flex flex-col gap-1" data-testid="scene-losses">
      <span className="font-medium text-amber-200">{label}</span>
      <ul className="flex flex-col gap-1 pl-1" aria-label={label}>
        {scenes.map((scene, index) => (
          <li key={`${index}-${scene.scene}`} data-testid="scene-loss">
            <span className="text-stone-100">“{scene.scene}”</span> {t("workshop.world.sceneLoss.loses")}
            <ul className="list-disc pl-5 text-amber-100/90">
              {(scene.details?.length === scene.lost.length
                ? scene.details.map((detail) => detailText(detail))
                : scene.lost
              ).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
