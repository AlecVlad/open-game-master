"use client";

import { PageSection } from "@/components/PageShell";
import { GameIcon } from "@/components/ui/GameIcon";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Slider } from "@/components/ui/Slider";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { ui } from "@/lib/ui";
import { UI_SCALE_MAX, UI_SCALE_MIN, useThemePrefs, writeThemeChoice, writeUiScale, type ThemeChoice } from "@/lib/theme-mode";

// Appearance (docs/vtt-parity-implementation-plan.md section 14): the night
// or the day theme, the OS's choice by default, and how large the interface
// reads. Both are kept on this device, not on the account.
const CHOICES: Array<{ id: ThemeChoice; label: MessageKey; glyph: string }> = [
  { id: "auto", label: "appearance.theme.auto", glyph: "daypart-dusk" },
  { id: "dark", label: "appearance.theme.dark", glyph: "daypart-night" },
  { id: "light", label: "appearance.theme.light", glyph: "daypart-day" },
];

export function AppearanceSection() {
  const { choice, scale } = useThemePrefs();
  const t = useT();
  return (
    <PageSection
      heading={t("appearance.heading")}
      glyph="sense-darkvision"
      intro={t("appearance.intro")}
    >
      <div className="mb-4">
        <div className="mb-1 text-xs text-stone-400">{t("lang.label")}</div>
        <LanguageSwitcher />
        <p className="mt-1 text-xs text-stone-500">{t("lang.hint")}</p>
      </div>
      <div data-pill-group="" role="group" aria-label={t("appearance.theme")} className="flex flex-wrap gap-2">
        {CHOICES.map((entry) => (
          <button
            data-on={choice === entry.id ? "" : undefined}
            key={entry.id}
            type="button"
            aria-pressed={choice === entry.id}
            onClick={() => writeThemeChoice(entry.id)}
            className="theme-card motion-press"
          >
            <GameIcon icon={{ kind: "glyph", key: entry.glyph }} size="size-8" /> {t(entry.label)}
          </button>
        ))}
      </div>
      <div className="mt-4 text-xs text-stone-400">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span>{t("appearance.scale")}</span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums text-stone-300">{Math.round(scale * 100)}%</span>
            {scale !== 1 ? (
              <button type="button" onClick={() => writeUiScale(1)} className={`${ui.btnSmall} reveal-pop px-2 py-1 text-[11px]`}>
                {t("appearance.reset")}
              </button>
            ) : null}
          </span>
        </div>
        <Slider
          label={t("appearance.scale")}
          min={UI_SCALE_MIN}
          max={UI_SCALE_MAX}
          step={0.05}
          value={scale}
          onChange={writeUiScale}
          bubble={(value) => `${Math.round(value * 100)}%`}
        />
      </div>
    </PageSection>
  );
}
