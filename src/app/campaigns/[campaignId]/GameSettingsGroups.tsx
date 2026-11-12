"use client";

import { STAGES, isStageEnabled } from "@/lib/dm/stages";
import { DELEGATIONS } from "@/lib/dm/delegation";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/provider";
import { formatFeet, formatMeasurementText } from "@/lib/measurement-system";
import { Tooltip } from "@/components/ui/Tooltip";
import { InfoButton } from "@/components/ui/InfoDialog";
import { SettingToggle, panelField } from "./PanelKit";
import { cn } from "@/lib/cn";
import { GENRE_PRESETS, type GenrePreset } from "@/lib/genres";
import type { WorldPackSummary } from "@/lib/worlds/types";
import { WorldPackGallery } from "@/components/WorldPackGallery";
import { NarratorLanguageNote, VoicePicker } from "@/components/VoicePicker";
import { NarrationNote } from "@/app/campaigns/[campaignId]/NarrationNote";
import { CharacterVoices } from "@/app/campaigns/[campaignId]/CharacterVoices";
import { VoicePreviewButton } from "@/components/VoicePreviewButton";
import { SafetyToneFields } from "@/components/SafetyToneFields";
import type { GameSettings } from "@/lib/schemas/game-settings";
import { REROLL_LOW_DEFAULT, rerollBelowFor, rerollChoiceOf, type RerollChoice } from "@/lib/srd/ability-rerolls";
import {
  CAMPAIGN_LENGTHS,
  CONSCIENCE_SETTINGS,
  HP_METHODS,
  STARTING_WEALTH,
  TABLE_LANGUAGE_LABELS,
  TABLE_LANGUAGES,
  type CampaignLengthSetting,
  type ConscienceSetting,
  type DicePolicy,
  type Genre,
  type MeasurementSystem,
  type TableLanguage,
} from "@/lib/schemas/game-settings-options";
import { alliesShown, conscienceShown } from "@/app/campaigns/[campaignId]/table-settings-groups";
import { NarrationStyleRows } from "@/app/campaigns/[campaignId]/NarrationStyleRows";

// The bodies of the table settings' named groups (table-settings-groups.ts
// names them and says what each holds on its closed face). Every control is
// the one the single long panel drew, with the same tooltip and the same
// immediate PATCH; only the grouping changed.

type Patch = (update: Partial<GameSettings>) => void;
type Base = { settings: GameSettings; patch: Patch };

// Short forms of the character-rule settings for a settings row; the long
// forms live in game-settings-options.ts.
export const HP_METHOD_SHORT: Record<GameSettings["hpMethod"], string> = {
  average: "HP: average each level",
  rolled: "HP: rolled each level",
  max: "HP: maximum each level",
};
export const WEALTH_SHORT: Record<GameSettings["startingWealth"], string> = {
  equipment: "Start: class kit and coin",
  rolled: "Start: rolled gold, buy gear",
};

// A select is as wide as its longest option, and a flex item will not
// shrink below that on its own, so a world pack with a long name used to
// push the whole panel sideways on a phone. Capped at the row's width and
// ellipsised instead.
const selectClass = "min-w-0 max-w-full";

export function WorldGroup({
  settings,
  patch,
  packs,
  selectedPack,
  preset,
}: Base & { packs: WorldPackSummary[]; selectedPack: WorldPackSummary | null; preset: GenrePreset }) {
  const aiNarrates = settings.dmMode !== "human";
  const { t } = useI18n();
  return (
    <>
      {packs.length ? (
        <div className="reveal flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.world.group")}</span>
          <Select
            size="sm"
            label={t("campaign.gameSettings.world.pack.label")}
            value={settings.worldPack}
            placeholder={t("campaign.gameSettings.world.pack.none")}
            onChange={(value) => {
              const next = packs.find((entry) => entry.id === value);
              // Genre moves with the pack, so a campaign never ends up in a
              // world whose base genre contradicts it.
              patch(next ? { worldPack: next.id, genre: next.baseGenre } : { worldPack: "" });
            }}
            options={[{ value: "", label: t("campaign.gameSettings.world.pack.none") }, ...packs.map((entry) => ({ value: entry.id, label: entry.name, hint: entry.inspiredBy }))]}
            className={selectClass}
          />
          <span className="text-stone-500">
            {selectedPack
              ? selectedPack.inspiredBy
              : t("campaign.gameSettings.world.pack.hint")}
          </span>
        </div>
      ) : null}
      {selectedPack?.cover ? (
        <div className="reveal flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedPack.cover}
            alt=""
            className="h-20 w-36 rounded-md border border-amber-500/30 object-cover shadow-[0_2px_8px_rgba(4,2,12,0.5)]"
          />
        </div>
      ) : null}
      {selectedPack ? <WorldPackGallery packId={selectedPack.id} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.world.setting")}</span>
        <Select<Genre>
          size="sm"
          label={t("campaign.gameSettings.world.setting")}
          value={settings.genre}
          onChange={(genre) =>
            // Changing the genre by hand drops the pack, for the same reason
            // the creation dialog does: a pack IS its baseGenre plus
            // overrides, so the two must never disagree.
            patch({ genre, ...(settings.worldPack ? { worldPack: "" } : {}) })
          }
          options={GENRE_PRESETS.map((entry) => ({ value: entry.id as Genre, label: t(`campaign.gameSettings.genre.${entry.id}`) }))}
          className={selectClass}
        />
        <span className="text-stone-500">{t(`campaign.gameSettings.genre.blurb.${settings.genre}`)}</span>
      </div>
      {settings.genre === "custom" ? (
        <div className="reveal flex items-start gap-2">
          <span className="pk-rowlabel pt-1">World</span>
          <textarea
            defaultValue={settings.customGenreText}
            rows={2}
            maxLength={500}
            onBlur={(event) => patch({ customGenreText: event.target.value })}
            placeholder={t("campaign.gameSettings.world.customPlaceholder")}
            aria-label={t("campaign.gameSettings.world.customAria")}
            className={cn(panelField, "w-auto flex-1")}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.world.language")}</span>
        <Select<TableLanguage>
          size="sm"
          label={t("campaign.gameSettings.world.tableLanguage")}
          value={settings.tableLanguage}
          onChange={(tableLanguage) => patch({ tableLanguage })}
          options={TABLE_LANGUAGES.map((value) => ({ value, label: TABLE_LANGUAGE_LABELS[value] }))}
          className={selectClass}
        />
        <span className="text-stone-500">{t("campaign.gameSettings.world.languageHelp")}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("measurement.system.label")}</span>
        <Select<MeasurementSystem>
          size="sm"
          label={t("measurement.system.label")}
          value={settings.measurementSystem}
          onChange={(measurementSystem) => patch({ measurementSystem })}
          options={[
            { value: "si", label: t("measurement.system.si") },
            { value: "imperial", label: t("measurement.system.imperial") },
          ]}
          className={selectClass}
        />
        <span className="text-stone-500">{t("measurement.system.hint")}</span>
      </div>
      {aiNarrates ? (
        <div className="reveal flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.world.length")}</span>
          <Tooltip content={t("campaign.gameSettings.world.lengthHint")}>
            <span className="inline-flex min-w-0 max-w-full">
              <Select<CampaignLengthSetting>
                size="sm"
                label={t("campaign.gameSettings.world.length")}
                value={settings.campaignLength}
                onChange={(campaignLength) => patch({ campaignLength })}
                options={CAMPAIGN_LENGTHS.map((value) => ({ value, label: t(`campaign.gameSettings.world.lengthOption.${value}`) }))}
                className={selectClass}
              />
            </span>
          </Tooltip>
        </div>
      ) : null}
    </>
  );
}

export function CharacterGroup({ settings, patch, serverRerollLabel }: Base & { serverRerollLabel: string }) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.character.dice")}</span>
        <Tooltip content={t("campaign.gameSettings.character.diceHint")}>
          <span className="inline-flex min-w-0 max-w-full">
            <Select<DicePolicy>
              size="sm"
              label={t("campaign.gameSettings.character.dice")}
              value={settings.dicePolicy}
              onChange={(dicePolicy) => patch({ dicePolicy })}
              options={[
                { value: "digital_only", label: t("campaign.gameSettings.character.dice.digital"), icon: { kind: "glyph", key: "tab-dice" } },
                { value: "real_allowed", label: t("campaign.gameSettings.character.dice.real"), icon: { kind: "glyph", key: "die-d20" } },
              ]}
              className={selectClass}
            />
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.character.heroes")}</span>
        <Tooltip content={t("campaign.gameSettings.character.hpHint")}>
          <span className="inline-flex min-w-0 max-w-full">
            <Select
              size="sm"
              label={t("campaign.gameSettings.character.hp")}
              value={settings.hpMethod ?? "average"}
              onChange={(value) => patch({ hpMethod: value as GameSettings["hpMethod"] })}
              options={HP_METHODS.map((method) => ({ value: method, label: t(`campaign.gameSettings.character.hpOption.${method}`) }))}
              className={selectClass}
            />
          </span>
        </Tooltip>
        <Tooltip content={t("campaign.gameSettings.character.wealthHint")}>
          <span className="inline-flex min-w-0 max-w-full">
            <Select
              size="sm"
              label={t("campaign.gameSettings.character.wealth")}
              value={settings.startingWealth ?? "equipment"}
              onChange={(value) => patch({ startingWealth: value as GameSettings["startingWealth"] })}
              options={STARTING_WEALTH.map((method) => ({ value: method, label: t(`campaign.gameSettings.character.wealthOption.${method}`) }))}
              className={selectClass}
            />
          </span>
        </Tooltip>
        <Tooltip content={t("campaign.gameSettings.character.statsHint")}>
          <span className="inline-flex min-w-0 max-w-full">
            <Select
              size="sm"
              label={t("campaign.gameSettings.character.stats")}
              value={settings.abilityRerollBelow == null ? "server" : rerollChoiceOf(settings.abilityRerollBelow)}
              onChange={(value) =>
                patch({
                  abilityRerollBelow:
                    value === "server"
                      ? null
                      : rerollBelowFor(value as RerollChoice, settings.abilityRerollBelow ?? REROLL_LOW_DEFAULT),
                })
              }
              options={[
                { value: "server", label: t("campaign.gameSettings.character.stats.serverOption", { rule: serverRerollLabel }) },
                { value: "keep", label: t("campaign.gameSettings.character.stats.keepOption") },
                { value: "low", label: t("campaign.gameSettings.character.stats.lowOption", { limit: rerollBelowFor("low", settings.abilityRerollBelow ?? REROLL_LOW_DEFAULT) }) },
                { value: "free", label: t("campaign.gameSettings.character.stats.freeOption") },
              ]}
              className={selectClass}
            />
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.character.classes")}</span>
        <Tooltip content={t("campaign.gameSettings.character.multiclassHint")}>
          <SettingToggle on={settings.multiclassingEnabled} onToggle={() => patch({ multiclassingEnabled: !settings.multiclassingEnabled })}>
            {t(settings.multiclassingEnabled ? "campaign.gameSettings.character.multiclass.on" : "campaign.gameSettings.character.multiclass.off")}
          </SettingToggle>
        </Tooltip>
      </div>
    </>
  );
}

export function NarrationGroup({
  settings,
  patch,
  campaignId,
  narrating,
  narrationOff,
}: Base & { campaignId: string; narrating: boolean; narrationOff: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.narration.group")}</span>
        <SettingToggle label={t("campaign.gameSettings.narration.group")} on={narrating} disabled={narrationOff} onToggle={() => patch({ ttsEnabled: !settings.ttsEnabled })}>
          {narrating ? t("campaign.gameSettings.state.on") : narrationOff ? t("campaign.gameSettings.state.serverOff") : t("campaign.gameSettings.state.off")}
        </SettingToggle>
        {narrating ? (
          <>
            <VoicePicker size="sm" label={t("campaign.gameSettings.narration.voice")} value={settings.ttsVoice} onChange={(ttsVoice) => patch({ ttsVoice })} language={settings.tableLanguage} />
            <VoicePreviewButton voice={settings.ttsVoice} />
          </>
        ) : null}
      </div>
      {narrating ? <NarratorLanguageNote language={settings.tableLanguage} /> : null}
      {narrating ? <CharacterVoices campaignId={campaignId} settings={settings} steersStory patch={patch} /> : null}
      {narrating || narrationOff ? <NarrationNote /> : null}
      <p className="text-stone-500">
        {t("campaign.gameSettings.narration.description")}
      </p>
    </>
  );
}

export function AtmosphereGroup({
  settings,
  patch,
  steersAudio,
  ambienceInstalled,
  ambienceCounts,
}: Base & {
  steersAudio: boolean;
  ambienceInstalled: boolean;
  ambienceCounts: Record<"bed" | "music" | "sting", { installed: number; total: number }> | null;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.atmosphere.maps")}</span>
        <SettingToggle on={settings.mapsEnabled} onToggle={() => patch({ mapsEnabled: !settings.mapsEnabled })}>
          {t(settings.mapsEnabled ? "campaign.gameSettings.atmosphere.mapsOn" : "campaign.gameSettings.atmosphere.mapsOff")}
        </SettingToggle>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.atmosphere.faces")}</span>
        <Tooltip content={t("campaign.gameSettings.atmosphere.facesHint")}>
          <SettingToggle on={settings.presentation === "theatre"} onToggle={() => patch({ presentation: settings.presentation === "theatre" ? "plain" : "theatre" })}>
            {t(settings.presentation === "theatre" ? "campaign.gameSettings.atmosphere.facesOn" : "campaign.gameSettings.atmosphere.facesOff")}
          </SettingToggle>
        </Tooltip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.atmosphere.ambience")}</span>
        <SettingToggle label={t("campaign.gameSettings.atmosphere.ambience")} on={settings.ambienceEnabled} onToggle={() => patch({ ambienceEnabled: !settings.ambienceEnabled })}>
          {settings.ambienceEnabled ? t("campaign.gameSettings.state.on") : t("campaign.gameSettings.state.off")}
        </SettingToggle>
        {settings.ambienceEnabled ? (
          <Tooltip content={t("campaign.gameSettings.atmosphere.ambienceHint")}>
            <SettingToggle on={settings.ambienceAuto} onToggle={() => patch({ ambienceAuto: !settings.ambienceAuto })}>
              {settings.ambienceAuto ? t("campaign.gameSettings.atmosphere.followsScene") : t("campaign.gameSettings.atmosphere.gmSets")}
            </SettingToggle>
          </Tooltip>
        ) : null}
        {steersAudio && settings.ambienceEnabled && !ambienceInstalled ? (
          // The catalog knows the cues but no audio is on disk, so the
          // toggle above is currently a promise of silence. Say so where
          // it is being switched on rather than letting the table wonder.
          <span className="text-stone-500">
            {t("campaign.gameSettings.atmosphere.noAudioLibrary")}
          </span>
        ) : steersAudio && settings.ambienceEnabled && ambienceCounts ? (
          <span className="text-stone-500">
            {t("campaign.gameSettings.atmosphere.audioCounts", {
              roomsInstalled: ambienceCounts.bed.installed,
              roomsTotal: ambienceCounts.bed.total,
              moodsInstalled: ambienceCounts.music.installed,
              moodsTotal: ambienceCounts.music.total,
              soundsInstalled: ambienceCounts.sting.installed,
              soundsTotal: ambienceCounts.sting.total,
            })}
          </span>
        ) : null}
      </div>
    </>
  );
}

export function SafetyGroup({ settings, patch }: Base) {
  return (
    <SafetyToneFields
      safety={settings.safety}
      gm={settings.gm}
      ttsVoice={settings.ttsVoice}
      onSafety={(safety) => patch({ safety })}
      onGm={(gm) => patch({ gm })}
      onVoice={(ttsVoice) => patch({ ttsVoice })}
      tableLanguage={settings.tableLanguage}
    />
  );
}

// The Living World explainer, shared with the campaign creator's info
// button so the two never drift.
export const LIVING_WORLD_INFO = [
  "On: the world moves without you. Off-screen storylines advance on background dice each turn, so rival factions, threats, and distant events keep developing while you play.",
  "NPCs pursue their own goals between chapters and during rests and travel. Schemes progress, pressure builds, and rivals can collide with each other.",
  "The GM quietly records what happened off-screen and weaves it into future scenes, ambushes, and rumors. These simulation notes are GM-only until the party discovers them in play.",
  "Off: all of that pauses. The world changes only when your party acts or the story arc calls for it. Your main story arc, chapters, quests, and XP work exactly the same either way.",
  "You can switch this at any time. Turning it back on resumes from the world as it currently stands.",
].join("\n\n");

export function AiGroup({ settings, patch }: Base) {
  const { t } = useI18n();
  const aiNarrates = settings.dmMode !== "human";
  return (
    <>
      {settings.dmMode === "assisted" ? (
        // Only in the middle setting. A table the AI runs has nothing to
        // delegate and a table running itself has chosen not to, so showing
        // three switched-off switches in either would be noise.
        <div className="flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.ai.helps")}</span>
          {DELEGATIONS.map((which) => (
            <Tooltip key={which} content={t(`campaign.gameSettings.ai.delegationHint.${which}`)}>
              <SettingToggle
                on={settings.dmAssist[which]}
                onToggle={() => patch({ dmAssist: { ...settings.dmAssist, [which]: !settings.dmAssist[which] } })}
              >
                {t(`campaign.gameSettings.ai.delegation.${which}`)}
              </SettingToggle>
            </Tooltip>
          ))}
        </div>
      ) : null}
      {aiNarrates ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.ai.setup")}</span>
          <SettingToggle on={settings.aiStorySetup} onToggle={() => patch({ aiStorySetup: !settings.aiStorySetup })}>
            {t(settings.aiStorySetup ? "campaign.gameSettings.ai.setupOn" : "campaign.gameSettings.ai.setupOff")}
          </SettingToggle>
          <span className="text-stone-500">
            {t(settings.aiStorySetup ? "campaign.gameSettings.ai.setupHintOn" : "campaign.gameSettings.ai.setupHintOff")}
          </span>
        </div>
      ) : null}
      {aiNarrates ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.ai.prose")}</span>
          <Tooltip content={t("campaign.gameSettings.ai.outcomeCheckHint")}>
            <SettingToggle on={settings.narrationGuard} onToggle={() => patch({ narrationGuard: !settings.narrationGuard })}>
              {t(settings.narrationGuard ? "campaign.gameSettings.ai.outcomeCheckOn" : "campaign.gameSettings.ai.outcomeCheckOff")}
            </SettingToggle>
          </Tooltip>
          <span className="text-stone-500">
            {t(settings.narrationGuard ? "campaign.gameSettings.ai.outcomeCheckHintOn" : "campaign.gameSettings.ai.outcomeCheckHintOff")}
          </span>
        </div>
      ) : null}
      {aiNarrates ? <NarrationStyleRows settings={settings} patch={patch} /> : null}
      {aiNarrates ? (
        <div className="reveal flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.world.group")}</span>
          <Tooltip content={t("campaign.gameSettings.ai.livingWorldHint")}>
            <SettingToggle on={settings.worldSimulation} onToggle={() => patch({ worldSimulation: !settings.worldSimulation })}>
              {t(settings.worldSimulation ? "campaign.gameSettings.ai.livingWorldOn" : "campaign.gameSettings.ai.livingWorldOff")}
            </SettingToggle>
          </Tooltip>
          <InfoButton label={t("campaign.gameSettings.ai.livingWorldInfoLabel")} text={t("campaign.gameSettings.ai.livingWorldInfo")} />
          <span className="text-stone-500">
            {t(settings.worldSimulation ? "campaign.gameSettings.ai.livingWorldHintOn" : "campaign.gameSettings.ai.livingWorldHintOff")}
          </span>
        </div>
      ) : null}
      {/* At a table a person runs, Auto already allows the lasting allies
          the DM plays by hand, so the row stays out of the way; it shows
          when an Off or guests-only setting carried over from an AI table
          shuts them out, which is where the Party panel's handoff points
          (issue 209). */}
      {alliesShown(settings) ? (
        <div data-settings-row="allies" className="reveal flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.ai.allies")}</span>
          <Tooltip content={t("campaign.gameSettings.ai.alliesHint")}>
            <span className="inline-flex min-w-0 max-w-full">
              <Select<GameSettings["companions"]>
                size="sm"
                label={t("campaign.gameSettings.ai.companions")}
                value={settings.companions}
                onChange={(companions) => patch({ companions })}
                options={(["auto", "full", "guests", "off"] as Array<GameSettings["companions"]>).map((mode) => ({ value: mode, label: t(`campaign.gameSettings.option.companions.${mode}`) }))}
                className={selectClass}
              />
            </span>
          </Tooltip>
          {settings.companions !== "off" ? (
            <>
              {settings.companions !== "guests" ? (
                <span className="inline-flex min-w-0 max-w-full" title={t("campaign.gameSettings.ai.maxCompanions")}>
                  <Select
                    size="sm"
                    label={t("campaign.gameSettings.ai.maxCompanions")}
                    value={String(settings.maxCompanions)}
                    onChange={(value) => patch({ maxCompanions: Number(value) })}
                    options={[1, 2, 3, 4].map((count) => ({ value: String(count), label: t("campaign.gameSettings.ai.maxCompanionsOption", { count }) }))}
                    className={selectClass}
                  />
                </span>
              ) : null}
              <span className="inline-flex min-w-0 max-w-full" title={t("campaign.gameSettings.ai.maxGuests")}>
                <Select
                  size="sm"
                  label={t("campaign.gameSettings.ai.maxGuests")}
                  value={String(settings.maxGuests)}
                  onChange={(value) => patch({ maxGuests: Number(value) })}
                  options={[1, 2, 3, 4].map((count) => ({ value: String(count), label: t("campaign.gameSettings.ai.maxGuestsOption", { count }) }))}
                  className={selectClass}
                />
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// The narrator's pipeline. Optional tuning: every table starts with all of
// it on, and the line under the switches says so.
export function MemoryGroup({ settings, patch }: Base) {
  const { t } = useI18n();
  const stageCopy = {
    compaction: { label: t("campaign.gameSettings.memory.compaction.label"), description: t("campaign.gameSettings.memory.compaction.description"), cost: t("campaign.gameSettings.memory.compaction.cost") },
    recall: { label: t("campaign.gameSettings.memory.recall.label"), description: t("campaign.gameSettings.memory.recall.description"), cost: t("campaign.gameSettings.memory.recall.cost") },
    retrieval: { label: t("campaign.gameSettings.memory.retrieval.label"), description: t("campaign.gameSettings.memory.retrieval.description"), cost: t("campaign.gameSettings.memory.retrieval.cost") },
    chapterSummary: { label: t("campaign.gameSettings.memory.chapterSummary.label"), description: t("campaign.gameSettings.memory.chapterSummary.description"), cost: t("campaign.gameSettings.memory.chapterSummary.cost") },
  };
  return (
    <>
      <p className="text-stone-500">
        {t("campaign.gameSettings.memory.description")}
      </p>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {STAGES.map((stage) => {
          const on = isStageEnabled(settings.stages, stage.id);
          return (
            <Tooltip key={stage.id} content={`${stageCopy[stage.id].description} ${stageCopy[stage.id].cost}`}>
              <SettingToggle on={on} onToggle={() => patch({ stages: { ...settings.stages, [stage.id]: !on } })}>
                {stageCopy[stage.id].label} {on ? t("campaign.gameSettings.state.on") : t("campaign.gameSettings.state.off")}
                {/* Only a model-call stage buys back GPU time; saying so
                    stops an operator disabling recall expecting a speedup. */}
                <span className="ml-1 text-[11px] text-stone-500">{stage.callsModel ? t("campaign.gameSettings.memory.model") : t("campaign.gameSettings.memory.engine")}</span>
              </SettingToggle>
            </Tooltip>
          );
        })}
      </div>
    </>
  );
}

// What Companion conscience does, for its row's info button and the
// creator-free settings it lives in (issue 503).
export const CONSCIENCE_INFO = [
  "Each lasting AI companion holds a few values from its class and alignment, some of them red lines it will not see crossed.",
  "Deeds the party commits in front of them move a ladder the server keeps: content, uneasy, warning, ultimatum, breaking point. Their Bonds row shows where they stand and any ultimatum they set, with the time left on the campaign's clock. Making amends, or doing what they hold dear, climbs it back, a rung a day at most. A character who stands by while another does it bears a little of it; one who speaks against it bears none.",
  "Off: companions judge by standing alone. Talk: they object, warn and set ultimatums, and stay whatever happens. Leave (the default): past their breaking point they walk out, slip away or report the party. Turn: as Leave, and they may turn on the party in a fight, at their full strength whatever the table's difficulty; a player's command over a companion ends once it warns the party.",
].join("\n\n");

export function BondsGroup({ settings, patch, lastingCompanions = false }: Base & { lastingCompanions?: boolean }) {
  const { t } = useI18n();
  return (
    <>
    <div className="flex flex-wrap items-center gap-2">
      <span className="pk-rowlabel">{t("campaign.gameSettings.bonds.group")}</span>
      <Tooltip content={t("campaign.gameSettings.bonds.hint")}>
        <SettingToggle on={settings.relationships !== "off"} onToggle={() => patch({ relationships: settings.relationships === "off" ? "on" : "off" })}>
          {t(settings.relationships !== "off" ? "campaign.gameSettings.bonds.on" : "campaign.gameSettings.bonds.off")}
        </SettingToggle>
      </Tooltip>
      {settings.relationships !== "off" ? (
        <Tooltip content={t("campaign.gameSettings.bonds.romanceHint")}>
          <SettingToggle on={settings.romance !== "off"} onToggle={() => patch({ romance: settings.romance === "off" ? "on" : "off" })}>
            {t(settings.romance !== "off" ? "campaign.gameSettings.bonds.romanceOn" : "campaign.gameSettings.bonds.romanceOff")}
          </SettingToggle>
        </Tooltip>
      ) : null}
      <span className="text-stone-500">
        {t(settings.relationships === "off"
          ? "campaign.gameSettings.bonds.summary.off"
          : settings.romance !== "off"
            ? "campaign.gameSettings.bonds.summary.romance"
            : "campaign.gameSettings.bonds.summary.on")}
      </span>
    </div>
    {/* Only where it can matter: bonds on and a lasting companion possible
        at this table (AGENTS.md settings rule 4). */}
    {conscienceShown(settings, lastingCompanions) ? (
      <div data-settings-row="conscience" className="reveal flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.bonds.conscience")}</span>
        <Tooltip content={t("campaign.gameSettings.bonds.conscienceHint")}>
          <span className="inline-flex min-w-0 max-w-full">
            <Select<ConscienceSetting>
              size="sm"
              label={t("campaign.gameSettings.bonds.conscience")}
              value={settings.companionConscience ?? "leave"}
              onChange={(companionConscience) => patch({ companionConscience })}
              options={CONSCIENCE_SETTINGS.map((setting) => ({ value: setting, label: t(`campaign.gameSettings.option.conscience.${setting}`) }))}
              className={selectClass}
            />
          </span>
        </Tooltip>
        <InfoButton label={t("campaign.gameSettings.bonds.conscienceInfoLabel")} text={t("campaign.gameSettings.bonds.conscienceInfo")} />
        <span key={settings.companionConscience ?? "leave"} className="live-in text-stone-500">
          {t(`campaign.gameSettings.bonds.conscienceOptionHint.${settings.companionConscience ?? "leave"}`)}
        </span>
      </div>
    ) : null}
    </>
  );
}

// Wait for the table (src/lib/dm/table-wait.ts) as one picker: the DM answers
// the first post, or waits for everyone with a choice of how long a quiet
// table holds it (15 to 900 seconds allowed). A stored length that is not
// one of the choices is offered as itself.
const WAIT_CHOICES = [30, 60, 120, 180, 300, 600, 900];

// `solo`: a table of one, where nobody else could be waited for.
export function PlayersGroup({ settings, patch, solo = false }: Base & { solo?: boolean }) {
  const { t } = useI18n();
  const lengths = WAIT_CHOICES.includes(settings.waitForTableSeconds) ? WAIT_CHOICES : [...WAIT_CHOICES, settings.waitForTableSeconds].sort((a, b) => a - b);
  const pacingOptions = [
    { value: "0", label: t("campaign.gameSettings.players.firstPost") },
    ...lengths.map((seconds) => ({
      value: String(seconds),
      label: t("campaign.gameSettings.players.waitForTable", {
        duration: seconds % 60
          ? t("campaign.gameSettings.players.seconds", { count: seconds })
          : t("campaign.gameSettings.players.minutes", { count: seconds / 60 }),
      }),
    })),
  ];
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.players.joining")}</span>
        <Tooltip content={t("campaign.gameSettings.players.joiningHint")}>
          <SettingToggle on={settings.midGameJoinOpen} onToggle={() => patch({ midGameJoinOpen: !settings.midGameJoinOpen })}>
            {t(settings.midGameJoinOpen ? "campaign.gameSettings.players.joiningOpen" : "campaign.gameSettings.players.joiningClosed")}
          </SettingToggle>
        </Tooltip>
        <Tooltip content={t("campaign.gameSettings.players.heldHint")}>
          <SettingToggle on={settings.holdSubmissions} onToggle={() => patch({ holdSubmissions: !settings.holdSubmissions })}>
            {t(settings.holdSubmissions ? "campaign.gameSettings.players.heldOn" : "campaign.gameSettings.players.heldOff")}
          </SettingToggle>
        </Tooltip>
      </div>
      {/* Only where it can matter: an AI turn to hold, and someone else to
          wait for. */}
      {!solo && settings.dmMode !== "human" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="pk-rowlabel">{t("campaign.gameSettings.players.pacing")}</span>
          <Select
            size="sm"
            label={t("campaign.gameSettings.players.pacingLabel")}
            value={settings.waitForTable ? String(settings.waitForTableSeconds) : "0"}
            onChange={(value) => patch(Number(value) ? { waitForTable: true, waitForTableSeconds: Number(value) } : { waitForTable: false })}
            options={pacingOptions}
            className={selectClass}
          />
          <InfoButton label={t("campaign.gameSettings.players.pacingInfoLabel")} text={t("campaign.gameSettings.players.pacingInfo")} />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.players.items")}</span>
        <Tooltip content={t("campaign.gameSettings.players.itemsHint")}>
          <SettingToggle on={settings.inventoryApprovals} onToggle={() => patch({ inventoryApprovals: !settings.inventoryApprovals })}>
            {t(settings.inventoryApprovals ? "campaign.gameSettings.players.itemsOn" : "campaign.gameSettings.players.itemsOff")}
          </SettingToggle>
        </Tooltip>
        <span className="text-stone-500">
          {t(settings.inventoryApprovals ? "campaign.gameSettings.players.itemsHintOn" : "campaign.gameSettings.players.itemsHintOff")}
        </span>
      </div>
      <div className="pk-row">
        <span className="pk-rowlabel">{t("campaign.gameSettings.players.vitals")}</span>
        <Tooltip content={t("campaign.gameSettings.players.vitalsHint")}>
          <SettingToggle on={settings.vitalsApprovals} onToggle={() => patch({ vitalsApprovals: !settings.vitalsApprovals })}>
            {t(settings.vitalsApprovals ? "campaign.gameSettings.players.vitalsOn" : "campaign.gameSettings.players.vitalsOff")}
          </SettingToggle>
        </Tooltip>
        <span className="text-stone-500">
          {t(settings.vitalsApprovals ? "campaign.gameSettings.players.vitalsHintOn" : "campaign.gameSettings.players.vitalsHintOff")}
        </span>
      </div>
    </>
  );
}

// Only the DM seat is ever nudged, so this group does not exist for a table
// the AI narrates: there, the story is typed by definition.
export function ConsoleGroup({ settings, patch }: Base) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="pk-rowlabel">{t("campaign.gameSettings.console.remind")}</span>
      <Tooltip content={t("campaign.gameSettings.console.hint")}>
        <span className="inline-flex min-w-0 max-w-full">
          <Select
            size="sm"
            label={t("campaign.gameSettings.console.actionsLabel")}
            value={String(settings.beatReminder.messages)}
            onChange={(value) => patch({ beatReminder: { ...settings.beatReminder, messages: Number(value) } })}
            options={[0, 5, 10, 20, 40].map((count) => ({ value: String(count), label: count === 0 ? t("campaign.gameSettings.console.neverActions") : t("campaign.gameSettings.console.afterActions", { count }) }))}
            className={selectClass}
          />
        </span>
      </Tooltip>
      <span className="inline-flex min-w-0 max-w-full" title={t("campaign.gameSettings.console.rollTempoHint")}>
        <Select
          size="sm"
          label={t("campaign.gameSettings.console.rollsLabel")}
          value={String(settings.beatReminder.rolls)}
          onChange={(value) => patch({ beatReminder: { ...settings.beatReminder, rolls: Number(value) } })}
          options={[0, 6, 12, 24, 48].map((count) => ({ value: String(count), label: count === 0 ? t("campaign.gameSettings.console.neverRolls") : t("campaign.gameSettings.console.afterRolls", { count }) }))}
          className={selectClass}
        />
      </span>
    </div>
  );
}

export function BoardGroup({ settings, patch }: Base) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="pk-rowlabel">{t("campaign.gameSettings.board.group")}</span>
      <Tooltip content={t("campaign.gameSettings.board.drawingHint")}>
        <SettingToggle on={settings.boardDrawing} onToggle={() => patch({ boardDrawing: !settings.boardDrawing })}>
          {t(settings.boardDrawing ? "campaign.gameSettings.board.playersDraw" : "campaign.gameSettings.board.gmDraws")}
        </SettingToggle>
      </Tooltip>
      <Tooltip content={t("campaign.gameSettings.board.enemyIntentHint")}>
        <SettingToggle on={settings.enemyIntent} onToggle={() => patch({ enemyIntent: !settings.enemyIntent })}>
          {t(settings.enemyIntent ? "campaign.gameSettings.board.enemyIntentOn" : "campaign.gameSettings.board.enemyIntentOff")}
        </SettingToggle>
      </Tooltip>
    </div>
  );
}

// Live voice chat. The rules below are a list rather than a single
// proximity checkbox on purpose: "players only hear people within 30 feet"
// is one table's house rule, and the next table will want a different one.
// They are all inputs to one function (src/lib/voice/audibility.ts).
export function VoiceChatGroup({ settings, patch, transcribes }: Base & { transcribes: boolean }) {
  const { t } = useI18n();
  const rules = settings.voice.rules;
  const setRule = (change: Partial<GameSettings["voice"]["rules"]>) => patch({ voice: { ...settings.voice, rules: { ...rules, ...change } } });
  return (
    <>
      <p className="text-stone-500">
        {t("campaign.gameSettings.voiceChat.description")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="pk-rowlabel">{t("campaign.gameSettings.voiceChat.voice")}</span>
        <Tooltip content={t("campaign.gameSettings.voiceChat.voiceHint")}>
          <SettingToggle on={settings.voice.enabled} onToggle={() => patch({ voice: { ...settings.voice, enabled: !settings.voice.enabled } })}>
            {t(settings.voice.enabled ? "campaign.gameSettings.voiceChat.voiceOn" : "campaign.gameSettings.voiceChat.voiceOff")}
          </SettingToggle>
        </Tooltip>
        {settings.voice.enabled ? (
          <>
            <Tooltip content={t("campaign.gameSettings.voiceChat.turnHint")}>
              <span className="inline-flex min-w-0 max-w-full">
                <Select<"off" | "soft" | "strict">
                  size="sm"
                  label={t("campaign.gameSettings.voiceChat.turnLabel")}
                  value={settings.voice.turnEnforcement}
                  onChange={(turnEnforcement) => patch({ voice: { ...settings.voice, turnEnforcement } })}
                  options={[
                    { value: "off", label: t("campaign.gameSettings.voiceChat.turns.ignored") },
                    { value: "soft", label: t("campaign.gameSettings.voiceChat.turns.shown") },
                    { value: "strict", label: t("campaign.gameSettings.voiceChat.turns.enforced") },
                  ]}
                  className={selectClass}
                />
              </span>
            </Tooltip>
            <Tooltip
              content={
                transcribes
                  ? t("campaign.gameSettings.voiceChat.transcriptionHintOn")
                  : t("campaign.gameSettings.voiceChat.transcriptionHintOff")
              }
            >
              <SettingToggle
                on={settings.voice.transcribe && transcribes}
                disabled={!transcribes}
                onToggle={() => patch({ voice: { ...settings.voice, transcribe: !settings.voice.transcribe } })}
              >
                {t(!transcribes ? "campaign.gameSettings.voiceChat.transcriptionServerOff" : settings.voice.transcribe ? "campaign.gameSettings.voiceChat.transcriptionOn" : "campaign.gameSettings.voiceChat.transcriptionOff")}
              </SettingToggle>
            </Tooltip>
            <Tooltip content={t("campaign.gameSettings.voiceChat.proximityHint")}>
              <SettingToggle on={rules.proximity} onToggle={() => setRule({ proximity: !rules.proximity })}>
                {t(rules.proximity ? "campaign.gameSettings.voiceChat.proximityOn" : "campaign.gameSettings.voiceChat.proximityOff")}
              </SettingToggle>
            </Tooltip>
            {rules.proximity ? (
              <>
                <span className="inline-flex min-w-0 max-w-full" title={t("campaign.gameSettings.voiceChat.hearingRange")}>
                  <Select
                    size="sm"
                    label={t("campaign.gameSettings.voiceChat.hearingRange")}
                    value={String(rules.hearingRangeFeet)}
                    onChange={(value) => setRule({ hearingRangeFeet: Number(value) })}
                    options={[15, 30, 60, 120].map((feet) => ({ value: String(feet), label: formatFeet(feet, settings.measurementSystem, settings.tableLanguage) }))}
                    className={selectClass}
                  />
                </span>
                <Tooltip content={t("campaign.gameSettings.voiceChat.sayRangeHint")}>
                  <SettingToggle on={rules.sayRange} onToggle={() => setRule({ sayRange: !rules.sayRange })}>
                    {t(rules.sayRange ? "campaign.gameSettings.voiceChat.sayRangeOn" : "campaign.gameSettings.voiceChat.sayRangeOff")}
                  </SettingToggle>
                </Tooltip>
                <Tooltip content={t("campaign.gameSettings.voiceChat.wallsHint")}>
                  <SettingToggle on={rules.wallsAttenuate} onToggle={() => setRule({ wallsAttenuate: !rules.wallsAttenuate })}>
                    {t(rules.wallsAttenuate ? "campaign.gameSettings.voiceChat.wallsOn" : "campaign.gameSettings.voiceChat.wallsOff")}
                  </SettingToggle>
                </Tooltip>
              </>
            ) : null}
            <Tooltip content={t("campaign.gameSettings.voiceChat.downedHint")}>
              <SettingToggle on={rules.downedGoDeaf} onToggle={() => setRule({ downedGoDeaf: !rules.downedGoDeaf })}>
                {t(rules.downedGoDeaf ? "campaign.gameSettings.voiceChat.downedOn" : "campaign.gameSettings.voiceChat.downedOff")}
              </SettingToggle>
            </Tooltip>
          </>
        ) : null}
      </div>
    </>
  );
}
