"use client";

import { LoadFailed } from "@/app/campaigns/[campaignId]/PanelKit";
import { readLoad, useLoadStatus } from "@/lib/load-state";
import { Link2, Loader2, Plug, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ui } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";
import { PageSection } from "@/components/PageShell";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { AgentConnectLines } from "@/components/AgentConnectLines";
import { AssistantLink } from "@/components/AssistantLink";
import { PlayerReceiverSetup, type ReceiverInfo } from "@/app/settings/PlayerReceiverSetup";
import { PlayerPollLinkSetup } from "@/app/settings/PlayerPollLinkSetup";
import { hostOffers, useCapabilities } from "@/lib/use-capabilities";
import { type StopReason } from "@/lib/agents/webhook-seat-logic";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";

type Grant = {
  id: string;
  name: string;
  scopes: string[];
  campaignId: string | null;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
};

type Campaign = { id: string; title: string };

// What a connection's receiver or poll link wakes, and one that stopped on
// its own and why (issue 654). From hosts that send `agentLinks`.
type AgentLink = { id: string; grantId: string; campaignId: string; delivery: "poll" | "push"; characterName: string; pending: number; failed: number };
type StoppedLink = { grantId: string; campaignId: string; delivery: "poll" | "push"; reason: StopReason; stoppedAt: string; characterName: string };

type T = (key: MessageKey, params?: Record<string, string | number>) => string;
type TP = (key: string, count: number, params?: Record<string, string | number>) => string;

function linkLine(link: AgentLink, t: T, tp: TP): string {
  const what = link.delivery === "poll" ? t("settings.agents.poll") : t("settings.agents.recv");
  const trouble = link.failed > 0
    ? ` · ${tp("settings.agents.trouble.failed", link.failed, { count: link.failed })}`
    : link.pending > 0 ? ` · ${link.pending} ${t("settings.agents.trouble.waiting")}` : "";
  return t("settings.agents.line", { what, name: link.characterName, trouble });
}

function stopLine(stop: StoppedLink, date: string, t: T): string {
  const why = stop.reason === "left_campaign" ? t("settings.agents.stop.why.left")
    : stop.reason === "expired" ? t("settings.agents.stop.why.expired")
    : t("settings.agents.stop.why.replaced", { name: stop.characterName });
  const next = stop.reason === "expired" ? t("settings.agents.stop.next.expired")
    : stop.delivery === "poll" ? t("settings.agents.stop.next.poll") : t("settings.agents.stop.next.push");
  return t(stop.delivery === "poll" ? "settings.agents.stop.poll" : "settings.agents.stop.push", { date, why, next });
}

export const AGENT_SCOPE_CHOICES: Array<{ id: string; label: string; hint: string }> = [
  { id: "read", label: "Read", hint: "Your campaigns, characters, quests and lore, as you see them." },
  { id: "play", label: "Play", hint: "Act, speak and roll at a table as your character." },
  { id: "characters", label: "Characters", hint: "Create, edit and delete your library characters." },
  { id: "campaigns", label: "Campaigns", hint: "Create campaigns and change the ones you lead." },
  { id: "dm", label: "Game Master", hint: "Run the rules engine and narrate, only where you hold the GM seat." },
];

function when(iso: string | null, t: T): string {
  if (!iso) return t("settings.agents.never");
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Connected agents (docs/archive/harness-mcp-plan.md 7): your own Claude Code, Codex
// or other MCP client acting as you on this server, with exactly what your
// account can do in the browser and nothing more. The token is shown once.
export function ConnectedAgentsSection() {
  const { t, tp } = useI18n();
  const [grants, setGrants] = useState<Grant[] | null>(null);
  // A refused or failed read is shown in the server's words with a way to
  // ask again, never as "nothing here yet" (issue 140).
  const { loaded, loadError, settle } = useLoadStatus();
  const [reloads, setReloads] = useState(0);
  const [mcpUrl, setMcpUrl] = useState("");
  const [pollLinks, setPollLinks] = useState(false);
  // The row whose poll link box is open, to make a first link or replace one.
  const [pollFor, setPollFor] = useState<string | null>(null);
  const [assistantUrl, setAssistantUrl] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read", "play"]);
  const [campaignId, setCampaignId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState<{ id: string; token: string; name: string; receiver: ReceiverInfo | null } | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [links, setLinks] = useState<AgentLink[]>([]);
  const [stoppedLinks, setStoppedLinks] = useState<StoppedLink[]>([]);
  const showsLinks = hostOffers(useCapabilities(), "agentLinks");

  useEffect(() => {
    readLoad<{ grants?: Grant[]; mcpUrl?: string; assistantUrl?: string; pollLinks?: boolean; links?: AgentLink[]; stoppedLinks?: StoppedLink[] }>(fetch("/api/profile/agents"), "The connected agents").then((outcome) => {
      settle(outcome);
      if (outcome.payload) {
        setGrants(outcome.payload.grants ?? []);
        setLinks(Array.isArray(outcome.payload.links) ? outcome.payload.links : []);
        setStoppedLinks(Array.isArray(outcome.payload.stoppedLinks) ? outcome.payload.stoppedLinks : []);
        setMcpUrl(outcome.payload.mcpUrl ?? "");
        setPollLinks(outcome.payload.pollLinks === true);
        setAssistantUrl(outcome.payload.assistantUrl ?? "");
      }
    });
    fetch("/api/campaigns")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const list = (data?.campaigns ?? []) as Array<{ id: string; title: string }>;
        setCampaigns(list.map((campaign) => ({ id: campaign.id, title: campaign.title })));
      })
      .catch(() => undefined);
  }, [reloads, settle]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes, campaignId: campaignId || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? t("settings.agents.err.connect"));
        return;
      }
      setGrants((current) => [data.grant, ...(current ?? [])]);
      setMcpUrl(data.mcpUrl ?? mcpUrl);
      setAssistantUrl(data.assistantUrl ?? assistantUrl);
      setFresh({ id: data.grant.id, token: data.token, name: data.grant.name, receiver: data.receiver ?? null });
      setCreating(false);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    const response = await fetch(`/api/profile/agents/${id}`, { method: "DELETE" });
    if (response.ok) {
      // The row plays its leave before it goes.
      setLeaving(id);
      setTimeout(() => {
        setGrants((current) => (current ?? []).filter((grant) => grant.id !== id));
        setLeaving(null);
      }, 180);
    }
  }

  const campaignTitle = (id: string | null) => campaigns.find((campaign) => campaign.id === id)?.title ?? t("settings.agents.oneCampaign");

  return (
    <PageSection
      heading={t("settings.agents.heading")}
      glyph="system-share"
      intro={`${t("settings.agents.intro")}${assistantUrl ? t("settings.agents.intro.assistant") : ""}${t("settings.agents.intro.tail")}`}
    >
      {fresh ? (
        <div className="hx-token mb-4 space-y-2 rounded-xl border border-amber-600/40 bg-amber-950/20 p-3">
          <p className="text-sm text-amber-100">
            <strong>{fresh.name}</strong>{t("settings.agents.fresh.ready")}
          </p>
          <AssistantLink base={assistantUrl} token={fresh.token} />
          <AgentConnectLines grantId={fresh.id} token={fresh.token} mcpUrl={mcpUrl} />
          {fresh.receiver ? <PlayerReceiverSetup key={fresh.id} receiver={fresh.receiver} mcpUrl={mcpUrl} /> : null}
          {fresh.receiver?.pollLinks && fresh.receiver.character ? (
            <PlayerPollLinkSetup key={fresh.id} grantId={fresh.id} characterName={fresh.receiver.character.name} />
          ) : null}
          <button type="button" className={ui.btnSmall} onClick={() => setFresh(null)}>
            {t("settings.agents.fresh.done")}
          </button>
        </div>
      ) : null}

      {grants === null ? (
        <div className="skeleton-block h-12 rounded-xl" aria-label={t("settings.agents.loading")} />
      ) : grants.length === 0 && !creating ? (
        (loadError ? (
          <LoadFailed
            error={loadError}
            onRetry={() => setReloads((current) => current + 1)}
          />
        ) : loaded ? (
          <EmptyState
            size="sm"
            art="board"
            title={t("settings.agents.empty")}
          />
        ) : null)
      ) : (
        <ul className="stagger space-y-2">
          {grants.map((grant) => (
            <li key={grant.id} className={leaving === grant.id ? "plate-row reveal-leave" : "plate-row"}>
              <span className="medallion grid size-9 place-items-center">
                <Plug className="size-4 text-amber-200" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-stone-200">{grant.name}</span>
                <span className="block truncate text-[11px] text-stone-500">
                  {t("settings.agents.details", {
                    scopes: grant.scopes.join(", "),
                    campaign: grant.campaignId ? ` · ${campaignTitle(grant.campaignId)}` : "",
                    used: when(grant.lastUsedAt, t),
                    expires: when(grant.expiresAt, t),
                  })}
                </span>
                {showsLinks
                  ? links.filter((link) => link.grantId === grant.id).map((link) => (
                    <span key={link.id} className="block text-xs text-stone-400">
                      {linkLine(link, t, tp)}
                    </span>
                  ))
                  : null}
                {showsLinks
                  ? stoppedLinks.filter((stop) => stop.grantId === grant.id).slice(0, 1).map((stop) => (
                    <span key={`${stop.grantId}-${stop.stoppedAt}`} role="status" className="block text-xs text-amber-200">
                      {stopLine(stop, when(stop.stoppedAt, t), t)}
                    </span>
                  ))
                  : null}
              </span>
              {pollLinks && grant.campaignId && grant.scopes.includes("read") && grant.scopes.includes("play") ? (
                <button type="button" className={ui.btnSmall} onClick={() => setPollFor(pollFor === grant.id ? null : grant.id)}>
                  <Link2 className="size-3.5" /> {t("settings.agents.poll")}
                </button>
              ) : null}
              <button type="button" className={ui.btnSmall} onClick={() => revoke(grant.id)}>
                <Trash2 className="size-3.5" /> {t("settings.agents.revoke")}
              </button>
              {pollFor === grant.id ? (
                <div className="basis-full pt-2">
                  <PlayerPollLinkSetup
                    key={grant.id}
                    grantId={grant.id}
                    characterName={links.find((link) => link.grantId === grant.id)?.characterName ?? t("settings.agents.yourChar")}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <div className="reveal-height mt-3">
          <div className="space-y-3 rounded-xl border border-stone-800 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-400">{t("settings.agents.name")}</span>
              <input
                className={ui.input}
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("settings.agents.name.ph")}
              />
            </label>
            <div className="space-y-2">
              <span className="block text-xs font-medium text-stone-400">{t("settings.agents.may")}</span>
              {AGENT_SCOPE_CHOICES.map((scope) => {
                const on = scopes.includes(scope.id);
                return (
                  <label key={scope.id} className="flex items-start gap-3 text-sm text-stone-300">
                    <Switch
                      label={t(`settings.agents.scope.${scope.id}.label` as MessageKey)}
                      on={on}
                      onChange={(next) =>
                        setScopes((current) => (next ? [...current, scope.id] : current.filter((entry) => entry !== scope.id)))
                      }
                    />
                    <span>
                      {t(`settings.agents.scope.${scope.id}.label` as MessageKey)}
                      <span className="block text-xs text-stone-500">{t(`settings.agents.scope.${scope.id}.hint` as MessageKey)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div role="group" aria-label={t("settings.agents.limit")}>
              <span className="mb-1 block text-xs font-medium text-stone-400">{t("settings.agents.limit")}</span>
              <Select
                value={campaignId}
                onChange={setCampaignId}
                label={t("settings.agents.limit")}
                options={[{ value: "", label: t("settings.agents.anyCampaign") }, ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.title }))]}
              />
            </div>
            {error ? (
              <p role="alert" className="motion-shake text-sm text-red-400">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={ui.btnPrimary}
                onClick={create}
                disabled={busy || !name.trim() || scopes.length === 0}
                aria-busy={busy}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />} {t("settings.agents.connect")}
              </button>
              <button type="button" className={ui.btnSecondary} onClick={() => setCreating(false)}>
                {t("settings.agents.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" className={`${ui.btnSmall} mt-3`} onClick={() => setCreating(true)}>
          <Plug className="size-3.5" /> {t("settings.agents.connectAgent")}
        </button>
      )}
    </PageSection>
  );
}
