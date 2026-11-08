"use client";

import { ChevronDown, Download, FlaskConical, Loader2, RefreshCw, ScrollText, Trash2, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddonFields, fieldDefaults, type FieldValues } from "@/components/addons/AddonFields";
import { appConfirm } from "@/components/ui/ConfirmDialog";
import { Switch } from "@/components/ui/Switch";
import type { AdminAddon, AdminAddonsState } from "@/lib/addons/admin-view";
import { cancelTask, followTask } from "@/lib/addons/follow-task";
import { CONTRIBUTION_KINDS, CONTRIBUTION_LABELS } from "@/lib/addons/manifest";
import type { RequirementCheck } from "@/lib/addons/requirements";
import type { TaskView } from "@/lib/addons/tasks";
import { forgetAddons } from "@/lib/addons/use-addons";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

// One installed addon on Admin > Addons: what it is and where it came from,
// whether it is on, what it asks for, its setup, its settings, the programs
// it needs, its log, and its update and remove buttons.

const SOURCE_LABEL: Record<AdminAddon["source"], MessageKey> = {
  registry: "admin.addon.src.registry",
  file: "admin.addon.src.file",
  github: "admin.addon.src.github",
  dev: "admin.addon.src.dev",
};

const STATUS: Record<AdminAddon["status"], { label: MessageKey; tone: string }> = {
  ready: { label: "admin.addon.st.ready", tone: "bg-emerald-400" },
  disabled: { label: "admin.addon.st.disabled", tone: "bg-stone-500" },
  "needs-approval": { label: "admin.addon.st.needsApproval", tone: "bg-amber-400" },
  "needs-settings": { label: "admin.addon.st.needsSettings", tone: "bg-amber-400" },
  "needs-setup": { label: "admin.addon.st.needsSetup", tone: "bg-amber-400" },
  conflict: { label: "admin.addon.st.conflict", tone: "bg-red-400" },
  "missing-files": { label: "admin.addon.st.missingFiles", tone: "bg-red-400" },
  broken: { label: "admin.addon.st.broken", tone: "bg-red-400" },
  unfit: { label: "admin.addon.st.unfit", tone: "bg-red-400" },
  unsupported: { label: "admin.addon.st.unsupported", tone: "bg-stone-600" },
};

type Details = { requirements: RequirementCheck[]; log: string[] };

export function AdminAddonCard({
  addon,
  permissions,
  onChanged,
  onInstall,
  busy,
}: {
  addon: AdminAddon;
  permissions: AdminAddonsState["permissions"];
  onChanged: (notice: string) => Promise<void>;
  onInstall: (addonId: string) => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const manifest = addon.manifest;
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [values, setValues] = useState<FieldValues>(() => ({ ...fieldDefaults(manifest?.settings ?? []), ...addon.settings }));
  const [dirty, setDirty] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [test, setTest] = useState("");
  const status = STATUS[addon.status];
  const name = manifest?.name ?? addon.id;

  async function call(method: string, body?: unknown, path = ""): Promise<Record<string, unknown> | null> {
    setError("");
    const response = await fetch(`/api/admin/addons/${encodeURIComponent(addon.id)}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => ({}))) as Record<string, unknown>) : { error: t("admin.addon.err.network") };
    if (!response?.ok) {
      setError(String(data.error ?? t("admin.addon.err.generic")));
      return null;
    }
    return data;
  }

  async function toggle(next: boolean) {
    if (next && manifest?.permissions.length) {
      const asks = manifest.permissions
        .map((permission) => permissions[permission as keyof typeof permissions]?.label ?? permission)
        .join("; ");
      const sure = await appConfirm(t("admin.addon.toggle.confirm", { name, asks }), {
        title: t("admin.addon.toggle.title"),
        actionLabel: t("admin.addon.toggle.action"),
        tone: "plain",
      });
      if (!sure) return;
    }
    setWorking("toggle");
    const done = await call("PATCH", next ? { enabled: true, accept: manifest?.permissions ?? [] } : { enabled: false });
    setWorking("");
    if (done) {
      forgetAddons();
      const fresh = done.addon as AdminAddon | null;
      if (next && fresh?.status === "needs-settings") {
        // Its setup waits for these: open them where they are filled in.
        setOpen(true);
        await onChanged(t("admin.addon.note.fill", { name, fields: fresh.missingSettings.join(", ") }));
        return;
      }
      await onChanged(next ? (done.setupTask ? t("admin.addon.note.onSetup", { name }) : t("admin.addon.note.on", { name })) : t("admin.addon.note.off", { name }));
    }
  }

  async function update() {
    if (addon.source !== "github") {
      onInstall(addon.id);
      return;
    }
    setWorking("update");
    const done = await call("POST", { do: "update" });
    setWorking("");
    if (done) {
      forgetAddons();
      const installed = done.installed as { version: string };
      await onChanged(`${t("admin.addon.note.updated", { name, version: installed.version, from: String(done.from) })}${done.setupTask ? t("admin.addon.note.setupStarted") : ""}`);
    }
  }

  async function saveSettings() {
    setWorking("settings");
    const done = await call("PATCH", { settings: values });
    setWorking("");
    if (done) {
      setDirty(false);
      await onChanged(
        done.setupTask ? t("admin.addon.note.savedSetup", { name }) : t("admin.addon.note.saved", { name }),
      );
    }
  }

  async function check() {
    setWorking("check");
    const data = await call("GET");
    setWorking("");
    if (data) setDetails({ requirements: (data.requirements as RequirementCheck[]) ?? [], log: (data.log as string[]) ?? [] });
  }

  async function runTest() {
    setWorking("test");
    setTest("");
    const response = await fetch(`/api/admin/addons/${encodeURIComponent(addon.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ do: "test" }),
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => ({}))) as { ok?: boolean; tools?: string[]; error?: string; log?: string[] }) : null;
    setWorking("");
    if (!data) {
      setError(t("admin.addon.err.network"));
      return;
    }
    setTest(data.ok ? t("admin.addon.test.ok", { tools: data.tools?.join(", ") || t("admin.addon.test.noTools") }) : "");
    if (!data.ok) setError(data.error ?? t("admin.addon.err.notStarted"));
    setDetails((current) => ({ requirements: current?.requirements ?? [], log: data.log ?? [] }));
  }

  async function remove() {
    const sure = await appConfirm(t("admin.addon.remove.confirm", { name }), {
      title: t("admin.addon.remove.title"),
      actionLabel: t("admin.addon.remove.action"),
      tone: "danger",
    });
    if (!sure) return;
    setWorking("remove");
    const done = await call("DELETE");
    setWorking("");
    if (done) {
      forgetAddons();
      await onChanged(t("admin.addon.note.removed", { name }));
    }
  }

  const contributes = manifest
    ? CONTRIBUTION_KINDS.flatMap((kind) => manifest.contributes[kind].map((title) => `${CONTRIBUTION_LABELS[kind]}: ${title}`))
    : [];
  const canSwitch = Boolean(manifest) && !["broken", "missing-files", "unfit", "unsupported"].includes(addon.status);

  return (
    <li className="plate-row" data-layout="stack">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm text-amber-100">{name}</p>
          <p className="text-[11px] text-stone-500">
            v{addon.version}
            {manifest?.author ? t("admin.addon.by", { author: manifest.author }) : ""} · {t(SOURCE_LABEL[addon.source])}
          </p>
          {addon.origin ? (
            <p className="text-[11px] text-stone-500">
              GitHub:{" "}
              <a href={addon.origin.url} target="_blank" rel="noreferrer" className="text-amber-200/80 hover:text-amber-200">
                {addon.origin.repo}
              </a>{" "}
              · {addon.origin.label}
            </p>
          ) : null}
        </div>
        <span className="flex items-center gap-2 text-[11px] text-stone-400">
          <span className={cn("size-2 rounded-full", status.tone)} aria-hidden="true" />
          {t(status.label)}
          {addon.running ? <span className="text-emerald-300/80">{t("admin.addon.running")}</span> : null}
        </span>
        {canSwitch ? (
          <Switch
            on={addon.enabled && addon.status !== "needs-approval"}
            onChange={(next) => void toggle(next)}
            label={t("admin.addon.onOff", { name })}
            disabled={working === "toggle"}
          />
        ) : null}
      </div>
      {manifest?.description ? <p className="mt-1 text-xs text-stone-400">{manifest.description}</p> : null}
      {addon.conflicts.length ? (
        <ul className="mt-2 space-y-0.5">
          {addon.conflicts.map((conflict) => (
            <li key={conflict.id} className={cn("text-[11px] leading-4", conflict.on ? "text-red-300/90" : "text-stone-500")}>
              {t("admin.addon.conflict.line", { name: conflict.name })}
              {conflict.on ? t("admin.addon.conflict.on") : ""}: {conflict.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {addon.exclusive.length ? (
        <p className="mt-1 text-[11px] leading-4 text-stone-500">
          {t("admin.addon.exclusive", { list: addon.exclusive.join(", ") })}
        </p>
      ) : null}
      {/* While its setup runs, the setup's own progress says it. */}
      {addon.problem && !(addon.status === "needs-setup" && addon.setup.task) ? (
        <p className="live-in mt-1 text-xs text-amber-300/90">{addon.problem}</p>
      ) : null}
      {addon.status === "needs-settings" && !open ? (
        <button type="button" onClick={() => setOpen(true)} className={cn(ui.btnSmall, "mt-2 w-fit text-xs")}>
          {t("admin.addon.fillIn")}
        </button>
      ) : null}
      {contributes.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {contributes.map((line) => (
            <li key={line} className="rounded-full border border-stone-700/70 px-2 py-0.5 text-[10px] text-stone-400">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {manifest?.permissions.length ? (
        <p className="mt-2 text-[11px] leading-4 text-stone-500">
          {t("admin.addon.asks")}{" "}
          {manifest.permissions.map((permission) => permissions[permission as keyof typeof permissions]?.label ?? permission).join("; ")}.
        </p>
      ) : null}
      {addon.setup.has ? <AddonSetup addon={addon} name={name} onChanged={onChanged} /> : null}
      {error ? <p role="alert" className="motion-shake mt-2 text-xs text-red-400">{error}</p> : null}
      {test ? <p role="status" className="live-in mt-2 text-xs text-emerald-300/90">{test}</p> : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {addon.update ? (
          <button type="button" onClick={() => void update()} disabled={busy || working === "update"} className={cn(ui.btnSmall, "text-xs")}>
            {busy || working === "update" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {t("admin.addon.update", { version: addon.update })}
          </button>
        ) : addon.source === "registry" && (addon.status === "missing-files" || addon.status === "broken") ? (
          // Files gone (a world moved to a new machine, a folder deleted by
          // hand): the list still has it, so it is fetched again here.
          <button type="button" onClick={() => onInstall(addon.id)} disabled={busy} className={cn(ui.btnSmall, "text-xs")}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {t("admin.addon.reinstall")}
          </button>
        ) : null}
        {manifest ? (
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={cn(ui.btnSmall, "text-xs")}>
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            {open ? t("admin.addon.less") : t("admin.addon.more")}
          </button>
        ) : null}
        {addon.source !== "dev" ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={working === "remove"}
            className={cn(ui.btnSmall, "text-xs hover:border-red-500/50 hover:text-red-400")}
          >
            {working === "remove" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            {t("admin.addon.remove.action")}
          </button>
        ) : null}
      </div>

      {open && manifest ? (
        <div className="reveal mt-3 space-y-4 border-t border-stone-800/80 pt-3">
          {manifest.settings.length ? (
            <section className="space-y-3">
              <AddonFields
                idPrefix={`addon-${addon.id}`}
                fields={manifest.settings}
                values={values}
                secretsSet={addon.secretsSet}
                onChange={(key, value) => {
                  setValues((current) => ({ ...current, [key]: value }));
                  setDirty(true);
                }}
              />
              <button type="button" onClick={() => void saveSettings()} disabled={!dirty || working === "settings"} className={cn(ui.btnSmall, "text-xs")}>
                {working === "settings" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {dirty ? t("admin.addon.settings.save") : t("admin.addon.settings.saved")}
              </button>
            </section>
          ) : (
            <p className="text-[11px] text-stone-500">{t("admin.addon.settings.none")}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void check()} disabled={working === "check"} className={cn(ui.btnSmall, "text-xs")}>
              {working === "check" ? <Loader2 className="size-3.5 animate-spin" /> : <ScrollText className="size-3.5" />}
              {t("admin.addon.check")}
            </button>
            <button
              type="button"
              onClick={() => void runTest()}
              disabled={working === "test" || addon.status !== "ready"}
              title={addon.status === "ready" ? undefined : t("admin.addon.test.switchFirst")}
              className={cn(ui.btnSmall, "text-xs")}
            >
              {working === "test" ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
              {t("admin.addon.test.button")}
            </button>
          </div>

          {details ? (
            <div className="live-in space-y-2">
              {details.requirements.length ? (
                <ul className="space-y-1">
                  {details.requirements.map((requirement) => (
                    <li key={requirement.program} className="text-[11px] leading-4">
                      <span className={requirement.ok ? "text-emerald-300/90" : "text-amber-300/90"}>
                        {requirement.ok ? t("admin.addon.req.found", { program: requirement.program }) : t("admin.addon.req.missing", { program: requirement.program })}
                        {requirement.version ? ` ${requirement.version}` : ""}
                      </span>
                      {requirement.found ? <span className="font-mono text-stone-500"> {requirement.found}</span> : null}
                      {requirement.problem ? <span className="block text-stone-400">{requirement.problem} {requirement.hint}</span> : null}
                      {!requirement.ok && requirement.url ? (
                        <a href={requirement.url} target="_blank" rel="noreferrer" className="text-amber-200 underline-offset-2 hover:underline">
                          {requirement.url}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-stone-500">{t("admin.addon.req.nothing")}</p>
              )}
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-800 bg-stone-950/80 p-2 font-mono text-[10px] leading-4 text-stone-400">
                {details.log.length ? details.log.join("\n") : t("admin.addon.log.empty")}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

// An addon's setup on its card: what it will do and how much it fetches,
// how far a run has got (followed after a reload too), what went wrong last
// time, and the button to run it (again).
function AddonSetup({ addon, name, onChanged }: { addon: AdminAddon; name: string; onChanged: (notice: string) => Promise<void> }) {
  const { t } = useI18n();
  const [run, setRun] = useState<TaskView | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const live = useRef(true);
  const followed = useRef("");

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const follow = useCallback(
    async (task: TaskView) => {
      if (followed.current === task.id) return;
      followed.current = task.id;
      const done = await followTask(task, setRun, () => live.current);
      if (!live.current) return;
      setRun(null);
      await onChanged(
        done?.status === "done" ? t("admin.addon.setup.done", { name }) : done?.status === "cancelled" ? t("admin.addon.setup.stopped", { name }) : done ? t("admin.addon.setup.failed", { name }) : "",
      );
    },
    [name, onChanged, t],
  );

  // A setup started elsewhere (switching it on, an update) or before a reload.
  const incoming = addon.setup.task;
  useEffect(() => {
    if (incoming?.status === "running") void follow(incoming);
  }, [incoming, follow]);

  async function start() {
    setStarting(true);
    setError("");
    const response = await fetch(`/api/admin/addons/${encodeURIComponent(addon.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ do: "setup" }),
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => ({}))) as { task?: TaskView; error?: string }) : { error: t("admin.addon.err.network") };
    setStarting(false);
    if (!response?.ok || !data.task) {
      setError(data.error ?? t("admin.addon.err.setupNotStarted"));
      return;
    }
    void follow(data.task);
  }

  const { setup } = addon;
  const canRun = addon.enabled && (addon.status === "ready" || addon.status === "needs-setup");
  const blockedBy = !addon.enabled ? t("admin.addon.test.switchFirst") : addon.status === "needs-settings" ? t("admin.addon.setup.fillFirst") : canRun ? undefined : addon.problem;
  return (
    <div className="mt-2 rounded-lg border border-stone-800/80 bg-stone-950/40 p-2.5">
      <p className="text-[11px] leading-4 text-stone-400">
        <Wrench className="mr-1 inline size-3 align-[-2px] text-stone-500" aria-hidden="true" />
        {t("admin.addon.setup.line", { steps: setup.steps.join("; ") })}
        {setup.diskMB ? t("admin.addon.setup.disk", { size: setup.diskMB >= 1024 ? t("admin.addon.setup.gb", { value: (setup.diskMB / 1024).toFixed(1) }) : t("admin.addon.setup.mb", { value: setup.diskMB }) }) : "."}
      </p>
      {run ? (
        <div className="live-in mt-2 space-y-1.5" role="status">
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-800">
            <div
              className={cn("h-full rounded-full bg-amber-400/80 transition-[width] duration-500", run.progress.fraction === null && "animate-pulse")}
              style={{ width: `${Math.round((run.progress.fraction ?? 0.15) * 100)}%` }}
            />
          </div>
          <p className="flex min-w-0 items-center gap-2 text-[11px] text-stone-300">
            <Loader2 className="size-3 shrink-0 animate-spin" />
            <span className="truncate">{run.progress.message || t("admin.addon.setup.working")}</span>
          </p>
          <button type="button" onClick={() => void cancelTask(run.id)} className={cn(ui.btnSmall, "text-xs")}>
            {t("admin.addon.setup.stop")}
          </button>
        </div>
      ) : (
        <>
          {setup.error ? <p className="live-in mt-1 text-[11px] leading-4 text-red-300/90">{t("admin.addon.setup.lastFailed", { error: setup.error })}</p> : null}
          {error ? <p role="alert" className="motion-shake mt-1 text-[11px] text-red-400">{error}</p> : null}
          <button
            type="button"
            onClick={() => void start()}
            disabled={starting || !canRun}
            title={blockedBy}
            className={cn(ui.btnSmall, "mt-2 text-xs")}
          >
            {starting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {setup.needed ? t("admin.addon.setup.run") : t("admin.addon.setup.rerun")}
          </button>
        </>
      )}
    </div>
  );
}
