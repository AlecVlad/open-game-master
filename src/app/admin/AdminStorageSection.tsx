"use client";

import { LoadFailed } from "@/app/campaigns/[campaignId]/PanelKit";
import { readLoad, useLoadStatus } from "@/lib/load-state";
import { BrushCleaning, Check, HardDrive, Loader2, Minimize2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { appConfirm } from "@/components/ui/ConfirmDialog";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { useI18n } from "@/lib/i18n/provider";

// What the server keeps and what it weighs (src/lib/ops/retention.ts). The
// story stays forever; once a day the server clears what nothing reads back
// and hands the space to the disk. Files no row names are only listed here,
// for the admin to remove.
type Report = {
  at: string;
  eventsRemoved: number;
  tracesCleared: number;
  usageRowsMerged: number;
  bytesReclaimed: number;
};

type Stats = {
  databaseBytes: number;
  freePageBytes: number;
  incremental: boolean;
  diskFreeBytes: number;
  eventRows: number;
  usageRows: number;
  traceBytes: number;
  running: boolean;
  report: Report | null;
  nextAt: string | null;
};

type Orphans = { pictures: number; audio: number; bytes: number; sample: string[] };

function formatSize(bytes: number, t: (key: MessageKey) => string) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} ${t("admin.storage.unit.gb")}`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} ${t("admin.storage.unit.mb")}`;
  return `${Math.max(bytes > 0 ? 1 : 0, Math.round(bytes / 1024))} ${t("admin.storage.unit.kb")}`;
}

export function AdminStorageSection() {
  const { t, tp } = useI18n();
  const count = (value: number, key: string) => tp(key, value, { count: value.toLocaleString() });
  const [stats, setStats] = useState<Stats | null>(null);
  const [orphans, setOrphans] = useState<Orphans | null>(null);
  const { loadError, settle } = useLoadStatus();
  const [reloads, setReloads] = useState(0);
  const [busy, setBusy] = useState<"" | "tidy" | "compact" | "remove-orphans">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    readLoad<{ stats?: Stats; orphans?: Orphans }>(fetch("/api/admin/storage"), "Storage").then((outcome) => {
      settle(outcome);
      if (outcome.payload) {
        setStats(outcome.payload.stats ?? null);
        setOrphans(outcome.payload.orphans ?? null);
      }
    });
  }, [reloads, settle]);

  async function act(action: "tidy" | "compact" | "remove-orphans") {
    setBusy(action);
    setError("");
    setDone("");
    try {
      const response = await fetch("/api/admin/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || t("admin.storage.err.action"));
        return;
      }
      if (data.stats) setStats(data.stats);
      if (data.orphans) setOrphans(data.orphans);
      if (action === "compact" && data.compacted) {
        setDone(t("admin.storage.done.compacted", { before: formatSize(data.compacted.before, t), after: formatSize(data.compacted.after, t) }));
      } else if (action === "remove-orphans" && data.removed) {
        setDone(t("admin.storage.done.removed", { files: count(data.removed.removed, "admin.storage.file"), size: formatSize(data.removed.bytes, t) }));
      } else if (action === "tidy") {
        setDone(t("admin.storage.done.tidied"));
      }
    } catch {
      setError(t("admin.storage.err.reach"));
    } finally {
      setBusy("");
    }
  }

  async function compact() {
    const sure = await appConfirm(
      t("admin.storage.compact.confirm"),
      { title: t("admin.storage.compact.title"), actionLabel: t("admin.storage.compact.action") },
    );
    if (sure) await act("compact");
  }

  async function removeOrphans() {
    if (!orphans) return;
    const sure = await appConfirm(
      t("admin.storage.orphans.confirm", { files: count(orphans.pictures + orphans.audio, "admin.storage.file"), size: formatSize(orphans.bytes, t) }),
      { title: t("admin.storage.orphans.title"), actionLabel: t("admin.storage.orphans.action"), tone: "danger" },
    );
    if (sure) await act("remove-orphans");
  }

  if (stats === null && loadError) {
    return <LoadFailed error={loadError} onRetry={() => setReloads((current) => current + 1)} />;
  }

  if (stats === null) {
    return <div className="skeleton-block mt-3 h-16 rounded-xl" aria-label={t("admin.storage.loading")} />;
  }

  const report = stats.report;
  const orphanCount = orphans ? orphans.pictures + orphans.audio : 0;
  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-stone-500">
        {t("admin.storage.intro")}
      </p>
      <ul className="stagger space-y-2">
        <li className="plate-row flex-wrap gap-2">
          <HardDrive className="size-4 text-stone-400" />
          <span className="text-sm text-stone-300">{t("admin.storage.database")}</span>
          <span className="text-xs tabular-nums text-stone-500">{formatSize(stats.databaseBytes, t)}</span>
          {stats.freePageBytes > 0 ? (
            <span className="text-xs tabular-nums text-stone-500">{t("admin.storage.freeInside", { size: formatSize(stats.freePageBytes, t) })}</span>
          ) : null}
          <span className={cn("text-xs", stats.incremental ? "text-emerald-400" : "text-amber-300")}>
            {stats.incremental ? t("admin.storage.returnsDaily") : t("admin.storage.compactOnce")}
          </span>
          {stats.diskFreeBytes >= 0 ? (
            <span className="ml-auto text-xs tabular-nums text-stone-500">{t("admin.storage.freeOnDisk", { size: formatSize(stats.diskFreeBytes, t) })}</span>
          ) : null}
        </li>
        <li className="plate-row flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-stone-500">
          <span>{count(stats.eventRows, "admin.storage.liveUpdate")}</span>
          <span>{count(stats.usageRows, "admin.storage.usageRow")}</span>
          <span>{t("admin.storage.traces", { size: formatSize(stats.traceBytes, t) })}</span>
        </li>
        <li className="plate-row flex-wrap gap-2 text-xs text-stone-500">
          {stats.running || busy === "tidy" ? (
            <span className="live-in inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" /> {t("admin.storage.tidying")}
            </span>
          ) : report ? (
            <span key={report.at} className="live-in">
              {t("admin.storage.lastTidy", {
                at: new Date(report.at).toLocaleString(),
                updates: count(report.eventsRemoved, "admin.storage.update"),
                traces: count(report.tracesCleared, "admin.storage.trace"),
                usage: count(report.usageRowsMerged, "admin.storage.usageRow"),
                size: formatSize(report.bytesReclaimed, t),
              })}
            </span>
          ) : (
            <span>{stats.nextAt ? t("admin.storage.noTidyNext", { time: new Date(stats.nextAt).toLocaleTimeString() }) : t("admin.storage.noTidy")}</span>
          )}
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => act("tidy")} disabled={Boolean(busy) || stats.running} aria-busy={busy === "tidy"} className={ui.btnSmall}>
          {busy === "tidy" ? <Loader2 className="size-4 animate-spin" /> : <BrushCleaning className="size-4" />}
          {t("admin.storage.tidyNow")}
        </button>
        <button type="button" onClick={compact} disabled={Boolean(busy) || stats.running} aria-busy={busy === "compact"} className={ui.btnSmall}>
          {busy === "compact" ? <Loader2 className="size-4 animate-spin" /> : <Minimize2 className="size-4" />}
          {t("admin.storage.compactDb")}
        </button>
        {done ? (
          <span key={done} role="status" className="live-in inline-flex items-center gap-1 text-xs text-emerald-400">
            <Check className="size-3.5" /> {done}
          </span>
        ) : null}
      </div>
      {error ? <p role="alert" className="motion-shake text-sm text-red-400">{error}</p> : null}
      {orphans ? (
        orphanCount > 0 ? (
          <div className="live-in space-y-2">
            <div className="plate-row flex-wrap gap-2">
              <span className="text-sm text-stone-300">
                {count(orphanCount, "admin.storage.orphan")}
              </span>
              <span className="text-xs tabular-nums text-stone-500">{formatSize(orphans.bytes, t)}</span>
              <button
                type="button"
                onClick={removeOrphans}
                disabled={Boolean(busy)}
                aria-busy={busy === "remove-orphans"}
                className={cn(ui.btnSmall, "ml-auto hover:border-red-500/50 hover:text-red-400")}
              >
                {busy === "remove-orphans" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                {t("admin.storage.orphans.action")}
              </button>
            </div>
            <ul className="stagger space-y-1 pl-1">
              {orphans.sample.map((url) => (
                <li key={url} className="truncate font-mono text-[11px] text-stone-600" title={url}>
                  {url}
                </li>
              ))}
              {orphanCount > orphans.sample.length ? (
                <li className="text-[11px] text-stone-600">{t("admin.storage.andMore", { count: (orphanCount - orphans.sample.length).toLocaleString() })}</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <p className="live-in text-xs text-stone-500">{t("admin.storage.allInUse")}</p>
        )
      ) : null}
    </div>
  );
}
