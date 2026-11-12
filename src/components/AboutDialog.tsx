"use client";

import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { GameIcon } from "@/components/ui/GameIcon";
import type { BuildInfo, UpdateStatus } from "@/lib/build-info";
import { cn } from "@/lib/cn";
import { shellHost } from "@/lib/shell-host";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";

// About this server (issue 102): the release it runs, the exact build behind
// that number, and whether a newer release is out. It exists so "is the fix
// in what I am running?" can be answered from the browser, and so a problem
// can be reported with the build it happened on: the Copy button puts that
// on the clipboard in the shape an issue wants. The link to the issues is
// the admin's alone: a player tells whoever runs the server, who can check
// its setup before anything reaches GitHub (issue #459's follow-up).

type About = {
  serverName: string;
  build: BuildInfo;
  update: UpdateStatus;
  repositoryUrl: string;
  canRecheck: boolean;
};

function day(iso: string, locale: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

function moment(iso: string, locale: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

// The build in a sentence: what the label's metadata means, for someone who
// does not read git.
function buildLine(build: BuildInfo, t: ReturnType<typeof useI18n>["t"]): string {
  if (!build.known) {
    return t("about.build.unknown");
  }
  const where = build.release
    ? t("about.build.release", { tag: build.tag })
    : build.tag.replace(/^v/, "") === build.version && build.ahead > 0
      ? t("about.build.changes", { count: build.ahead, tag: build.tag })
      : build.tag.replace(/^v/, "") === build.version
        ? t("about.build.basedOn", { tag: build.tag })
        : t("about.build.development");
  return build.dirty ? `${where} ${t("about.build.localChanges")}` : where;
}

function reportText(about: About): string {
  const { build, update } = about;
  const inApp = shellHost() ? "yes" : "no";
  return [
    `Open Game Master ${build.label}`,
    `Commit: ${build.commit || "unknown"}${build.dirty ? " (with uncommitted changes)" : ""}`,
    `Built: ${build.builtAt || "unknown"}`,
    `Latest release: ${"latest" in update ? update.latest.version : update.state === "off" ? "not checked" : "could not check"}`,
    ...("channel" in update ? [`Update channel: ${update.channel}`] : []),
    `Inside the desktop or Android app: ${inApp}`,
    `Browser: ${navigator.userAgent}`,
  ].join("\n");
}

// Null when the server could not be asked. `fresh` has it look for a newer
// release again now (an admin's button) instead of using its kept answer.
async function ask(fresh: boolean): Promise<About | null> {
  try {
    const response = await fetch(`/api/about${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as About) : null;
  } catch {
    return null;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-stone-800/70 py-2 first:border-t-0">
      <dt className="eyebrow shrink-0 text-[10px] text-stone-500">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm text-stone-200">{children}</dd>
    </div>
  );
}

function UpdateLine({ update, build }: { update: UpdateStatus; build: BuildInfo }) {
  const { t, lang } = useI18n();
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  if (update.state === "off") {
    return (
      <p className="text-sm text-stone-400">
        {update.reason === "device_world"
          ? t("about.update.off.deviceWorld")
          : t("about.update.off.server")}
      </p>
    );
  }
  if (update.state === "unknown") {
    return <p className="text-sm text-stone-400">{t("about.update.unknown")}</p>;
  }
  const { latest } = update;
  const released = day(latest.publishedAt, locale);
  const kind = update.channel === "stable"
    ? t("about.update.kind.stable")
    : latest.prerelease
      ? t("about.update.kind.beta")
      : t("about.update.kind.release");
  if (update.state === "available") {
    return (
      <div className="live-in rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
        <p className="text-sm text-amber-100">
          {t("about.update.available", {
            kind: latest.prerelease ? t("about.update.kind.beta") : t("about.version"),
            version: latest.version,
            released: released ? ` (${released})` : "",
            running: build.version,
          })}
        </p>
        <a href={latest.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300 underline-offset-2 hover:underline">
          {t("about.update.whatsNew", { version: latest.version })} <ExternalLink className="size-3" />
        </a>
        <p className="mt-1 text-xs text-stone-400">{t("about.update.ownerUpdates")}</p>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-sm text-stone-200">
      <Check className="size-4 shrink-0 text-emerald-500" />
      {update.state === "ahead"
        ? t("about.update.ahead", { kind, version: latest.version })
        : t("about.update.current", { version: latest.version, kind })}
    </p>
  );
}

export function AboutDialog({ open, onOpenChange, isAdmin = false }: { open: boolean; onOpenChange: (open: boolean) => void; isAdmin?: boolean }) {
  const { t, lang } = useI18n();
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const [about, setAbout] = useState<About | null>(null);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Asked each time the dialog opens: it is opened to learn what is running
  // now, and a server may have been updated since the page was loaded.
  useEffect(() => {
    if (!open) {
      return;
    }
    let live = true;
    void ask(false).then((answer) => {
      if (live) {
        setAbout(answer ?? null);
        setFailed(answer === null);
      }
    });
    return () => {
      live = false;
    };
  }, [open]);

  async function copy() {
    if (!about) return;
    try {
      await navigator.clipboard.writeText(reportText(about));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // No clipboard here (an insecure address): the details stay on screen.
    }
  }

  const build = about?.build;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("about.title")}
      icon={<GameIcon icon={{ kind: "glyph", key: "system-rules" }} size="size-6" />}
      width="w-[min(92vw,30rem)]"
    >
      {!about || !build ? (
        <p className="flex items-center gap-2 text-sm text-stone-400" role="status">
          {failed ? t("about.error.load") : <><Loader2 className="size-4 animate-spin" /> {t("about.loading")}</>}
        </p>
      ) : (
        <div className="reveal space-y-4">
          <div>
            <p className="gold-title font-display text-xl tracking-wide">Open Game Master</p>
            <p className="mt-0.5 text-sm text-stone-300">
              {t("about.version")} <span className="font-mono text-amber-100">{build.version}</span>
              {about.serverName && about.serverName !== "Open Game Master" ? <span className="text-stone-500">{t("about.serverName", { name: about.serverName })}</span> : null}
            </p>
          </div>

          <UpdateLine update={about.update} build={build} />

          <dl className="rounded-lg border border-stone-700/60 bg-stone-900/40 px-3">
            <Row label={t("about.row.build")}>
              <span className="font-mono text-[13px]">{build.label}</span>
            </Row>
            {build.shortCommit ? (
              <Row label={t("about.row.commit")}>
                <a
                  href={`${about.repositoryUrl}/commit/${build.commit}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[13px] text-amber-200 underline-offset-2 hover:underline"
                >
                  {build.shortCommit} <ExternalLink className="size-3" />
                </a>
              </Row>
            ) : null}
            {build.builtAt ? <Row label={t("about.row.built")}>{moment(build.builtAt, locale)}</Row> : null}
            {"channel" in about.update ? <Row label={t("about.row.updateChannel")}>{about.update.channel === "beta" ? t("about.update.kind.beta") : t("about.update.kind.stable")}</Row> : null}
            {"checkedAt" in about.update ? <Row label={t("about.row.checkedAt")}>{moment(about.update.checkedAt, locale)}</Row> : null}
          </dl>
          <p className={cn("text-xs leading-relaxed", build.dirty ? "text-amber-300/90" : "text-stone-500")}>{buildLine(build, t)}</p>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void copy()} className={cn(ui.btnSmall, "gap-1.5")}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? t("about.copy.copied") : isAdmin ? t("about.copy.bugReport") : t("about.copy.details")}
            </button>
            {about.canRecheck && about.update.state !== "off" ? (
              <button
                type="button"
                disabled={checking}
                onClick={async () => {
                  setChecking(true);
                  const answer = await ask(true);
                  if (answer) {
                    setAbout(answer);
                  }
                  setChecking(false);
                }}
                className={cn(ui.btnSmall, "gap-1.5")}
              >
                <RefreshCw className={cn("size-3.5", checking && "animate-spin")} /> {t("about.checkAgain")}
              </button>
            ) : null}
          </div>
          {shellHost() ? (
            <p className="text-xs text-stone-500">{t("about.server.connected")}</p>
          ) : null}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a href={`${about.repositoryUrl}/releases`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-stone-400 underline-offset-2 hover:text-amber-200 hover:underline">
              {t("about.releaseNotes")} <ExternalLink className="size-3" />
            </a>
            {isAdmin ? (
              <a href={`${about.repositoryUrl}/issues`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-stone-400 underline-offset-2 hover:text-amber-200 hover:underline">
                {t("about.reportProblem")} <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="text-stone-500">{t("about.tellHost")}</span>
            )}
          </p>
        </div>
      )}
    </Dialog>
  );
}
