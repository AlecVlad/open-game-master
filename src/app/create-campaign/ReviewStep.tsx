"use client";

import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { CampaignCover } from "@/components/CampaignCover";
import { StorySetupNotice } from "@/components/StorySetupNotice";
import { useTtsVoices, voiceLabel } from "@/components/VoicePicker";
import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { WorldPackSummary } from "@/lib/worlds/types";
import type { StepProps } from "@/app/create-campaign/draft";
import type { GroupId, StepKey } from "@/app/create-campaign/groups";
import { coverSheet } from "@/app/create-campaign/cover-sheet";
import { customRules, narrationSummary, safetySummary } from "@/app/create-campaign/summaries";
import { featuresOn } from "@/app/create-campaign/table-sheet";
import { bringsSomething } from "@/app/workshop/ContentImportPicker";

export type EditTarget = { step: Exclude<StepKey, "review">; group?: GroupId };

const DM_MODE_MESSAGE_KEYS: Record<StepProps["draft"]["dmMode"], MessageKey> = {
  ai: "createCampaign.review.dmMode.ai",
  steered: "createCampaign.review.dmMode.steered",
  human: "createCampaign.review.dmMode.human",
  assisted: "createCampaign.review.dmMode.assisted",
};

const genreMessageKey = (genre: string): MessageKey =>
  `createCampaign.identity.genre.${genre}.name` as MessageKey;

// Step 3: the cover the campaign will wear, assembled from the choices behind
// it, then the read-back. The cover is CampaignCover with no art, the same
// tile the home screen draws until somebody paints one from the lobby. Every
// row has an Edit that opens the place it was set, and the step comes back
// here with nothing lost. The warnings that block creation, and the
// Storyboard one, sit next to the button they concern.
export function ReviewStep({
  draft,
  patch,
  gates,
  active,
  selectedPack,
  prep,
  error,
  followUp = null,
  onEdit,
  defaultsPanel,
}: StepProps & {
  // True while this is the step on screen; the cover assembles on arrival.
  active: boolean;
  selectedPack: WorldPackSummary | null;
  prep: { title: string; arcComing: boolean } | null;
  error: string;
  // The campaign is made and part of what was chosen did not land: what
  // failed, and the way into the campaign as it stands. The wizard's own
  // button says Try again meanwhile and sends only what failed.
  followUp?: { problems: string[]; busy: boolean; onOpen: () => void } | null;
  onEdit: (target: EditTarget) => void;
  defaultsPanel: ReactNode;
}) {
  const { t } = useI18n();
  const { solo, storyKnownMissing } = gates;
  const genreName = t(genreMessageKey(draft.genre));
  const sheet = coverSheet(draft, gates, selectedPack?.name ?? null, t);
  const voices = useTtsVoices();
  const rules = customRules(draft, t);
  const importing = bringsSomething(draft.contentImport);
  const storyboardClash = Boolean(prep?.arcComing && importing && gates.aiNarrates && draft.aiStorySetup && !draft.storySetupKept);
  let index = 0;
  const row = (label: string, value: ReactNode, target: EditTarget, options: { gold?: boolean; wrap?: boolean } = {}) => (
    <Row key={label} label={label} index={index++} gold={options.gold} wrap={options.wrap} onEdit={() => onEdit(target)}>
      {value}
    </Row>
  );

  return (
    <div className={cn("space-y-4 text-sm", active && "cc-live")}>
      <div className="cc-review">
        <div className="cc-cover">
          <div className="cc-cover-art rounded-xl">
            <CampaignCover cover={null} title={sheet.title} genre={draft.genre} />
            <span className="cc-cover-caption">
              <span className="cc-cover-genre">{genreName}</span>
              <span className="cc-cover-title">{sheet.title}</span>
            </span>
          </div>
          <div className="flex flex-col gap-1 px-1 pb-1 pt-2.5">
            <span className="cc-prose text-[12.5px] leading-snug text-stone-300">{sheet.theme}</span>
            <span className="cc-note">{sheet.meta}</span>
          </div>
          <span className="cc-stamp" aria-hidden="true">
            <span className="cc-stamp-top">{sheet.difficulty}</span>
            <span className="cc-stamp-sub">{sheet.stampSub}</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-2.5">
          <dl className="cc-readback">
            {row(t("createCampaign.review.row.runsGame"), t(DM_MODE_MESSAGE_KEYS[draft.dmMode]), { step: "essentials" }, { gold: true })}
            {row(t("createCampaign.review.row.setting"), sheet.setting, { step: "essentials", group: selectedPack ? "world" : undefined })}
            {row(t("createCampaign.review.row.party"), sheet.party, { step: "essentials" })}
            {row(t("createCampaign.review.row.difficulty"), sheet.difficulty, { step: "essentials" })}
            {row(t("createCampaign.review.row.dice"), sheet.dice, { step: "essentials", group: "character" })}
            {row(
              t("createCampaign.review.row.narration"),
              narrationSummary(draft, gates, voiceLabel(voices, draft.ttsVoice), t),
              { step: "experience" },
              { wrap: true },
            )}
            {row(t("createCampaign.review.row.safety"), safetySummary(draft, t), { step: "experience", group: "safety" }, { wrap: true })}
            {row(t("createCampaign.review.row.rules"), rules ?? t("createCampaign.review.rulesBook"), { step: "experience", group: "variants" }, { wrap: true })}
            {row(
              t("createCampaign.review.row.prep"),
              importing
                ? t("createCampaign.review.prep.from", { title: prep?.title ?? t("createCampaign.review.prep.workshop") })
                : t("createCampaign.review.prep.none"),
              { step: "essentials", group: "prep" },
              { wrap: true },
            )}
            {row(t("createCampaign.review.row.tableFeatures"), t("createCampaign.review.tableFeatures", { count: featuresOn(draft, gates) }), { step: "experience" }, { gold: true })}
          </dl>
          <p className="text-stone-400">
            {t(solo ? "createCampaign.review.lobby.solo" : "createCampaign.review.lobby.group")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[t(`createCampaign.party.difficulty.${draft.difficulty}Hint` as MessageKey), ...sheet.chips].map((chip, chipIndex) => (
              <span key={chip} className="cc-review-chip" style={{ "--cc-delay": `${420 + chipIndex * 60}ms` } as CSSProperties}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {storyboardClash ? (
        <StorySetupNotice
          text={t("createCampaign.review.storyClash")}
          onTurnOff={() => patch({ aiStorySetup: false })}
          onKeep={() => patch({ storySetupKept: true })}
        />
      ) : null}
      {defaultsPanel}
      {solo && storyKnownMissing ? (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-amber-200">
          {t("createCampaign.review.soloAiMissing")}
        </p>
      ) : null}
      {error ? <p className="motion-shake text-red-400">{error}</p> : null}
      {followUp ? (
        <div role="alert" className="motion-shake space-y-2 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-amber-200">
          <p>{t(solo ? "createCampaign.review.followUp.adventureIntro" : "createCampaign.review.followUp.campaignIntro")}</p>
          <ul className="list-disc space-y-1 pl-5 text-amber-100/90">
            {followUp.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-200/80">
            {t("createCampaign.review.followUp.help")}
          </p>
          <button type="button" className="cc-link inline-flex min-h-10 items-center" disabled={followUp.busy} onClick={followUp.onOpen}>
            {t(solo ? "createCampaign.review.followUp.openAdventure" : "createCampaign.review.followUp.openCampaign")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// The rows cascade in at 70 ms steps once the step is on screen.
function Row({
  label,
  index,
  gold = false,
  wrap = false,
  onEdit,
  children,
}: {
  label: string;
  index: number;
  gold?: boolean;
  wrap?: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="cc-readback-row" data-wrap={wrap || undefined} style={{ "--cc-delay": `${index * 70}ms` } as CSSProperties}>
      <dt>{label}</dt>
      <dd data-ink={gold ? "gold" : undefined}>
        <span className="cc-readback-value">{children}</span>
        <button
          type="button"
          className="cc-readback-edit"
          onClick={onEdit}
          aria-label={t("createCampaign.review.editAria", { label: label.toLowerCase() })}
        >
          {t("createCampaign.review.edit")}
        </button>
      </dd>
    </div>
  );
}
