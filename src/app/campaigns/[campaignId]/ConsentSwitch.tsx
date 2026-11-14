"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { InfoButton } from "@/components/ui/InfoDialog";
import { PanelError, SettingToggle } from "./PanelKit";
import type { CharacterSheet } from "@/lib/schemas/sheet";

// A player's own consent for one of their characters, on that character's
// Bonds row: "Open to advances from NPCs" (issue 501, PUT /sheet/romance)
// and "Pacts may approach me" (issue 503, PUT /sheet/pacts). Each is theirs
// alone, shown only where it can matter, never shown to anyone else, and
// off until they turn it on. A real switch named for the character, 40px
// tall on a phone, reachable by keyboard with the kit's focus ring.

export type Consent = {
  // The route that saves it.
  route: "romance" | "pacts";
  // The sheet field the stream sends back.
  field: "openToAdvances" | "openToPacts";
  labelKey: string;
  infoKey: string;
};

export const ADVANCES_CONSENT: Consent = {
  route: "romance",
  field: "openToAdvances",
  labelKey: "campaign.relationship.consent.advances",
  infoKey: "campaign.relationship.consent.advancesInfo",
};

export const PACTS_CONSENT: Consent = {
  route: "pacts",
  field: "openToPacts",
  labelKey: "campaign.relationship.consent.pacts",
  infoKey: "campaign.relationship.consent.pactsInfo",
};

export function ConsentSwitch({ campaignId, sheet, consent }: { campaignId: string; sheet: CharacterSheet; consent: Consent }) {
  const { t } = useI18n();
  const label = t(consent.labelKey as never);
  const info = t(consent.infoKey as never, { name: sheet.name });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Shown at once while it saves, until the sheet the stream sends back
  // moves off the value it was pressed from.
  const stored = Boolean(sheet[consent.field]);
  const [pending, setPending] = useState<{ value: boolean; from: boolean } | null>(null);
  const open = pending && pending.from === stored ? pending.value : stored;

  // Never disabled while it saves: a disabled switch drops the keyboard's
  // focus. A second press while the first saves simply sends its own
  // answer, and the sheet the stream sends back settles it.
  async function toggle() {
    const next = !open;
    setBusy(true);
    setError("");
    setPending({ value: next, from: stored });
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/sheet/${consent.route}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: sheet.id, open: next }),
      });
      if (!response.ok) {
        await response.json().catch(() => ({}));
        setError(t("campaign.relationship.consent.saveError"));
        setPending(null);
      }
    } catch {
      setError(t("campaign.relationship.consent.networkError"));
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-1.5" data-advances-switch={consent.route === "romance" ? sheet.id : undefined} data-pacts-switch={consent.route === "pacts" ? sheet.id : undefined}>
      <span className="flex flex-wrap items-center gap-1">
        <SettingToggle on={open} onToggle={() => void toggle()} aria-busy={busy || undefined} label={t("campaign.relationship.consent.aria", { label, name: sheet.name })}>
          {label}
        </SettingToggle>
        <InfoButton label={label} text={info} />
      </span>
      {error ? <PanelError>{error}</PanelError> : null}
    </div>
  );
}
