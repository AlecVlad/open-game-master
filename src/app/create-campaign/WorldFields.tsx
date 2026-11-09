"use client";

import { ImageIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { InfoButton } from "@/components/ui/InfoDialog";
import { Select } from "@/components/ui/Select";
import { useTtsVoices } from "@/components/VoicePicker";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { cn } from "@/lib/cn";
import { GENRE_PRESETS } from "@/lib/genres";
import { narratorVoiceFor } from "@/lib/tts-voices";
import {
  TABLE_LANGUAGES,
  type Genre,
  type TableLanguage,
} from "@/lib/schemas/game-settings-options";
import type { WorldPackSummary } from "@/lib/worlds/types";
import type { Climate } from "@/lib/srd/weather";
import { FieldLabel } from "@/app/create-campaign/fields";
import type { StepProps } from "@/app/create-campaign/draft";
import {
  arrivalTypeIn,
  portalCards,
  typeInPlan,
  worldFacts,
  type TypeInPlan,
} from "@/app/create-campaign/portals";

// A card has no room for a ⓘ of its own, and a `title` tooltip never opens
// under a finger, so every setting is also spelled out in one dialog on the
// label.
type GenreMessagePart =
  | "name"
  | "blurb"
  | "dmFlavor"
  | "fact.maps"
  | "fact.names"
  | "fact.people";

const genreMessageKey = (genre: Genre, part: GenreMessagePart): MessageKey =>
  `createCampaign.identity.genre.${genre}.${part}` as MessageKey;

const CLIMATE_MESSAGE_KEYS: Record<Climate, MessageKey> = {
  temperate: "createCampaign.identity.climate.temperate",
  arid: "createCampaign.identity.climate.arid",
  boreal: "createCampaign.identity.climate.boreal",
  tropical: "createCampaign.identity.climate.tropical",
  blighted: "createCampaign.identity.climate.blighted",
};

const TABLE_LANGUAGE_MESSAGE_KEYS: Record<TableLanguage, MessageKey> = {
  english: "createCampaign.identity.tableLanguage.english",
  danish: "createCampaign.identity.tableLanguage.danish",
  dutch: "createCampaign.identity.tableLanguage.dutch",
  finnish: "createCampaign.identity.tableLanguage.finnish",
  french: "createCampaign.identity.tableLanguage.french",
  german: "createCampaign.identity.tableLanguage.german",
  hungarian: "createCampaign.identity.tableLanguage.hungarian",
  indonesian: "createCampaign.identity.tableLanguage.indonesian",
  irish: "createCampaign.identity.tableLanguage.irish",
  italian: "createCampaign.identity.tableLanguage.italian",
  norwegian: "createCampaign.identity.tableLanguage.norwegian",
  portuguese: "createCampaign.identity.tableLanguage.portuguese",
  russian: "createCampaign.identity.tableLanguage.russian",
  spanish: "createCampaign.identity.tableLanguage.spanish",
  swedish: "createCampaign.identity.tableLanguage.swedish",
};

const WORLD_FACT_LABEL_KEYS: Record<string, MessageKey> = {
  Maps: "createCampaign.identity.fact.maps",
  Names: "createCampaign.identity.fact.names",
  "Who lives here": "createCampaign.identity.fact.people",
  Sky: "createCampaign.identity.fact.sky",
};

const WORLD_FACT_VALUE_PARTS: Record<string, GenreMessagePart> = {
  Maps: "fact.maps",
  Names: "fact.names",
  "Who lives here": "fact.people",
};

// The setting as eight painted portals, its custom description, the theme the
// preset writes (and the person may overwrite) and the premise. One component
// because the portals and the theme field share the type-in: picking a
// portal writes the preset's line into the theme while it plays.
export function WorldFields({
  draft,
  patch,
  gates,
  active,
  onPickGenre,
}: StepProps & {
  // True while this is the step on screen; entrances wait for it.
  active: boolean;
  // Picking a bare genre by hand leaves the pack and lets the preset write
  // the theme, so the dialog owns the handler that does all three.
  onPickGenre: (genre: Genre) => void;
}) {
  const { t } = useI18n();
  const settingInfo = [
    t("createCampaign.identity.settingInfo"),
    ...GENRE_PRESETS.map(
      (preset) => `**${t(genreMessageKey(preset.id, "name"))}**: ${t(genreMessageKey(preset.id, "blurb"))}`,
    ),
  ].join("\n\n");
  const showsAiFill = gates.aiNarrates && draft.aiStorySetup;
  // The type-in is a clip played over the input while its own text hides;
  // `run` re-keys it so a second pick replays it.
  const [typing, setTyping] = useState<(TypeInPlan & { run: number }) | null>(null);
  const [arrived, setArrived] = useState(false);
  if (active && !arrived) {
    setArrived(true);
    const plan = arrivalTypeIn(draft);
    if (plan) {
      setTyping({ ...plan, run: 0 });
    }
  }

  const pick = (genre: Genre) => {
    const plan = typeInPlan(draft, genre);
    onPickGenre(genre);
    setTyping((current) => (plan ? { ...plan, run: (current?.run ?? 0) + 1 } : null));
  };

  // Only while the line on screen is the line being typed: a pack, saved
  // defaults, or anything else that rewrote the theme, ends it.
  const typingNow = typing !== null && typing.text === draft.theme;
  const themeNote = draft.themeTouched
    ? t("createCampaign.identity.theme.own")
    : draft.worldPack
      ? t("createCampaign.identity.theme.pack")
      : draft.theme
        ? t("createCampaign.identity.theme.preset")
        : t("createCampaign.identity.theme.write");

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel className="mb-0">
          <span className="flex items-center gap-1">
            {t("createCampaign.identity.setting")}
            <InfoButton label={t("createCampaign.identity.setting")} text={settingInfo} />
          </span>
        </FieldLabel>
        <div className="cc-portal-grid">
          {portalCards(draft.genre).map((card) => {
            const cardName = t(genreMessageKey(card.id, "name"));
            return (
              <div key={card.id} className="cc-portal-slot" style={{ "--cc-delay": `${card.delayMs}ms` } as CSSProperties}>
                <button type="button" onClick={() => pick(card.id)} aria-pressed={card.chosen} className="cc-portal motion-card">
                  <span
                    role="img"
                    aria-label={t("createCampaign.identity.coverPlate", { name: cardName })}
                    className="cc-plate"
                    style={{ backgroundImage: `url("${card.plate}")` }}
                  >
                    <span className="cc-plate-name">{cardName}</span>
                    {card.humansOnly ? <span className="cc-humans">{t("createCampaign.identity.genre.allHuman")}</span> : null}
                  </span>
                  <span className="cc-portal-body">
                    <span className="cc-portal-blurb">{t(genreMessageKey(card.id, "blurb"))}</span>
                    <span className="cc-portal-foot">
                      <span className="cc-chip">{t(CLIMATE_MESSAGE_KEYS[card.climate])}</span>
                      <span className="cc-cta">{card.chosen ? t("createCampaign.identity.genre.chosen") : t("createCampaign.identity.genre.tapToChoose")}</span>
                    </span>
                  </span>
                </button>
                {card.chosen ? (
                  <span className="cc-chosen" aria-hidden="true">
                    ✓ {t("createCampaign.identity.genre.chosen")}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {draft.genre === "custom" ? (
          <div className="cc-custom mt-2">
            <span className="cc-eyebrow mb-1 block">{t("createCampaign.identity.genre.custom.label")}</span>
            <p className="cc-prose mb-2 text-[13px] leading-relaxed text-stone-300">
              {t("createCampaign.identity.genre.custom.description")}
            </p>
            <span className="cc-serif block">
              <textarea
                value={draft.customGenreText}
                onChange={(event) => patch({ customGenreText: event.target.value })}
                rows={2}
                maxLength={500}
                aria-label={t("createCampaign.identity.genre.custom.aria")}
                placeholder={t("createCampaign.identity.genre.custom.placeholder")}
                className="cc-bare"
              />
            </span>
          </div>
        ) : null}
      </div>

      <label
        className={cn("cc-field block", typingNow && "cc-typing")}
        data-written={draft.theme ? "true" : "false"}
        style={
          typingNow
            ? ({
                "--cc-type-ms": `${typing.typeMs}ms`,
                "--cc-type-steps": typing.chars,
                "--cc-sweep-ms": `${typing.sweepMs}ms`,
              } as CSSProperties)
            : undefined
        }
      >
        <span key={typingNow ? typing.run : "rest"} className="cc-sweep" aria-hidden="true" />
        <span className="cc-field-head">
          <span className="cc-eyebrow">{t("createCampaign.identity.theme.label")}</span>
          <span className="cc-note">{themeNote}</span>
        </span>
        <span className="cc-type-row cc-serif block">
          <input
            value={draft.theme}
            onChange={(event) => {
              setTyping(null);
              patch({ theme: event.target.value, themeTouched: true });
            }}
            maxLength={120}
            placeholder={t("createCampaign.identity.theme.placeholder")}
            className="cc-bare"
          />
          {typingNow ? (
            <span key={typing.run} className="cc-typed" aria-hidden="true">
              <span
                onAnimationEnd={(event) => {
                  if (event.animationName === "cc-typeline") {
                    setTyping(null);
                  }
                }}
              >
                {typing.text}
              </span>
            </span>
          ) : null}
        </span>
      </label>

      <label className="cc-field block">
        <span className="cc-field-head">
          <span className="cc-eyebrow">{t("createCampaign.identity.premise")}</span>
          <span className="cc-note">{showsAiFill ? t("createCampaign.identity.optionalAi") : t("createCampaign.identity.optional")}</span>
        </span>
        <span className="cc-serif block">
          <textarea
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value, descriptionTouched: true })}
            rows={2}
            maxLength={500}
            className="cc-bare"
          />
        </span>
      </label>
    </div>
  );
}

// What the chosen setting tells the Dungeon Master (read-only), the language
// the story is written in, and where cover art comes from. Cover art is only
// pointed at: the upload and the AI painter live in the campaign's details
// dialog, because a cover needs a campaign row to hang off.
export function WorldDetailsFields({
  draft,
  patch,
  selectedPack,
}: Pick<StepProps, "draft" | "patch"> & { selectedPack: WorldPackSummary | null }) {
  const { t } = useI18n();
  // A new table language brings its narrator voice, as the server does on
  // create, so the narration step shows the voice that will be saved.
  const voices = useTtsVoices();
  const climate = GENRE_PRESETS.find((preset) => preset.id === draft.genre)?.climate ?? "temperate";
  const facts = worldFacts(draft.genre).map((fact) => {
    const label = t(WORLD_FACT_LABEL_KEYS[fact.key]);
    if (fact.key === "Sky") {
      return {
        id: fact.key,
        label,
        value: t("createCampaign.identity.fact.skyValue", { climate: t(CLIMATE_MESSAGE_KEYS[climate]) }),
      };
    }
    return {
      id: fact.key,
      label,
      value: t(genreMessageKey(draft.genre, WORLD_FACT_VALUE_PARTS[fact.key])),
    };
  });
  return (
    <div className="space-y-4">
      <div className="cc-field">
        <div className="cc-field-head">
          <span className="cc-eyebrow">{t("createCampaign.identity.gmTalk")}</span>
          <span className="cc-note">{selectedPack ? t("createCampaign.identity.packVoice", { name: selectedPack.name }) : t("createCampaign.identity.readOnly")}</span>
        </div>
        <p key={draft.genre} className="cc-flavor cc-prose text-[13px] leading-relaxed text-stone-300">
          {t(genreMessageKey(draft.genre, "dmFlavor"))}
        </p>
        <div key={`facts-${draft.genre}`} className="cc-facts">
          {facts.map((fact, index) => (
            <span key={fact.id} className="cc-fact" style={{ animationDelay: `${index * 70}ms` }}>
              <span className="cc-fact-key">{fact.label}</span>
              <span className="cc-fact-value">{fact.value}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="cc-field">
        <div className="cc-field-head">
          <span className="cc-eyebrow">{t("createCampaign.identity.tableLanguage")}</span>
          <span className="cc-note">{t("createCampaign.identity.tableLanguageNote")}</span>
        </div>
        <Select<TableLanguage>
          value={draft.tableLanguage}
          onChange={(tableLanguage) => patch({ tableLanguage, ttsVoice: narratorVoiceFor(tableLanguage, draft.ttsVoice, voices.provider === "openai") })}
          label={t("createCampaign.identity.tableLanguage")}
          className="w-full"
          options={TABLE_LANGUAGES.map((value) => ({ value, label: t(TABLE_LANGUAGE_MESSAGE_KEYS[value]) }))}
        />
        <p className="mt-1 text-xs text-stone-500">{t("createCampaign.identity.tableLanguageHelp")}</p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-stone-800 bg-stone-950/40 p-3">
        <ImageIcon className="mt-0.5 size-4 shrink-0 text-amber-300/70" aria-hidden="true" />
        <div>
          <span className="block text-stone-300">{t("createCampaign.identity.coverArt")}</span>
          <p className="mt-0.5 text-xs text-stone-500">{t("createCampaign.identity.coverArtHelp")}</p>
        </div>
      </div>
    </div>
  );
}
