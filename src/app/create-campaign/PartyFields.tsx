"use client";

import { InfoButton } from "@/components/ui/InfoDialog";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import {
  REROLL_LOW_DEFAULT,
  rerollBelowFor,
  rerollChoiceOf,
  type RerollChoice,
} from "@/lib/srd/ability-rerolls";
import { useServerRerollBelow } from "@/app/characters/builder/useTableRules";
import {
  CAMPAIGN_DIFFICULTIES,
  type CampaignDifficulty,
} from "@/lib/campaign-types";
import {
  CAMPAIGN_LENGTHS,
  HP_METHODS,
  STARTING_WEALTH,
  type CampaignLengthSetting,
  type HpMethodSetting,
  type StartingWealthSetting,
} from "@/lib/schemas/game-settings-options";
import { FieldLabel, ToggleCard } from "@/app/create-campaign/fields";
import type { StepProps } from "@/app/create-campaign/draft";

const messageKey = (value: string) => value as MessageKey;

// How many, how strong, how hard. A solo table has no player count
// (maxPlayers is pinned to 1 in the payload, from the solo entry point, never
// from the count chosen here).
export function PartyBasics({ draft, patch, gates }: StepProps) {
  const { t } = useI18n();
  const { solo } = gates;
  const difficultyInfo = [
    t("createCampaign.party.difficultyInfo"),
    ...CAMPAIGN_DIFFICULTIES.map(
      (value) =>
        `**${t(messageKey(`createCampaign.party.difficulty.${value}`))}**: ${t(messageKey(`createCampaign.party.difficulty.${value}Hint`))}`,
    ),
    t("createCampaign.party.difficultyInfoEnd"),
  ].join("\n\n");
  return (
    <div className={cn("grid gap-3", solo ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      {!solo ? (
        <div className="block">
          <FieldLabel>{t("createCampaign.party.players")}</FieldLabel>
          <NumberStepper min={1} max={8} value={draft.maxPlayers} onChange={(maxPlayers) => patch({ maxPlayers })} label={t("createCampaign.party.players")} />
        </div>
      ) : null}
      <div className="block">
        <FieldLabel>{t("createCampaign.party.startLevel")}</FieldLabel>
        <NumberStepper min={1} max={20} value={draft.startingLevel} onChange={(startingLevel) => patch({ startingLevel })} label={t("createCampaign.party.startLevel")} />
      </div>
      <label className={cn("block", !solo && "col-span-2 sm:col-span-1")}>
        <FieldLabel>
          <span className="flex items-center gap-1">
            {t("createCampaign.party.difficulty")}
            <InfoButton label={t("createCampaign.party.difficulty")} text={difficultyInfo} />
          </span>
        </FieldLabel>
        <Select<CampaignDifficulty>
          value={draft.difficulty}
          onChange={(difficulty) => patch({ difficulty })}
          label={t("createCampaign.party.difficulty")}
          className="w-full"
          options={CAMPAIGN_DIFFICULTIES.map((value) => ({ value, label: t(messageKey(`createCampaign.party.difficulty.${value}`)) }))}
        />
        {/* The chosen tier says what it means without opening anything. */}
        <p className="mt-1 text-xs text-stone-500">{t(messageKey(`createCampaign.party.difficulty.${draft.difficulty}Hint`))}</p>
      </label>
    </div>
  );
}

// How heroes are built here. Asked at creation because the first characters
// are built before anyone opens the lobby's settings.
export function CharacterRulesFields({ draft, patch, gates }: StepProps) {
  const { t } = useI18n();
  // Named in the "follow the server" choice, so it says what it means.
  const serverRerollBelow = useServerRerollBelow();
  const serverRerollDetail =
    serverRerollBelow === null
      ? ""
      : t("createCampaign.party.stats.serverDetail", { score: serverRerollBelow });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <FieldLabel>{t("createCampaign.party.hpPerLevel")}</FieldLabel>
          <Select<HpMethodSetting>
            value={draft.hpMethod}
            onChange={(hpMethod) => patch({ hpMethod })}
            label={t("createCampaign.party.hpPerLevel")}
            className="w-full"
            options={HP_METHODS.map((value) => ({ value, label: t(messageKey(`createCampaign.party.hp.${value}`)) }))}
          />
          <p className="mt-1 text-xs text-stone-500">{t("createCampaign.party.hp.firstLevel")}</p>
        </label>
        <label className="block">
          <FieldLabel>{t("createCampaign.party.wealth")}</FieldLabel>
          <Select<StartingWealthSetting>
            value={draft.startingWealth}
            onChange={(startingWealth) => patch({ startingWealth })}
            label={t("createCampaign.party.wealth")}
            className="w-full"
            options={STARTING_WEALTH.map((value) => ({ value, label: t(messageKey(`createCampaign.party.wealth.${value}`)) }))}
          />
          <p className="mt-1 text-xs text-stone-500">{t("createCampaign.party.wealth.help")}</p>
        </label>
        <label className="block sm:col-span-2">
          <FieldLabel>{t("createCampaign.party.rolledStats")}</FieldLabel>
          <Select<"server" | RerollChoice>
            value={draft.abilityRerollBelow === null ? "server" : rerollChoiceOf(draft.abilityRerollBelow)}
            onChange={(choice) =>
              patch({
                abilityRerollBelow:
                  choice === "server" ? null : rerollBelowFor(choice, draft.abilityRerollBelow ?? REROLL_LOW_DEFAULT),
              })
            }
            label={t("createCampaign.party.rolledStats")}
            className="w-full"
            options={[
              { value: "server", label: t("createCampaign.party.stats.server", { detail: serverRerollDetail }) },
              { value: "keep", label: t("createCampaign.party.stats.keep") },
              { value: "low", label: t("createCampaign.party.stats.low", { score: REROLL_LOW_DEFAULT }) },
              { value: "free", label: t("createCampaign.party.stats.free") },
            ]}
          />
          <p className="mt-1 text-xs text-stone-500">{t("createCampaign.party.stats.help")}</p>
        </label>
      </div>
      <DicePolicyField draft={draft} patch={patch} gates={gates} />
    </div>
  );
}

export function DicePolicyField({ draft, patch, gates }: StepProps) {
  const { t } = useI18n();
  return (
    <div>
      <FieldLabel className="mb-1.5">{t("createCampaign.party.dice")}</FieldLabel>
      <div className="flex gap-2">
        <ToggleCard
          active={draft.dicePolicy === "digital_only"}
          onClick={() => patch({ dicePolicy: "digital_only" })}
          label={t("createCampaign.party.dice.digital")}
          hint={t("createCampaign.party.dice.digitalHint")}
        />
        <ToggleCard
          active={draft.dicePolicy === "real_allowed"}
          onClick={() => patch({ dicePolicy: "real_allowed" })}
          label={t("createCampaign.party.dice.real")}
          hint={t(gates.solo ? "createCampaign.party.dice.realSoloHint" : "createCampaign.party.dice.realGroupHint")}
        />
      </div>
    </div>
  );
}

// Only an AI narrator plans a story arc, so only then is its length asked.
export function CampaignLengthField({ draft, patch, gates }: StepProps) {
  const { t } = useI18n();
  const lengthInfo = [
    t("createCampaign.party.lengthInfo"),
    `**${t("createCampaign.party.length.short")}**: ${t("createCampaign.party.length.shortInfo")}`,
    `**${t("createCampaign.party.length.standard")}**: ${t("createCampaign.party.length.standardInfo")}`,
    `**${t("createCampaign.party.length.epic")}**: ${t("createCampaign.party.length.epicInfo")}`,
    t("createCampaign.party.length.noCutoff"),
  ].join("\n\n");
  if (!gates.aiNarrates) {
    return null;
  }
  return (
    <label className="block">
      <FieldLabel>
        <span className="flex items-center gap-1">
          {t("createCampaign.party.length")}
          <InfoButton label={t("createCampaign.party.length")} text={lengthInfo} />
        </span>
      </FieldLabel>
      <Select<CampaignLengthSetting>
        value={draft.campaignLength}
        onChange={(campaignLength) => patch({ campaignLength })}
        label={t("createCampaign.party.length")}
        className="w-full"
        options={CAMPAIGN_LENGTHS.map((value) => ({ value, label: t(messageKey(`createCampaign.party.length.${value}`)) }))}
      />
      <p className="mt-1 text-xs text-stone-500">{t("createCampaign.party.length.help")}</p>
    </label>
  );
}
