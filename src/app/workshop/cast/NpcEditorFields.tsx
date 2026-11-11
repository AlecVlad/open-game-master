"use client";

import { useId, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { X } from "lucide-react";
import { ContentPick } from "@/components/ui/ContentPick";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { VoicePicker } from "@/components/VoicePicker";
import { VoicePreviewButton } from "@/components/VoicePreviewButton";
import {
  ATTITUDES,
  type GeneratableField,
  type NpcDraft,
  type RelationGraph,
} from "@/lib/npcs/forge";
import { npcRoleOptions } from "@/lib/placeholders";
import { GENDERS, type Gender } from "@/lib/gender";
import { NPC_RACE_OPTIONS } from "@/lib/npc-race";
import { hostOffers, useCapabilities } from "@/lib/use-capabilities";
import { AttractionPicker } from "@/components/AttractionPicker";
import {
  GOAL_FIELDS,
  PersonalitySliders,
  RelationEditor,
  goalText,
  setGoal,
} from "@/app/campaigns/[campaignId]/NpcFields";
import { DictateField } from "@/components/DictateField";
import { appendDictation } from "@/lib/dictation";
import { KNOWN_BEFORE_HOW_CHARS, type KnownBeforeGrade } from "@/lib/dm/known-before-logic";

// "Before the story" (issue 731): whether the whole party already knows this
// person when the story begins, and how. Each grade says in plain words the
// standing every hero's bond opens at.
const KNOWN_BEFORE_OPTIONS: Array<{ value: KnownBeforeGrade | "none"; label: string; hint: string }> = [
  { value: "none", label: "campaign.npcEditor.known.none", hint: "campaign.npcEditor.known.noneHint" },
  { value: "acquainted", label: "campaign.npcEditor.known.acquainted", hint: "campaign.npcEditor.known.acquaintedHint" },
  { value: "friend", label: "campaign.npcEditor.known.friend", hint: "campaign.npcEditor.known.friendHint" },
  { value: "close", label: "campaign.npcEditor.known.close", hint: "campaign.npcEditor.known.closeHint" },
];

// The four sections of the NPC form: who they are on the surface, who they
// are underneath, what they want, and how they feel about everyone else.
// Moved here unchanged from DmNpcForgePanel, which keeps the requests and
// the buttons; the panel renders these inline in the console and inside a
// sheet in the workshop.
//
// `suggest` renders the per-field Suggest button, or nothing on a server
// with no text model. The panel owns it because it owns the request.
//
// `genre` orders the role picker: the setting's own roles (a fixer, a street
// doc) come before the twelve every table gets. The picker is a datalist, so
// a role the catalog does not know can still be typed and kept.

export function NpcEditorFields({
  draft,
  onChange,
  graph,
  others,
  suggest,
  genre,
  places = [],
  factions = [],
  knownBeforeOpen = false,
}: {
  draft: NpcDraft;
  onChange: (draft: NpcDraft) => void;
  graph: RelationGraph;
  others: string[];
  suggest: (field: GeneratableField) => ReactNode;
  genre?: string | null;
  // The named places this world already has (the overworld's locations and
  // the geography lore), offered under the location field.
  places?: readonly string[];
  // The world's factions, for the membership picker.
  factions?: ReadonlyArray<{ id: string; name: string }>;
  // Whether "Before the story" can still matter: in a workshop, and at a
  // table whose GM has not yet narrated (the people route says; an older
  // host never does, and the section stays out).
  knownBeforeOpen?: boolean;
}) {
  const { t } = useI18n();
  const roleListId = useId();
  const placeListId = useId();
  const knownLabelId = useId();
  const howId = useId();
  const howHintId = useId();
  const known = draft.knownBefore ?? null;
  const keepsRace = hostOffers(useCapabilities(), "npcRace");
  const roles = npcRoleOptions(genre);
  return (
    <>
      <section
        className="panel space-y-2 rounded-xl p-3"
        data-tour="cast-fields"
      >
        <SectionHead title={t("campaign.npcEditor.surface")} glyph="system-cast" className="mb-0" />
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder={t("campaign.npcEditor.name.placeholder")}
            className={cn(ui.input, "min-w-32 flex-1")}
          />
          <input
            list={roleListId}
            value={draft.role}
            onChange={(event) => onChange({ ...draft, role: event.target.value })}
            placeholder={t("campaign.npcEditor.role.placeholder")}
            aria-label={t("campaign.npcEditor.role.aria")}
            title={t("campaign.npcEditor.role.title")}
            className={cn(ui.input, "w-full sm:w-40")}
          />
          <datalist id={roleListId}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </datalist>
          <span className="w-full sm:w-60">
          <Select<NpcDraft["attitude"]>
            label={t("campaign.npcEditor.attitude.label")}
            value={draft.attitude}
            onChange={(attitude) => onChange({ ...draft, attitude })}
            options={ATTITUDES.map((attitude) => ({
              value: attitude,
              label:
                attitude === "hostile"
                  ? t("campaign.npcEditor.attitude.hostile")
                  : attitude === "friendly"
                    ? t("campaign.npcEditor.attitude.friendly")
                    : t("campaign.npcEditor.attitude.indifferent"),
              icon: {
                kind: "glyph" as const,
                key: attitude === "hostile" ? "attitude-hostile" : attitude === "friendly" ? "attitude-friendly" : "attitude-neutral",
              },
            }))}
          />
          </span>
          <span className="w-full sm:w-40">
          <Select<Gender>
            label={t("campaign.npcEditor.gender.label")}
            value={draft.gender}
            onChange={(gender) => onChange({ ...draft, gender })}
            options={[{ value: "", label: t("campaign.npcEditor.unspecified") }, ...GENDERS.map((gender) => ({ value: gender, label: t(gender === "Female" ? "campaign.npcEditor.gender.female" : gender === "Male" ? "campaign.npcEditor.gender.male" : "campaign.npcEditor.gender.nonbinary") }))]}
          />
          </span>
          {/* Beside the gender because the two pick the stand-in face
              together: an elf bandit draws the elf bandit, not a human one.
              An older host drops the race unsaved, so it waits for one that
              keeps it (the apps can open an older server). */}
          {keepsRace ? (
            <span className="w-full sm:w-48">
            <Select<string>
              label={t("campaign.npcEditor.race.label")}
              value={draft.race ?? ""}
              onChange={(race) => onChange({ ...draft, race })}
              options={[{ value: "", label: t("campaign.npcEditor.unspecified") }, ...NPC_RACE_OPTIONS]}
            />
            </span>
          ) : null}
        </div>

        {/* Who they are drawn to, beside the gender (issue 501): identity,
            so the DM never writes it by guesswork. */}
        <AttractionPicker
          value={draft.attraction ?? { genders: [], note: "" }}
          onChange={(attraction) => onChange({ ...draft, attraction })}
          hint={t("campaign.npcEditor.attraction.hint")}
          className="sm:max-w-md"
        />

        <input
          value={draft.location}
          list={places.length ? placeListId : undefined}
          onChange={(event) => onChange({ ...draft, location: event.target.value })}
          placeholder={t("campaign.npcEditor.location.placeholder")}
          aria-label={t("campaign.npcEditor.location.aria")}
          className={ui.input}
        />
        {places.length ? (
          <datalist id={placeListId}>
            {places.map((place) => (
              <option key={place} value={place} />
            ))}
          </datalist>
        ) : null}

        <input
          value={draft.aliases.join(", ")}
          onChange={(event) =>
            onChange({
              ...draft,
              aliases: event.target.value.split(",").map((alias) => alias.trim()).filter(Boolean),
            })
          }
          placeholder={t("campaign.npcEditor.aliases.placeholder")}
          className={ui.input}
        />

        <div className="flex items-start gap-1.5">
          <DictateField
            label={t("campaign.npcEditor.trait.label")}
            className="min-w-0 flex-1"
            onTranscript={(text) => onChange({ ...draft, trait: appendDictation(draft.trait, text) })}
          >
            <textarea
              value={draft.trait}
              onChange={(event) => onChange({ ...draft, trait: event.target.value })}
              rows={2}
              placeholder={t("campaign.npcEditor.trait.placeholder")}
              className={ui.input}
            />
          </DictateField>
          {suggest("trait")}
        </div>

        {factions.length ? (
          <Select
            label={t("campaign.npcEditor.faction.label")}
            value={draft.factionId}
            onChange={(factionId) => onChange({ ...draft, factionId })}
            options={[
              { value: "", label: t("campaign.npcEditor.faction.none") },
              ...factions.map((faction) => ({ value: faction.id, label: faction.name, icon: { kind: "glyph" as const, key: "system-factions" } })),
            ]}
          />
        ) : null}

        {/* The stat block they fight with: start_encounter with their name
            brings them in as it, under their own name. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <GameIcon icon={{ kind: "glyph", key: "system-bestiary" }} size="size-7" />
          <span className="text-xs text-stone-400">{t("campaign.npcEditor.statBlock.fightsAs")}</span>
          {draft.statBlock ? (
            <span className="pop-in inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-stone-900/60 py-0.5 pl-2.5 pr-1 text-xs text-stone-200">
              {draft.statBlock.startsWith("homebrew:") ? t("campaign.npcEditor.statBlock.own") : draft.statBlock.replace(/-/g, " ")}
              <button
                type="button"
                aria-label={t("campaign.npcEditor.statBlock.clear")}
                onClick={() => onChange({ ...draft, statBlock: "" })}
                className={cn(ui.iconAction, "rounded-full p-1 opacity-100 hover:text-red-300")}
              >
                <X className="size-3" />
              </button>
            </span>
          ) : null}
          <ContentPick
            kind="monsters"
            label={t("campaign.npcEditor.statBlock.label")}
            placeholder={draft.statBlock ? t("campaign.npcEditor.statBlock.another") : t("campaign.npcEditor.statBlock.placeholder")}
            className="min-w-48 flex-1"
            onPick={(entry) => onChange({ ...draft, statBlock: entry.slug ?? entry.name })}
          />
        </div>

        {/* Their own read-aloud voice (docs/vtt-parity-implementation-plan.md
            8.2): a voice from the server's speech backend and a pace, previewed here, heard on every
            line attributed to them. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <GameIcon icon={{ kind: "glyph", key: "tab-ambience" }} size="size-7" />
          <span className="min-w-0 flex-1 sm:max-w-72">
          <VoicePicker
            label={t("campaign.npcEditor.voice.label")}
            value={draft.voice?.voiceId ?? ""}
            onChange={(voiceId) =>
              onChange({
                ...draft,
                voice: voiceId ? { voiceId, speed: draft.voice?.speed ?? 1 } : null,
              })
            }
            noneLabel={t("campaign.npcEditor.voice.narrator")}
            className="w-full"
          />
          </span>
          {draft.voice ? (
            <>
              <VoicePreviewButton voice={draft.voice.voiceId} />
              <span className="flex items-center gap-2 text-xs text-stone-400">
                {t("campaign.npcEditor.voice.pace")}
                <span className="w-28">
                <Slider
                  label={t("campaign.npcEditor.voice.pace")}
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  value={draft.voice.speed}
                  onChange={(speed) => onChange({ ...draft, voice: { voiceId: draft.voice!.voiceId, speed } })}
                  bubble={(speed) => speed.toFixed(2)}
                />
                </span>
                <span className="w-8 text-stone-500">{draft.voice.speed.toFixed(2)}</span>
              </span>
            </>
          ) : null}
        </div>
      </section>

      {/* Only an author's word, with its reason, gives the party a history
          with someone (issue 731); a person hostile to the party has none. */}
      {knownBeforeOpen && draft.attitude !== "hostile" ? (
        <section className="panel space-y-2 rounded-xl p-3" data-tour="cast-known-before">
          <SectionHead title={t("campaign.npcEditor.known.title")} glyph="tab-bonds" className="mb-0" />
          <p id={knownLabelId} className="text-xs text-stone-300">
            {t("campaign.npcEditor.known.question")}
          </p>
          <span className="block sm:max-w-md" aria-describedby={knownLabelId}>
            <Select<KnownBeforeGrade | "none">
              label={t("campaign.npcEditor.known.question")}
              value={known?.grade ?? "none"}
              onChange={(grade) =>
                onChange({ ...draft, knownBefore: grade === "none" ? null : { grade, how: known?.how ?? "" } })
              }
              options={KNOWN_BEFORE_OPTIONS.map((option) => ({ ...option, label: t(option.label as never), hint: t(option.hint as never), icon: { kind: "glyph" as const, key: option.value === "none" ? "attitude-neutral" : "tab-bonds" } }))}
            />
          </span>
          {known ? (
            <div className="pop-in space-y-1">
              <label htmlFor={howId} className="block text-xs text-stone-300">
                {t("campaign.npcEditor.known.how")}
              </label>
              <input
                id={howId}
                value={known.how}
                maxLength={KNOWN_BEFORE_HOW_CHARS}
                onChange={(event) => onChange({ ...draft, knownBefore: { grade: known.grade, how: event.target.value } })}
                placeholder={t("campaign.npcEditor.known.placeholder")}
                aria-describedby={howHintId}
                aria-invalid={!known.how.trim()}
                className={ui.input}
              />
              <p id={howHintId} className="text-[11px] text-stone-500">
                {known.how.trim() ? "" : t("campaign.npcEditor.known.required") + " "}
                {t("campaign.npcEditor.known.help")}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="panel space-y-2 rounded-xl p-3">
        <SectionHead title={t("campaign.npcEditor.personality.title")} glyph="tab-bonds" className="mb-0" aside={suggest("personality")} />
        <PersonalitySliders draft={draft} onChange={onChange} />
      </section>

      <section className="panel space-y-2 rounded-xl p-3">
        <SectionHead title={t("campaign.npcEditor.goals.title")} glyph="quest-active" className="mb-0" />
        {GOAL_FIELDS.map(([field, placeholder]) => (
          <div key={field} className="flex items-center gap-1.5">
            <input
              value={goalText(draft, field)}
              onChange={(event) => onChange(setGoal(draft, field, event.target.value))}
              placeholder={t(field === "scene" ? "campaign.npcEditor.goals.scene" : field === "session" ? "campaign.npcEditor.goals.session" : "campaign.npcEditor.goals.ambition")}
              className={cn(ui.input, "min-w-0 flex-1")}
            />
            {field === "session" && draft.goals.session ? (
              <span className="shrink-0 text-[11px] text-stone-500">
                {draft.goals.session.progress}/{draft.goals.session.target}
              </span>
            ) : null}
            {suggest(field)}
          </div>
        ))}
        <p className="text-[11px] text-stone-500">
          {t("campaign.npcEditor.goals.sessionNote")}
        </p>
      </section>

      <section className="panel space-y-2 rounded-xl p-3">
        <SectionHead title={t("campaign.npcEditor.relations.title")} glyph="attitude-wary" className="mb-0" />
        <RelationEditor draft={draft} graph={graph} others={others} onChange={onChange} />
      </section>
    </>
  );
}
