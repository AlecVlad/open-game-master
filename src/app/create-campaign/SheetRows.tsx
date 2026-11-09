"use client";

import type { CSSProperties } from "react";
import { InfoButton } from "@/components/ui/InfoDialog";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { StepProps } from "@/app/create-campaign/draft";
import { flipRow, tableSheet, type SheetInfo, type SheetRowKey } from "@/app/create-campaign/table-sheet";

const ROW_MESSAGES: Record<SheetRowKey, { label: MessageKey; hint: MessageKey }> = {
  aiStorySetup: { label: "createCampaign.experience.sheet.aiStorySetup.label", hint: "createCampaign.experience.sheet.aiStorySetup.hint" },
  narrationGuard: { label: "createCampaign.experience.sheet.narrationGuard.label", hint: "createCampaign.experience.sheet.narrationGuard.hint" },
  worldSimulation: { label: "createCampaign.experience.sheet.worldSimulation.label", hint: "createCampaign.experience.sheet.worldSimulation.hint" },
  ttsEnabled: { label: "createCampaign.experience.sheet.ttsEnabled.label", hint: "createCampaign.experience.sheet.ttsEnabled.hint" },
  mapsEnabled: { label: "createCampaign.experience.sheet.mapsEnabled.label", hint: "createCampaign.experience.sheet.mapsEnabled.hint" },
  ambienceEnabled: { label: "createCampaign.experience.sheet.ambienceEnabled.label", hint: "createCampaign.experience.sheet.ambienceEnabled.hint" },
  ambienceAuto: { label: "createCampaign.experience.sheet.ambienceAuto.label", hint: "createCampaign.experience.sheet.ambienceAuto.hint" },
  presentation: { label: "createCampaign.experience.sheet.presentation.label", hint: "createCampaign.experience.sheet.presentation.hint" },
  relationships: { label: "createCampaign.experience.sheet.relationships.label", hint: "createCampaign.experience.sheet.relationships.hint" },
  romance: { label: "createCampaign.experience.sheet.romance.label", hint: "createCampaign.experience.sheet.romance.hint" },
  multiCharacter: { label: "createCampaign.experience.sheet.multiCharacter.off", hint: "createCampaign.experience.sheet.multiCharacter.hint" },
  midGameJoinOpen: { label: "createCampaign.experience.sheet.midGameJoinOpen.label", hint: "createCampaign.experience.sheet.midGameJoinOpen.hint" },
  holdSubmissions: { label: "createCampaign.experience.sheet.holdSubmissions.label", hint: "createCampaign.experience.sheet.holdSubmissions.hint" },
  multiclassingEnabled: { label: "createCampaign.experience.sheet.multiclassingEnabled.label", hint: "createCampaign.experience.sheet.multiclassingEnabled.hint" },
  inventoryApprovals: { label: "createCampaign.experience.sheet.inventoryApprovals.label", hint: "createCampaign.experience.sheet.inventoryApprovals.hint" },
  vitalsApprovals: { label: "createCampaign.experience.sheet.vitalsApprovals.label", hint: "createCampaign.experience.sheet.vitalsApprovals.hint" },
  boardDrawing: { label: "createCampaign.experience.sheet.boardDrawing.label", hint: "createCampaign.experience.sheet.boardDrawing.hint" },
  enemyIntent: { label: "createCampaign.experience.sheet.enemyIntent.label", hint: "createCampaign.experience.sheet.enemyIntent.hint" },
};

const INFO: Record<SheetInfo, { label: MessageKey; text: MessageKey }> = {
  livingWorld: { label: "createCampaign.experience.sheet.info.livingWorld.label", text: "createCampaign.experience.sheet.info.livingWorld.text" },
  bonds: { label: "createCampaign.experience.sheet.info.bonds.label", text: "createCampaign.experience.sheet.info.bonds.text" },
  romance: { label: "createCampaign.experience.sheet.info.romance.label", text: "createCampaign.experience.sheet.info.romance.text" },
  narrationGuard: { label: "createCampaign.experience.sheet.info.narrationGuard.label", text: "createCampaign.experience.sheet.info.narrationGuard.text" },
};

// Some of the table sheet's switches (table-sheet.ts decides which exist in
// this mode, what each says, and what a press does), drawn wherever the
// experience step groups them. A row the mode hides is simply absent, and a
// dependent row arrives beside its parent. The gold dot still marks a switch
// the "features on" total counts.
export function SheetRows({
  draft,
  patch,
  gates,
  keys,
  onFlip,
}: StepProps & { keys: readonly SheetRowKey[]; onFlip?: () => void }) {
  const { t } = useI18n();
  const rows = tableSheet(draft, gates)
    .flatMap((group) => group.rows)
    .filter((row) => keys.includes(row.key))
    .sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
  if (!rows.length) {
    return null;
  }
  return (
    <div className="cc-sheet-grid">
      {rows.map((row) => (
        <div
          key={row.key}
          className="cc-row-slot"
          data-dependent={row.dependent ? "true" : "false"}
          data-info={row.info ? "true" : "false"}
        >
          <button
            type="button"
            disabled={row.disabled}
            aria-pressed={row.on}
            onClick={() => {
              patch(flipRow(draft, row.key));
              onFlip?.();
            }}
            className="cc-row motion-press"
          >
            <span className="cc-switch" style={{ "--knob": row.knob } as CSSProperties} aria-hidden="true" />
            <span className="min-w-0">
              <span className="cc-row-label">
                {t(
                  row.key === "multiCharacter"
                    ? (`createCampaign.experience.sheet.multiCharacter.${draft.multiCharacter === "off" ? "off" : draft.multiCharacter === "one_active" ? "oneActive" : "allActive"}` as MessageKey)
                    : ROW_MESSAGES[row.key].label,
                )}
              </span>
              <span className="cc-row-hint">
                {t(
                  row.key === "ttsEnabled" && !gates.ttsAvailable
                    ? "createCampaign.experience.sheet.ttsEnabled.noService"
                    : row.key === "mapsEnabled" && !gates.mapsAvailable
                      ? "createCampaign.experience.sheet.mapsEnabled.noPainter"
                      : ROW_MESSAGES[row.key].hint,
                )}
              </span>
            </span>
          </button>
          {row.counted && row.on ? <span className="cc-dot" aria-hidden="true" /> : null}
          {row.info ? (
            <InfoButton label={t(INFO[row.info].label)} text={t(INFO[row.info].text)} className="absolute right-1.5 top-1.5" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
