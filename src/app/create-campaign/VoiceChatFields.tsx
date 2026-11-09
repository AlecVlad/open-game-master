"use client";

import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { GameSettings } from "@/lib/schemas/game-settings";
import { FieldLabel, ToggleCard } from "@/app/create-campaign/fields";

type VoiceSettings = GameSettings["voice"];

// Live voice for a multiplayer table: the master switch, then the turn
// floor and the proximity rules that only mean something once it is on.
// A solo table never mounts this block; there is nobody to talk to.
export function VoiceChatFields({
  value,
  onChange,
}: {
  value: VoiceSettings;
  onChange: (next: VoiceSettings) => void;
}) {
  const { t } = useI18n();
  const messageKey = (part: string) => `createCampaign.experience.voiceChat.${part}` as MessageKey;
  const setRule = (rules: Partial<VoiceSettings["rules"]>) =>
    onChange({ ...value, rules: { ...value.rules, ...rules } });
  return (
    <div>
      <FieldLabel className="mb-1.5">{t(messageKey("title"))}</FieldLabel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ToggleCard
          active={value.enabled}
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
          label={t(messageKey("toggle"))}
          hint={t(messageKey("toggleHint"))}
        />
        {value.enabled ? (
          <>
            <label className="block">
              <span className="mb-1 block text-xs text-stone-500">{t(messageKey("turnFloor"))}</span>
              <Select<VoiceSettings["turnEnforcement"]>
                value={value.turnEnforcement}
                onChange={(turnEnforcement) => onChange({ ...value, turnEnforcement })}
                label={t(messageKey("turnFloor"))}
                className="w-full"
                options={[
                  { value: "off", label: t(messageKey("turn.off")) },
                  { value: "soft", label: t(messageKey("turn.soft")) },
                  { value: "strict", label: t(messageKey("turn.strict")) },
                ]}
              />
            </label>
            <ToggleCard
              active={value.rules.proximity}
              onClick={() => setRule({ proximity: !value.rules.proximity })}
              label={t(messageKey("proximity"))}
              hint={t(messageKey("proximityHint"))}
            />
            {value.rules.proximity ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs text-stone-500">{t(messageKey("hearingRange"))}</span>
                  <Select<string>
                    value={String(value.rules.hearingRangeFeet)}
                    onChange={(feet) => setRule({ hearingRangeFeet: Number(feet) })}
                    label={t(messageKey("hearingRange"))}
                    className="w-full"
                    options={[15, 30, 60, 120].map((feet) => ({ value: String(feet), label: t(messageKey("hearingRangeValue"), { feet }) }))}
                  />
                </label>
                <ToggleCard
                  active={value.rules.sayRange}
                  onClick={() => setRule({ sayRange: !value.rules.sayRange })}
                  label={t(messageKey("whisperShout"))}
                  hint={t(messageKey("whisperShoutHint"))}
                />
                <ToggleCard
                  active={value.rules.wallsAttenuate}
                  onClick={() => setRule({ wallsAttenuate: !value.rules.wallsAttenuate })}
                  label={t(messageKey("wallsMuffle"))}
                  hint={t(messageKey("wallsMuffleHint"))}
                />
              </>
            ) : null}
            <ToggleCard
              active={value.rules.downedGoDeaf}
              onClick={() => setRule({ downedGoDeaf: !value.rules.downedGoDeaf })}
              label={t(messageKey("downedDeaf"))}
              hint={t(messageKey("downedDeafHint"))}
            />
          </>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-stone-500">{t(messageKey("serverHelp"))}</p>
    </div>
  );
}
