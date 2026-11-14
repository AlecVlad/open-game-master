"use client";

import { DoorOpen } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { MASTER_VOLUME_MAX, VOLUME_STEP } from "@/lib/voice/volume";
import type { VoiceChannelView } from "@/lib/voice/types";

// The two folding blocks of the voice menu, lifted out of VoicePanel.tsx so
// that file stays about the call itself.

type MicMode = "open" | "ptt";

// Everyone at once, the microphone and its mode. Lives in here rather than in
// the header because the dock is 320px wide and the header has no room, and
// because this block already says these settings are per browser. Per-player
// sliders are on each row of the roster.
export function VoiceSettings({
  masterVolume,
  deafened,
  onMasterVolume,
  micId,
  micDevices,
  onSelectMic,
  micMode,
  onSelectMicMode,
}: {
  masterVolume: number;
  deafened: boolean;
  onMasterVolume: (value: number) => void;
  micId: string;
  micDevices: Array<{ deviceId: string; label: string }>;
  onSelectMic: (deviceId: string) => void;
  micMode: MicMode;
  onSelectMicMode: (mode: MicMode) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="reveal panel mt-2 space-y-2.5 rounded-lg p-2.5">
      <div>
        <span className="session-field-label">{t("campaign.voice.settings.masterVolume.title")}</span>
        <Slider
          min={0}
          max={MASTER_VOLUME_MAX}
          step={VOLUME_STEP}
          value={masterVolume}
          disabled={deafened}
          onChange={onMasterVolume}
          label={t("campaign.voice.settings.masterVolume.label")}
          bubble={(value) => `${Math.round(value * 100)}%`}
          className="w-full"
        />
      </div>
      <div>
        <span className="session-field-label">{t("campaign.voice.settings.microphone")}</span>
        <Select
          value={micId}
          onChange={onSelectMic}
          label={t("campaign.voice.settings.microphone")}
          size="sm"
          className="w-full"
          options={[
            { value: "", label: t("campaign.voice.settings.systemDefault") },
            ...micDevices.map((device) => ({ value: device.deviceId, label: device.label })),
          ]}
        />
      </div>
      <div>
        <span className="session-field-label">
          {t("campaign.voice.settings.mode")}{micMode === "ptt" ? t("campaign.voice.settings.pttHint") : ""}
        </span>
        <Select<MicMode>
          value={micMode}
          onChange={onSelectMicMode}
          label={t("campaign.voice.settings.mode.label")}
          size="sm"
          className="w-full"
          options={[
            { value: "open", label: t("campaign.voice.settings.mode.open") },
            { value: "ptt", label: t("campaign.voice.settings.mode.ptt") },
          ]}
        />
      </div>
      <p className="text-[11px] text-stone-500">{t("campaign.voice.settings.saved")}</p>
    </div>
  );
}

export function VoiceRooms({
  channels,
  occupants,
  steersStory,
  onAction,
}: {
  channels: VoiceChannelView[];
  occupants: (channelId: string) => number;
  steersStory: boolean;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const [newRoom, setNewRoom] = useState("");
  return (
    <div className="reveal mt-3">
      <SectionHead title={t("campaign.voice.rooms.title")} glyph="tab-campaigns" level="h4" className="mb-1.5" />
      <div className="space-y-1">
        {channels.map((channel) => (
          <div key={channel.id} className="flex min-h-8 items-center gap-2 text-xs">
            <GameIcon icon={{ kind: "glyph", key: channel.id === "table" ? "tab-session" : "system-party" }} size="size-6" />
            <span className="truncate text-stone-300">{channel.name}</span>
            <span key={occupants(channel.id)} className="count-pop text-stone-500">
              {occupants(channel.id)}
            </span>
            {steersStory && channel.id !== "table" ? (
              <button
                type="button"
                onClick={() => onAction({ action: "close", channelId: channel.id })}
                aria-label={t("campaign.voice.rooms.close.aria", { name: channel.name })}
                title={t("campaign.voice.rooms.close.title")}
                className={cn(ui.btnSmall, "session-voice-mini ml-auto hover:border-red-500/50 hover:text-red-300")}
              >
                <DoorOpen className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {steersStory ? (
        <div className="reveal flex gap-1.5 pt-1.5">
          <input
            value={newRoom}
            onChange={(event) => setNewRoom(event.target.value)}
            placeholder={t("campaign.voice.rooms.new.placeholder")}
            aria-label={t("campaign.voice.rooms.new.placeholder")}
            className={cn(ui.input, "min-w-0 flex-1 py-1.5 text-xs")}
          />
          <button
            type="button"
            disabled={!newRoom.trim()}
            onClick={() => {
              onAction({ action: "open", name: newRoom.trim() });
              setNewRoom("");
            }}
            className={cn(ui.btnSmall, "text-xs")}
          >
            {t("campaign.voice.rooms.open")}
          </button>
          {channels.length > 1 ? (
            <button
              type="button"
              onClick={() => onAction({ action: "recall" })}
              title={t("campaign.voice.rooms.recall.title")}
              className={cn(ui.btnSmall, "text-xs")}
            >
              {t("campaign.voice.rooms.recall")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
