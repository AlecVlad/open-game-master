"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { Params } from "@/lib/i18n/core";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { cn } from "@/lib/cn";
import { VoicePreviewButton } from "@/components/VoicePreviewButton";
import { InfoButton } from "@/components/ui/InfoDialog";
import {
  BOUNDARIES,
  STRICTNESS,
  TONES,
  TONE_MAX,
  type Boundaries,
  type GmSettings,
  type SafetySettings,
  type Strictness,
  type Tone,
} from "@/lib/dm/safety-logic";
import type { Personality } from "@/lib/dm/personalities";
import type { TableLanguage } from "@/lib/schemas/game-settings-options";
import { personalityVoiceFits } from "@/lib/tts-voices";

// Safety, strictness and tone (docs/vtt-parity-implementation-plan.md
// section 9), shared by the creation wizard's Feel step and the lobby's
// settings. Lines and veils are typed as lists; the boundary, strictness
// and tone are chips; a personality preset fills strictness, tone and the
// narrator's voice at once. A line or veil naming romance keeps the engine's
// own romance offers away (dm/advance-logic.ts namesRomance), and the panel
// points a table that wants no romance at all to its switch, under Bonds and
// romance.

const chip = "rounded-md border px-2 py-0.5 text-[11px]";
const on = "border-amber-700 bg-amber-950/40 text-amber-100";
const off = "border-stone-700 text-stone-400 hover:text-stone-200";

const BOUNDARY_MESSAGE_KEYS: Record<Boundaries, MessageKey> = {
  family: "safetyTone.safety.boundary.family",
  standard: "safetyTone.safety.boundary.standard",
  mature: "safetyTone.safety.boundary.mature",
};

const STRICTNESS_MESSAGE_KEYS: Record<Strictness, MessageKey> = {
  lenient: "safetyTone.strictness.lenient",
  standard: "safetyTone.strictness.standard",
  harsh: "safetyTone.strictness.harsh",
};

const TONE_MESSAGE_KEYS: Record<Tone, MessageKey> = {
  grim: "safetyTone.tone.grim",
  hopeful: "safetyTone.tone.hopeful",
  whimsical: "safetyTone.tone.whimsical",
  epic: "safetyTone.tone.epic",
  intimate: "safetyTone.tone.intimate",
  pulpy: "safetyTone.tone.pulpy",
  eerie: "safetyTone.tone.eerie",
  political: "safetyTone.tone.political",
};

export const BOUNDARY_LABELS: Record<Boundaries, string> = { family: "All ages", standard: "Standard", mature: "Mature" };
export const STRICTNESS_LABELS: Record<Strictness, string> = { lenient: "Lenient", standard: "By the book", harsh: "Harsh" };

const STOCK_PERSONALITY_MESSAGE_KEYS: Record<string, { name: MessageKey; blurb: MessageKey }> = {
  "The Storyteller": { name: "safetyTone.personality.storyteller.name", blurb: "safetyTone.personality.storyteller.blurb" },
  "The Referee": { name: "safetyTone.personality.referee.name", blurb: "safetyTone.personality.referee.blurb" },
  "The Grim Chronicler": { name: "safetyTone.personality.grimChronicler.name", blurb: "safetyTone.personality.grimChronicler.blurb" },
  "The Trickster": { name: "safetyTone.personality.trickster.name", blurb: "safetyTone.personality.trickster.blurb" },
  "The Courtier": { name: "safetyTone.personality.courtier.name", blurb: "safetyTone.personality.courtier.blurb" },
};

function localizePersonality(
  preset: Personality,
  t: (key: MessageKey, params?: Params) => string,
): Personality {
  // Stock presets are shared; a user's own names and descriptions stay untouched.
  if (preset.userId !== null) return preset;
  const keys = STOCK_PERSONALITY_MESSAGE_KEYS[preset.name];
  return keys ? { ...preset, name: t(keys.name), blurb: t(keys.blurb) } : preset;
}


function ListField({ label, hint, value, onChange }: { label: string; hint: string; value: string[]; onChange: (next: string[]) => void }) {
  // Typed as one line and kept as a list on blur, so a half-typed entry is
  // never cut at its comma. A list changed from outside (saved defaults laid
  // over a new campaign) replaces the line, so the box never shows an old one.
  const joined = value.join(", ");
  const [text, setText] = useState(joined);
  const [shown, setShown] = useState(joined);
  if (joined !== shown) {
    setShown(joined);
    setText(joined);
  }
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-stone-400">{label}</span>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => onChange(text.split(",").map((entry) => entry.trim()).filter(Boolean).slice(0, 12))}
        placeholder={hint}
        className="w-full rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-200 outline-none focus:border-amber-600"
      />
    </label>
  );
}

// Every personality and what it does, for the ⓘ beside them: a preset's
// blurb was only ever a hover title.
function personalitiesInfo(
  presets: Personality[],
  setsVoice: boolean,
  t: (key: MessageKey, params?: Params) => string,
): string {
  const descriptions = presets.map((preset) => `**${preset.name}**: ${preset.blurb}`).join("\n\n");
  const voicePart = setsVoice ? t("safetyTone.tone.voicePart") : "";
  return `${descriptions}\n\n${t("safetyTone.tone.personalitiesInfoIntro", { voicePart })}`;
}

export function SafetyToneFields({
  safety,
  gm,
  ttsVoice,
  onSafety,
  onGm,
  onVoice,
  tableLanguage,
  showPresets = true,
}: {
  safety: SafetySettings;
  gm: GmSettings;
  ttsVoice?: string;
  onSafety: (next: SafetySettings) => void;
  onGm: (next: GmSettings) => void;
  onVoice?: (voice: string) => void;
  tableLanguage: TableLanguage;
  showPresets?: boolean;
}) {
  const { t } = useI18n();
  const [presets, setPresets] = useState<Personality[]>([]);
  useEffect(() => {
    if (!showPresets) {
      return;
    }
    let cancelled = false;
    fetch("/api/personalities")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { personalities?: Personality[] } | null) => {
        if (!cancelled) {
          setPresets(data?.personalities ?? []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showPresets]);
  // A preset's voice counts only where it can narrate this table.
  const localizedPresets = presets.map((preset) => localizePersonality(preset, t));
  const voiced = (preset: Personality) => personalityVoiceFits(tableLanguage, preset.ttsVoice);
  const isChosen = (preset: Personality) =>
    preset.gm.strictness === gm.strictness && preset.gm.tone.join() === gm.tone.join() && (!ttsVoice || !voiced(preset) || preset.ttsVoice === ttsVoice);
  const chosenPreset = localizedPresets.find(isChosen);
  const toggleTone = (tone: Tone) => {
    const has = gm.tone.includes(tone);
    if (!has && gm.tone.length >= TONE_MAX) {
      return;
    }
    onGm({ ...gm, tone: has ? gm.tone.filter((entry) => entry !== tone) : [...gm.tone, tone] });
  };
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-stone-500">{t("safetyTone.safety.label")}</p>
        <div data-pill-group="" className="flex flex-wrap items-center gap-1.5">
          <button type="button" aria-pressed={safety.xCard} onClick={() => onSafety({ ...safety, xCard: !safety.xCard })} className={cn(chip, safety.xCard ? on : off)}>
            {t(safety.xCard ? "safetyTone.safety.xCardOn" : "safetyTone.safety.xCardOff")}
          </button>
          {BOUNDARIES.map((boundary) => (
            <button data-on={safety.boundaries === boundary ? "" : undefined} key={boundary} type="button" aria-pressed={safety.boundaries === boundary} onClick={() => onSafety({ ...safety, boundaries: boundary })} className={cn(chip, safety.boundaries === boundary ? on : off)}>
              {t(BOUNDARY_MESSAGE_KEYS[boundary])}
            </button>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ListField label={t("safetyTone.safety.lines.label")} hint={t("safetyTone.safety.lines.hint")} value={safety.lines} onChange={(lines) => onSafety({ ...safety, lines })} />
          <ListField label={t("safetyTone.safety.veils.label")} hint={t("safetyTone.safety.veils.hint")} value={safety.veils} onChange={(veils) => onSafety({ ...safety, veils })} />
        </div>
        {/* An all-ages table never has romance, whatever the switch says. */}
        {safety.boundaries !== "family" ? <p className="mt-1 text-[11px] text-stone-500">{t("safetyTone.safety.romanceNote")}</p> : null}
      </div>
      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-stone-500">{t("safetyTone.strictness.label")} / {t("safetyTone.tone.label")}</p>
        <div data-pill-group="" className="flex flex-wrap items-center gap-1.5">
          {STRICTNESS.map((level) => (
            <button data-on={gm.strictness === level ? "" : undefined} key={level} type="button" aria-pressed={gm.strictness === level} onClick={() => onGm({ ...gm, strictness: level })} className={cn(chip, gm.strictness === level ? on : off)}>
              {t(STRICTNESS_MESSAGE_KEYS[level])}
            </button>
          ))}
        </div>
        <div className="stagger-pop mt-1.5 flex flex-wrap items-center gap-1.5">
          {TONES.map((tone) => (
            <button key={tone} type="button" aria-pressed={gm.tone.includes(tone)} onClick={() => toggleTone(tone)} className={cn(chip, gm.tone.includes(tone) ? on : off)}>
              {t(TONE_MESSAGE_KEYS[tone])}
            </button>
          ))}
          <span className="text-[10px] text-stone-600">{t("safetyTone.tone.upToThree")}</span>
        </div>
      </div>
      {showPresets && presets.length ? (
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wide text-stone-500">
            {t("safetyTone.tone.choosePersonality")}
            <InfoButton
              label={t("safetyTone.tone.personalitiesInfoLabel")}
              text={personalitiesInfo(localizedPresets, Boolean(onVoice) && localizedPresets.some(voiced), t)}
            />
          </p>
          <div className="stagger-pop flex flex-wrap items-center gap-1.5">
            {localizedPresets.map((preset) => {
              const active = isChosen(preset);
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.blurb}
                  aria-pressed={active}
                  onClick={() => {
                    onGm({ strictness: preset.gm.strictness, tone: [...preset.gm.tone] });
                    if (voiced(preset)) {
                      onVoice?.(preset.ttsVoice);
                    }
                  }}
                  className={cn(chip, active ? on : off)}
                >
                  {preset.name}
                </button>
              );
            })}
            {ttsVoice ? <VoicePreviewButton voice={ttsVoice} /> : null}
          </div>
          {/* The chosen personality says what it is without a hover, which a
              finger never makes. */}
          {chosenPreset ? <p className="mt-1 text-[11px] text-stone-500">{chosenPreset.name}: {chosenPreset.blurb}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
