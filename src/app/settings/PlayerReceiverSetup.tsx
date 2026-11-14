"use client";

import { Check, Download, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { CopyLine } from "@/components/CopyLine";
import { downloadBlob } from "@/lib/download";
import { useI18n } from "@/lib/i18n/provider";
import { ui } from "@/lib/ui";
import {
  RECEIVER_PORT,
  receiverCommands,
  receiverConfig,
  receiverFileName,
  type ReceiverConfig,
} from "@/lib/agents/receiver-config";

export type ReceiverInfo = {
  campaignId: string;
  character: { id: string; name: string } | null;
  webhooksEnabled: boolean;
  pollLinks?: boolean;
};

type AddressCheck =
  | { state: "idle" }
  | { state: "checking"; url: string }
  | { state: "done"; url: string; allowed: boolean; origin: string; admin: boolean }
  | { state: "failed"; url: string; error: string };

// Shown with a new connection that can play one campaign: a receiver file
// filled in for the player's character there (src/lib/agents/receiver-config),
// so a Codex player agent wakes on its turn after two commands
// (docs/player-webhooks.md). The token stays in the box above; the
// receiver's --setup asks for it once and keeps it in the OS's store.
export function PlayerReceiverSetup({ receiver, mcpUrl }: { receiver: ReceiverInfo; mcpUrl: string }) {
  const { t } = useI18n();
  const [address, setAddress] = useState("");
  const [port, setPort] = useState(String(RECEIVER_PORT));
  const [check, setCheck] = useState<AddressCheck>({ state: "idle" });
  const asked = useRef("");

  if (!receiver.character) {
    return (
      <p className="text-xs text-stone-400">
        {t("settings.recv.noChar")}
      </p>
    );
  }
  const character = receiver.character;

  let config: ReceiverConfig | null = null;
  let configError = "";
  if (address.trim()) {
    try {
      config = receiverConfig({
        mcpUrl,
        campaignId: receiver.campaignId,
        characterId: character.id,
        characterName: character.name,
        receiverUrl: address,
        port: Number(port),
      });
    } catch (error) {
      configError = error instanceof Error ? error.message : t("settings.recv.fallback");
    }
  }
  const fileName = receiverFileName(character.name, character.id);
  const commands = config ? receiverCommands(`PATH/${fileName}`, config) : null;

  // Each check answers for the address it asked about; one that comes back
  // after the address changed, or after a newer check, is dropped.
  async function checkAddress() {
    if (!config) return;
    const url = config.receiverUrl;
    asked.current = url;
    const settle = (next: AddressCheck) => {
      if (asked.current === url) setCheck(next);
    };
    setCheck({ state: "checking", url });
    try {
      const response = await fetch("/api/profile/agents/receiver-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        settle({ state: "failed", url, error: data.error ?? t("settings.recv.err.check") });
        return;
      }
      settle({ state: "done", url, allowed: Boolean(data.allowed), origin: String(data.origin ?? ""), admin: Boolean(data.admin) });
    } catch {
      settle({ state: "failed", url, error: t("settings.recv.err.net") });
    }
  }
  const shown: AddressCheck = check.state !== "idle" && check.url === config?.receiverUrl ? check : { state: "idle" };
  const httpsServer = mcpUrl.startsWith("https://");

  return (
    <div className="space-y-3 rounded-xl border border-stone-800 p-3">
      <div>
        <p className="text-sm text-stone-200">{t("settings.recv.title", { name: character.name })}</p>
        <p className="text-xs text-stone-500">
          {t("settings.recv.intro", { name: character.name })}
        </p>
      </div>
      {httpsServer ? null : (
        <p className="flex items-start gap-2 text-xs text-amber-200">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {t("settings.recv.nohttps", { url: mcpUrl.replace(/\/api\/mcp$/, "") })}
        </p>
      )}
      {receiver.webhooksEnabled ? null : (
        <p className="flex items-start gap-2 text-xs text-amber-200">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {t("settings.recv.noallow", { poll: receiver.pollLinks ? t("settings.recv.noallow.poll") : "" })}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-400">{t("settings.recv.addr")}</span>
          <input
            className={ui.input}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setCheck({ state: "idle" });
            }}
            onBlur={() => void checkAddress()}
            placeholder="https://my-pc.example.ts.net:8443"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-400">{t("settings.recv.port")}</span>
          <input
            className={ui.input}
            inputMode="numeric"
            value={port}
            onChange={(event) => setPort(event.target.value.replace(/[^0-9]/g, ""))}
          />
        </label>
      </div>
      <p className="text-[11px] text-stone-500">
        {t("settings.recv.multi")}
      </p>
      {configError ? (
        <p role="alert" className="text-xs text-red-400">
          {configError}
        </p>
      ) : null}
      {shown.state === "checking" ? (
        <p className="flex items-center gap-2 text-xs text-stone-400">
          <Loader2 className="size-3.5 animate-spin" /> {t("settings.recv.checking")}
        </p>
      ) : shown.state === "failed" ? (
        <p className="text-xs text-red-400">{shown.error}</p>
      ) : shown.state === "done" ? (
        shown.allowed ? (
          <p className="flex items-center gap-2 text-xs text-emerald-300">
            <Check className="size-3.5" /> {t("settings.recv.ok", { origin: shown.origin })}
          </p>
        ) : (
          <p className="flex items-start gap-2 text-xs text-amber-200">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {t("settings.recv.na.head", { origin: shown.origin })}{" "}
              {shown.admin ? (
                <Link className="underline" href="/admin?section=admin-player-agents">
                  {t("settings.recv.na.link")}
                </Link>
              ) : (
                t("settings.recv.na.ask")
              )}
              {t("settings.recv.na.tail")}
            </span>
          </p>
        )
      ) : null}
      {config && commands ? (
        <ol className="list-decimal space-y-2 pl-5 text-xs text-stone-300">
          <li className="space-y-1">
            <button
              type="button"
              className={ui.btnSmall}
              onClick={() => downloadBlob(fileName, new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: "application/json" }))}
            >
              <Download className="size-3.5" /> {t("settings.recv.download", { file: fileName })}
            </button>
            <span className="block text-stone-500">
              {t("settings.recv.keep")}
            </span>
          </li>
          <li className="space-y-1">
            <span>{t("settings.recv.step.setup")}</span>
            <CopyLine text={commands.setup} label={t("settings.recv.step.setup.label")} />
          </li>
          <li className="space-y-1">
            <span>{t("settings.recv.step.listen")}</span>
            <CopyLine text={commands.listen} label={t("settings.recv.step.listen.label")} />
          </li>
          {commands.tunnel ? (
            <li className="space-y-1">
              <span>{t("settings.recv.step.tunnel")}</span>
              <CopyLine text={commands.tunnel} label={t("settings.recv.step.tunnel.label")} />
            </li>
          ) : (
            <li>{t("settings.recv.step.own", { port: config.port })}</li>
          )}
        </ol>
      ) : null}
    </div>
  );
}
