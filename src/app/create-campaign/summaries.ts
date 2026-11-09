import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { TABLE_LANGUAGE_LABELS } from "@/lib/schemas/game-settings-options";
import type { CampaignDraft, WizardGates } from "@/app/create-campaign/draft";
import { bringsSomething } from "@/app/workshop/ContentImportPicker";

// The one line under each group's name, and the review's read-back of what
// is inside the groups. Worked out from the draft only, so a closed group
// still says truthfully what it holds. Optional translation keeps the pure
// English contract used by the creator-flow tests and any non-UI caller.

export type SummaryTranslator = (key: MessageKey, params?: Params) => string;

const summaryKey = (part: string): MessageKey => `createCampaign.summary.${part}` as MessageKey;
const messageKey = (part: string): MessageKey => part as MessageKey;

const BOUNDARY_WORDS = { family: "All ages", standard: "Standard", mature: "Mature" } as const;
const STRICTNESS_WORDS = { lenient: "lenient", standard: "by the book", harsh: "harsh" } as const;
const REST_WORDS = { standard: "standard rests", gritty: "gritty rests", heroic: "heroic rests" } as const;
const HP_WORDS = { average: "average hit points", rolled: "rolled hit points", max: "maximum hit points" } as const;
const ALLY_WORDS = { auto: "automatic", full: "party members and guests", guests: "guests only", off: "off" } as const;

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const onOff = (on: boolean) => (on ? "on" : "off");
const translatedOnOff = (on: boolean, t?: SummaryTranslator) =>
  t ? t(summaryKey(on ? "common.on" : "common.off")) : onOff(on);

export function worldSummary(
  draft: CampaignDraft,
  gates: WizardGates,
  packName: string | null,
  t?: SummaryTranslator,
): string {
  return [
    packName ?? (t ? t(summaryKey("world.noPack")) : "No world pack"),
    t ? t(messageKey(`createCampaign.identity.tableLanguage.${draft.tableLanguage}`)) : TABLE_LANGUAGE_LABELS[draft.tableLanguage],
    gates.aiNarrates
      ? t
        ? t(messageKey(`createCampaign.party.length.${draft.campaignLength}`))
        : `${draft.campaignLength} length`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function characterSummary(draft: CampaignDraft, t?: SummaryTranslator): string {
  if (!t) {
    return [
      HP_WORDS[draft.hpMethod],
      draft.startingWealth === "equipment" ? "starting kit" : "rolled gold",
      draft.dicePolicy === "digital_only" ? "digital dice" : "real dice allowed",
      `multiclassing ${onOff(draft.multiclassingEnabled)}`,
    ].join(" · ");
  }
  return [
    t(messageKey(`createCampaign.party.hp.${draft.hpMethod}`)),
    t(summaryKey(draft.startingWealth === "equipment" ? "character.startingKit" : "character.rolledGold")),
    t(messageKey(draft.dicePolicy === "digital_only" ? "createCampaign.party.dice.digital" : "createCampaign.party.dice.real")),
    t(summaryKey("character.multiclassing"), { state: translatedOnOff(draft.multiclassingEnabled, t) }),
  ].join(" · ");
}

export function prepSummary(draft: CampaignDraft, sourceTitle: string | null, t?: SummaryTranslator): string {
  const lore = draft.loreDrafts.filter((entry) => entry.title.trim()).length;
  const importing = bringsSomething(draft.contentImport);
  if (!t) {
    return [
      draft.houseRules.trim() ? "house rules written" : "no house rules",
      lore ? count(lore, "lore entry", "lore entries") : "no lore yet",
      importing ? `prep from ${sourceTitle ?? "a workshop"}` : "no prep brought in",
    ].join(" · ");
  }
  return [
    t(summaryKey(draft.houseRules.trim() ? "prep.houseRulesWritten" : "prep.noHouseRules")),
    lore ? t(summaryKey("prep.loreCount"), { count: lore }) : t(summaryKey("prep.noLore")),
    importing
      ? t(summaryKey("prep.fromSource"), { title: sourceTitle ?? t(summaryKey("prep.workshop")) })
      : t(summaryKey("prep.noPrep")),
  ].join(" · ");
}

export function narrationSummary(
  draft: CampaignDraft,
  gates: WizardGates,
  voiceName: string,
  t?: SummaryTranslator,
): string {
  if (!gates.ttsAvailable) {
    return t ? t(summaryKey("narration.noSpeech")) : "Not read aloud: this server has no speech service";
  }
  if (!draft.ttsEnabled) {
    return t ? t(summaryKey("narration.off")) : "Off: nothing is read aloud";
  }
  if (!t) {
    return `${voiceName} at ${draft.ttsSpeed.toFixed(2)}× · ${
      draft.ttsAutoCast ? "each speaker gets a voice" : "the narrator reads the characters"
    }`;
  }
  return [
    t(summaryKey("narration.voiceAtPace"), { voice: voiceName, pace: draft.ttsSpeed.toFixed(2) }),
    t(summaryKey(draft.ttsAutoCast ? "narration.autoCast" : "narration.manualCast")),
  ].join(" · ");
}

export function safetySummary(
  draft: Pick<CampaignDraft, "safety" | "gm">,
  t?: SummaryTranslator,
): string {
  const { safety, gm } = draft;
  if (!t) {
    const lists = [
      safety.lines.length ? count(safety.lines.length, "line") : null,
      safety.veils.length ? count(safety.veils.length, "veil") : null,
    ].filter(Boolean);
    return [
      BOUNDARY_WORDS[safety.boundaries],
      `X-card ${onOff(safety.xCard)}`,
      lists.length ? lists.join(", ") : "no lines or veils",
      STRICTNESS_WORDS[gm.strictness],
      gm.tone.length ? gm.tone.join(", ") : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const tone = gm.tone.map((entry) => t(summaryKey(`safety.tone.${entry}`)));
  return [
    t(summaryKey(`safety.boundary.${safety.boundaries}`)),
    t(summaryKey("safety.xCard"), { state: translatedOnOff(safety.xCard, t) }),
    safety.lines.length || safety.veils.length
      ? t(summaryKey("safety.counts"), { lines: safety.lines.length, veils: safety.veils.length })
      : t(summaryKey("safety.noLinesVeils")),
    t(summaryKey(`safety.strictness.${gm.strictness}`)),
    tone.length ? tone.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function aiSummary(draft: CampaignDraft, t?: SummaryTranslator): string {
  if (!t) {
    return [
      `story setup ${onOff(draft.aiStorySetup)}`,
      `outcome check ${onOff(draft.narrationGuard)}`,
      `living world ${onOff(draft.worldSimulation)}`,
      `allies: ${ALLY_WORDS[draft.companions]}`,
    ].join(" · ");
  }
  return [
    t(summaryKey("ai.storySetup"), { state: translatedOnOff(draft.aiStorySetup, t) }),
    t(summaryKey("ai.outcomeCheck"), { state: translatedOnOff(draft.narrationGuard, t) }),
    t(summaryKey("ai.livingWorld"), { state: translatedOnOff(draft.worldSimulation, t) }),
    t(summaryKey("ai.allies"), { mode: t(messageKey(`createCampaign.experience.narration.allies.mode.${draft.companions}`)) }),
  ].join(" · ");
}

export function bondsSummary(
  draft: Pick<CampaignDraft, "relationships" | "romance">,
  t?: SummaryTranslator,
): string {
  if (!t) {
    if (draft.relationships === "off") {
      return "Bonds off";
    }
    return draft.romance === "off" ? "Bonds on, romance off" : "Bonds and romance on";
  }
  if (draft.relationships === "off") return t(summaryKey("bonds.off"));
  return t(summaryKey(draft.romance === "off" ? "bonds.onRomanceOff" : "bonds.onRomanceOn"));
}

export function playersSummary(draft: CampaignDraft, gates: WizardGates, t?: SummaryTranslator): string {
  if (!t) {
    return [
      draft.multiCharacter === "off" ? "one character each" : draft.multiCharacter === "one_active" ? "several characters, one at a time" : "several characters, all fielded",
      gates.solo ? null : `joining mid-game ${draft.midGameJoinOpen ? "open" : "closed"}`,
      gates.solo ? null : draft.holdSubmissions ? "held responses" : null,
      draft.inventoryApprovals || draft.vitalsApprovals ? "players confirm changes" : "changes apply at once",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const multi = draft.multiCharacter === "off"
    ? "oneEach"
    : draft.multiCharacter === "one_active"
      ? "severalOne"
      : "severalAll";
  return [
    t(messageKey(`createCampaign.experience.multiCharacter.${multi}`)),
    gates.solo ? null : t(summaryKey(draft.midGameJoinOpen ? "players.join.open" : "players.join.closed")),
    gates.solo || !draft.holdSubmissions ? null : t(summaryKey("players.heldResponses")),
    t(summaryKey(draft.inventoryApprovals || draft.vitalsApprovals ? "players.confirmChanges" : "players.applyChanges")),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function boardSummary(
  draft: Pick<CampaignDraft, "boardDrawing" | "enemyIntent">,
  t?: SummaryTranslator,
): string {
  if (!t) return `Drawing ${onOff(draft.boardDrawing)} · enemy intent ${draft.enemyIntent ? "shown" : "hidden"}`;
  return [
    t(summaryKey("board.drawing"), { state: translatedOnOff(draft.boardDrawing, t) }),
    t(summaryKey(draft.enemyIntent ? "board.enemyIntent.shown" : "board.enemyIntent.hidden")),
  ].join(" · ");
}

export function variantSummary(draft: Pick<CampaignDraft, "variantRules">, t?: SummaryTranslator): string {
  const { restVariant, ...toggles } = draft.variantRules;
  const on = Object.values(toggles).filter(Boolean).length;
  if (!t) return `${on ? `${on} on` : "None on"} · ${REST_WORDS[restVariant]}`;
  return [
    on ? t(summaryKey("variant.ruleCount"), { count: on }) : t(summaryKey("variant.noneOn")),
    t(messageKey(`createCampaign.experience.variantRules.rest.${restVariant}`)),
  ].join(" · ");
}

export function voiceChatSummary(draft: Pick<CampaignDraft, "voiceChat">, t?: SummaryTranslator): string {
  return voiceSummary(draft.voiceChat, t);
}

// The live table's settings call it `voice`; the creator's draft `voiceChat`.
export function voiceSummary(voice: CampaignDraft["voiceChat"], t?: SummaryTranslator): string {
  if (!t) {
    if (!voice.enabled) return "Off";
    const turns = { off: "turns ignored", soft: "turns shown", strict: "turns enforced" }[voice.turnEnforcement];
    return ["On", turns, voice.rules.proximity ? `proximity, ${voice.rules.hearingRangeFeet} ft` : null].filter(Boolean).join(" · ");
  }
  if (!voice.enabled) return t(summaryKey("voice.off"));
  return [
    t(summaryKey("voice.on")),
    t(summaryKey(`voice.turn.${voice.turnEnforcement}`)),
    voice.rules.proximity ? t(summaryKey("voice.proximity"), { feet: voice.rules.hearingRangeFeet }) : null,
  ].filter(Boolean).join(" · ");
}

// Whether the table has rules beyond the book: any variant rule, a rest
// variant, or house rules typed here.
export function customRules(draft: CampaignDraft, t?: SummaryTranslator): string | null {
  const { restVariant, ...toggles } = draft.variantRules;
  const on = Object.values(toggles).filter(Boolean).length;
  if (!t) {
    const parts = [
      on ? count(on, "variant rule") : null,
      restVariant !== "standard" ? REST_WORDS[restVariant] : null,
      draft.houseRules.trim() ? "house rules" : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  const parts = [
    on ? t(summaryKey("customRules.variantCount"), { count: on }) : null,
    restVariant !== "standard" ? t(messageKey(`createCampaign.experience.variantRules.rest.${restVariant}`)) : null,
    draft.houseRules.trim() ? t(summaryKey("customRules.houseRules")) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
