"use client";

import { Bluetooth, Dices, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import {
  DIE_SIDES,
  type DieSides,
  pixelSource,
  pixelSystemId,
  useDiceSources,
} from "@/lib/dice/dice-sources";
import {
  type ConnectedPixel,
  connectNewPixel,
  disconnectPixel,
  getConnectedPixels,
  getConnectedPixelsServer,
  identifyPixel,
  isWebBluetoothAvailable,
  onPixelsChanged,
  reconnectPixel,
} from "@/lib/dice/pixels-dice";

// Lets a player say, per die shape, where its number comes from during a
// physical roll: a tabletop die they type, a digital roll, or a specific
// Pixels Bluetooth die. Opens from the party panel's physical-dice controls.
export function DiceSourcesButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("campaign.diceSources.button.title")}
        className={cn(
          "flex w-full items-center justify-center gap-1 rounded border border-stone-700 py-1 text-xs text-stone-400 hover:bg-stone-900",
          className,
        )}
      >
        <Bluetooth className="size-3" />
        {t("campaign.diceSources.button.label")}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t("campaign.diceSources.title")}
        icon={<Dices className="size-5 text-amber-300" />}
      >
        <DiceSourcesPanel />
      </Dialog>
    </>
  );
}

const SOURCE_MANUAL = "manual";
const SOURCE_DIGITAL = "digital";

// Also mounted by the apps' own Settings screen, outside any table.
export function DiceSourcesPanel() {
  const { t } = useI18n();
  const [sources, setSource] = useDiceSources();
  const pixels = useSyncExternalStore(
    onPixelsChanged,
    getConnectedPixels,
    getConnectedPixelsServer,
  );
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const supported = isWebBluetoothAvailable();

  // Try to bring back dice this device previously assigned, so a returning
  // player's Pixels reconnect without re-picking them. Best-effort and silent.
  useEffect(() => {
    if (!supported) {
      return;
    }
    const assigned = new Set(
      Object.values(sources)
        .map((source) => pixelSystemId(source))
        .filter((id): id is string => !!id),
    );
    const live = new Set(getConnectedPixels().map((pixel) => pixel.systemId));
    for (const systemId of assigned) {
      if (!live.has(systemId)) {
        reconnectPixel(systemId).catch(() => {});
      }
    }
    // Runs once on open; assignments rarely change mid-dialog and each attempt
    // is guarded against duplicates by the live check above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      await connectNewPixel();
    } catch (err) {
      // A user cancelling the chooser throws too; only surface real failures.
      const message = err instanceof Error ? err.message : "";
      if (message && !/cancel|user gesture|no devices/i.test(message)) {
        setError(t("campaign.diceSources.connectError"));
      }
    } finally {
      setConnecting(false);
    }
  }, [t]);

  return (
    <div className="space-y-4 text-sm">
      {!supported ? (
        <p className="reveal rounded-md border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
          {t("campaign.diceSources.unsupported")}{" "}
          <span className="font-mono">chrome://flags/#enable-web-bluetooth</span>.
        </p>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
              {t("campaign.diceSources.bluetoothHeading")}
            </span>
            <button
              type="button"
              onClick={connect}
              disabled={connecting}
              className="flex items-center gap-1.5 rounded-md border border-sky-800 bg-sky-950/40 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-950/70 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Bluetooth className="size-3.5" />
              )}
              {t("campaign.diceSources.connect")}
            </button>
          </div>
          {pixels.length ? (
            <ul className="stagger space-y-1.5">
              {pixels.map((pixel) => (
                <li
                  key={pixel.systemId}
                  className="flex items-center justify-between rounded-md border border-stone-700/70 bg-stone-900/50 px-2.5 py-1.5"
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded bg-sky-950/60 font-mono text-[10px] text-sky-300">
                      d{pixel.faceCount}
                    </span>
                    <span className="text-stone-200">{pixel.name}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => identifyPixel(pixel.systemId)}
                      aria-label={t("campaign.diceSources.identifyAria", { name: pixel.name })}
                      title={t("campaign.diceSources.identifyTitle")}
                      className="rounded p-1 text-stone-400 hover:bg-stone-800 hover:text-amber-200"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => disconnectPixel(pixel.systemId)}
                      aria-label={t("campaign.diceSources.forgetAria", { name: pixel.name })}
                      title={t("campaign.diceSources.forgetTitle")}
                      className="rounded p-1 text-stone-400 hover:bg-stone-800 hover:text-red-300"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-stone-500">
              {t("campaign.diceSources.noneConnected")}
            </p>
          )}
          {error ? <p className="motion-shake mt-1.5 text-xs text-red-400">{error}</p> : null}
        </div>
      )}

      <div>
        <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-400">
          {t("campaign.diceSources.rollEachWith")}
        </span>
        <div className="stagger space-y-1.5">
          {DIE_SIDES.map((sides) => (
            <SourceRow
              key={sides}
              sides={sides}
              value={sources[sides] ?? SOURCE_MANUAL}
              pixels={pixels.filter((pixel) => pixel.faceCount === sides)}
              onChange={(source) => setSource(sides, source)}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {t("campaign.diceSources.assignmentNote")}
        </p>
      </div>
    </div>
  );
}

function SourceRow({
  sides,
  value,
  pixels,
  onChange,
}: {
  sides: DieSides;
  value: string;
  pixels: ConnectedPixel[];
  onChange: (source: string) => void;
}) {
  const { t } = useI18n();
  const assignedId = pixelSystemId(value);
  const assignedOffline = assignedId
    ? !pixels.some((pixel) => pixel.systemId === assignedId)
    : false;
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="w-10 font-mono text-xs text-amber-200/90">d{sides}</span>
      <Select
        value={value}
        onChange={onChange}
        label={t("campaign.diceSources.sourceForDie", { sides })}
        size="sm"
        className="min-w-0 flex-1"
        options={[
          { value: SOURCE_MANUAL as string, label: t("campaign.diceSources.source.manual") },
          { value: SOURCE_DIGITAL as string, label: t("campaign.diceSources.source.digital") },
          ...pixels.map((pixel) => ({ value: pixelSource(pixel.systemId) as string, label: pixel.name })),
          ...(assignedOffline ? [{ value, label: t("campaign.diceSources.source.offline") }] : []),
        ]}
      />
    </label>
  );
}
