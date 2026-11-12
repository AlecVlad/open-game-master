"use client";

import { Check, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionHead } from "@/components/ui/SectionHead";
import { PanelError } from "./PanelKit";
import { genrePreset } from "@/lib/genres";
import type { WorldPackSummary } from "@/lib/worlds/types";
import { useTtsVoices, voiceLabel } from "@/components/VoicePicker";
import { CharacterVoices } from "@/app/campaigns/[campaignId]/CharacterVoices";
import { DetailGroup } from "@/app/create-campaign/fields";
import type { GameSettings } from "@/lib/schemas/game-settings";
import { describeTableReroll } from "@/lib/srd/ability-rerolls";
import { useServerRerollBelow } from "@/app/characters/builder/useTableRules";
import { transcribesVoice, useCapabilities } from "@/lib/use-capabilities";

import {
  AiGroup,
  AtmosphereGroup,
  BoardGroup,
  BondsGroup,
  CharacterGroup,
  ConsoleGroup,
  HP_METHOD_SHORT,
  MemoryGroup,
  NarrationGroup,
  PlayersGroup,
  SafetyGroup,
  VoiceChatGroup,
  WEALTH_SHORT,
  WorldGroup,
} from "@/app/campaigns/[campaignId]/GameSettingsGroups";
import {
  conscienceShown,
  groupMatches,
  tableGroupSummary,
  tableGroups,
  type TableGroupId,
} from "@/app/campaigns/[campaignId]/table-settings-groups";

export { LIVING_WORLD_INFO } from "@/app/campaigns/[campaignId]/GameSettingsGroups";

// The same explainers as this panel's tooltips, shared with the campaign
// creator's info buttons so the two surfaces never drift apart.
export const BONDS_INFO = [
  "How each NPC and AI companion feels about each character, tracked by the server on one meter from hostile through neutral to devoted.",
  "Deeds move it, and the same deed lands differently on different people: mercy wins over a kind healer and irritates a hard-bitten mercenary.",
  "Standing shows in the Bonds tab and colors how the GM plays them. Off: the GM tracks no personal standing and NPCs react to the party as a whole.",
].join("\n\n");

export const ROMANCE_INFO = [
  "The romance ladder on top of the bond meter: interested, courting, together, betrothed, married.",
  "Nobody can be romanced who does not already like the character, nobody is courted who did not ask to be, partners keep to each other unless everyone involved is open to more than one partner, and intimate scenes always fade to black.",
  "Each step needs a little story time after the last, the other side starts scenes of their own, and every step is told to the table.",
  "Requires Bonds to be on.",
].join("\n\n");

export const NARRATION_GUARD_INFO = [
  "After each turn the server compares the GM's narration against what the dice and tools actually resolved: a hit written on a miss, a death the hit points deny, a damage number no die rolled.",
  "A contradiction is sent back to the GM once for a rewrite. It also does what the GM left undone: a spell a player asked for that the story cast is cast for real, and a kindness or flirt a player declared is recorded on their bonds.",
  "Off costs nothing but the check, and the narration is persisted exactly as written.",
].join("\n\n");

type SaveState = "idle" | "saving" | "saved" | "error";

// Which groups were left open, per campaign, for this browser tab: the
// Settings tab unmounts when another tab is picked, and coming back to a
// group you were in should not mean finding it again.
function openKey(campaignId: string) {
  return `odm.tableSettingsOpen.${campaignId}`;
}

function useOpenGroups(campaignId: string) {
  const [open, setOpen] = useState<TableGroupId[]>([]);
  useEffect(() => {
    let stored: TableGroupId[] = [];
    try {
      const raw = window.sessionStorage.getItem(openKey(campaignId));
      stored = raw ? (JSON.parse(raw) as TableGroupId[]) : [];
    } catch {
      // Storage refused: every group starts closed.
    }
    const timer = window.setTimeout(() => setOpen(Array.isArray(stored) ? stored : []), 0);
    return () => window.clearTimeout(timer);
  }, [campaignId]);
  const toggle = (id: TableGroupId, next: boolean) =>
    setOpen((current) => {
      const updated = next ? [...current.filter((entry) => entry !== id), id] : current.filter((entry) => entry !== id);
      try {
        window.sessionStorage.setItem(openKey(campaignId), JSON.stringify(updated));
      } catch {
        // Kept for this visit only.
      }
      return updated;
    });
  return { isOpen: (id: TableGroupId) => open.includes(id), toggle };
}

// The table's settings, in the lobby and in the Settings tab: whoever steers
// the story edits them live (PATCHes propagate to everyone over SSE), in the
// campaign creator's named groups; other players see a read-only summary.
export function GameSettingsPanel({
  campaignId,
  settings,
  steersStory,
  heading = true,
  solo = false,
  lastingCompanions = false,
}: {
  campaignId: string;
  settings: GameSettings;
  steersStory: boolean;
  // A table of one: the controls that wait on other players are left out.
  solo?: boolean;
  // A lasting AI companion can travel with this party, so its conscience
  // setting can matter (issue 503).
  lastingCompanions?: boolean;
  // The lobby names the section itself, so the panel's own title would say
  // "Table settings" twice.
  heading?: boolean;
}) {
  const { t } = useI18n();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const voices = useTtsVoices();
  // Narration switched off server-wide (Admin > Speech, or setup's text
  // only): the row reads Off and its switch is held, whatever the table's
  // own switch says, since nothing would be read aloud. A fresh install's
  // first table said "Narration on" with a voice picked, over a note that
  // the server had no narration (issue 275). The stored value is kept, so
  // a server that gains a speech engine later brings the table's choice
  // back. A speech server that is named but not answering is one switch
  // away, and the note under the row says so; only off holds the switch.
  const capabilities = useCapabilities();
  const narrationOff = capabilities?.tts?.provider === "off";
  const narrating = settings.ttsEnabled && !narrationOff;
  // Every control here renders the server's settings, so a refused PATCH
  // changes nothing on screen; without this line it changes nothing silently.
  const [error, setError] = useState("");
  const [packs, setPacks] = useState<WorldPackSummary[]>([]);
  const [find, setFind] = useState("");
  const groups = useOpenGroups(campaignId);
  // Whether any ambience audio is actually on disk. The library ships empty
  // (public/ambience is gitignored and filled by npm run fetch-ambience), so
  // a lead can switch ambience on and hear nothing with no clue why; this
  // powers the hint on the Ambience row. Defaults to true so the hint never
  // flashes on installs that are fine while the answer is in flight.
  const [ambienceInstalled, setAmbienceInstalled] = useState(true);
  const [ambienceCounts, setAmbienceCounts] = useState<Record<"bed" | "music" | "sting", { installed: number; total: number }> | null>(null);
  // What "the server's rule" for rolled stats is, so neither the lead's
  // choice nor a player's summary leaves it unnamed.
  const serverRerollBelow = useServerRerollBelow();
  // A server that cannot transcribe holds the Transcription switch off; the
  // table's stored choice is kept, so transcription added later brings it
  // back.
  const transcribes = transcribesVoice(capabilities);
  const serverRerollLabel = describeTableReroll(null, serverRerollBelow).toLowerCase();

  // Installed world packs, so the lead can switch worlds after creation. An
  // empty list simply hides the row.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/worlds")
      .then((response) => (response.ok ? response.json() : { packs: [] }))
      .then((data) => {
        if (!cancelled) {
          setPacks(Array.isArray(data.packs) ? data.packs : []);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Asked lazily like the world packs above, and only when the answer could
  // matter: the hint renders for the lead with ambience switched on, so
  // nobody else pays for the request.
  useEffect(() => {
    if (!steersStory || !settings.ambienceEnabled) {
      return;
    }
    let cancelled = false;
    void fetch("/api/ambience")
      .then((response) => (response.ok ? response.json() : { tracks: {} }))
      .then((data) => {
        if (!cancelled) {
          setAmbienceInstalled(Object.keys(data.tracks ?? {}).length > 0);
          setAmbienceCounts(data.counts ?? null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [steersStory, settings.ambienceEnabled]);

  // "Saved" stays a moment, then the line goes back to saying how saving works.
  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = window.setTimeout(() => setSaveState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  async function patch(update: Partial<GameSettings>) {
    setSaveState("saving");
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t("campaign.gameSettings.error.notSaved"));
        setSaveState("error");
        return;
      }
      setSaveState("saved");
    } catch {
      setError(t("campaign.session.networkError"));
      setSaveState("error");
    }
  }

  const preset = genrePreset(settings.genre);
  const selectedPack = packs.find((entry) => entry.id === settings.worldPack) ?? null;

  if (!steersStory) {
    return (
      <section className="panel mb-6 rounded-xl p-4" data-table-settings="read">
        {heading ? <SectionHead title={t("campaign.gameSettings.title")} glyph="tab-settings" level="h2" /> : null}
        <p className="mb-2 text-xs text-stone-500">
          {settings.dmMode === "ai" ? t("campaign.gameSettings.readOnly.lead") : t("campaign.gameSettings.readOnly.gm")}
        </p>
        <div className="stagger flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-stone-300">
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "system-region" }} size="size-5" />
            {selectedPack?.name ?? preset.name}
            {settings.dmMode === "human" ? ` · ${t("campaign.gameSettings.summary.dm.human")}` : settings.dmMode === "steered" ? ` · ${t("campaign.gameSettings.summary.dm.steered")}` : ""}
            {settings.dmMode !== "human" && settings.aiStorySetup ? ` · ${t("campaign.gameSettings.summary.aiStorySetup")}` : ""}
            {settings.dmMode !== "human"
              ? ` · ${t(`campaign.gameSettings.summary.length.${settings.campaignLength}`)}`
              : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "tab-dice" }} size="size-5" />
            {t(settings.dicePolicy === "real_allowed" ? "campaign.gameSettings.summary.dice.real" : "campaign.gameSettings.summary.dice.digital")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "cue-bell" }} size="size-5" />
            {narrating
              ? t("campaign.gameSettings.summary.narration.on", { voice: voiceLabel(voices, settings.ttsVoice) })
              : narrationOff
                ? t("campaign.gameSettings.summary.narration.serverOff")
                : t("campaign.gameSettings.summary.narration.off")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "tab-ambience" }} size="size-5" />
            {settings.ambienceEnabled
              ? settings.ambienceAuto ? t("campaign.gameSettings.summary.ambience.auto") : t("campaign.gameSettings.summary.ambience.on")
              : t("campaign.gameSettings.summary.ambience.off")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "tab-map" }} size="size-5" />
            {t(settings.mapsEnabled ? "campaign.gameSettings.summary.maps.on" : "campaign.gameSettings.summary.maps.off")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "rest-level-up" }} size="size-5" />
            {t(settings.multiclassingEnabled ? "campaign.gameSettings.summary.multiclass.on" : "campaign.gameSettings.summary.multiclass.off")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "rest-hp" }} size="size-5" />
            {t(`campaign.gameSettings.summary.hp.${settings.hpMethod ?? "average"}`)}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "coin-gp" }} size="size-5" />
            {t(`campaign.gameSettings.summary.wealth.${settings.startingWealth ?? "equipment"}`)}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "die-d6" }} size="size-5" />
            {(() => {
              const setting = settings.abilityRerollBelow;
              const rule = typeof setting === "number" ? setting : serverRerollBelow;
              if (rule === null) return t("campaign.gameSettings.summary.stats.serverUnknown");
              const description = rule <= 0
                ? t("campaign.gameSettings.summary.stats.keep")
                : rule >= 108
                  ? t("campaign.gameSettings.summary.stats.free")
                  : t("campaign.gameSettings.summary.stats.threshold", { limit: rule });
              return typeof setting === "number"
                ? t("campaign.gameSettings.summary.stats.label", { rule: description })
                : t("campaign.gameSettings.summary.stats.server", { rule: description });
            })()}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "tab-friends" }} size="size-5" />
            {t(settings.midGameJoinOpen ? "campaign.gameSettings.summary.join.open" : "campaign.gameSettings.summary.join.closed")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "rest-initiative" }} size="size-5" />
            {t(settings.holdSubmissions ? "campaign.gameSettings.summary.responses.held" : "campaign.gameSettings.summary.responses.open")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "system-storyboard" }} size="size-5" />
            {t(settings.worldSimulation ? "campaign.gameSettings.summary.world.on" : "campaign.gameSettings.summary.world.off")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "tab-loot" }} size="size-5" />
            {t(settings.inventoryApprovals && settings.vitalsApprovals
              ? "campaign.gameSettings.summary.approvals.both"
              : settings.inventoryApprovals
                ? "campaign.gameSettings.summary.approvals.items"
                : settings.vitalsApprovals
                  ? "campaign.gameSettings.summary.approvals.vitals"
                  : "campaign.gameSettings.summary.approvals.none")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "tab-bonds" }} size="size-5" />
            {t(settings.relationships === "off"
              ? "campaign.gameSettings.summary.bonds.off"
              : settings.romance !== "off"
                ? "campaign.gameSettings.summary.bonds.romance"
                : "campaign.gameSettings.summary.bonds.on")}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon icon={{ kind: "glyph", key: "system-party" }} size="size-5" />
            t("campaign.gameSettings.summary.companions", { mode: t(`campaign.gameSettings.option.companions.${settings.companions}`) })
          </span>
          {conscienceShown(settings, lastingCompanions) ? (
            <span className="flex items-center gap-1.5" data-conscience-setting>
              <GameIcon icon={{ kind: "glyph", key: "tab-bonds" }} size="size-5" />
              t("campaign.gameSettings.summary.conscience", { mode: t(`campaign.gameSettings.option.conscience.${settings.companionConscience ?? "leave"}`) })
            </span>
          ) : null}
        </div>
        {narrating ? <CharacterVoices campaignId={campaignId} settings={settings} steersStory={false} /> : null}
      </section>
    );
  }

  const context = {
    packName: selectedPack?.name ?? null,
    genreName: preset.name,
    voiceName: voiceLabel(voices, settings.ttsVoice),
    narrationOff,
    statsRule: describeTableReroll(settings.abilityRerollBelow, serverRerollBelow).toLowerCase(),
    lastingCompanions,
  };
  const searching = find.trim().length > 0;
  const visible = tableGroups(settings)
    .map((group) => ({ ...group, summary: tableGroupSummary(group.id, settings, context) }))
    .filter((group) => groupMatches(group, group.summary, find));
  const base = { settings, patch: (update: Partial<GameSettings>) => void patch(update) };

  function body(id: TableGroupId) {
    switch (id) {
      case "world":
        return <WorldGroup {...base} packs={packs} selectedPack={selectedPack} preset={preset} />;
      case "character":
        return <CharacterGroup {...base} serverRerollLabel={serverRerollLabel} />;
      case "narration":
        return <NarrationGroup {...base} campaignId={campaignId} narrating={narrating} narrationOff={narrationOff} />;
      case "atmosphere":
        return <AtmosphereGroup {...base} steersAudio ambienceInstalled={ambienceInstalled} ambienceCounts={ambienceCounts} />;
      case "safety":
        return <SafetyGroup {...base} />;
      case "ai":
        return <AiGroup {...base} />;
      case "memory":
        return <MemoryGroup {...base} />;
      case "bonds":
        return <BondsGroup {...base} lastingCompanions={lastingCompanions} />;
      case "players":
        return <PlayersGroup {...base} solo={solo} />;
      case "console":
        return <ConsoleGroup {...base} />;
      case "board":
        return <BoardGroup {...base} />;
      case "voiceChat":
        return <VoiceChatGroup {...base} transcribes={transcribes} />;
    }
  }

  return (
    <section className="panel mb-6 rounded-xl p-4" data-table-settings="edit">
      {heading ? <SectionHead title={t("campaign.gameSettings.title")} glyph="tab-settings" level="h2" /> : null}
      <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500" aria-live="polite">
        <span>{t("campaign.gameSettings.save.explanation")}</span>
        {saveState === "saving" ? (
          <span key="saving" className="live-in inline-flex items-center gap-1 text-stone-400">
            <Loader2 className="size-3 animate-spin" /> {t("campaign.gameSettings.save.saving")}
          </span>
        ) : saveState === "saved" ? (
          <span key="saved" className="live-in inline-flex items-center gap-1 text-emerald-400">
            <Check className="tick-in size-3" /> {t("campaign.gameSettings.save.saved")}
          </span>
        ) : null}
      </p>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-300/70" />
        <input
          value={find}
          onChange={(event) => setFind(event.target.value)}
          placeholder={t("campaign.gameSettings.search.placeholder")}
          aria-label={t("campaign.gameSettings.search.aria")}
          className={cn(ui.input, "h-9 pl-9 text-xs")}
        />
      </div>
      {error ? <PanelError className="mb-2">{error}</PanelError> : null}
      <div className="space-y-2 text-xs">
        {visible.map((group) => (
          <DetailGroup
            key={group.id}
            id={group.id}
            title={group.title}
            glyph={group.glyph}
            summary={group.summary}
            // A search opens every group it finds, so the setting is in view.
            open={searching || groups.isOpen(group.id)}
            onToggle={(next) => groups.toggle(group.id, next)}
          >
            {body(group.id)}
          </DetailGroup>
        ))}
        {!visible.length ? <p className="text-stone-500">{t("campaign.gameSettings.search.empty")}</p> : null}
      </div>
    </section>
  );
}
