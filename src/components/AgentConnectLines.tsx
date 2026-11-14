"use client";

import { useEffect, useState } from "react";
import { CopyLine } from "@/components/CopyLine";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/SegmentedControl";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// The one line an agent needs, for the program the person actually uses,
// then a lamp that lights when the agent's first call arrives. Shared by
// Settings > Connected agents and the guided setup (src/app/setup): both
// used to print every program's line at once and leave the person to guess
// which was theirs, and whether it had worked.

export type AgentProgram = "claude" | "codex" | "opencode" | "other";

const PROGRAMS: Array<{ value: AgentProgram; label: string }> = [
  { value: "claude", label: "Claude Code" },
  { value: "codex", label: "Codex" },
  { value: "opencode", label: "opencode" },
];

type Line = { text: string; block: boolean; whereKey: MessageKey };

export function agentSetupLine(program: AgentProgram, url: string, token: string): Line {
  if (program === "claude") {
    return {
      text: `claude mcp add --transport http odm ${url} --header "Authorization: Bearer ${token}"`,
      block: false,
      whereKey: "agentConnect.where.claude",
    };
  }
  if (program === "codex") {
    return {
      text: `[mcp_servers.odm]\nurl = "${url}"\nhttp_headers = { Authorization = "Bearer ${token}" }`,
      block: true,
      whereKey: "agentConnect.where.codex",
    };
  }
  // opencode 2's shape, with the servers under `mcp.servers`; 2.x still
  // converts 1.x's, which put them straight under `mcp`.
  if (program === "opencode") {
    return {
      text: `"mcp": { "servers": { "odm": { "type": "remote", "url": "${url}", "headers": { "Authorization": "Bearer ${token}" }, "oauth": false } } }`,
      block: false,
      whereKey: "agentConnect.where.opencode",
    };
  }
  return {
    text: `${url}  ·  Authorization: Bearer ${token}`,
    block: false,
    whereKey: "agentConnect.where.other",
  };
}

type Activity = { grantId: string; tool: string; ok: boolean; createdAt: string };

// How long the lamp keeps asking before it says so and stops. Polling a
// signed-in route every few seconds is cheap, but not forever.
const WATCH_MS = 10 * 60 * 1000;
const POLL_MS = 3_000;

export function AgentConnectLines({
  grantId,
  token,
  mcpUrl,
  initialProgram = "claude",
}: {
  grantId: string;
  token: string;
  mcpUrl: string;
  initialProgram?: AgentProgram;
}) {
  const { t, lang } = useI18n();
  const programOptions: SegmentedOption<AgentProgram>[] = [
    ...PROGRAMS,
    { value: "other", label: t("agentConnect.program.other") },
  ];
  const programLabel = programOptions.find((entry) => entry.value === program)?.label ?? t("agentConnect.program.other");
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const [program, setProgram] = useState<AgentProgram>(initialProgram);
  const [first, setFirst] = useState<Activity | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const line = agentSetupLine(program, mcpUrl, token);

  useEffect(() => {
    if (first) {
      return;
    }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const look = async () => {
      const data = await fetch("/api/profile/agents")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
      if (!live) return;
      const calls = ((data?.recent ?? []) as Activity[]).filter((row) => row.grantId === grantId);
      const used = (data?.grants ?? []).find((grant: { id: string; lastUsedAt: string | null }) => grant.id === grantId)?.lastUsedAt;
      if (calls.length || used) {
        setFirst(calls.at(-1) ?? { grantId, tool: "", ok: true, createdAt: used });
        return;
      }
      if (Date.now() - started > WATCH_MS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(look, POLL_MS);
    };
    timer = setTimeout(look, POLL_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [grantId, first]);

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <SegmentedControl options={programOptions} value={program} onChange={setProgram} label={t("agentConnect.programLabel")} className="w-max" />
      </div>
      <ol className="su-steps space-y-2 text-sm text-stone-300">
        <li>
          <span className="su-step-n">1</span>
          <span className="min-w-0 flex-1">
            {t("agentConnect.copyThis")}
            <span key={program} className="reveal mt-1.5 block">
              <CopyLine text={line.text} label={t("agentConnect.copyLabel", { program: programLabel })} block={line.block} />
            </span>
          </span>
        </li>
        <li>
          <span className="su-step-n">2</span>
          <span key={program} className="reveal min-w-0 flex-1">{t(line.whereKey)}</span>
        </li>
        <li>
          <span className="su-step-n">3</span>
          <span className="min-w-0 flex-1">
            {t("agentConnect.askExample", { example: t("agentConnect.example") })}
          </span>
        </li>
      </ol>
      <p
        role="status"
        aria-live="polite"
        className="su-watch flex items-center gap-2 text-sm"
        data-state={first ? "ok" : gaveUp ? "off" : "wait"}
      >
        <span className="su-lamp" data-tone={first ? "ok" : gaveUp ? "off" : "wait"} aria-hidden="true" />
        {first ? (
          <span key="ok" className="reveal-pop text-emerald-300">
            {t("agentConnect.connected")} {t("agentConnect.firstCall")}{first.tool ? <> (<code className="text-emerald-200">{first.tool}</code>)</> : null} {t("agentConnect.arrived")}
            {first.createdAt ? ` ${t("agentConnect.at", { time: new Date(first.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) })}` : "."}
          </span>
        ) : gaveUp ? (
          <span key="off" className="reveal text-stone-400">
            {t("agentConnect.noCall")}
          </span>
        ) : (
          <span key="wait" className="text-stone-400">{t("agentConnect.waiting")}</span>
        )}
      </p>
    </div>
  );
}
