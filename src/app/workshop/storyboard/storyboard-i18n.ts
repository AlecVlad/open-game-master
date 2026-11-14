import type { MessageKey } from "@/lib/i18n/messages/index";
import type { BeatKind, BeatOrigin, RouteKind, Suggestion } from "@/lib/workshop/board";

export type StoryboardT = (key: MessageKey, params?: Record<string, string | number>) => string;

const BEAT_LABEL_KEYS = {
  setting: "campaign.storyboard.kind.setting",
  backstory: "campaign.storyboard.kind.backstory",
  event: "campaign.storyboard.kind.event",
  encounter: "campaign.storyboard.kind.encounter",
  hook: "campaign.storyboard.kind.hook",
  secret: "campaign.storyboard.kind.secret",
  npc_moment: "campaign.storyboard.kind.npcMoment",
} as const satisfies Record<BeatKind, MessageKey>;

const BEAT_HINT_KEYS = {
  setting: "campaign.storyboard.hint.setting",
  backstory: "campaign.storyboard.hint.backstory",
  event: "campaign.storyboard.hint.event",
  encounter: "campaign.storyboard.hint.encounter",
  hook: "campaign.storyboard.hint.hook",
  secret: "campaign.storyboard.hint.secret",
  npc_moment: "campaign.storyboard.hint.npcMoment",
} as const satisfies Record<BeatKind, MessageKey>;

const ROUTE_LABEL_KEYS = {
  then: "campaign.storyboard.route.then",
  choice: "campaign.storyboard.route.choice",
  optional: "campaign.storyboard.route.optional",
} as const satisfies Record<"then" | RouteKind, MessageKey>;

const ROUTE_TAG_KEYS = {
  choice: "campaign.storyboard.route.tag.choice",
  optional: "campaign.storyboard.route.tag.optional",
} as const satisfies Record<RouteKind, MessageKey>;

export function beatLabel(t: StoryboardT, kind: BeatKind): string {
  return t(BEAT_LABEL_KEYS[kind]);
}

export function beatHint(t: StoryboardT, kind: BeatKind): string {
  return t(BEAT_HINT_KEYS[kind]);
}

export function routeLabel(t: StoryboardT, kind: "then" | RouteKind): string {
  return t(ROUTE_LABEL_KEYS[kind]);
}

export function routeTag(t: StoryboardT, kind: RouteKind): string {
  return t(ROUTE_TAG_KEYS[kind]);
}

export function linkLabel(t: StoryboardT, field: "npcId" | "mapId" | "encounterId" | "locationId"): string {
  switch (field) {
    case "npcId": return t("campaign.storyboard.link.who");
    case "mapId": return t("campaign.storyboard.link.map");
    case "encounterId": return t("campaign.storyboard.link.fight");
    case "locationId": return t("campaign.storyboard.link.place");
  }
}

export function linkShortLabel(t: StoryboardT, field: "npcId" | "mapId" | "encounterId" | "locationId"): string {
  switch (field) {
    case "npcId": return t("campaign.storyboard.link.short.who");
    case "mapId": return t("campaign.storyboard.link.short.map");
    case "encounterId": return t("campaign.storyboard.link.short.fight");
    case "locationId": return t("campaign.storyboard.link.short.place");
  }
}

export function originText(t: StoryboardT, origin: BeatOrigin): string {
  switch (origin.kind) {
    case "worldforge": return t("campaign.storyboard.origin.worldforge");
    case "bundle": return t("campaign.storyboard.origin.bundle");
    case "copy": return origin.title
      ? t("campaign.storyboard.origin.copyNamed", { title: origin.title })
      : t("campaign.storyboard.origin.copy");
  }
}

function quotedTitle(title: string): string {
  return title.match(/"([^"]+)"/)?.[1] ?? title;
}

export function suggestionTitle(t: StoryboardT, suggestion: Suggestion): string {
  const [kind] = suggestion.id.split(":");
  switch (suggestion.id) {
    case "missing:hook": return t("campaign.storyboard.suggestion.title.missingHook");
    case "missing:setting": return t("campaign.storyboard.suggestion.title.missingSetting");
    case "missing:event": return t("campaign.storyboard.suggestion.title.missingEvent");
    default:
      if (kind === "payoff") return t("campaign.storyboard.suggestion.title.payoff", { name: quotedTitle(suggestion.title) });
      if (kind === "reason") return t("campaign.storyboard.suggestion.title.reason", { name: quotedTitle(suggestion.title) });
      if (kind === "reveal") return t("campaign.storyboard.suggestion.title.reveal", { name: quotedTitle(suggestion.title) });
      if (kind === "choice") return t("campaign.storyboard.suggestion.title.choice", { name: quotedTitle(suggestion.title) });
      if (kind === "context") return t("campaign.storyboard.suggestion.title.context", { name: quotedTitle(suggestion.title) });
      return suggestion.title;
  }
}

export function suggestionReason(t: StoryboardT, suggestion: Suggestion): string {
  const [kind, bucket] = suggestion.id.split(":");
  switch (suggestion.id) {
    case "missing:hook": return t("campaign.storyboard.suggestion.reason.missingHook");
    case "missing:setting": return t("campaign.storyboard.suggestion.reason.missingSetting");
    case "missing:event": return t("campaign.storyboard.suggestion.reason.missingEvent");
    default:
      if (kind === "payoff") return t("campaign.storyboard.suggestion.reason.payoff", { name: quotedTitle(suggestion.title) });
      if (kind === "reason") return t("campaign.storyboard.suggestion.reason.reason", { name: quotedTitle(suggestion.title) });
      if (kind === "reveal") return t("campaign.storyboard.suggestion.reason.reveal", { name: quotedTitle(suggestion.title) });
      if (kind === "choice") return t("campaign.storyboard.suggestion.reason.choice", { name: quotedTitle(suggestion.title) });
      if (kind === "context") return t("campaign.storyboard.suggestion.reason.context", { name: quotedTitle(suggestion.title) });
      if (kind === "unused") {
        const key = bucket === "npcs" ? "npc" : bucket === "maps" ? "map" : bucket === "encounters" ? "encounter" : "location";
        return t(`campaign.storyboard.suggestion.reason.unused.${key}` as MessageKey, { name: suggestion.title });
      }
      if (kind === "link") return t("campaign.storyboard.suggestion.reason.unlinked", { name: suggestion.title });
      return t("campaign.storyboard.suggestion.reason.generic", { name: suggestion.title });
  }
}
