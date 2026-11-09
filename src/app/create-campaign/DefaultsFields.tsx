"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import { Dialog } from "@/components/ui/Dialog";
import { GameIcon } from "@/components/ui/GameIcon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/cn";
import type { DefaultsState } from "@/app/create-campaign/useCampaignDefaults";

// The creator's half of personal campaign defaults
// (src/lib/campaign-defaults.ts): the bar on the first step that says what
// this campaign started from, the panel on the review step that saves it, and
// the manager both open. Saving is always a press of its own: creating a
// campaign never changes the defaults, and saving them never creates one.

export type StartFrom = "mine" | "app";

export type DefaultsActions = {
  state: DefaultsState;
  startFrom: StartFrom;
  // The saved defaults arrived after the person had begun, so none of them
  // were laid over what they typed.
  late: boolean;
  // What applying them left alone, and why.
  kept: string[];
  busy: boolean;
  message: { tone: "ok" | "error"; text: string } | null;
  onUseMine: () => void;
  onUseApp: () => void;
  onSave: () => void;
  onRemove: () => void;
  onManage: () => void;
};

const SAVED_GROUPS = [
  "createCampaign.defaults.savedGroup.0",
  "createCampaign.defaults.savedGroup.1",
  "createCampaign.defaults.savedGroup.2",
  "createCampaign.defaults.savedGroup.3",
  "createCampaign.defaults.savedGroup.4",
  "createCampaign.defaults.savedGroup.5",
  "createCampaign.defaults.savedGroup.6",
  "createCampaign.defaults.savedGroup.7",
  "createCampaign.defaults.savedGroup.8",
  "createCampaign.defaults.savedGroup.9",
  "createCampaign.defaults.savedGroup.10",
] as const satisfies readonly MessageKey[];

const savedOn = (iso: string, lang: "en" | "ru") => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";
};

export function DefaultsBar({ actions }: { actions: DefaultsActions }) {
  const { t, lang } = useI18n();
  const { state, startFrom, late, kept } = actions;
  // Nothing saved yet: one quiet line, since there is nothing to choose
  // between before the person has made a table worth keeping. Saving it
  // waits on the review step, and Manage stays a tap away.
  if (state.status === "none" && !kept.length) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500" role="status">
        <GameIcon icon={{ kind: "glyph", key: "ui-pin" }} size="size-4" className="shrink-0" />
        <span className="min-w-0 flex-1">{t("createCampaign.defaults.startingFromApp")}</span>
        <button type="button" onClick={actions.onManage} className="cc-link">
          {t("createCampaign.defaults.about")}
        </button>
      </p>
    );
  }

  const savedDate = state.status === "saved" ? savedOn(state.defaults.savedAt, lang) : "";
  const keptItems = kept.map((entry) => {
    if (entry === "the world pack keeps its own setting") {
      return t("createCampaign.defaults.keptWorldPackGeneric");
    }
    const namedPack = /^(.+) keeps its own setting$/.exec(entry);
    return namedPack ? t("createCampaign.defaults.keptWorldPack", { name: namedPack[1] }) : entry;
  });
  const line =
    state.status === "loading"
      ? t("createCampaign.defaults.loading")
      : state.status === "unavailable"
        ? t("createCampaign.defaults.readError", { error: state.error })
        : state.status === "none"
          ? t("createCampaign.defaults.startingFromAppReview")
          : late && startFrom === "app"
            ? t("createCampaign.defaults.late")
            : state.status === "saved" && startFrom === "mine"
              ? t("createCampaign.defaults.startingFromMine", { savedDate: savedDate ? " (" + savedDate + ")" : "" })
              : t("createCampaign.defaults.startingFromAppOnePress");

  return (
    <div className="cc-defaults" role="group" aria-label={t("createCampaign.defaults.startingPoint")}>
      <GameIcon icon={{ kind: "glyph", key: "ui-pin" }} size="size-5" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="cc-eyebrow block">{t("createCampaign.defaults.startingPoint")}</span>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-400" role="status">
          {line}
          {keptItems.length ? " " + t("createCampaign.defaults.kept", { items: keptItems.join("; ") }) : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {state.status === "saved" ? (
          <SegmentedControl<StartFrom>
            size="sm"
            label={t("createCampaign.defaults.startFrom")}
            value={startFrom}
            onChange={(value) => (value === "mine" ? actions.onUseMine() : actions.onUseApp())}
            options={[
              { value: "mine", label: t("createCampaign.defaults.mine") },
              { value: "app", label: t("createCampaign.defaults.app") },
            ]}
          />
        ) : null}
        <button type="button" onClick={actions.onManage} className="cc-link">
          {t("createCampaign.defaults.manage")}
        </button>
      </div>
    </div>
  );
}

export function DefaultsPanel({ actions }: { actions: DefaultsActions }) {
  const { t } = useI18n();
  const saved = actions.state.status === "saved";
  return (
    <div className="cc-field">
      <div className="cc-field-head">
        <span className="cc-eyebrow">{t("createCampaign.defaults.usualTable")}</span>
        <span className="cc-note">{saved ? t("createCampaign.defaults.haveSaved") : t("createCampaign.defaults.noneSaved")}</span>
      </div>
      <p className="text-xs leading-relaxed text-stone-400">
        {t("createCampaign.defaults.description")}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={actions.onSave} disabled={actions.busy || actions.state.status === "loading"} className={ui.btnSmall}>
          {actions.busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {saved ? t("createCampaign.defaults.update") : t("createCampaign.defaults.save")}
        </button>
        <button type="button" onClick={actions.onManage} className="cc-link">
          {t("createCampaign.defaults.managePanel")}
        </button>
      </div>
      <DefaultsMessage actions={actions} />
    </div>
  );
}

function DefaultsMessage({ actions }: { actions: DefaultsActions }) {
  if (!actions.message) {
    return null;
  }
  return (
    <p role="status" className={cn("mt-2 text-xs", actions.message.tone === "error" ? "text-red-400" : "text-emerald-300")}>
      {actions.message.text}
    </p>
  );
}

export function DefaultsDialog({
  open,
  onOpenChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: DefaultsActions;
}) {
  const [confirming, setConfirming] = useState(false);
  const { t, lang } = useI18n();
  const { state } = actions;
  const saved = state.status === "saved";
  const date = saved ? savedOn(state.defaults.savedAt, lang) : "";
  const dateLabel = date ? (lang === "ru" ? " " + date : " on " + date) : "";
  const source = t(actions.startFrom === "mine" ? "createCampaign.defaults.mine" : "createCampaign.defaults.app");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setConfirming(false);
        onOpenChange(next);
      }}
      title={t("createCampaign.defaults.title")}
      width="w-[min(92vw,36rem)]"
    >
      <div className="space-y-3 text-sm">
        <p className="text-stone-400">
          {t("createCampaign.defaults.dialogDescription")}
        </p>
        <div className="cc-field">
          <span className="cc-eyebrow mb-1.5 block">{t("createCampaign.defaults.savedWith")}</span>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-stone-300">
            {SAVED_GROUPS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-stone-500">
          {t("createCampaign.defaults.neverSaved")}
        </p>
        <p className="text-xs text-stone-400" role="status">
          {state.status === "loading"
            ? t("createCampaign.defaults.loading")
            : state.status === "unavailable"
              ? t("createCampaign.defaults.readError", { error: state.error })
              : saved
                ? t("createCampaign.defaults.savedDate", { date: dateLabel, source })
                : t("createCampaign.defaults.notSaved")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={actions.onSave} disabled={actions.busy || state.status === "loading"} className={ui.btnPrimary}>
            {actions.busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {saved ? t("createCampaign.defaults.updateWithCampaign") : t("createCampaign.defaults.saveCampaign")}
          </button>
          {saved ? (
            <button type="button" onClick={actions.onUseMine} className={ui.btnSmall}>
              {t("createCampaign.defaults.startCampaignMine")}
            </button>
          ) : null}
          <button type="button" onClick={actions.onUseApp} className={ui.btnSmall}>
            {t("createCampaign.defaults.startCampaignApp")}
          </button>
        </div>
        {saved ? (
          confirming ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/20 p-2.5 text-xs text-stone-300">
              <span className="min-w-0 flex-1">{t("createCampaign.defaults.removePrompt")}</span>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  actions.onRemove();
                }}
                className={cn(ui.btnSmall, "border-red-800/60 text-red-300 hover:text-red-200")}
              >
                {t("createCampaign.defaults.remove")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={ui.btnSmall}>
                {t("createCampaign.defaults.keep")}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="cc-link text-red-300/80 hover:text-red-200">
              {t("createCampaign.defaults.removeSaved")}
            </button>
          )
        ) : null}
        <DefaultsMessage actions={actions} />
      </div>
    </Dialog>
  );
}
