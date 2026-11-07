"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/ui";
import { AdminNarratorQualityCard } from "@/app/admin/AdminNarratorQualityCard";
import { PageSkeleton } from "@/components/PageSkeleton";
import { SectionHead } from "@/components/ui/SectionHead";
import type { AccountUsage, CampaignUsage, UsageTotals } from "@/lib/usage/ledger";
import type { ModelCallSummary } from "@/lib/usage/model-calls";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

type Overview = { campaigns: CampaignUsage[]; accounts: AccountUsage[]; generatedAt: string; modelCalls?: ModelCallSummary[] };

type T = (key: MessageKey, params?: Record<string, string | number>) => string;

function seconds(ms: number | null, t: T): string {
  return ms === null ? "–" : `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}${t("admin.usage.unit.s")}`;
}

// 1234 -> "1.2k", 1234567 -> "1.2M"; whole numbers below a thousand.
function compact(n: number, t: T): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}${t("admin.usage.unit.m")}`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}${t("admin.usage.unit.k")}`;
  }
  return String(Math.round(n));
}

function bytes(n: number, t: T): string {
  if (n >= 1024 * 1024 * 1024) {
    return `${(n / (1024 * 1024 * 1024)).toFixed(1)} ${t("admin.usage.unit.gb")}`;
  }
  if (n >= 1024 * 1024) {
    return `${(n / (1024 * 1024)).toFixed(1)} ${t("admin.usage.unit.mb")}`;
  }
  if (n >= 1024) {
    return `${Math.round(n / 1024)} ${t("admin.usage.unit.kb")}`;
  }
  return n ? `${n} ${t("admin.usage.unit.b")}` : "0";
}

function when(at: string | null, t: T): string {
  return at ? new Date(at).toLocaleDateString() : t("admin.usage.never");
}

// The five usage columns every row shares: paid tokens, local tokens,
// pictures, speech, agent turns. "in/out" reads as tokens sent and tokens
// back; a dash is a clean zero.
function tokens(input: number, output: number, t: T): string {
  return input || output ? t("admin.usage.tokens", { input: compact(input, t), output: compact(output, t) }) : "–";
}

function pictures(paid: number, local: number, t: T): string {
  if (!paid && !local) {
    return "–";
  }
  return [
    paid ? t("admin.usage.picturesPaid", { count: compact(paid, t) }) : "",
    local ? t("admin.usage.picturesLocal", { count: compact(local, t) }) : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function speech(totals: UsageTotals, t: T): string {
  const parts = [
    totals.paidSpeechChars || totals.localSpeechChars
      ? t("admin.usage.chars", { count: compact(totals.paidSpeechChars + totals.localSpeechChars, t) }) +
        (totals.paidSpeechChars ? t("admin.usage.paidNote", { count: compact(totals.paidSpeechChars, t) }) : "")
      : "",
    totals.paidDictationClips || totals.localDictationClips
      ? t("admin.usage.clips", { count: compact(totals.paidDictationClips + totals.localDictationClips, t) }) +
        (totals.paidDictationClips ? t("admin.usage.paidNote", { count: compact(totals.paidDictationClips, t) }) : "")
      : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "–";
}

const th = "px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-stone-500";
const td = "px-2 py-1.5 align-top text-xs text-stone-300 tabular-nums";

function UsageCells({ totals }: { totals: UsageTotals }) {
  const { t } = useI18n();
  return (
    <>
      <td className={td} title={t("admin.usage.hint.paid")}>
        {tokens(totals.paidInputTokens, totals.paidOutputTokens, t)}
      </td>
      <td className={td} title={t("admin.usage.hint.local")}>
        {tokens(totals.localInputTokens, totals.localOutputTokens, t)}
      </td>
      <td className={td}>{pictures(totals.paidImages, totals.localImages, t)}</td>
      <td className={td}>{speech(totals, t)}</td>
      <td className={td}>{totals.agentTurns || "–"}</td>
    </>
  );
}

// What the server's AI has been spent on, by account and by campaign
// (issue #137). Counts come from what each backend reported; nothing here
// was read out of a prompt or a transcript, and no price is guessed.
export function AdminUsagePanel() {
  const { t } = useI18n();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State moves only once the answer is in, so the first load inside the
  // effect sets nothing synchronously.
  const load = useCallback(() => {
    return fetch("/api/admin/usage")
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as (Overview & { error?: string }) | null;
        if (!response.ok || !data) {
          setError(data?.error || t("admin.usage.err.load"));
          return;
        }
        setError("");
        setOverview(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    void load();
  };

  if (loading && !overview) {
    return <PageSkeleton />;
  }

  const accounts = [...(overview?.accounts ?? [])].sort(
    (a, b) => b.paidInputTokens + b.paidOutputTokens - (a.paidInputTokens + a.paidOutputTokens) || b.calls - a.calls,
  );
  const campaigns = [...(overview?.campaigns ?? [])].sort(
    (a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-400">
        {t("admin.usage.intro")}
      </p>
      {error ? <p role="alert" className="motion-shake text-sm text-red-400">{error}</p> : null}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        {overview ? <span>{t("admin.usage.asOf", { time: new Date(overview.generatedAt).toLocaleTimeString() })}</span> : null}
        <button type="button" className={ui.btnSmall} onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} {t("admin.usage.refresh")}
        </button>
      </div>

      <section className="panel texture-noise rounded-xl p-5">
        <SectionHead
          level="h2"
          title={t("admin.usage.accounts")}
          glyph="tab-party"
          aside={<span className="count-pop tabular-nums">{accounts.length}</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={th}>{t("admin.usage.h.Account")}</th>
                <th className={th}>{t("admin.usage.h.Campaigns")}</th>
                <th className={th}>{t("admin.usage.h.Characters")}</th>
                <th className={th}>{t("admin.usage.h.LastActive")}</th>
                <th className={th}>{t("admin.usage.h.Storage")}</th>
                <th className={th}>{t("admin.usage.h.PaidTokens")}</th>
                <th className={th}>{t("admin.usage.h.LocalTokens")}</th>
                <th className={th}>{t("admin.usage.h.Pictures")}</th>
                <th className={th}>{t("admin.usage.h.Speech")}</th>
                <th className={th}>{t("admin.usage.h.AgentTurns")}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.userId} className="border-t border-stone-800/60">
                  <td className={td}>
                    <span className="text-stone-100">{account.username}</span>
                    {account.isAdmin ? <span className="ml-1 text-[10px] uppercase text-amber-300/80">{t("admin.usage.admin")}</span> : null}
                  </td>
                  <td className={td} title={t("admin.usage.hint.owned")}>
                    {account.campaignsOwned} / {account.campaignsLed} / {account.campaignsJoined}
                  </td>
                  <td className={td}>{account.libraryCharacters}</td>
                  <td className={td}>{when(account.lastActivityAt, t)}</td>
                  <td className={td}>{bytes(account.storageBytes, t)}</td>
                  <UsageCells totals={account} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-stone-500">
          {t("admin.usage.note.accounts")}
        </p>
      </section>

      <section className="panel texture-noise rounded-xl p-5">
        <SectionHead
          level="h2"
          title={t("admin.usage.campaigns")}
          glyph="tab-campaigns"
          aside={<span className="count-pop tabular-nums">{campaigns.length}</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={th}>{t("admin.usage.h.Campaign")}</th>
                <th className={th}>{t("admin.usage.h.Lead")}</th>
                <th className={th}>{t("admin.usage.h.Members")}</th>
                <th className={th}>{t("admin.usage.h.Characters")}</th>
                <th className={th}>{t("admin.usage.h.GmTurns")}</th>
                <th className={th}>{t("admin.usage.h.ActiveDays")}</th>
                <th className={th}>{t("admin.usage.h.LastActivity")}</th>
                <th className={th}>{t("admin.usage.h.Storage")}</th>
                <th className={th}>{t("admin.usage.h.PaidTokens")}</th>
                <th className={th}>{t("admin.usage.h.LocalTokens")}</th>
                <th className={th}>{t("admin.usage.h.Pictures")}</th>
                <th className={th}>{t("admin.usage.h.Speech")}</th>
                <th className={th}>{t("admin.usage.h.AgentTurns")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.campaignId} className="border-t border-stone-800/60">
                  <td className={td}>
                    <span className="text-stone-100">{campaign.title}</span>
                    <span className="ml-1 text-[10px] uppercase text-stone-500">
                      {campaign.kind === "workshop" ? t("admin.usage.kind.workshop") : campaign.kind === "playtest" ? t("admin.usage.kind.playtest") : campaign.status}
                    </span>
                  </td>
                  <td className={td}>{campaign.leadUsername || "–"}</td>
                  <td className={td}>{campaign.members}</td>
                  <td className={td}>{campaign.characters}</td>
                  <td className={td}>{campaign.turns || "–"}</td>
                  <td className={td}>{campaign.activeDays || "–"}</td>
                  <td className={td}>{when(campaign.lastActivityAt, t)}</td>
                  <td className={td}>{bytes(campaign.storageBytes, t)}</td>
                  <UsageCells totals={campaign} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-stone-500">
          {t("admin.usage.note.campaigns")}
        </p>
      </section>

      {overview?.modelCalls?.length ? (
        <section className="panel texture-noise rounded-xl p-5" data-testid="model-calls">
          <SectionHead
            level="h2"
            title={t("admin.usage.calls.title")}
            glyph="tab-context"
            aside={<span className="count-pop tabular-nums">{overview.modelCalls.reduce((sum, row) => sum + row.calls, 0)}</span>}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={th}>{t("admin.usage.h.For")}</th>
                  <th className={th}>{t("admin.usage.h.Calls")}</th>
                  <th className={th}>{t("admin.usage.h.Failed")}</th>
                  <th className={th}>{t("admin.usage.h.FellBack")}</th>
                  <th className={th}>{t("admin.usage.h.Median")}</th>
                  <th className={th}>{t("admin.usage.h.95Th")}</th>
                  <th className={th}>{t("admin.usage.h.FirstWords")}</th>
                  <th className={th}>{t("admin.usage.h.Input")}</th>
                  <th className={th}>{t("admin.usage.h.Cached")}</th>
                  <th className={th}>{t("admin.usage.h.Output")}</th>
                  <th className={th}>{t("admin.usage.h.Reasoning")}</th>
                </tr>
              </thead>
              <tbody>
                {overview.modelCalls.map((row) => (
                  <tr key={row.task} className="border-t border-stone-800/60">
                    <td className={td}>
                      <span className="text-stone-100">{row.task.replaceAll("_", " ")}</span>
                    </td>
                    <td className={td}>{row.calls}</td>
                    <td className={td}>{row.errors || "–"}</td>
                    <td className={td}>{row.fallbacks || "–"}</td>
                    <td className={td}>{seconds(row.p50Ms, t)}</td>
                    <td className={td}>{seconds(row.p95Ms, t)}</td>
                    <td className={td}>{seconds(row.p50FirstTokenMs, t)}</td>
                    <td className={td}>{row.avgInputTokens === null ? "–" : compact(row.avgInputTokens, t)}</td>
                    <td className={td}>{row.cachedShare === null ? "–" : `${Math.round(row.cachedShare * 100)}%`}</td>
                    <td className={td}>{row.avgOutputTokens === null ? "–" : compact(row.avgOutputTokens, t)}</td>
                    <td className={td}>{row.avgReasoningTokens === null ? "–" : compact(row.avgReasoningTokens, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-stone-500">
            {t("admin.usage.note.calls")}
          </p>
        </section>
      ) : null}

      <AdminNarratorQualityCard />
    </div>
  );
}
