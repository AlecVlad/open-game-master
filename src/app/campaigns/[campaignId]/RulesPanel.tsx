"use client";

import { readLoad, useLoadStatus } from "@/lib/load-state";
import { EmptyState } from "@/components/EmptyState";
import { Pin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { cn } from "@/lib/cn";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Tooltip } from "@/components/ui/Tooltip";
import { KitButton, LoadFailed, panelField, PanelLoading } from "./PanelKit";
import { CalendarSection } from "@/app/campaigns/[campaignId]/CalendarSection";
import type { GameSettings } from "@/lib/schemas/game-settings";

type RuleChunkView = {
  id: string;
  heading: string;
  text: string;
  enabled: boolean;
  pinned: boolean;
};

export const VARIANT_TOGGLES: Array<{
  key: keyof GameSettings["variantRules"] & string;
  label: string;
  tip: string;
}> = [
  {
    key: "flanking",
    label: "Flanking",
    tip: "Two allies on opposite sides of a creature give each other advantage on melee attacks against it.",
  },
  {
    key: "criticalFumbles",
    label: "Critical fumbles (narrated)",
    tip: "A natural 1 on an attack roll comes with a minor mishap the GM describes. Narration only: the server changes no numbers.",
  },
  {
    key: "encumbrance",
    label: "Encumbrance",
    tip: "Carrying more than 5 times Strength in pounds slows a character by 10 feet.",
  },
  {
    key: "lingeringInjuries",
    label: "Lingering injuries (narrated)",
    tip: "A critical hit or dropping to 0 HP can leave a lasting injury the GM describes. Narration only: the server tracks no injury and changes no numbers.",
  },
  {
    key: "powerfulCritical",
    label: "Powerful critical",
    tip: "On a critical hit the extra weapon dice are dealt as their maximum instead of being rolled.",
  },
  {
    key: "criticalDamageMods",
    label: "Crit damage mods",
    tip: "On a critical hit the flat damage modifiers double along with the dice.",
  },
  {
    key: "ammunition",
    label: "Ammunition",
    tip: "Arrows, bolts and bullets are spent when they are fired and half are recovered after the fight.",
  },
  {
    key: "supplies",
    label: "Food and water",
    tip: "Each dawn every character eats a ration from their pack and drinks, unless a lifestyle or a meal in the story covers it; going without costs exhaustion on the SRD's schedule, and that exhaustion stays until they eat. Off: the party is assumed supplied.",
  },
];

export const REST_LABELS: Record<GameSettings["variantRules"]["restVariant"], string> = {
  standard: "Standard rests (1h short, 8h long)",
  gritty: "Gritty realism (8h short, 7-day long)",
  heroic: "Heroic (5min short, 1h long)",
};

// The variant-rule controls on their own, so the campaign-creation dialog can
// offer the same choices this panel does without the lead having to open the
// lobby afterwards to find them.
type RestVariant = GameSettings["variantRules"]["restVariant"];
const variantRuleMessage = (part: string): MessageKey =>
  `createCampaign.experience.variantRules.${part}` as MessageKey;

// One variant rule: the kit switch, its name, and the word that says which
// way it is set (a player reads "on" or "off", not the knob's position).
function VariantSwitch({ label, tip, on, onChange }: { label: string; tip: string; on: boolean; onChange: (next: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Tooltip content={tip}>
      <span className="flex min-h-9 items-center gap-2 text-xs text-stone-300">
        <Switch on={on} onChange={onChange} label={label} />
        <span className="min-w-0 flex-1">{label}</span>
        <span className={on ? "text-amber-200" : "text-stone-500"}>{t(variantRuleMessage(on ? "on" : "off"))}</span>
      </span>
    </Tooltip>
  );
}

export function VariantRulesFields({
  value,
  onChange,
}: {
  value: GameSettings["variantRules"];
  onChange: (next: GameSettings["variantRules"]) => void;
}) {
  const { t } = useI18n();
  const restOptions = (Object.keys(REST_LABELS) as RestVariant[]).map((variant) => ({
    value: variant,
    label: t(variantRuleMessage(`rest.${variant}`)),
    icon: { kind: "glyph" as const, key: variant === "standard" ? "rest-short" : "rest-long" },
  }));
  return (
    <div>
      <SectionHead title={t(variantRuleMessage("title"))} glyph="system-rules" level="h4" />
      <div className="stagger-pop grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {VARIANT_TOGGLES.map((toggle) => (
          <VariantSwitch
            key={toggle.key}
            label={t(variantRuleMessage(`${toggle.key}.label`))}
            tip={t(variantRuleMessage(`${toggle.key}.tip`))}
            on={Boolean(value[toggle.key])}
            onChange={(next) => onChange({ ...value, [toggle.key]: next })}
          />
        ))}
      </div>
      <Select<RestVariant>
        value={value.restVariant}
        onChange={(restVariant) => onChange({ ...value, restVariant })}
        options={restOptions}
        label={t(variantRuleMessage("restLengths"))}
        className="mt-2 w-full"
      />
    </div>
  );
}

// Rules manager: 5e variant toggles plus lead-authored house rules. The
// house-rules text is chunked server-side; each chunk can be silenced or
// pinned into every DM prompt, and the rest are retrieved per turn by
// relevance.
export function RulesPanel({
  campaignId,
  settings,
  steersStory,
  isDm,
}: {
  campaignId: string;
  settings: GameSettings;
  steersStory: boolean;
  // Holds the DM seat. The calendar's routes are DM-only, so the AI
  // campaign's lead steers the story but does not get the almanac.
  isDm: boolean;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  // A refused or failed read is shown in the server's words with a way to
  // ask again, never as "nothing here yet" (issue 140).
  const { loaded, loadError, settle } = useLoadStatus();
  const [reloads, setReloads] = useState(0);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [chunks, setChunks] = useState<RuleChunkView[]>([]);
  const [saving, setSaving] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  // A refused change says why, instead of the switch quietly snapping back.
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    readLoad<{ text?: unknown; chunks?: unknown }>(fetch(`/api/campaigns/${campaignId}/rules`), "The house rules").then((outcome) => {
      if (cancelled) {
        return;
      }
      settle(outcome);
      const data = outcome.payload;
      if (data) {
        setText(String(data.text ?? ""));
        setSavedText(String(data.text ?? ""));
        setChunks(Array.isArray(data.chunks) ? (data.chunks as RuleChunkView[]) : []);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, reloads, settle]);

  async function saveText() {
    setSaving(true);
    setSettingsError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.ok) {
        const data = await response.json();
        setSavedText(String(data.text ?? text));
        setChunks(Array.isArray(data.chunks) ? data.chunks : []);
      } else {
        setSettingsError(t("campaign.session.rules.saveFailed"));
      }
    } catch {
      setSettingsError(t("campaign.session.rules.network"));
    } finally {
      setSaving(false);
    }
  }

  async function patchChunk(chunkId: string, flags: { enabled?: boolean; pinned?: boolean }) {
    const response = await fetch(`/api/campaigns/${campaignId}/rules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunkId, ...flags }),
    });
    if (response.ok) {
      const data = await response.json();
      setChunks((current) =>
        current.map((chunk) => (chunk.id === chunkId ? { ...chunk, ...data.chunk } : chunk)),
      );
    } else {
      setSettingsError(t("campaign.session.rules.changeFailed"));
    }
  }

  async function patchVariant(update: Partial<GameSettings["variantRules"]>) {
    setSettingsBusy(true);
    setSettingsError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantRules: { ...settings.variantRules, ...update } }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string; errorCode?: string };
        setSettingsError(
          data.errorCode === "INVALID_GAME_SETTINGS"
            ? t("campaign.session.rules.invalidSettings")
            : t("campaign.session.rules.changeFailed"),
        );
      }
    } catch {
      setSettingsError(t("campaign.session.rules.network"));
    } finally {
      setSettingsBusy(false);
    }
  }

  const variant = settings.variantRules;
  const restOptions = (Object.keys(REST_LABELS) as RestVariant[]).map((restVariant) => ({
    value: restVariant,
    label: t(variantRuleMessage(`rest.${restVariant}`)),
  }));

  return (
    <div className="space-y-3">
      <div className="panel rounded-lg p-3" data-tour="rules-variants">
        <SectionHead title={t(variantRuleMessage("title"))} glyph="system-rules" />
        {steersStory ? (
          <div className={cn("reveal space-y-0.5", settingsBusy && "opacity-70")}>
            {VARIANT_TOGGLES.map((toggle) => (
              <VariantSwitch
                key={toggle.key}
                label={t(variantRuleMessage(`${toggle.key}.label`))}
                tip={t(variantRuleMessage(`${toggle.key}.tip`))}
                on={Boolean(variant[toggle.key])}
                onChange={(next) => patchVariant({ [toggle.key]: next })}
              />
            ))}
            <Tooltip content={t("campaign.session.rules.restHint")}>
              <span className="block pt-1.5">
                <Select<RestVariant>
                  size="sm"
                  value={variant.restVariant}
                  onChange={(restVariant) => patchVariant({ restVariant })}
                  options={restOptions}
                  label={t(variantRuleMessage("restLengths"))}
                  className="w-full"
                />
              </span>
            </Tooltip>
            {settingsError ? (
              <p role="alert" className="motion-shake pt-1 text-[11px] text-red-300">
                {settingsError}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs leading-5 text-stone-400">
            {[
              ...VARIANT_TOGGLES.filter((toggle) => variant[toggle.key]).map(
                (toggle) => t(variantRuleMessage(`${toggle.key}.label`)),
              ),
              ...(variant.restVariant !== "standard"
                ? [t(variantRuleMessage(`rest.${variant.restVariant}`))]
                : []),
            ].join(" · ") || t("campaign.session.rules.noVariants")}
          </p>
        )}
      </div>

      <div className="panel rounded-lg p-3" data-tour="rules-house">
        <SectionHead title={t("campaign.session.rules.houseRules")} glyph="system-homebrew" />
        {loading ? (
          <PanelLoading label={t("campaign.session.rules.loading")} rows={2} />
        ) : steersStory ? (
          <>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              maxLength={20_000}
              placeholder={
                t("campaign.session.rules.houseRulesPlaceholder")
              }
              aria-label={t("campaign.session.rules.houseRulesAria")}
              className={cn(panelField, "leading-5")}
            />
            <div className="mt-1.5 flex items-center gap-2">
              <KitButton tone="primary" onClick={saveText} disabled={saving || text === savedText} busy={saving}>
                {saving ? null : <Save className="size-3.5" />}
                {saving ? t("campaign.session.rules.saving") : t("campaign.session.rules.save")}
              </KitButton>
              {text !== savedText ? (
                <span className="live-in text-xs text-amber-300/80">{t("campaign.session.rules.unsaved")}</span>
              ) : null}
            </div>
          </>
        ) : savedText ? (
          <p className="reveal whitespace-pre-wrap text-xs leading-5 text-stone-400">{savedText}</p>
        ) : (
          (loadError ? (
            <LoadFailed
              error={loadError}
              onRetry={() => { setLoading(true); setReloads((current) => current + 1); }}
            />
          ) : loaded ? (
            <EmptyState
              size="sm"
              art="board"
              title={t("campaign.session.rules.noneSet")}
            />
          ) : null)
        )}
      </div>

      {steersStory && chunks.length ? (
        <div className="panel reveal rounded-lg p-3">
          <SectionHead title={t("campaign.session.rules.sections")} glyph="system-rulesets" aside={chunks.length} />
          <p className="mb-2 text-xs leading-5 text-stone-500">
            {t("campaign.session.rules.sectionsHint")}
          </p>
          <ul className="stagger space-y-1.5">
            {chunks.map((chunk) => (
              <li
                key={chunk.id}
                className={cn("flex items-start gap-2 rounded-md border border-stone-700/50 bg-stone-950/40 p-2", !chunk.enabled && "opacity-60")}
              >
                <span className="mt-0.5 shrink-0" title={chunk.enabled ? t("campaign.session.rules.section.disable") : t("campaign.session.rules.section.enable")}>
                  <Switch on={chunk.enabled} onChange={(enabled) => patchChunk(chunk.id, { enabled })} label={chunk.enabled ? t("campaign.session.rules.section.disable") : t("campaign.session.rules.section.enable")} />
                </span>
                <KitButton
                  tone="icon"
                  always
                  onClick={() => patchChunk(chunk.id, { pinned: !chunk.pinned })}
                  aria-pressed={chunk.pinned}
                  aria-label={chunk.pinned ? t("campaign.session.rules.section.unpin") : t("campaign.session.rules.section.pin")}
                  title={chunk.pinned ? t("campaign.session.rules.section.unpin") : t("campaign.session.rules.section.pin")}
                  className={cn("shrink-0", chunk.pinned && "text-amber-300")}
                >
                  <Pin className={cn("size-3.5", chunk.pinned && "fill-current")} />
                </KitButton>
                <span className="min-w-0 text-xs leading-5 text-stone-400">
                  {chunk.heading ? (
                    <span className="font-medium text-stone-300">{chunk.heading}: </span>
                  ) : null}
                  {chunk.text.length > 160 ? `${chunk.text.slice(0, 160)}...` : chunk.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isDm ? <CalendarSection campaignId={campaignId} /> : null}
    </div>
  );
}
