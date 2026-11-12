"use client";

import { NumberStepper } from "@/components/ui/NumberStepper";
import { Select } from "@/components/ui/Select";
import { SectionHead } from "@/components/ui/SectionHead";
import { UnofficialPackNotice } from "@/components/UnofficialPackNotice";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import { GENRE_OPTIONS, RACE_OPTIONS, ALIGNMENT_OPTIONS, catalogLabel } from "@/lib/worlds/catalog";
import type { WorldPackDraft } from "@/lib/worlds/draft";
import { DM_FLAVOR_FLOOR } from "@/lib/worlds/draft-check";
import { ChipList, TextField } from "@/app/workshop/plugin/fields";
import type { SectionProps } from "@/app/workshop/plugin/types";

// The identity of a world pack, in four groups that are also the wizard's
// steps: what it is called, whose setting it stands on, what kind of world
// it is, and how the narrator should sound. The Identity tab shows all four
// at once for anyone past the guided setup.

export function NameFields({ draft, onDraft }: SectionProps) {
  const { t } = useI18n();
  const set = (patch: Partial<WorldPackDraft>) => onDraft({ ...draft, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        label={t("workshop.plugin.identity.name")}
        value={draft.name}
        onChange={(name) => set({ name })}
        maxLength={70}
        placeholder={t("workshop.plugin.identity.name.placeholder")}
        className="sm:col-span-2"
        required
      />
      <TextField
        label={t("workshop.plugin.identity.blurb")}
        value={draft.blurb}
        onChange={(blurb) => set({ blurb })}
        maxLength={200}
        placeholder={t("workshop.plugin.identity.blurb.placeholder")}
        hint={t("workshop.plugin.identity.blurb.hint")}
        className="sm:col-span-2"
        required
      />
      <TextField label={t("workshop.plugin.identity.author")} value={draft.author} onChange={(author) => set({ author })} maxLength={80} />
      <TextField
        label={t("workshop.plugin.identity.version")}
        value={draft.version}
        onChange={(version) => set({ version })}
        maxLength={20}
        hint={t("workshop.plugin.identity.version.hint")}
      />
      <TextField
        label={t("workshop.plugin.identity.homepage")}
        value={draft.homepage}
        onChange={(homepage) => set({ homepage })}
        maxLength={300}
        placeholder="https://"
        className="sm:col-span-2"
      />
    </div>
  );
}

export function OriginFields({ draft, onDraft }: SectionProps) {
  const { t } = useI18n();
  const set = (patch: Partial<WorldPackDraft>) => onDraft({ ...draft, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        label={t("workshop.plugin.identity.inspiredBy")}
        value={draft.inspiredBy}
        onChange={(inspiredBy) => set({ inspiredBy })}
        maxLength={200}
        placeholder={t("workshop.plugin.identity.inspiredBy.placeholder")}
        className="sm:col-span-2"
        required
      />
      <TextField
        label={t("workshop.plugin.identity.rightsHolder")}
        value={draft.rightsHolder}
        onChange={(rightsHolder) => set({ rightsHolder })}
        maxLength={120}
        placeholder={t("workshop.plugin.identity.rightsHolder.placeholder")}
        hint={t("workshop.plugin.identity.rightsHolder.hint")}
        className="sm:col-span-2"
      />
      <UnofficialPackNotice
        rightsHolder={draft.rightsHolder}
        inspiredBy={draft.inspiredBy.trim() || undefined}
        className="sm:col-span-2"
      />
      <TextField
        label={t("workshop.plugin.identity.franchise")}
        value={draft.franchise}
        onChange={(franchise) => set({ franchise })}
        maxLength={60}
        placeholder={t("workshop.plugin.identity.franchise.placeholder")}
        hint={t("workshop.plugin.identity.franchise.hint")}
      />
      <TextField
        label={t("workshop.plugin.identity.edition")}
        value={draft.edition}
        onChange={(edition) => set({ edition })}
        maxLength={60}
        placeholder={t("workshop.plugin.identity.edition.placeholder")}
      />
      <div className="block">
        <span className="mb-1 block font-display text-[11px] tracking-[0.1em] text-amber-300/85">{t("workshop.plugin.identity.editionOrder")}</span>
        <NumberStepper
          label={t("workshop.plugin.identity.editionOrder")}
          min={0}
          max={999}
          value={draft.editionOrder}
          onChange={(next) => set({ editionOrder: Math.max(0, Math.min(999, next || 0)) })}
        />
        <span className="mt-1 block text-[11px] text-stone-500">{t("workshop.plugin.identity.editionOrder.hint")}</span>
      </div>
    </div>
  );
}

export function WorldFields({ draft, onDraft }: SectionProps) {
  const { t } = useI18n();
  const set = (patch: Partial<WorldPackDraft>) => onDraft({ ...draft, ...patch });
  const alignments = ALIGNMENT_OPTIONS.map((option) => ({
    value: option.value,
    label: t(`workshop.plugin.alignment.${option.value}` as never),
  }));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="block">
        <span className="mb-1 block font-display text-[11px] tracking-[0.1em] text-amber-300/85">
          {t("workshop.plugin.identity.baseGenre")} <span className="text-amber-400/80">*</span>
        </span>
        <Select<WorldPackDraft["baseGenre"]>
          label={t("workshop.plugin.identity.baseGenre")}
          value={draft.baseGenre}
          onChange={(baseGenre) => set({ baseGenre })}
          options={GENRE_OPTIONS.map((option) => ({ value: option.value as WorldPackDraft["baseGenre"], label: t(`createCampaign.identity.genre.${option.value}.name` as never) }))}
        />
        <span className="mt-1 block text-[11px] text-stone-500">
          {t("workshop.plugin.identity.baseGenre.hint")}
        </span>
      </div>
      <TextField
        label={t("workshop.plugin.identity.theme")}
        value={draft.theme}
        onChange={(theme) => set({ theme })}
        maxLength={120}
        placeholder={t("workshop.plugin.identity.theme.placeholder")}
        hint={t("workshop.plugin.identity.theme.hint")}
        required
      />
      <TextField
        label={t("workshop.plugin.identity.premise")}
        value={draft.premise}
        onChange={(premise) => set({ premise })}
        maxLength={500}
        rows={3}
        placeholder={t("workshop.plugin.identity.premise.placeholder")}
        hint={t("workshop.plugin.identity.premise.hint")}
        className="sm:col-span-2"
      />
      <div className="sm:col-span-2">
        <span className="mb-1 block font-display text-[11px] tracking-[0.1em] text-amber-300/85">{t("workshop.plugin.identity.alignments")}</span>
        <ChipList
          items={draft.alignments}
          onChange={(alignments) => set({ alignments })}
          options={alignments}
          prompt={t("workshop.plugin.identity.addAlignment")}
          labelFor={(code) => catalogLabel(ALIGNMENT_OPTIONS, code)}
          max={9}
        />
      </div>
    </div>
  );
}

export function VoiceFields({ draft, onDraft }: SectionProps) {
  const { t } = useI18n();
  const set = (patch: Partial<WorldPackDraft>) => onDraft({ ...draft, ...patch });
  const thin = draft.dmFlavor.trim().length < DM_FLAVOR_FLOOR;
  const companionRaces = RACE_OPTIONS.map((option) => ({
    ...option,
    label: t(`campaign.npcEditor.raceOption.${option.value}` as never),
  }));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        label={t("workshop.plugin.identity.narratorBrief")}
        value={draft.dmFlavor}
        onChange={(dmFlavor) => set({ dmFlavor })}
        maxLength={1400}
        rows={6}
        placeholder={t("workshop.plugin.identity.narratorBrief.placeholder")}
        hint={
          thin
            ? t("workshop.plugin.identity.narratorBrief.short", { minimum: String(DM_FLAVOR_FLOOR), current: String(draft.dmFlavor.trim().length) })
            : t("workshop.plugin.identity.narratorBrief.hint")
        }
        className="sm:col-span-2"
      />
      <TextField
        label={t("workshop.plugin.identity.portraitStyle")}
        value={draft.portraitStyle}
        onChange={(portraitStyle) => set({ portraitStyle })}
        maxLength={300}
        placeholder={t("workshop.plugin.identity.portraitStyle.placeholder")}
        hint={t("workshop.plugin.identity.portraitStyle.hint")}
      />
      <TextField
        label={t("workshop.plugin.identity.mapStyle")}
        value={draft.mapStyle}
        onChange={(mapStyle) => set({ mapStyle })}
        maxLength={300}
        placeholder={t("workshop.plugin.identity.mapStyle.placeholder")}
        hint={t("workshop.plugin.identity.mapStyle.hint")}
      />
      <TextField
        label={t("workshop.plugin.identity.sceneStyle")}
        value={draft.sceneStyle}
        onChange={(sceneStyle) => set({ sceneStyle })}
        maxLength={300}
        placeholder={t("workshop.plugin.identity.sceneStyle.placeholder")}
        hint={t("workshop.plugin.identity.sceneStyle.hint")}
      />
      <TextField
        label={t("workshop.plugin.identity.nameHints")}
        value={draft.nameHints}
        onChange={(nameHints) => set({ nameHints })}
        maxLength={300}
        placeholder={t("workshop.plugin.identity.nameHints.placeholder")}
        hint={t("workshop.plugin.identity.nameHints.hint")}
      />
      <TextField
        label={t("workshop.plugin.identity.raceHint")}
        value={draft.raceHint}
        onChange={(raceHint) => set({ raceHint })}
        maxLength={300}
        placeholder={t("workshop.plugin.identity.raceHint.placeholder")}
        hint={t("workshop.plugin.identity.raceHint.hint")}
      />
      <div className="sm:col-span-2">
        <span className="mb-1 block font-display text-[11px] tracking-[0.1em] text-amber-300/85">{t("workshop.plugin.identity.companionRaces")}</span>
        <ChipList
          items={draft.companionRaces}
          onChange={(companionRaces) => set({ companionRaces })}
          options={companionRaces}
          prompt={t("workshop.plugin.identity.companionRaces.prompt")}
          labelFor={(id) => t(`campaign.npcEditor.raceOption.${id}` as never)}
        />
        <p className="mt-1 text-[11px] text-stone-500">{t("workshop.plugin.identity.companionRaces.empty")}</p>
      </div>
    </div>
  );
}

export function IdentitySection(props: SectionProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.identity.section.name")} glyph="system-plugin" />
        <NameFields {...props} />
      </section>
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.identity.section.origin")} glyph="tab-friends" />
        <OriginFields {...props} />
      </section>
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.identity.section.world")} glyph="system-region" />
        <WorldFields {...props} />
      </section>
      <section className={ui.card + " p-4"}>
        <SectionHead title={t("workshop.plugin.identity.section.voice")} glyph="tab-ambience" />
        <VoiceFields {...props} />
      </section>
    </div>
  );
}
