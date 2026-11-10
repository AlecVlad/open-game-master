"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/ui";
import { BackendProbe } from "@/app/admin/BackendProbe";
import { HarnessTestPanel } from "@/app/admin/HarnessTestPanel";
import type { Capabilities } from "@/lib/capabilities";
import type { Draft } from "@/app/setup/draft";
import { Lamp, type Tone } from "@/app/setup/SetupParts";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

type Row = { key: string; title: string; tone: Tone; text: string; step: number };

const SIGNUPS: Record<Draft["signupMode"], MessageKey> = {
  invite: "setup.ready.players.invite",
  open: "setup.ready.players.open",
  closed: "setup.ready.players.closed",
};

const STT_WORDS: Record<string, MessageKey> = {
  whisper: "setup.ready.dictation.whisper",
  builtin: "setup.ready.dictation.builtin",
  openai: "setup.ready.dictation.openai",
};

function rows(input: {
  draft: Draft;
  caps: Capabilities | null;
  address: string;
  agentConnected: boolean;
  steps: Record<string, number>;
  t: ReturnType<typeof useI18n>["t"];
}): Row[] {
  const { draft, caps, steps, t } = input;
  const wait = !caps;
  const story: Row =
    draft.story === "none"
      ? { key: "story", title: t("setup.ready.story.title"), tone: "off", text: t("setup.ready.story.none"), step: steps.story }
      : wait
        ? { key: "story", title: "Storyteller", tone: "wait", text: t("setup.ready.story.asking"), step: steps.story }
        : caps.story.configured && caps.story.reachable
          ? { key: "story", title: "Storyteller", tone: "ok", text: t("setup.ready.story.answering", { model: caps.story.model ? ` · ${caps.story.model}` : "" }), step: steps.story }
          : {
              key: "story",
              title: "Storyteller",
              tone: "bad",
              text:
                draft.story === "agent"
                  ? t("setup.ready.story.notReadyAgent")
                  : t("setup.ready.story.notReadyModel"),
              step: steps.story,
            };
  const pictures: Row =
    draft.pictures === "none"
      ? { key: "pictures", title: t("setup.ready.pictures.title"), tone: "off", text: t("setup.ready.pictures.off"), step: steps.pictures }
      : draft.pictures === ""
        ? // Skipped: nothing was saved, and a ComfyUI found on its own still counts.
          wait
          ? { key: "pictures", title: "Pictures", tone: "wait", text: t("setup.ready.pictures.asking"), step: steps.pictures }
          : caps.images.configured && caps.images.reachable
            ? { key: "pictures", title: "Pictures", tone: "ok", text: t("setup.ready.pictures.found"), step: steps.pictures }
            : { key: "pictures", title: "Pictures", tone: "off", text: t("setup.ready.pictures.notSet"), step: steps.pictures }
      : wait
        ? { key: "pictures", title: "Pictures", tone: "wait", text: "Asking…", step: steps.pictures }
        : caps.images.configured && caps.images.reachable
          ? { key: "pictures", title: "Pictures", tone: "ok", text: draft.pictures === "comfyui" ? t("setup.ready.pictures.comfyui") : draft.pictures === "openai" ? t("setup.ready.pictures.openai") : t("setup.ready.pictures.agent"), step: steps.pictures }
          : caps.images.needsModel
            ? { key: "pictures", title: "Pictures", tone: "warn", text: t("setup.ready.pictures.needsModel"), step: steps.pictures }
            : { key: "pictures", title: "Pictures", tone: "warn", text: t("setup.ready.pictures.notAnswering"), step: steps.pictures };
  const narration: Row =
    draft.narration === "off"
      ? { key: "narration", title: t("setup.ready.narration.title"), tone: "off", text: t("setup.ready.narration.off"), step: steps.voice }
      : draft.narration === ""
        ? wait
          ? { key: "narration", title: "Narration", tone: "wait", text: "Asking…", step: steps.voice }
          : caps.tts.configured && caps.tts.reachable
            ? { key: "narration", title: "Narration", tone: "ok", text: t("setup.ready.narration.found"), step: steps.voice }
            : { key: "narration", title: "Narration", tone: "off", text: t("setup.ready.narration.notSet"), step: steps.voice }
      : wait
        ? { key: "narration", title: "Narration", tone: "wait", text: "Asking…", step: steps.voice }
        : caps.tts.configured && caps.tts.reachable
          ? { key: "narration", title: "Narration", tone: "ok", text: draft.narration === "kokoro" ? t("setup.ready.narration.kokoro") : t("setup.ready.narration.openai"), step: steps.voice }
          : caps.tts.needsModel
            ? { key: "narration", title: "Narration", tone: "warn", text: t("setup.ready.narration.needsModel"), step: steps.voice }
            : { key: "narration", title: "Narration", tone: "warn", text: t("setup.ready.narration.notAnswering"), step: steps.voice };
  const dictation: Row = wait
    ? { key: "dictation", title: t("setup.ready.dictation.title"), tone: "wait", text: "Asking…", step: steps.voice }
    : caps.stt.configured
      ? { key: "dictation", title: "Dictation", tone: "ok", text: STT_WORDS[caps.stt.backend] ? t(STT_WORDS[caps.stt.backend]) : t("setup.ready.dictation.ready"), step: steps.voice }
      : { key: "dictation", title: "Dictation", tone: "off", text: t("setup.ready.dictation.off"), step: steps.voice };
  const players: Row = {
    key: "players",
    title: t("setup.ready.players.title"),
    tone: "ok",
    text: t(SIGNUPS[draft.signupMode], { address: input.address ? ` · ${input.address}` : "" }),
    step: steps.players,
  };
  const agent: Row = input.agentConnected
    ? { key: "agent", title: t("setup.ready.agent.title"), tone: "ok", text: t("setup.ready.agent.connected"), step: steps.agent }
    : { key: "agent", title: "Your agent", tone: "off", text: t("setup.ready.agent.notConnected"), step: steps.agent };
  return [story, pictures, narration, dictation, players, agent];
}

// The last step: what the server can do now, asked live, each line with a
// way back to the step that sets it, and one real test of the storyteller.
export function ReadyStep({
  active,
  draft,
  address,
  agentConnected,
  steps,
  onJump,
}: {
  active: boolean;
  draft: Draft;
  address: string;
  agentConnected: boolean;
  steps: Record<string, number>;
  onJump: (step: number) => void;
}) {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [checking, setChecking] = useState(false);

  const ask = useCallback(
    () =>
      fetch("/api/capabilities")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)
        .then((data) => {
          setCaps(data as Capabilities | null);
          setChecking(false);
        }),
    [],
  );

  // Asked on each arrival (the wizard remounts this step with a new key):
  // the steps before it have just saved.
  useEffect(() => {
    if (active) void ask();
  }, [active, ask]);

  function check() {
    setChecking(true);
    setCaps(null);
    void ask();
  }

  const { t } = useI18n();
  const list = rows({ draft, caps, address, agentConnected, steps, t });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-400">{t("setup.ready.header")}</span>
        <button type="button" className={ui.btnSmall} onClick={check} disabled={checking} aria-busy={checking}>
          <RefreshCw className={checking ? "size-3.5 animate-spin" : "size-3.5"} /> {t("setup.ready.recheck")}
        </button>
      </div>
      <ul className="stagger space-y-2" aria-live="polite">
        {list.map((row) => (
          <li key={row.key} className="su-row">
            <Lamp tone={row.tone} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-stone-100">{row.title}</span>
              <span key={row.text} className="live-in block text-xs text-stone-400">
                {row.text}
              </span>
            </span>
            <button type="button" className={ui.btnSmall} onClick={() => onJump(row.step)}>
              {t("setup.ready.change")}
            </button>
          </li>
        ))}
      </ul>

      {draft.story === "local" || draft.story === "key" ? (
        <div className="su-row flex-col items-stretch">
          <span className="text-sm text-stone-200">{t("setup.ready.tryStory")}</span>
          <BackendProbe which="story" baseUrl="" model="" />
        </div>
      ) : draft.story === "agent" && draft.agent.id ? (
        <div className="su-row flex-col items-stretch">
          <span className="text-sm text-stone-200">{t("setup.ready.tryAgent")}</span>
          <HarnessTestPanel saved paints={false} picturesVerified={false} onVerified={check} />
        </div>
      ) : null}
    </div>
  );
}
