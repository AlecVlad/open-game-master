import { STAGES, isStageEnabled } from "@/lib/dm/stages";
import type { GameSettings } from "@/lib/schemas/game-settings";
import { DELEGATIONS } from "@/lib/dm/delegation";
import { CAMPAIGN_LENGTH_LABELS, TABLE_LANGUAGE_LABELS } from "@/lib/schemas/game-settings-options";
import { bondsSummary, boardSummary, safetySummary, voiceSummary, type SummaryTranslator } from "@/app/create-campaign/summaries";
import { formatMeasurementText } from "@/lib/measurement-system";
import { textKey } from "@/lib/language/text-logic";

// The live table's settings, in the named groups the campaign creator taught
// (src/app/create-campaign/groups.ts): a lead who met "Bonds and romance"
// while making the table finds it under the same name in the lobby and in
// play. Which groups a table shows, what each says on its closed face, and
// which group holds a row another panel links to. Pure, for
// scripts/test-table-settings-groups.mjs.

export type TableGroupId =
  | "world"
  | "character"
  | "narration"
  | "atmosphere"
  | "safety"
  | "ai"
  | "memory"
  | "bonds"
  | "players"
  | "console"
  | "board"
  | "voiceChat";

export type TableGroup = { id: TableGroupId; title: string; glyph: string };

// What the panel needs to know besides the settings themselves.
export type TableGroupContext = {
  // The name of the world pack, when the table has one installed here.
  packName: string | null;
  // The genre preset's name, for a table without a pack.
  genreName: string;
  // The narration voice's display name.
  voiceName: string;
  // Narration is off for the whole server (Admin > Speech).
  narrationOff: boolean;
  // The server's own rule for rolled stats, in words.
  statsRule: string;
  // A lasting AI companion can travel with this party (src/lib/schemas/
  // game-settings.ts resolveCompanionMode is full, or one already does).
  lastingCompanions?: boolean;
};

const ORDER: TableGroupId[] = [
  "world",
  "character",
  "narration",
  "atmosphere",
  "safety",
  "ai",
  "memory",
  "bonds",
  "players",
  "console",
  "board",
  "voiceChat",
];

const GLYPHS: Record<TableGroupId, string> = {
  world: "system-world",
  character: "tab-characters",
  narration: "cue-bell",
  atmosphere: "tab-ambience",
  safety: "ui-lock",
  ai: "ui-ai",
  memory: "tab-facts",
  bonds: "tab-bonds",
  players: "tab-party",
  console: "tab-dm",
  board: "tab-battle",
  voiceChat: "ui-voice",
};

const onOff = (on: boolean) => (on ? "on" : "off");
const gameSettingsKey = (part: string): Parameters<SummaryTranslator>[0] =>
  `campaign.gameSettings.${part}` as Parameters<SummaryTranslator>[0];
const createCampaignKey = (part: string): Parameters<SummaryTranslator>[0] =>
  `createCampaign.${part}` as Parameters<SummaryTranslator>[0];
const settingText = (
  t: SummaryTranslator | undefined,
  part: string,
  fallback: string,
  params?: Parameters<SummaryTranslator>[1],
) => t ? t(gameSettingsKey(part), params) : fallback;
const HP_WORDS = { average: "average hit points", rolled: "rolled hit points", max: "maximum hit points" } as const;
const ALLY_WORDS = { auto: "automatic", full: "party members and guests", guests: "guests only", off: "off" } as const;

// The allies row lives in this group at a table a person runs too, where
// it shows only once an Off or guests-only setting shuts companions out.
export function alliesShown(settings: GameSettings): boolean {
  return settings.dmMode !== "human" || settings.companions === "off" || settings.companions === "guests";
}

// Companion conscience (issue 503) shows only where it can matter: bonds on
// and a lasting companion possible at this table (settings rule 4).
export function conscienceShown(settings: GameSettings, lastingCompanions: boolean): boolean {
  return settings.relationships !== "off" && lastingCompanions;
}

const CONSCIENCE_WORDS = { off: "off", talk: "talk only", leave: "may leave", turn: "may turn" } as const;

function title(id: TableGroupId, settings: GameSettings, t?: SummaryTranslator): string {
  const aiNarrates = settings.dmMode !== "human";
  const part = id === "ai" && !aiNarrates ? "allies" : id;
  const fallback: Record<string, string> = {
    world: "World and story",
    character: "Character creation",
    narration: "Narration and character voices",
    atmosphere: "Atmosphere",
    safety: "Safety and boundaries",
    ai: "AI storytelling and allies",
    allies: "Allies",
    memory: "Narrator memory",
    bonds: "Bonds and romance",
    players: "Players and permissions",
    console: "GM reminders",
    board: "Battle board",
    voiceChat: "Live voice chat",
  };
  return settingText(t, `group.title.${part}`, fallback[part]);
}



function shown(id: TableGroupId, settings: GameSettings): boolean {
  const aiNarrates = settings.dmMode !== "human";
  if (id === "ai") return aiNarrates || alliesShown(settings);
  // The narrator's pipeline only exists where the AI narrates.
  if (id === "memory") return aiNarrates;
  // Only the DM seat is ever nudged to write the story down.
  if (id === "console") return settings.dmMode !== "ai";
  return true;
}

// The groups this table shows, in the creator's order.
export function tableGroups(settings: GameSettings, t?: SummaryTranslator): TableGroup[] {
  return ORDER.filter((id) => shown(id, settings)).map((id) => ({
    id,
    title: title(id, settings, t),
    glyph: GLYPHS[id],
  }));
}



const ASSIST_WORDS = { monsters: "the monsters", narration: "reading beats aloud", cover: "covering for you" } as const;

function assistWords(settings: GameSettings, t?: SummaryTranslator): string {
  const helps = DELEGATIONS
    .filter((which) => settings.dmAssist[which])
    .map((which) =>
      t
        ? t(gameSettingsKey(`ai.delegation.${which}`))
        : ASSIST_WORDS[which],
    );
  return helps.length
    ? settingText(t, "summary.aiHelps", `AI helps with ${helps.join(", ")}`, { tasks: helps.join(", ") })
    : settingText(t, "summary.aiHelpsNone", "AI helps with nothing");
}



// The line on a closed group's face: what is set inside, never a count to
// fill up.
export function tableGroupSummary(
  id: TableGroupId,
  settings: GameSettings,
  context: TableGroupContext,
  t?: SummaryTranslator,
): string {
  const aiNarrates = settings.dmMode !== "human";
  const s = (part: string, fallback: string, params?: Parameters<SummaryTranslator>[1]) =>
    settingText(t, part, fallback, params);
  switch (id) {
    case "world":
      return [
        context.packName ?? (t
          ? t(gameSettingsKey(`genre.${settings.genre}`))
          : context.genreName),
        t
          ? t(createCampaignKey(`identity.tableLanguage.${settings.tableLanguage}`))
          : TABLE_LANGUAGE_LABELS[settings.tableLanguage],
        s(
          settings.measurementSystem === "si" ? "summary.units.si" : "summary.units.imperial",
          settings.measurementSystem === "si" ? "SI" : "Imperial",
        ),
        aiNarrates
          ? s(`summary.length.${settings.campaignLength}`, `${CAMPAIGN_LENGTH_LABELS[settings.campaignLength].split(" (")[0]} campaign`)
          : null,
      ].filter(Boolean).join(" · ");
    case "character":
      return [
        s(`summary.hp.${settings.hpMethod ?? "average"}`, HP_WORDS[settings.hpMethod ?? "average"]),
        s(
          `summary.wealth.${settings.startingWealth === "rolled" ? "rolled" : "equipment"}`,
          settings.startingWealth === "rolled" ? "rolled gold" : "starting kit",
        ),
        s(
          settings.dicePolicy === "real_allowed" ? "summary.dice.real" : "summary.dice.digital",
          settings.dicePolicy === "real_allowed" ? "real dice allowed" : "digital dice",
        ),
        context.statsRule,
        s(
          settings.multiclassingEnabled ? "summary.multiclass.on" : "summary.multiclass.off",
          `multiclassing ${onOff(settings.multiclassingEnabled)}`,
        ),
      ].join(" · ");
    case "narration":
      if (context.narrationOff) {
        return s("summary.narration.serverOff", "Off on this server: nothing is read aloud");
      }
      return settings.ttsEnabled
        ? s("summary.narration.on", `Narration on (${context.voiceName})`, { voice: context.voiceName })
        : s("summary.narration.off", "Off: nothing is read aloud");
    case "atmosphere":
      return [
        s(settings.mapsEnabled ? "summary.maps.on" : "summary.maps.off", `maps ${onOff(settings.mapsEnabled)}`),
        settings.ambienceEnabled
          ? settings.ambienceAuto
            ? s("summary.ambience.auto", "ambience on, follows the scene")
            : s("summary.ambience.on", "ambience on")
          : s("summary.ambience.off", "ambience off"),
        s(
          settings.presentation === "theatre" ? "summary.theatre.on" : "summary.theatre.off",
          `theatre inserts ${onOff(settings.presentation === "theatre")}`,
        ),
      ].join(" · ");
    case "safety":
      return safetySummary(settings, t);
    case "ai": {
      const parts = [
        settings.dmMode === "assisted" ? assistWords(settings, t) : null,
        aiNarrates
          ? t
            ? t(createCampaignKey("summary.ai.storySetup"), { state: t(gameSettingsKey(settings.aiStorySetup ? "state.on" : "state.off")) })
            : `story setup ${onOff(settings.aiStorySetup)}`
          : null,
        aiNarrates
          ? t
            ? t(createCampaignKey("summary.ai.outcomeCheck"), { state: t(gameSettingsKey(settings.narrationGuard ? "state.on" : "state.off")) })
            : `outcome check ${onOff(settings.narrationGuard)}`
          : null,
        aiNarrates && settings.narrationLength !== "standard"
          ? s(`summary.narrationLength.${settings.narrationLength}`, `${settings.narrationLength} narration`)
          : null,
        aiNarrates && settings.styleNotes ? s("summary.styleNotes", "style notes set") : null,
        aiNarrates && (settings.combatPace ?? "balanced") !== "balanced"
          ? s(
            settings.combatPace === "rare" ? "summary.combatPace.rare" : "summary.combatPace.frequent",
            settings.combatPace === "rare" ? "fewer fights" : "more fights",
          )
          : null,
        aiNarrates
          ? t
            ? t(createCampaignKey("summary.ai.livingWorld"), { state: t(gameSettingsKey(settings.worldSimulation ? "state.on" : "state.off")) })
            : `living world ${onOff(settings.worldSimulation)}`
          : null,
        alliesShown(settings)
          ? t
            ? t(createCampaignKey("summary.ai.allies"), {
              mode: t(gameSettingsKey(`option.companions.${settings.companions}`)),
            })
            : `allies: ${ALLY_WORDS[settings.companions]}`
          : null,
      ];
      return parts.filter(Boolean).join(" · ");
    }
    case "memory": {
      const off = STAGES.filter((stage) => !isStageEnabled(settings.stages, stage.id));
      if (!off.length) return s("summary.memory.allOn", "Everything on, as most tables keep it");
      const names = off.map((stage) =>
        t ? t(gameSettingsKey(`memory.${stage.id}.label`)).toLowerCase() : stage.label.toLowerCase(),
      );
      return s("summary.memory.off", `Off: ${names.join(", ")}`, { stages: names.join(", ") });
    }
    case "bonds": {
      const summary = bondsSummary(settings, t);
      return conscienceShown(settings, context.lastingCompanions ?? false)
        ? s(
          "summary.bonds.conscience",
          `${summary} · companions ${CONSCIENCE_WORDS[settings.companionConscience ?? "leave"]}`,
          {
            summary,
            mode: t
              ? t(gameSettingsKey(`option.conscience.${settings.companionConscience ?? "leave"}`))
              : CONSCIENCE_WORDS[settings.companionConscience ?? "leave"],
          },
        )
        : summary;
    }
    case "players":
      return [
        t
          ? t(createCampaignKey(settings.midGameJoinOpen ? "summary.players.join.open" : "summary.players.join.closed"))
          : `joining mid-game ${settings.midGameJoinOpen ? "open" : "closed"}`,
        settings.holdSubmissions
          ? t ? t(createCampaignKey("summary.players.heldResponses")) : "held responses"
          : null,
        settings.waitForTable
          ? s("summary.players.waitsForTable", "GM waits for the table")
          : null,
        t
          ? t(createCampaignKey(settings.inventoryApprovals || settings.vitalsApprovals
            ? "summary.players.confirmChanges"
            : "summary.players.applyChanges"))
          : settings.inventoryApprovals || settings.vitalsApprovals
            ? "players confirm changes"
            : "changes apply at once",
      ].filter(Boolean).join(" · ");
    case "console": {
      const { messages, rolls } = settings.beatReminder;
      if (!messages && !rolls) return s("summary.console.never", "Never reminded");
      const plural = (count: number) => {
        const lastTwo = count % 100;
        const last = count % 10;
        return last === 1 && lastTwo !== 11
          ? "one"
          : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
            ? "few"
            : "many";
      };
      const actions = messages
        ? s(`summary.console.afterAction.${plural(messages)}`, `after ${messages} actions`, { count: messages })
        : null;
      const rollCount = rolls
        ? s(`summary.console.afterRoll.${plural(rolls)}`, `after ${rolls} rolls`, { count: rolls })
        : null;
      return actions && rollCount
        ? s("summary.console.both", `${actions} or ${rollCount}`, { actions, rolls: rollCount })
        : actions ?? rollCount ?? "";
    }
    case "board":
      return boardSummary(settings, t);
    case "voiceChat":
      return formatMeasurementText(voiceSummary(settings.voice, t), settings.measurementSystem, settings.tableLanguage);
  }
}



// Rows other panels link to (data-settings-row), and the group holding each,
// so a link can open the group before it brings the row into view.
export const ROW_GROUP: Record<string, TableGroupId> = {
  allies: "ai",
};

// Words a person might search for that the group's title and summary do not
// say: the controls' own labels and the everyday names for them.
const KEYWORDS: Record<TableGroupId, string> = {
  world: "world pack setting genre universe language length saga custom мир сеттинг жанр вселенная язык длительность сага",
  character: "dice real dice digital hit points hp level wealth gold kit gear stats ability scores reroll 4d6 multiclass multiclassing class кости хиты здоровье уровень богатство золото снаряжение характеристики переброс класс",
  narration: "narration narrator voice voices read aloud speech tts speak pace character voices volume озвучивание рассказчик голос голоса речь темп персонажи громкость",
  atmosphere: "maps map ambience music sound audio scene theatre inserts faces portraits карты атмосфера музыка звук сцена театр портреты",
  safety: "safety x-card lines veils boundaries content tone strictness dc family mature безопасность ограничения запреты темы границы тон",
  ai: "ai story setup plot outcome check prose narration length short rich verbose style notes voice pacing living world simulation allies companions guests party members assist monsters cover ии сюжет подготовка проверка повествование длина стиль голоса живой мир симуляция союзники спутники гости чудовища",
  memory: "memory history compaction recall retrieval rules lore chapter summaries stages model advanced память история сжатие поиск воспоминания правила лор главы итоги этапы модель",
  bonds: "bonds relationships standing romance conscience companions values deeds ultimatum leave turn связи отношения репутация романтика совесть спутники ценности поступки ультиматум уход предательство",
  players: "players permissions mid-game joining invite held responses floor item offers loot gold vitals damage healing approvals confirm игроки разрешения присоединение приглашение ответы предметы добыча золото урон лечение подтверждение",
  console: "gm dm reminders remind nudge beats record ведущий напоминания действия броски записать",
  board: "battle board draw drawing enemy intent поле бой рисование противник намерения",
  voiceChat: "voice chat call microphone mic talk proximity hearing whisper shout walls downed deaf transcription transcribe turns голосовой чат звонок микрофон речь расстояние слух шёпот крик стены без сознания расшифровка очередь",
};

// Whether a group answers what was typed into the panel's search: every word
// must appear in its title, its summary or its keywords.
export function groupMatches(group: TableGroup, summary: string, query: string): boolean {
  const words = textKey(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = textKey(`${group.title} ${summary} ${KEYWORDS[group.id]}`);
  return words.every((word) => haystack.includes(word));
}
