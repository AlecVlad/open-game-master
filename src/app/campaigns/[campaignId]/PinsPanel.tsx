"use client";

import { readLoad, useLoadStatus } from "@/lib/load-state";
import { EmptyState } from "@/components/EmptyState";
import { Pin, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { campaignApiErrorText } from "@/lib/i18n/campaignApiError";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { SectionHead } from "@/components/ui/SectionHead";
import { cn } from "@/lib/cn";
import { KitButton, LoadFailed, panelRow, PanelError, RowMenu } from "./PanelKit";
import { PIN_TOKEN_CAP, pinTokens, totalPinTokens } from "@/lib/dm/pin-logic";

// Pinned memories: excerpts that ride in every prompt, unconditionally.
//
// The gauge is the point of the panel, following NE-P's PinnedMemoriesPanel:
// pins are the one memory mechanism with no eviction, so the table needs to
// see how much of the budget they have spent before the next pin is refused.
// NE-P colours it amber at 70 percent and red at 90; same thresholds here.

type PinRow = {
  id: string;
  messageId: string;
  text: string;
  isFullMessage: boolean;
  createdAt: string;
};

const COLLAPSE_AT = 160;

function PinItem({ pin, onUnpin }: { pin: PinRow; onUnpin: (id: string) => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const long = pin.text.length > COLLAPSE_AT;
  const shown = !expanded && long ? `${pin.text.slice(0, COLLAPSE_AT)}...` : pin.text;

  const jump = () => {
    document.querySelector(`[data-message-id="${pin.messageId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const items: ContextMenuItem[] = [
    { id: "jump", label: t("campaign.pins.menu.jump"), glyph: "tab-log", onSelect: jump },
    ...(long ? [{ id: "expand", label: expanded ? t("campaign.pins.menu.showLess") : t("campaign.pins.menu.showMore"), glyph: "ui-zoom", onSelect: () => setExpanded((value) => !value) }] : []),
    { id: "unpin", label: t("campaign.pins.menu.unpin"), glyph: "ui-pin", tone: "danger", separated: true, onSelect: () => onUnpin(pin.id) },
  ];

  return (
    <ContextMenu as="li" items={items} label={pin.isFullMessage ? t("campaign.pins.kind.fullMessage") : t("campaign.pins.kind.excerpt")} className={panelRow}>
      <div className="mb-1 flex items-center gap-1.5">
        <Pin className="size-3.5 shrink-0 text-amber-400" />
        <span className="eyebrow text-[10px] text-amber-300/80">
          {pin.isFullMessage ? t("campaign.pins.kind.fullMessage") : t("campaign.pins.kind.excerpt")}
        </span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-stone-500">
          {pinTokens(pin.text)}t
        </span>
        <KitButton tone="iconDanger" onClick={() => onUnpin(pin.id)} aria-label={t("campaign.pins.aria.unpin")} className="-my-1 shrink-0">
          <Trash2 className="size-3.5" />
        </KitButton>
        <RowMenu items={items} label={pin.isFullMessage ? t("campaign.pins.kind.fullMessage") : t("campaign.pins.kind.excerpt")} className="-my-1" />
      </div>
      <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-stone-300">
        {shown}
      </p>
      <div className="mt-1 flex gap-3">
        {long ? (
          <KitButton tone="link" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? t("campaign.pins.menu.showLess") : t("campaign.pins.menu.showMore")}
          </KitButton>
        ) : null}
        <KitButton tone="link" onClick={jump}>
          {t("campaign.pins.menu.jump")}
        </KitButton>
      </div>
    </ContextMenu>
  );
}

export function PinsPanel({ campaignId, version }: { campaignId: string; version: number }) {
  const { t } = useI18n();
  const [pins, setPins] = useState<PinRow[]>([]);
  // A refused or failed read is shown in the server's words with a way to
  // ask again, never as "nothing here yet" (issue 140).
  const { loaded, loadError, settle } = useLoadStatus();

  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void readLoad<{ pins?: PinRow[] }>(fetch(`/api/campaigns/${campaignId}/pins`), t("campaign.pins.title")).then((outcome) => {
      if (cancelled) {
        return;
      }
      settle(outcome.error ? { payload: null, error: t("campaign.pins.loadError") } : outcome);
      if (outcome.payload) {
        setPins(outcome.payload.pins ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, reload, version, settle, t]);

  const unpin = useCallback(
    async (pinId: string) => {
      setError("");
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/pins`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinId }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(campaignApiErrorText(data, t("campaign.pins.error.invalidUnpin"), t));
          return;
        }
        setReload((count) => count + 1);
      } catch {
        setError(t("campaign.pins.error.server"));
      }
    },
    [campaignId, t],
  );

  const used = totalPinTokens(pins);
  const pct = Math.min(100, Math.round((used / PIN_TOKEN_CAP) * 100));

  return (
    <div className="space-y-2">
      <SectionHead
        title={t("campaign.pins.title")}
        glyph="tab-facts"
        aside={
          <span
            className={cn(
              "font-mono text-[11px]",
              used >= PIN_TOKEN_CAP * 0.9 ? "text-red-400" : used >= PIN_TOKEN_CAP * 0.7 ? "text-amber-400" : "text-stone-500",
            )}
          >
            {used.toLocaleString()} / {PIN_TOKEN_CAP.toLocaleString()} {t("campaign.pins.budget.tokens")}
          </span>
        }
      />
      {error ? <PanelError>{error}</PanelError> : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-800" role="meter" aria-label={t("campaign.pins.budget.aria")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div
          className={cn(
            "bar-ease h-full rounded-full",
            used >= PIN_TOKEN_CAP * 0.9
              ? "bg-red-500"
              : used >= PIN_TOKEN_CAP * 0.7
                ? "bg-amber-400"
                : "bg-amber-500/60",
          )}
          style={{ width: `${Math.max(1, pct)}%` }}
        />
      </div>

      {pins.length ? (
        <ul className="stagger space-y-1.5">
          {pins.map((pin) => (
            <PinItem key={pin.id} pin={pin} onUnpin={unpin} />
          ))}
        </ul>
      ) : (
        (loadError ? (
          <LoadFailed
            error={loadError}
            onRetry={() => setReload((current) => current + 1)}
          />
        ) : loaded ? (
          <EmptyState
            size="sm"
            art="board"
            title={t("campaign.pins.empty")}
          />
        ) : null)
      )}
    </div>
  );
}
