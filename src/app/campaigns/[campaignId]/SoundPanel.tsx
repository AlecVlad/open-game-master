"use client";

import { Check, Loader2, Music, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAmbienceInstall } from "@/app/admin/useAmbienceInstall";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { AmbienceAudio } from "@/app/campaigns/[campaignId]/useAmbienceAudio";
import { HeaderGlyph } from "@/app/campaigns/[campaignId]/SessionGlyph";
import { headerButtonClass } from "@/app/campaigns/[campaignId]/headerButton";
import { Dialog } from "@/components/ui/Dialog";
import { GameIcon } from "@/components/ui/GameIcon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { cueById, cuesForLayer, type AmbienceLayer } from "@/lib/ambience/catalog";
import type { AmbienceLayerName } from "@/lib/ambience/player";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";

// The sound panel: what the table is hearing, this listener's hand on how
// loud, and, for whoever steers the story, the hand on what plays.
//
// Before this the header had one speaker button and nobody could tell what
// was playing, why it was silent, or change it without the DM console (a
// human DM) or asking the model (an AI table). Now the button opens this:
// the room and the music by name with the take that is on, a level for
// each, Next for a long fight, and the pickers. Every cue has a painting
// (public/assets/icons/glyph/cue-*), so picking is pointing, not typing.

export type SoundSteering = {
  campaignId: string;
  // The DM at a table a person runs, the party lead at an AI table.
  canSteer: boolean;
  // The engine follows the scene on its own (gameSettings.ambienceAuto).
  auto: boolean;
  isAdmin: boolean;
};

type Translate = ReturnType<typeof useI18n>["t"];

function layerLabel(layer: AmbienceLayerName, t: Translate): string {
  return layer === "bed" ? t("campaign.sound.layerRoom") : t("campaign.sound.layerMusic");
}

function cueMessageKey(layer: AmbienceLayer, id: string): MessageKey {
  if (layer === "bed") return `campaign.dmCatalog.set_ambience.field.bed.option.${id}` as MessageKey;
  if (layer === "music") return `campaign.dmCatalog.set_ambience.field.music.option.${id}` as MessageKey;
  return `campaign.dmCatalog.play_sting.field.cue.option.${id}` as MessageKey;
}

function cueLabel(layer: AmbienceLayer, id: string, t: Translate): string {
  return t(cueMessageKey(layer, id));
}

function cueBlurb(id: string, t: Translate): string {
  return t(`campaign.sound.blurb.${id}` as MessageKey);
}

async function steer(campaignId: string, body: Record<string, unknown>, t: Translate): Promise<string | null> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/ambience`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return data.error ?? t("campaign.sound.errorAction");
    }
    return null;
  } catch {
    return t("campaign.sound.errorServer");
  }
}

// One looping layer as the listener sees it: the painting, the cue, the
// take, and the level slider under it.
function LayerRow({ layer, ambience }: { layer: AmbienceLayerName; ambience: AmbienceAudio }) {
  const { t } = useI18n();
  const layerTitle = layerLabel(layer, t);
  const cueId = ambience.state[layer];
  const cue = cueId ? cueById(cueId) : null;
  const snapshot = ambience.playing[layer];
  const takes = cueId ? ambience.tracks[cueId] ?? [] : [];
  const take = snapshot.take ? takes[snapshot.take - 1] : null;
  const held = ambience.state.held.includes(layer);
  const noFile = Boolean(cue) && !takes.length;
  const level = layer === "bed" ? ambience.bedLevel : ambience.musicLevel;
  const setLevel = layer === "bed" ? ambience.setBedLevel : ambience.setMusicLevel;
  return (
    <div className="sound-layer" data-playing={snapshot.playing ? "" : undefined}>
      <div className="flex items-center gap-3">
        <span className="sound-layer-art">
          {cue ? (
            <GameIcon icon={{ kind: "glyph", key: `cue-${cue.id}` }} size="size-11" />
          ) : (
            <GameIcon icon={{ kind: "glyph", key: "tab-ambience" }} size="size-11" className="opacity-40" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={ui.sectionEyebrow}>{layerTitle}</span>
            {held ? (
              <Tooltip content={t("campaign.sound.heldTooltip")}>
                <span className="sound-held">{t("campaign.sound.held")}</span>
              </Tooltip>
            ) : null}
          </div>
          <div className="truncate font-display text-base text-amber-100">{cue ? cueLabel(layer, cue.id, t) : t("campaign.sound.silence")}</div>
          <div className="sound-take truncate">
            {noFile
              ? t("campaign.sound.noAudio")
              : take
                ? `${take.title}${takes.length > 1 ? ` · ${t("campaign.sound.takeOf", { take: snapshot.take, total: takes.length })}` : ""}`
                : cue
                  ? cueBlurb(cue.id, t)
                  : t("campaign.sound.nothingPlaying")}
          </div>
        </div>
        {takes.length > 1 ? (
          <button type="button" onClick={() => ambience.skip(layer)} className={ui.btnSmall} aria-label={t("campaign.sound.nextTake", { layer: layerTitle })}>
            {t("campaign.sound.next")}
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="sound-caption">{t("campaign.sound.level")}</span>
        <Slider
          label={`${layerTitle}: ${t("campaign.sound.level").toLowerCase()}`}
          value={level}
          min={0}
          max={1}
          step={0.05}
          onChange={setLevel}
          bubble={(value) => `${Math.round(value * 100)}%`}
          disabled={!cue}
          className="flex-1"
        />
        <span className="sound-caption w-9 text-right tabular-nums">{Math.round(level * 100)}%</span>
      </div>
    </div>
  );
}

// A cue to point at. Dimmed, not hidden, when this server has no file for
// it: the catalog is the same everywhere and a missing painting would read
// as a missing feature.
function CueTile({
  glyph,
  label,
  unavailableLabel,
  on,
  available,
  busy,
  onPick,
}: {
  // A painting from the glyph set, or null for the one tile that is not a
  // cue: silence, which has no picture because there is nothing to hear.
  glyph: string | null;
  label: string;
  unavailableLabel: string;
  on: boolean;
  available: boolean;
  busy: boolean;
  onPick: () => void;
}) {
  return (
    <Tooltip content={available ? label : unavailableLabel}>
      <button
        type="button"
        onClick={onPick}
        disabled={!available || busy}
        aria-pressed={on}
        data-on={on ? "" : undefined}
        className={cn("sound-tile motion-press", !available && "sound-tile-missing")}
      >
        {glyph ? (
          <GameIcon icon={{ kind: "glyph", key: glyph }} size="size-10" />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full border border-stone-600/60 text-stone-400">
            <VolumeX className="size-5" aria-hidden="true" />
          </span>
        )}
        <span className="sound-tile-label">{label}</span>
      </button>
    </Tooltip>
  );
}

function Pickers({ ambience, steering }: { ambience: AmbienceAudio; steering: SoundSteering }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<AmbienceLayer>("bed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cues = useMemo(() => cuesForLayer(tab), [tab]);
  const current = tab === "sting" ? null : ambience.state[tab];
  const held = tab !== "sting" && ambience.state.held.includes(tab);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    const failure = await steer(steering.campaignId, body, t);
    if (failure) {
      setError(failure);
    }
    setBusy(false);
  };

  return (
    <section className="mt-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className={ui.sectionEyebrow}>{t("campaign.sound.changeSound")}</span>
        <SegmentedControl
          size="sm"
          label={t("campaign.sound.whatToChange")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "bed", label: t("campaign.sound.layerRoom") },
            { value: "music", label: t("campaign.sound.layerMusic") },
            { value: "sting", label: t("campaign.sound.layerSounds") },
          ]}
        />
      </div>
      {tab !== "sting" ? (
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            <Switch
              label={t("campaign.sound.holdLayer", { layer: layerLabel(tab, t).toLowerCase() })}
              on={held}
              disabled={!current || busy}
              onChange={(on) => void send({ [tab]: current, hold: on })}
            />
            <span className="text-sm text-stone-300">{t("campaign.sound.hold")}</span>
          </span>
          <span className="text-xs text-stone-500">
            {steering.auto
              ? held
                ? t("campaign.sound.autoHeld")
                : t("campaign.sound.autoMode")
              : t("campaign.sound.manualMode")}
          </span>
        </div>
      ) : (
        <p className="mb-2 text-xs text-stone-500">{t("campaign.sound.oneShot")}</p>
      )}
      <div key={tab} className="motion-tab sound-grid">
        {tab !== "sting" ? (
          <CueTile
            glyph={null}
            label={t("campaign.sound.silence")}
            unavailableLabel={t("campaign.sound.silence")}
            on={current === null}
            available
            busy={busy}
            onPick={() => void send({ [tab]: "none" })}
          />
        ) : null}
        {cues.map((cue) => (
          <CueTile
            key={cue.id}
            glyph={`cue-${cue.id}`}
            label={cueLabel(tab, cue.id, t)}
            unavailableLabel={t("campaign.sound.cueUnavailable", { label: cueLabel(tab, cue.id, t) })}
            on={tab !== "sting" && current === cue.id}
            available={Boolean(ambience.tracks[cue.id]?.length)}
            busy={busy}
            onPick={() => void send(tab === "sting" ? { sting: cue.id } : { [tab]: cue.id })}
          />
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

function LibraryNote({ ambience, steering }: { ambience: AmbienceAudio; steering: SoundSteering }) {
  const { t } = useI18n();
  const counts = ambience.counts;
  if (!ambience.installed) {
    return steering.isAdmin ? (
      <LibraryInstall ambience={ambience} />
    ) : (
      <p className="sound-note">{t("campaign.sound.libraryMissingUser")}</p>
    );
  }
  if (!counts || !steering.canSteer) {
    return null;
  }
  return (
    <p className="sound-note">
      {t("campaign.sound.libraryCounts", {
        roomsInstalled: counts.bed.installed,
        roomsTotal: counts.bed.total,
        musicInstalled: counts.music.installed,
        musicTotal: counts.music.total,
        soundsInstalled: counts.sting.installed,
        soundsTotal: counts.sting.total,
      })}
    </p>
  );
}

// The library missing, seen by an admin: the apps ship without it to stay
// small, so the download is offered here, where the silence is noticed,
// and the table hears the first cue the moment it lands.
function LibraryInstall({ ambience }: { ambience: AmbienceAudio }) {
  const { t } = useI18n();
  const { status, error, installing, percent, install } = useAmbienceInstall();
  const landed = status?.status === "ready";
  useEffect(() => {
    if (landed) {
      ambience.refresh();
    }
  }, [landed, ambience]);
  return (
    <div className="sound-note">
      <p>{t("campaign.sound.libraryMissingAdmin")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => install()} disabled={!status || installing} className={ui.btnSmall}>
          {installing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {installing ? t("campaign.sound.downloading", { percent }) : t("campaign.sound.downloadLibrary")}
        </button>
        {landed && status.result ? (
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <Check className="size-4" aria-hidden="true" />
            {t("campaign.sound.tracksInstalled", { count: status.result.installed })}
          </span>
        ) : null}
        {status?.status === "error" ? <span className="text-red-300">{status.error}</span> : null}
        {error ? <span className="text-red-300">{error}</span> : null}
      </div>
    </div>
  );
}

export function SoundDialog({
  open,
  onOpenChange,
  ambience,
  steering,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambience: AmbienceAudio;
  steering: SoundSteering;
}) {
  const { t } = useI18n();
  // Ask again when the panel opens; the page gesture listener also retries
  // during the click itself, while the browser's audio gesture is active.
  const { unlock } = ambience;
  useEffect(() => {
    if (open) {
      unlock();
    }
  }, [open, unlock]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("campaign.sound.dialogTitle")} icon={<Music className="size-5 text-amber-300" />} width="w-[min(94vw,38rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch label={t("campaign.sound.soundSwitchOn")} on={!ambience.muted} onChange={(on) => ambience.setMuted(!on)} />
          <span className="text-sm text-stone-300">{ambience.muted ? t("campaign.sound.soundOffForUser") : t("campaign.sound.soundOnForUser")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="sound-caption">{t("campaign.sound.volume")}</span>
          <Slider
            label={t("campaign.sound.soundVolume")}
            value={ambience.volume}
            min={0}
            max={1}
            step={0.05}
            onChange={ambience.setVolume}
            bubble={(value) => `${Math.round(value * 100)}%`}
            disabled={ambience.muted}
            className="w-32 sm:w-40"
          />
          <span className="sound-caption w-9 text-right tabular-nums">{Math.round(ambience.volume * 100)}%</span>
        </div>
      </div>
      {ambience.playing.blocked ? (
        <p className="sound-note text-amber-200">{t("campaign.sound.blockedBrowser")}</p>
      ) : null}
      <div className="mt-4 space-y-3">
        <LayerRow layer="bed" ambience={ambience} />
        <LayerRow layer="music" ambience={ambience} />
      </div>
      <LibraryNote ambience={ambience} steering={steering} />
      {steering.canSteer ? <Pickers ambience={ambience} steering={steering} /> : null}
    </Dialog>
  );
}

// The header's sound control: the painting opens the panel; on sm+ the
// master slider sits beside it, as it always did, for the listener who
// only ever wanted it quieter.
// What the table's sound is doing, for the header's tip and the phone's
// table menu: "Sound: Rain, Tavern music", or why there is none.
export function soundSummary(ambience: AmbienceAudio, t: Translate): { quiet: boolean; playing: string; tip: string } {
  const quiet = ambience.muted || !ambience.unlocked;
  const bed = ambience.state.bed ? cueLabel("bed", ambience.state.bed, t) : null;
  const music = ambience.state.music ? cueLabel("music", ambience.state.music, t) : null;
  const playing = [bed, music ? `${music} — ${t("campaign.sound.layerMusic").toLowerCase()}` : null].filter(Boolean).join(", ");
  const tip = !ambience.installed
    ? t("campaign.sound.summaryNoLibrary")
    : quiet
      ? t("campaign.sound.summaryOff")
      : playing
        ? t("campaign.sound.summaryPlaying", { playing })
        : t("campaign.sound.summaryNothing");
  return { quiet, playing, tip };
}

export function SoundControl({ ambience, steering }: { ambience: AmbienceAudio; steering: SoundSteering }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { quiet, playing, tip } = soundSummary(ambience, t);
  return (
    <>
      <div className="flex items-center">
        <Tooltip content={tip} side="bottom">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("campaign.sound.dialogTitle")}
            aria-haspopup="dialog"
            data-tour="header-sound"
            className={headerButtonClass(!quiet && Boolean(playing))}
          >
            <HeaderGlyph glyph="tab-ambience" off={quiet} />
          </button>
        </Tooltip>
        {ambience.unlocked && !ambience.muted ? (
          <div className="hidden sm:block">
            <Tooltip content={t("campaign.sound.soundVolume")} side="bottom">
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={ambience.volume}
                onChange={ambience.setVolume}
                label={t("campaign.sound.soundVolume")}
                bubble={(value) => `${Math.round(value * 100)}%`}
                className="session-volume"
              />
            </Tooltip>
          </div>
        ) : null}
      </div>
      <SoundDialog open={open} onOpenChange={setOpen} ambience={ambience} steering={steering} />
    </>
  );
}
