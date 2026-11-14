"use client";

import { Check, Loader2, X, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { RECOMMENDED_WINDOW, storyWindowVerdict, windowFlag, windowLabel } from "@/lib/story-window";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// The three things the DM loop needs from a backend, in the order the probe
// tries them (scripts/lib/provider-capability-probe.mjs). A model that fails
// one of these will fail mid-story, so the admin can run the same probe the
// CLI runs before assigning a backend to a campaign.
const STAGES = [
  { key: "streaming", label: "admin.probe.stage.streaming" },
  { key: "toolCall", label: "admin.probe.stage.toolCall" },
  { key: "toolContinuation", label: "admin.probe.stage.toolContinuation" },
] as const;

// Then one turn of a campaign's own shape, once those three pass
// (src/lib/backend-trial.ts): a backend can pass them and still fail here.
const TRIAL_STAGES = [
  { key: "toolTurn", label: "admin.probe.stage.toolTurn" },
  { key: "narration", label: "admin.probe.stage.narration" },
] as const;

type TrialStage = { ok: boolean; detail?: string };
type ProbeStage = { ok?: boolean; sample?: string; name?: string | null };
type ProbeResult = {
  ok: boolean;
  endpoint?: string;
  model?: string;
  error?: string;
  // How the model's tools ran (scripts/lib/openai-tool-route.mjs): plain
  // Chat Completions, Chat Completions with reasoning off, or OpenAI's
  // Responses API. Worth a word when it is not the plain one, because a
  // campaign on this model runs the same way.
  route?: "chat" | "chat-no-reasoning" | "responses";
  stages?: Record<string, ProbeStage>;
  trial?: { ok: boolean; toolCount: number; stages: Record<string, TrialStage> };
  // The story window a campaign on it packs against; `reported` is false
  // when the server named no size.
  window?: { tokens: number; reported: boolean };
};

const ROUTE_NOTES: Record<string, MessageKey> = {
  "chat-no-reasoning": "admin.probe.route.chatNoReasoning",
  responses: "admin.probe.route.responses",
};

// baseUrl/model/apiKey are the field values as typed; blanks fall back to the
// saved settings and env server-side, mirroring how a real turn resolves
// them. Pass the API key field only when it holds a freshly typed key, and
// the provider only when it is not yet saved (the guided setup).
export function BackendProbe({
  which,
  baseUrl,
  model,
  apiKey = "",
  provider,
}: {
  which: "story" | "utility";
  baseUrl: string;
  model: string;
  apiKey?: string;
  provider?: "local" | "custom";
}) {
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  async function run() {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/backend-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ which, baseUrl, model, apiKey, ...(provider ? { provider } : {}) }),
      });
      const data = await response.json().catch(() => null);
      setResult(
        data ?? { ok: false, error: t("admin.probe.err.noAnswer") },
      );
    } catch {
      setResult({ ok: false, error: t("admin.probe.err.reach") });
    } finally {
      setTesting(false);
    }
  }

  const failed = result && !result.ok;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={testing}
          aria-busy={testing}
          className={ui.btnSmall}
        >
          {testing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          {t("admin.probe.run")}
        </button>
        <span className="text-xs text-stone-500">
          {which === "story" ? t("admin.probe.hint.story") : t("admin.probe.hint.utility")}
        </span>
      </div>
      {testing ? (
        <p role="status" className="live-in mt-2 text-sm text-stone-400">
          {t("admin.probe.testing", { extra: which === "story" ? t("admin.probe.testing.extra") : "" })}
        </p>
      ) : null}
      {result ? (
        <div className="live-in mt-2 space-y-1 text-sm">
          {STAGES.map((stage) => {
            const state = result.stages?.[stage.key];
            if (!state) return null;
            return (
              <p key={stage.key} className="flex items-center gap-2">
                {state.ok ? (
                  <Check className="size-4 shrink-0 text-emerald-400" />
                ) : (
                  <X className="size-4 shrink-0 text-red-400" />
                )}
                <span className={state.ok ? "text-stone-300" : "text-red-400"}>{t(stage.label)}</span>
              </p>
            );
          })}
          {TRIAL_STAGES.map((stage) => {
            const state = result.trial?.stages[stage.key];
            if (!state) return null;
            return (
              <div key={stage.key}>
                <p className="flex items-center gap-2">
                  {state.ok ? (
                    <Check className="size-4 shrink-0 text-emerald-400" />
                  ) : (
                    <X className="size-4 shrink-0 text-red-400" />
                  )}
                  <span className={state.ok ? "text-stone-300" : "text-red-400"}>{t(stage.label)}</span>
                </p>
                {state.detail ? <p className="ml-6 text-xs leading-5 text-stone-400">{state.detail}</p> : null}
              </div>
            );
          })}
          {result.ok ? (
            <p role="status" className="inline-flex items-center gap-1 text-emerald-400">
              <Check className="size-4" /> {t("admin.probe.success", { model: result.model ?? "" })}
              {result.route && ROUTE_NOTES[result.route] ? ` (${t(ROUTE_NOTES[result.route])})` : ""}.
            </p>
          ) : null}
          {result.ok && result.window ? <WindowLine size={result.window} /> : null}
          {result.ok ? null : (
            <p role="alert" className="motion-shake text-red-400">
              {result.error
                ? result.error
                : t("admin.probe.failure", { model: result.model || t("admin.probe.thisModel") })}
              {!result.error && result.stages?.streaming?.ok
                ? ` — ${t("admin.probe.seeChecks")}`
                : "."}
            </p>
          )}
        </div>
      ) : null}
      {failed && result?.endpoint ? (
        <p className={cn("mt-1 break-all text-xs text-stone-500")} title={result.endpoint}>
          {t("admin.probe.endpoint", { endpoint: result.endpoint })}
        </p>
      ) : null}
    </div>
  );
}

// Whether the window is big enough to narrate and to fight, and what to
// change when it is not.
function WindowLine({ size }: { size: { tokens: number; reported: boolean } }) {
  const { t } = useI18n();
  const raise = t("admin.probe.window.raise", { flag: windowFlag(RECOMMENDED_WINDOW) });
  if (!size.reported) {
    return (
      <p className="text-xs leading-5 text-amber-200">
        {t("admin.probe.window.unreported", { window: windowLabel(size.tokens) })}
      </p>
    );
  }
  const verdict = storyWindowVerdict(size.tokens);
  if (verdict.level === "ok") {
    return (
      <p className="flex items-center gap-1 text-emerald-400">
        <Check className="size-4 shrink-0" /> {t("admin.probe.window.ok", { window: windowLabel(size.tokens) })}
      </p>
    );
  }
  return (
    <p role="alert" className="text-xs leading-5 text-amber-200">
      {t(`admin.probe.window.verdict.${verdict.level}`, { window: windowLabel(size.tokens), fights: windowLabel(24_000), recommended: windowLabel(RECOMMENDED_WINDOW) })} {raise}
    </p>
  );
}

[executed on device: PZLD8SRKH9OMZNV (424c96e3-c9c5-4152-a4d9-25b4c5961356)]