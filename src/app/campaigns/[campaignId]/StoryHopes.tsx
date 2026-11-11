"use client";

import { useId, useState } from "react";
import { SheetBlock } from "@/components/sheet/SheetParts";
import { LengthNote } from "@/components/ui/LengthNote";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/provider";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import { ui } from "@/lib/ui";
import { hostOffers, useCapabilities } from "@/lib/use-capabilities";
import { KitButton } from "./PanelKit";

// The sheet schema's limit (src/lib/schemas/sheet.ts HOPES_MAX, checked equal
// by scripts/test-story-hopes.mjs).
const HOPES_MAX = 500;

// "Hopes for this story" on the player's own sheet: what they would love the
// story to hold for this character (a romance, a rival, a redemption), said
// to the GM out of character. Only the owner and a DM seat ever receive the
// text (src/lib/dm/sheet-view.ts). The GM reads it every turn
// (src/lib/dm/prompt.ts describeSheet), so the owner can change it as the
// story changes; the builder's Identity step writes the first one.
export function StoryHopes({ sheet, mine }: { sheet: CharacterSheet; mine: boolean }) {
  const { t } = useI18n();
  const hopes = sheet.hopes ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();
  // A host from before the field drops it while answering the save as done
  // (an app's screens may be newer than the host they are opened on).
  const kept = hostOffers(useCapabilities(), "storyHopes");
  if (!kept) {
    return null;
  }

  // Someone else's hopes reach this viewer only at a DM seat: read, not edit.
  if (!mine) {
    return hopes ? (
      <SheetBlock className="mt-4" title={t("charSheet.hopes.otherTitle")} aside={t("charSheet.hopes.forGm")}>
        <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-300">{hopes}</p>
      </SheetBlock>
    ) : null;
  }

  async function save(text: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${sheet.campaignId}/sheet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: sheet.id, hopes: text.trim() }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t("charSheet.hopes.saveError"));
        return;
      }
      setDraft(null);
    } catch {
      setError(t("charSheet.hopes.network"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetBlock className="mt-4" title={t("charSheet.hopes.title")} aside={t("charSheet.hopes.private")}>
      {draft === null ? (
        <div className="space-y-2">
          {hopes ? (
            <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-stone-300">{hopes}</p>
          ) : (
            <p className="text-xs text-stone-400">
              {t("charSheet.hopes.emptyHelp")}
            </p>
          )}
          <KitButton onClick={() => setDraft(hopes)}>{hopes ? t("charSheet.hopes.change") : t("charSheet.hopes.write")}</KitButton>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            maxLength={HOPES_MAX}
            autoFocus
            placeholder={t("charSheet.hopes.placeholder")}
            aria-label={t("charSheet.hopes.aria")}
            aria-describedby={`${fieldId}-length`}
            className={cn(ui.input, "w-full resize-y")}
          />
          <LengthNote id={`${fieldId}-length`} length={draft.length} max={HOPES_MAX} from={0.75} />
          <div className="flex flex-wrap justify-end gap-2">
            <KitButton onClick={() => setDraft(null)} disabled={saving}>
              {t("charSheet.hopes.cancel")}
            </KitButton>
            <KitButton
              onClick={() => void save(draft)}
              disabled={saving || draft.trim() === hopes}
              busy={saving}
              className="border-amber-500/50 text-amber-100"
            >
              {t("charSheet.hopes.save")}
            </KitButton>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </SheetBlock>
  );
}
