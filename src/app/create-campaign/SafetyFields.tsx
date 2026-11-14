"use client";

import { SafetyToneFields } from "@/components/SafetyToneFields";
import { useI18n } from "@/lib/i18n/provider";
import type { StepProps } from "@/app/create-campaign/draft";
import { normalizeGm, normalizeSafety } from "@/lib/dm/safety-logic";

// The safety and tone block (docs/vtt-parity-implementation-plan.md section
// 9): the same fields the lobby edits later. A DM personality sets strictness,
// tone and the narrator's voice at once, which the line under it says, since
// the voice it changes is the one chosen beside the narration above.
export function SafetyFields({ draft, patch, gates }: StepProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <SafetyToneFields
        safety={normalizeSafety(draft.safety)}
        gm={normalizeGm(draft.gm)}
        ttsVoice={draft.ttsVoice}
        onSafety={(safety) => patch({ safety })}
        onGm={(gm) => patch({ gm })}
        onVoice={(ttsVoice) => patch({ ttsVoice })}
        tableLanguage={draft.tableLanguage}
      />
      <p className="text-xs text-stone-500">
        {t(gates.ttsAvailable && draft.ttsEnabled ? "safetyTone.personalityNote.active" : "safetyTone.personalityNote.inactive")}
      </p>
    </div>
  );
}
