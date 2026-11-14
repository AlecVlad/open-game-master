"use client";

import { Check, Loader2, Minus, PlayCircle, X } from "lucide-react";
import { useState } from "react";
import { ui } from "@/lib/ui";
import { HarnessPictureTest } from "@/app/admin/HarnessPictureTest";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

type Stage = { id: string; ok: boolean | null; detail?: string };

const STAGE_LABELS: Record<string, MessageKey> = {
  found: "admin.harness.test.found",
  signedIn: "admin.harness.test.signedIn",
  handshake: "admin.harness.test.handshake",
  toolCall: "admin.harness.test.toolCall",
  lockdown: "admin.harness.test.lockdown",
  streaming: "admin.harness.test.streaming",
};

const STAGE_ORDER = ["found", "signedIn", "handshake", "toolCall", "lockdown", "streaming"];

// The live check: one real, tiny turn through the path every DM turn takes,
// with each stage ticked only when its real result comes back, and, for a
// program with its own image tool, one real test picture.
export function HarnessTestPanel({
  saved,
  paints,
  picturesVerified,
  picturesForTables = false,
  onVerified,
  onAdopted,
}: {
  // The program being tested is the saved one; testing an unsaved choice
  // would test something the tables will not use.
  saved: boolean;
  paints: boolean;
  picturesVerified: boolean;
  // Its pictures are already the tables' backend, switched on.
  picturesForTables?: boolean;
  onVerified: () => void;
  onAdopted?: () => void;
}) {
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [error, setError] = useState("");
  const localizeDetail = (detail?: string) => {
    if (!detail) return detail;
    if (detail === "No agent program is chosen yet.") return t("admin.harness.test.detail.noProgram");
    if (detail === "The program did not answer.") return t("admin.harness.test.detail.noAnswer");
    if (detail === "The program answered without calling ODM's tool, so it cannot run a table.") return t("admin.harness.test.detail.noTool");
    if (detail === "The program stopped after the tool call.") return t("admin.harness.test.detail.stoppedAfterTool");
    if (detail === "Its own tools are removed; only the table's tools are offered.") return t("admin.harness.test.detail.lockdownRemoved");
    if (detail === "Its own tools are contained: read-only, an empty folder, every approval refused.") return t("admin.harness.test.detail.lockdownContained");
    if (detail === "The reply arrived whole rather than streamed.") return t("admin.harness.test.detail.notStreamed");
    const signIn = detail.match(/^Run `([^\`]+)` on this machine\.$/);
    if (signIn) return t("admin.harness.test.detail.signIn", { command: signIn[1] });
    const notFound = detail.match(/^(.+) was not found\.$/);
    if (notFound) return t("admin.harness.test.detail.notFound", { program: notFound[1] });
    const wrongReply = detail.match(/^It replied "([\s\S]*)" instead of the tool's answer\.$/);
    if (wrongReply) return t("admin.harness.test.detail.wrongReply", { reply: wrongReply[1] });
    return detail;
  };

  async function test() {
    setTesting(true);
    setError("");
    setStages(STAGE_ORDER.map((id) => ({ id, ok: null })));
    try {
      const response = await fetch("/api/admin/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = (await response.json().catch(() => ({}))) as { stages?: Stage[]; error?: string };
      if (!response.ok || !data.stages) {
        setError(data.error ?? t("admin.harness.test.error.couldNotRun"));
        setStages(null);
        return;
      }
      setStages(data.stages);
    } catch {
      setError(t("admin.harness.test.error.reach"));
      setStages(null);
    } finally {
      setTesting(false);
    }
  }

  const failed = stages?.find((stage) => stage.ok === false);
  const passed = stages && stages.every((stage) => stage.ok === true);

  return (
    <div className="mt-4 space-y-3 border-t border-stone-800 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={ui.btnSmall}
          onClick={test}
          disabled={!saved || testing}
          aria-busy={testing}
        >
          {testing ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
          {t("admin.harness.test.run")}
        </button>
        <span className="text-xs text-stone-500">
          {saved
            ? t("admin.harness.test.hint.saved")
            : t("admin.harness.test.hint.unsaved")}
        </span>
      </div>

      {stages ? (
        <ol className="hx-stages" aria-live="polite">
          {stages.map((stage, index) => {
            const state = stage.ok === null ? (testing ? "wait" : "skip") : stage.ok ? "ok" : "bad";
            return (
              <li
                key={stage.id}
                className="hx-stage live-in"
                data-state={state}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <span className="hx-stage-mark mt-0.5">
                  {state === "ok" ? (
                    <Check key="ok" className="tick-in size-4 text-emerald-400" />
                  ) : state === "bad" ? (
                    <X key="bad" className="tick-in size-4 text-red-400" />
                  ) : state === "wait" ? (
                    <Loader2 className="size-4 animate-spin text-stone-500" />
                  ) : (
                    <Minus className="size-4 text-stone-600" />
                  )}
                </span>
                <span>
                  <span className={state === "bad" ? "text-red-300" : state === "ok" ? "text-stone-200" : "text-stone-500"}>
                    {t(STAGE_LABELS[stage.id] ?? "admin.harness.test.unknown")}
                  </span>
                  {stage.detail ? (
                    <span className="block text-xs text-stone-500">{localizeDetail(stage.detail)}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {passed ? (
        <p role="status" className="inline-flex items-center gap-1 text-sm text-emerald-400">
          <Check className="tick-in size-4" /> {t("admin.harness.test.ready")}
        </p>
      ) : failed && !testing ? (
        <p role="alert" className="motion-shake text-sm text-red-400">
          {localizeDetail(failed.detail) ?? t("admin.harness.test.stopped")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="motion-shake text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {paints ? (
        <HarnessPictureTest
          saved={saved}
          picturesVerified={picturesVerified}
          picturesForTables={picturesForTables}
          onVerified={onVerified}
          onAdopted={onAdopted}
        />
      ) : null}
    </div>
  );
}

[executed on device: PZLD8SRKH9OMZNV (424c96e3-c9c5-4152-a4d9-25b4c5961356)]