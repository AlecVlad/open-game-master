"use client";

import { CopyLine } from "@/components/CopyLine";
import { useT } from "@/lib/i18n/provider";

// The one URL a cloud assistant saves for this world: a device world's relay
// address with the new token on the end (src/lib/agents/assistant-relay.ts).
// ChatGPT, Claude, Grok and Meta Muse all take a bare URL for a custom
// connector, so this is the whole setup. Nothing renders where there is no
// relay: a server with its own address, or a world never shared online.
export function AssistantLink({ base, token }: { base: string; token: string }) {
  const t = useT();
  if (!base) {
    return null;
  }
  return (
    <div>
      <span className="mb-1 block text-xs text-stone-400">{t("assistantLink.title")}</span>
      <CopyLine text={`${base}/${token}`} label={t("assistantLink.copyLabel")} />
      <span className="mt-1 block text-xs text-stone-500">
        {t("assistantLink.hint")}
      </span>
    </div>
  );
}
