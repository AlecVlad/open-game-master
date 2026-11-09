"use client";

import { PageSection } from "@/components/PageShell";
import { DictationShortcutField } from "@/components/DictationShortcutField";
import { useI18n } from "@/lib/i18n/provider";

// The hold-to-dictate key (issue 291), on this device like Appearance: the
// apps also offer it under Audio and dice in their own Settings.
export function DictationShortcutSection() {
  const { t } = useI18n();
  return (
    <PageSection
      heading={t("settings.dk.heading")}
      glyph="ui-voice"
      intro={t("settings.dk.intro")}
    >
      <DictationShortcutField />
    </PageSection>
  );
}
