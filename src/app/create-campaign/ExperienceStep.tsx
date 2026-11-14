"use client";

import { useRef } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { cn } from "@/lib/cn";
import { InfoButton } from "@/components/ui/InfoDialog";
import { replayAnimation } from "@/lib/motion/replay";
import { VARIANT_TOGGLES, VariantRulesFields, REST_LABELS } from "@/app/campaigns/[campaignId]/RulesPanel";
import { DetailGroup } from "@/app/create-campaign/fields";
import { AlliesFields, NarrationFields } from "@/app/create-campaign/NarratorFields";
import { SafetyFields } from "@/app/create-campaign/SafetyFields";
import { SheetRows } from "@/app/create-campaign/SheetRows";
import { VoiceChatFields } from "@/app/create-campaign/VoiceChatFields";
import type { StepProps } from "@/app/create-campaign/draft";
import { groupProps, type GroupControl } from "@/app/create-campaign/groups";
import {
  aiSummary,
  boardSummary,
  bondsSummary,
  playersSummary,
  safetySummary,
  variantSummary,
  voiceChatSummary,
} from "@/app/create-campaign/summaries";
import { countableRows, featuresOn } from "@/app/create-campaign/table-sheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { CampaignDraft } from "@/app/create-campaign/draft";

// Step 2, the experience: first how the table sounds (narration and who
// voices the characters, side by side), then its atmosphere and a safety
// entry nobody has to hunt for. Everything else waits in named groups, each
// saying on its closed face what it holds. The running total is the old
// table sheet's: the same rows, counted the same way.
export function ExperienceStep(props: StepProps & { active: boolean; groups: GroupControl }) {
  const { t } = useI18n();
  const variantInfo = [
    ...VARIANT_TOGGLES.map(
      (toggle) =>
        `**${t(`createCampaign.experience.variantRules.${toggle.key}.label` as MessageKey)}**: ${t(`createCampaign.experience.variantRules.${toggle.key}.tip` as MessageKey)}`,
    ),
    `**${t("createCampaign.experience.variantRules.restLengths")}**: ${Object.keys(REST_LABELS)
      .map((variant) => t(`createCampaign.experience.variantRules.rest.${variant}` as MessageKey))
      .join("; ")}.`,
  ].join("\n\n");
  const { draft, gates, active, groups } = props;
  const counter = useRef<HTMLSpanElement>(null);
  // The total answers every press, including one that does not move it.
  const onFlip = () => replayAnimation(counter.current, "cc-count-pop var(--dur-beat) var(--ease-spring)");
  const rows = { ...props, onFlip };
  return (
    <div className={cn("space-y-4 text-sm", active && "cc-live")}>
      {/* What each group holds leads; the count is a quiet aside, since
          switching more on is not a goal (a gold dot marks a counted one). */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="cc-note min-w-0 flex-1 basis-48 leading-relaxed">
          {t("createCampaign.experience.intro")}
        </p>
        <span className="cc-note shrink-0" aria-live="polite">
          <span ref={counter} className="inline-block font-semibold text-amber-200">
            {t("createCampaign.experience.counter", { active: featuresOn(draft, gates), total: countableRows(gates) })}
          </span>
        </span>
      </div>

      <section className="cc-field" aria-labelledby="cc-voices-head">
        <div className="cc-field-head">
          <span id="cc-voices-head" className="cc-eyebrow">
            {t("createCampaign.experience.narration.title")}
          </span>
          <span className="cc-note">{t("createCampaign.experience.narration.note")}</span>
        </div>
        <NarrationFields {...rows} />
      </section>

      <section>
        <div className="cc-group-head">
          <span className="cc-eyebrow">{t("createCampaign.experience.atmosphere.title")}</span>
          <span className="cc-group-rule" aria-hidden="true" />
        </div>
        <SheetRows {...rows} keys={["mapsEnabled", "ambienceEnabled", "ambienceAuto", "presentation"]} />
      </section>

      <DetailGroup {...groupProps(groups, "safety")} title={t("createCampaign.experience.safety.title")} glyph="ui-lock" summary={safetySummary(draft, t)}>
        <SafetyFields {...props} />
      </DetailGroup>

      <div className="cc-group-head pt-1">
        <span className="cc-eyebrow">{t("createCampaign.experience.more.title")}</span>
        <span className="cc-group-rule" aria-hidden="true" />
        <span className="cc-note">{t("createCampaign.experience.optional")}</span>
      </div>
      <div className="space-y-2">
        {gates.aiNarrates ? (
          <DetailGroup {...groupProps(groups, "ai")} title={t("createCampaign.experience.ai.title")} glyph="ui-ai" summary={aiSummary(draft, t)}>
            <SheetRows {...rows} keys={["aiStorySetup", "narrationGuard", "worldSimulation"]} />
            <AlliesFields {...props} />
          </DetailGroup>
        ) : null}
        <DetailGroup {...groupProps(groups, "bonds")} title={t("createCampaign.experience.bonds.title")} glyph="tab-bonds" summary={bondsSummary(draft, t)}>
          <SheetRows {...rows} keys={["relationships", "romance"]} />
        </DetailGroup>
        <DetailGroup
          {...groupProps(groups, "players")}
          title={t("createCampaign.experience.players.title")}
          glyph="tab-party"
          summary={playersSummary(draft, gates, t)}
        >
          <MultiCharacterField draft={draft} patch={props.patch} />
          <SheetRows {...rows} keys={["midGameJoinOpen", "holdSubmissions", "inventoryApprovals", "vitalsApprovals"]} />
        </DetailGroup>
        <DetailGroup {...groupProps(groups, "board")} title={t("createCampaign.experience.board.title")} glyph="tab-battle" summary={boardSummary(draft, t)}>
          <SheetRows {...rows} keys={["boardDrawing", "enemyIntent"]} />
        </DetailGroup>
        <DetailGroup {...groupProps(groups, "variants")} title={t("createCampaign.experience.variants.title")} glyph="system-rules" summary={variantSummary(draft, t)}>
          <p className="flex items-center gap-1 text-xs text-stone-500">
            {t("createCampaign.experience.variants.info")}
            <InfoButton label={t("createCampaign.experience.variants.infoLabel")} text={variantInfo} />
          </p>
          <VariantRulesFields value={draft.variantRules} onChange={(variantRules) => props.patch({ variantRules })} />
        </DetailGroup>
        {/* A solo table has nobody to talk to. Live voice chat is people
            talking to each other, not the narration above. */}
        {!gates.solo ? (
          <DetailGroup {...groupProps(groups, "voiceChat")} title={t("createCampaign.experience.voiceChat.title")} glyph="ui-voice" summary={voiceChatSummary(draft, t)}>
            <VoiceChatFields value={draft.voiceChat} onChange={(voiceChat) => props.patch({ voiceChat })} />
          </DetailGroup>
        ) : null}
      </div>
    </div>
  );
}

// Characters per player, as its three answers side by side rather than a
// switch that cycles through them.
const MULTI_LABELS: Record<CampaignDraft["multiCharacter"], MessageKey> = {
  off: "createCampaign.experience.multiCharacter.oneEach",
  one_active: "createCampaign.experience.multiCharacter.severalOne",
  all_active: "createCampaign.experience.multiCharacter.severalAll",
};

const MULTI_HINTS: Record<CampaignDraft["multiCharacter"], MessageKey> = {
  off: "createCampaign.experience.multiCharacter.hint.off",
  one_active: "createCampaign.experience.multiCharacter.hint.oneActive",
  all_active: "createCampaign.experience.multiCharacter.hint.allActive",
};

function MultiCharacterField({ draft, patch }: Pick<StepProps, "draft" | "patch">) {
  const { t } = useI18n();
  return (
    <div data-sheet-row="multiCharacter">
      <span className="mb-1 block text-xs text-stone-400">{t("createCampaign.experience.multiCharacter.label")}</span>
      <SegmentedControl<CampaignDraft["multiCharacter"]>
        size="sm"
        label={t("createCampaign.experience.multiCharacter.label")}
        value={draft.multiCharacter}
        onChange={(multiCharacter) => patch({ multiCharacter })}
        options={[
          { value: "off", label: t(MULTI_LABELS.off) },
          { value: "one_active", label: t(MULTI_LABELS.one_active) },
          { value: "all_active", label: t(MULTI_LABELS.all_active) },
        ]}
      />
      <p key={draft.multiCharacter} className="live-in mt-1 text-[11px] text-stone-500">
        {t(MULTI_HINTS[draft.multiCharacter])}
      </p>
    </div>
  );
}
