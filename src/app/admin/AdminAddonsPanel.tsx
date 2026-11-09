"use client";

import { Download, GitBranch, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminAddonCard } from "@/app/admin/AdminAddonCard";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { appConfirm } from "@/components/ui/ConfirmDialog";
import { SectionHead } from "@/components/ui/SectionHead";
import { Switch } from "@/components/ui/Switch";
import type { AdminAddonsState, CatalogAddon } from "@/lib/addons/admin-view";
import { platformName } from "@/lib/addons/manifest";
import { sourceFacts } from "@/lib/addons/registry-index";
import { forgetAddons } from "@/lib/addons/use-addons";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// Admin > Addons: the downloader list (addons/catalog.json in the Open
// Dungeon Master repository, audited entry by entry), the addons this
// server has, and the two server-wide switches (which catalog, and whether a
// .zip or a GitHub link from anywhere may be installed). docs/addons.md is
// the operator's guide to all of it.

const MAX_FILE_BYTES = 64 * 1024 * 1024;

const CATEGORY_LABEL: Record<CatalogAddon["category"], MessageKey> = {
  maps: "admin.addons.cat.maps",
  content: "admin.addons.cat.content",
  table: "admin.addons.cat.table",
  tools: "admin.addons.cat.tools",
};

const KIND_LABEL: Record<string, MessageKey> = {
  workshopImporters: "admin.addons.kind.imports",
  mapGenerators: "admin.addons.kind.maps",
  boardViews: "admin.addons.kind.board",
};

export function AdminAddonsPanel() {
  const { t, tp } = useI18n();
  const [state, setState] = useState<AdminAddonsState | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const registryInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [githubLink, setGithubLink] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/addons").catch(() => null);
    if (response?.ok) setState(await response.json());
    else setError(t("admin.addons.err.read"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/admin/addons")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        if (live) setState(data);
      })
      .catch(() => {
        if (live) setError(t("admin.addons.err.read"));
      });
    return () => {
      live = false;
    };
  }, []);

  const changed = useCallback(
    async (message: string) => {
      setNotice(message);
      setError("");
      await load();
    },
    [load],
  );

  // An install over a copy of the same id from somewhere else (the
  // catalog's, a fork on GitHub, a file) waits for a yes, then goes again.
  async function confirmReplace(data: { replaces?: { name: string; from: string } | null }): Promise<boolean> {
    if (!data.replaces) return false;
    return appConfirm(
      t("admin.addons.replace.confirm", { name: data.replaces.name, from: data.replaces.from }),
      { title: t("admin.addons.replace.title"), actionLabel: t("admin.addons.replace.action"), tone: "plain" },
    );
  }

  async function post(body: Record<string, unknown>, key: string) {
    setBusyId(key);
    setError("");
    setNotice("");
    try {
      let response = await fetch("/api/admin/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data = await response.json().catch(() => ({}));
      if (response.status === 409 && (await confirmReplace(data))) {
        response = await fetch("/api/admin/addons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, replace: true }),
        });
        data = await response.json().catch(() => ({}));
      }
      if (!response.ok) {
        setError(data.replaces ? t("admin.addons.err.nothingReplaced") : data.error || t("admin.addons.err.generic"));
        return null;
      }
      return data;
    } catch {
      setError(t("admin.addons.err.network"));
      return null;
    } finally {
      setBusyId("");
    }
  }

  function installedNotice(data: { installed: { name: string; version: string }; updated: boolean; newPermissions?: string[]; setupTask?: string }, from = "") {
    const asks = data.newPermissions?.length ? t("admin.addons.n.asks") : "";
    const setup = data.setupTask ? t("admin.addons.n.setup") : "";
    return data.updated
      ? `${t("admin.addons.n.updated", { name: data.installed.name, version: data.installed.version, from })}${setup}${asks}`
      : `${t("admin.addons.n.installed", { name: data.installed.name, from })}${asks}`;
  }

  async function install(addonId: string) {
    const data = await post({ do: "install", addonId }, `install:${addonId}`);
    if (!data) return;
    forgetAddons();
    await changed(installedNotice(data));
  }

  async function installFromGitHub() {
    const url = githubLink.trim();
    if (!url) return;
    const data = await post({ do: "install-github", url }, "github");
    if (!data) return;
    setGithubLink("");
    forgetAddons();
    await changed(`${installedNotice(data, data.from ? ` (${data.from})` : "")}${t("admin.addons.n.notReviewed")}`);
  }

  async function saveConfig(patch: { registryUrl?: string; allowFiles?: boolean }) {
    const data = await post({ do: "config", ...patch }, "config");
    if (data) {
      setState(data);
      setNotice(
        patch.allowFiles !== undefined
          ? patch.allowFiles
            ? t("admin.addons.n.filesOn")
            : t("admin.addons.n.filesOff")
          : t("admin.addons.n.catalogSaved"),
      );
    }
  }

  async function onFile(file: File) {
    if (file.size >= MAX_FILE_BYTES) {
      setError(t("admin.addons.err.tooBig"));
      return;
    }
    setBusyId("upload");
    setError("");
    setNotice("");
    try {
      const send = (replace: boolean) =>
        fetch(`/api/admin/addons/upload${replace ? "?replace=1" : ""}`, {
          method: "POST",
          headers: { "Content-Type": "application/zip" },
          body: file,
        });
      let response = await send(false);
      let data = await response.json().catch(() => ({}));
      if (response.status === 409 && (await confirmReplace(data))) {
        response = await send(true);
        data = await response.json().catch(() => ({}));
      }
      if (!response.ok) {
        setError(data.replaces ? t("admin.addons.err.nothingReplaced") : data.error || t("admin.addons.err.archive"));
        return;
      }
      forgetAddons();
      await changed(`${t(data.updated ? "admin.addons.n.fileUpdated" : "admin.addons.n.fileInstalled", { name: data.installed.name, file: file.name })}${t("admin.addons.n.notReviewed")}`);
    } catch {
      setError(t("admin.addons.err.network"));
    } finally {
      setBusyId("");
    }
  }

  if (!state) {
    return error ? <p role="alert" className="text-xs text-red-400">{error}</p> : <PageSkeleton kind="flat" className="px-0 py-2" />;
  }

  const available = state.catalog.addons.filter((entry) => !entry.installed);
  const categories = [...new Set(available.map((entry) => entry.category))];

  return (
    <div className="space-y-4 text-sm">
      <section className={cn(ui.card, "ornate texture-noise p-5")}>
        <SectionHead level="h2" title={t("admin.addons.title")} glyph="system-plugin" />
        <p className="text-xs leading-5 text-stone-400">
          {t("admin.addons.intro1")}
        </p>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          {t("admin.addons.intro2")}
        </p>
        {!state.support.supported ? (
          <p role="status" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {state.support.reason}
          </p>
        ) : state.support.note ? (
          <p className="mt-2 text-[11px] leading-4 text-amber-200/80">{state.support.note}</p>
        ) : null}
      </section>

      {error ? <p role="alert" className="motion-shake text-xs text-red-400">{error}</p> : null}
      {notice ? <p role="status" className="live-in text-xs text-amber-200">{notice}</p> : null}

      <section className={cn(ui.card, "texture-noise p-5")}>
        <SectionHead title={t("admin.addons.installed")} glyph="system-homebrew" aside={<span className="tabular-nums">{state.installed.length}</span>} />
        {!state.installed.length ? (
          <EmptyState art="chest" size="sm" title={t("admin.addons.none")} hint={t("admin.addons.none.hint")} />
        ) : (
          <ul className="stagger space-y-2">
            {state.installed.map((addon) => (
              <AdminAddonCard
                key={`${addon.id}:${addon.version}`}
                addon={addon}
                permissions={state.permissions}
                onChanged={changed}
                onInstall={(id) => void install(id)}
                busy={busyId === `install:${addon.id}`}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={cn(ui.card, "texture-noise p-5")}>
        <SectionHead
          title={t("admin.addons.avail")}
          glyph="system-share"
          aside={available.length ? <span className="tabular-nums">{available.length}</span> : undefined}
        />
        {!state.support.supported ? (
          <EmptyState art="scrolls" size="sm" title={t("admin.addons.unsupported")} />
        ) : !state.catalog.url ? (
          <EmptyState art="scrolls" size="sm" title={t("admin.addons.catalogOff")} hint={t("admin.addons.catalogOff.hint")} />
        ) : state.catalog.error ? (
          <p role="alert" className="motion-shake rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {state.catalog.error}
          </p>
        ) : !available.length ? (
          <EmptyState
            art="chest"
            size="sm"
            title={state.catalog.addons.length ? t("admin.addons.allInstalled") : t("admin.addons.emptyList")}
          />
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category}>
                <p className={cn(ui.sectionEyebrow, "mb-2")}>{t(CATEGORY_LABEL[category])}</p>
                <ul className="stagger grid gap-2 sm:grid-cols-2">
                  {available
                    .filter((entry) => entry.category === category)
                    .map((entry) => (
                      <CatalogEntry
                        key={entry.id}
                        entry={entry}
                        permissions={state.permissions}
                        busy={busyId === `install:${entry.id}`}
                        onInstall={() => void install(entry.id)}
                      />
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {state.catalog.bundled ? (
          <p className="mt-2 text-[11px] leading-4 text-stone-500">
            {t("admin.addons.bundled")}
          </p>
        ) : null}
        {state.catalog.skipped ? (
          <p className="mt-2 text-[11px] text-stone-500">
            {tp("admin.addons.skipped", state.catalog.skipped, { count: state.catalog.skipped })}
          </p>
        ) : null}
      </section>

      <section className={cn(ui.card, "texture-noise p-5")}>
        <SectionHead title={t("admin.addons.list.title")} glyph="tab-facts" />
        <div className="flex flex-wrap items-center gap-2">
          <input
            key={state.config.registryUrl}
            ref={registryInput}
            defaultValue={state.config.registryUrl}
            placeholder={t("admin.addons.list.placeholder")}
            aria-label={t("admin.addons.list.aria")}
            className={cn(ui.input, "min-w-0 flex-1 text-xs")}
          />
          <button
            type="button"
            onClick={() => void saveConfig({ registryUrl: registryInput.current?.value.trim() ?? "" })}
            disabled={busyId === "config"}
            className={cn(ui.btnSmall, "text-xs")}
          >
            {busyId === "config" ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {t("admin.addons.save")}
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-stone-500">
          {t("admin.addons.list.hint1")}<span className="font-mono">ADDON_REGISTRY_URL</span>{t("admin.addons.list.hint2")}<span className="font-mono">off</span>{t("admin.addons.list.hint3")}
          {state.catalog.url ? <span className="block break-all font-mono">{t("admin.addons.reading", { url: state.catalog.url })}</span> : null}
        </p>

        <div className="mt-4 flex items-start justify-between gap-3">
          <span className="min-w-0 text-xs text-stone-300">
            {t("admin.addons.files.label")}
            <span className="block text-[11px] leading-4 text-stone-500">
              {t("admin.addons.files.hint")}
            </span>
          </span>
          <Switch
            on={state.config.allowFiles}
            onChange={(next) => void saveConfig({ allowFiles: next })}
            label={t("admin.addons.files.label")}
            disabled={busyId === "config"}
          />
        </div>
        {state.config.allowFiles ? (
          <div className="reveal mt-3">
            <input
              ref={fileInput}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void onFile(file);
              }}
            />
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void installFromGitHub();
              }}
            >
              <input
                value={githubLink}
                onChange={(event) => setGithubLink(event.target.value)}
                placeholder={t("admin.addons.gh.placeholder")}
                aria-label={t("admin.addons.gh.aria")}
                className={cn(ui.input, "min-w-0 flex-1 text-xs")}
              />
              <button
                type="submit"
                disabled={busyId === "github" || !githubLink.trim() || !state.support.supported}
                className={cn(ui.btnSmall, "text-xs")}
              >
                {busyId === "github" ? <Loader2 className="size-3.5 animate-spin" /> : <GitBranch className="size-3.5" />}
                {t("admin.addons.gh.install")}
              </button>
            </form>
            <p className="mt-1 text-[11px] leading-4 text-stone-500">
              {t("admin.addons.gh.hint")}
            </p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busyId === "upload" || !state.support.supported}
              className={cn(ui.btnSmall, "mt-3 text-xs")}
            >
              {busyId === "upload" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {t("admin.addons.zip.choose")}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CatalogEntry({
  entry,
  permissions,
  busy,
  onInstall,
}: {
  entry: CatalogAddon;
  permissions: AdminAddonsState["permissions"];
  busy: boolean;
  onInstall: () => void;
}) {
  const { t } = useI18n();
  const adds = Object.entries(entry.contributes)
    .filter(([, titles]) => titles.length)
    .map(([kind, titles]) => `${KIND_LABEL[kind] ? t(KIND_LABEL[kind]) : kind}: ${titles.join(", ")}`);
  const source = sourceFacts(entry.source);
  return (
    <li className="plate-row" data-layout="stack">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-sm text-amber-100">{entry.name}</span>
        <span className="text-[11px] text-stone-500">v{entry.version}</span>
      </div>
      <p className="text-[11px] text-stone-500">
        {entry.author ? t("admin.addons.by", { author: entry.author }) : null}
        {entry.author && source ? " · " : null}
        {source ? (
          <a href={source.url} target="_blank" rel="noreferrer" className="text-amber-200/80 hover:text-amber-200" title={t("admin.addons.gh.title", { repo: source.repo })}>
            {t("admin.addons.gh.on", { owner: source.owner })}
          </a>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-stone-400">{entry.description}</p>
      {adds.length ? <p className="mt-1 text-[11px] text-stone-400">{adds.join(" · ")}</p> : null}
      {entry.needs.length ? <p className="mt-1 text-[11px] text-stone-500">{t("admin.addons.needs", { list: entry.needs.join(", ") })}</p> : null}
      {entry.permissions.length ? (
        <p className="mt-1 text-[11px] text-stone-500">
          {t("admin.addons.asks", { list: entry.permissions.map((permission) => permissions[permission]?.label ?? permission).join("; ") })}
        </p>
      ) : null}
      {entry.platforms ? <p className="mt-1 text-[11px] text-stone-500">{t("admin.addons.runsOn", { list: entry.platforms.map(platformName).join(", ") })}</p> : null}
      {entry.exclusive.length ? (
        <p className="mt-1 text-[11px] text-stone-500">{t("admin.addons.exclusive", { list: entry.exclusive.join(", ") })}</p>
      ) : null}
      {entry.clashes.map((clash) => (
        <p key={clash.name} className="mt-1 text-[11px] text-amber-300/90">
          {t("admin.addons.clash", { name: clash.name, reason: clash.reason })}
        </p>
      ))}
      {!entry.fit.ok ? <p className="mt-1 text-[11px] text-amber-300/90">{entry.fit.reason}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onInstall} disabled={busy || !entry.fit.ok} className={cn(ui.btnSmall, "text-xs")}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {t("admin.addons.install")}
        </button>
        <span className="text-[10px] text-stone-500">
          {t("admin.addons.mb", { value: Math.max(1, Math.round(entry.bytes / 1024 / 1024)) })}
          {entry.setupMB ? t("admin.addons.setupSize", { size: entry.setupMB >= 1024 ? t("admin.addons.gb", { value: (entry.setupMB / 1024).toFixed(1) }) : t("admin.addons.mb", { value: entry.setupMB }) }) : ""}
        </span>
        {entry.homepage && !source ? (
          <a href={entry.homepage} target="_blank" rel="noreferrer" className="text-[11px] text-amber-200/80 hover:text-amber-200">
            {t("admin.addons.source")}
          </a>
        ) : null}
      </div>
    </li>
  );
}
