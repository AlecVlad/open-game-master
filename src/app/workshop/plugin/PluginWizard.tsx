"use client";

import { Switch } from "@/components/ui/Switch";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Wizard } from "@/components/ui/Wizard";
import type { WorldPackDraft } from "@/lib/worlds/draft";
import { NameFields, OriginFields, VoiceFields, WorldFields } from "@/app/workshop/plugin/IdentityFields";

// Guided setup: the identity of a world pack, one question at a time. The
// steps are the same four field groups the Identity tab shows together; the
// wizard only orders them and asks the last question, whether to pull the
// workshop's own lore into the pack before the person starts on the tables.
//
// The draft edits land as they are typed (the panel autosaves them), so
// closing the wizard halfway loses nothing and the Identity tab shows
// exactly where the person stopped.

export function PluginWizard({
  draft,
  onDraft,
  onDone,
  onCancel,
}: {
  draft: WorldPackDraft;
  onDraft: (next: WorldPackDraft) => void;
  onDone: (pull: boolean) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [pull, setPull] = useState(true);
  const props = { draft, onDraft };
  return (
    <Wizard
      title={t("workshop.plugin.wizard.title")}
      doneLabel={t("workshop.plugin.wizard.done")}
      onDone={() => onDone(pull)}
      onCancel={onCancel}
      // Room for the sheet's X, which floats over the header's step count
      // (the same clearance CreateCampaignDialog and SetupWizard give it).
      className="[&>header]:pr-9"
      steps={[
        {
          key: "name",
          title: t("workshop.plugin.wizard.step.name.title"),
          blurb: t("workshop.plugin.wizard.step.name.body"),
          content: <NameFields {...props} />,
          canContinue: Boolean(draft.name.trim() && draft.blurb.trim()),
        },
        {
          key: "origins",
          title: t("workshop.plugin.wizard.step.origin.title"),
          blurb: t("workshop.plugin.wizard.step.origin.body"),
          content: <OriginFields {...props} />,
          canContinue: Boolean(draft.inspiredBy.trim()),
        },
        {
          key: "world",
          title: t("workshop.plugin.wizard.step.world.title"),
          blurb: t("workshop.plugin.wizard.step.world.body"),
          content: <WorldFields {...props} />,
          canContinue: Boolean(draft.theme.trim()),
        },
        {
          key: "voice",
          title: t("workshop.plugin.wizard.step.voice.title"),
          blurb: t("workshop.plugin.wizard.step.voice.body"),
          content: <VoiceFields {...props} />,
        },
        {
          key: "fill",
          title: t("workshop.plugin.wizard.step.fill.title"),
          blurb: t("workshop.plugin.wizard.step.fill.body"),
          content: (
            <div className="panel flex items-start gap-3 rounded-lg p-3 text-sm text-stone-300">
              <Switch on={pull} onChange={setPull} label={t("workshop.plugin.wizard.pullNow")} className="mt-0.5" />
              <span>
                {t("workshop.plugin.wizard.pullExplanation")}
                <span className="mt-1 block text-[11px] text-stone-500">
                  {t("workshop.plugin.wizard.pullHint")}
                </span>
              </span>
            </div>
          ),
        },
      ]}
    />
  );
}
