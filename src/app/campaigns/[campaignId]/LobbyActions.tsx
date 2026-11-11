"use client";

import Link from "next/link";
import { HeroRoutes } from "@/app/campaigns/[campaignId]/HeroRoutes";
import { Check, Loader2, Pencil, Play, Trash2, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import type { CampaignMember } from "@/lib/campaign-types";
import type { LobbyNext } from "@/lib/dm/lobby-next";
import { GameIcon } from "@/components/ui/GameIcon";
import type { CharacterSheet } from "@/lib/schemas/sheet";
import { useI18n } from "@/lib/i18n/provider";

// Edit, switch or remove your character. Shown under the ready button once
// a character exists, in every flow that has one.
function CharacterActions({
  campaignId,
  sheet,
  busy,
  onRemove,
}: {
  campaignId: string;
  sheet: CharacterSheet;
  busy: boolean;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  // Edit and Switch sit together; Remove stands apart at the far end, so
  // a slip off Switch cannot land on it. Each is 44 px tall to the finger.
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs">
      <span className="text-stone-500">{sheet.name}:</span>
      <Link href={`/campaigns/${campaignId}/character?mode=edit`} className={cn(ui.btnSmall, "min-h-11")}>
        <Pencil className="size-3" /> {t("campaign.lobby.character.edit")}
      </Link>
      <Link href={`/campaigns/${campaignId}/character?mode=replace`} className={cn(ui.btnSmall, "min-h-11")}>
        <UserRound className="size-3" /> {t("campaign.lobby.character.switch")}
      </Link>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className={cn(ui.btnSmall, "ml-6 min-h-11 text-red-300")}
      >
        <Trash2 className="size-3" /> {t("campaign.lobby.character.remove")}
      </button>
    </div>
  );
}

// Opening the adventure. Pulled out of the player branch because the DM needs
// it just as much: a DM who owned the table used to see a Ready button and
// nothing else, so a human-run game could never be started from the seat that
// was running it. `canStart` is the owner or the person in the DM seat (the
// PATCH route allows the same two), and `blocker` is the server's own rule
// (lobbyBlocker in src/lib/dm/viewer.ts), so this button is never offered
// when the route would refuse it, and the reason shown is the reason the
// server would give.
function StartBlock({
  canStart,
  busy,
  blocker,
  onStart,
}: {
  canStart: boolean;
  busy: boolean;
  blocker: string;
  onStart: () => void;
}) {
  const { t } = useI18n();
  if (!canStart) {
    return (
      <p className="text-center text-sm text-stone-500">
        {t("campaign.lobby.start.ownerGm")}
      </p>
    );
  }
  return (
    <>
      {/* The lobby's one hero action: wide, foiled while it can be pressed. */}
      <button
        type="button"
        onClick={onStart}
        disabled={busy || Boolean(blocker)}
        className={cn(ui.btnPrimary, "h-14 w-full text-[15px]", !busy && !blocker && "motion-foil begin-glow")}
      >
        <Play className="size-5" /> {t("campaign.lobby.start.begin")}
      </button>
      {blocker ? <p className="reveal text-center text-sm text-stone-500">{blocker}</p> : null}
    </>
  );
}

// The block at the foot of the lobby that changes with the seat. The DM
// readies up without a character; a solo player readies and begins in one
// stroke; everyone else creates a character and readies up. Below all of
// them, for every seat but the solo player, the owner's Begin button: the DM
// is usually the owner of a game they run, so that button has to reach the DM
// seat too. Delete is the owner's alone and sits last, quiet, because it is
// irreversible.
export function LobbyActions({
  next,
  campaign,
  myMember,
  mySheet,
  isDm,
  isSolo,
  isOwner,
  canStart,
  busy,
  error,
  startBlocker,
  onToggleReady,
  onStart,
  onBeginSolo,
  onRemoveCharacter,
  onDelete,
}: {
  // What happens next for this viewer (src/lib/dm/lobby-next.ts).
  next?: LobbyNext;
  campaign: { id: string; gameSettings?: { multiCharacter?: string } };
  myMember: CampaignMember | undefined;
  mySheet: CharacterSheet | undefined;
  isDm: boolean;
  isSolo: boolean;
  isOwner: boolean;
  // Owner or the person in the DM seat: who may press Begin.
  canStart: boolean;
  busy: boolean;
  error: string;
  startBlocker: string;
  onToggleReady: () => void;
  onStart: () => void;
  onBeginSolo: () => void;
  onRemoveCharacter: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const nextText = (() => {
    if (!next) return "";
    const fixed: Record<string, string> = {
      "Your hero is ready. Begin whenever you like.": t("campaign.lobby.next.soloReady"),
      "Next: choose your hero, then begin.": t("campaign.lobby.next.soloChoose"),
      "Next: choose your hero. A ready-made one has you playing in a minute.": t("campaign.lobby.next.choose"),
      "Next: ready up when the table is set. The adventure is yours to open.": t("campaign.lobby.next.dmReady"),
      "Next: ready up when you are set.": t("campaign.lobby.next.ready"),
      "Everyone is ready. Begin the adventure.": t("campaign.lobby.next.begin"),
      "Everyone is ready. The owner or the GM opens the adventure.": t("campaign.lobby.next.waitForHost"),
      "The table is empty.": t("campaign.lobby.blocker.empty"),
      "Waiting for a player to join.": t("campaign.lobby.blocker.player"),
      "Every player needs a character before the adventure starts.": t("campaign.lobby.blocker.character"),
      "Waiting for everyone to ready up.": t("campaign.lobby.blocker.ready"),
    };
    if (fixed[next.text]) return fixed[next.text];
    const waitingForHero = /^Waiting for (.+) to choose a hero\.$/.exec(next.text);
    if (waitingForHero) {
      const names = waitingForHero[1].replace(/ and /g, " и ").replace(/(\d+) more/g, "ещё $1");
      return t("campaign.lobby.next.waitingForHero", { names });
    }
    const waitingToReady = /^Waiting for (.+) to ready up\.$/.exec(next.text);
    if (waitingToReady) {
      const names = waitingToReady[1].replace(/ and /g, " и ").replace(/(\d+) more/g, "ещё $1");
      return t("campaign.lobby.next.waitingToReady", { names });
    }
    return next.text;
  })();
  const blockerText = ({
    "The table is empty.": t("campaign.lobby.blocker.empty"),
    "Waiting for a player to join.": t("campaign.lobby.blocker.player"),
    "Every player needs a character before the adventure starts.": t("campaign.lobby.blocker.character"),
    "Waiting for everyone to ready up.": t("campaign.lobby.blocker.ready"),
  } as Record<string, string>)[startBlocker] ?? startBlocker;
  return (
    <section className="space-y-3">
      {next ? (
        <p data-lobby-next={next.tone} aria-live="polite" className="lobby-next">
          <GameIcon
            icon={{ kind: "glyph", key: next.tone === "go" ? "quest-done" : next.tone === "wait" ? "pace-slow" : "quest-active" }}
            size="size-6"
            className="shrink-0"
          />
          <span key={next.text} className="live-in min-w-0">{nextText}</span>
        </p>
      ) : null}
      {isDm ? (
        <div className={cn(ui.card, "ornate flex flex-col items-center gap-2 px-6 py-6 text-center")}>
          <p className="font-display text-lg tracking-wide text-amber-50">
            {t("campaign.lobby.dm.running")}
          </p>
          <p className="max-w-sm text-balance text-sm text-stone-400">
            {t("campaign.lobby.dm.description")}
          </p>
          <button type="button" onClick={onToggleReady} className={cn(ui.btnPrimary, "mt-1 px-6")}>
            {myMember?.ready ? t("campaign.lobby.notReady") : t("campaign.lobby.ready")}
          </button>
        </div>
      ) : isSolo ? (
        !mySheet ? (
          <div className={cn(ui.card, "ornate flex flex-col items-center gap-3 px-6 py-8 text-center")}>
            <p className="max-w-sm text-balance font-display text-xl tracking-wide text-amber-50">
              {t("campaign.lobby.solo.needsHero")}
            </p>
            <HeroRoutes campaignId={campaign.id} className="w-full" />
          </div>
        ) : (
          <>
            <CharacterActions
              campaignId={campaign.id}
              sheet={mySheet}
              busy={busy}
              onRemove={onRemoveCharacter}
            />
            {(campaign.gameSettings?.multiCharacter ?? "off") !== "off" ? (
              <Link href={`/campaigns/${campaign.id}/character`} className="block text-center text-xs text-amber-300/80 hover:text-amber-200">
                {t("campaign.lobby.character.addAnother")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onBeginSolo}
              disabled={busy}
              className={cn(ui.btnPrimary, "w-full py-2.5")}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {t("campaign.lobby.start.begin")}
            </button>
          </>
        )
      ) : !mySheet ? (
        <div className={cn(ui.card, "ornate space-y-3 px-4 py-4")}>
          <p className="text-center font-display text-lg tracking-wide text-amber-50">{t("campaign.lobby.chooseHero")}</p>
          <HeroRoutes campaignId={campaign.id} />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggleReady}
            disabled={busy}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-medium transition-colors disabled:opacity-60",
              "motion-press font-display uppercase tracking-[0.12em]",
              myMember?.ready
                ? "border border-amber-500/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
                : "border border-amber-400/60 bg-gradient-to-b from-amber-100 via-amber-200 to-amber-400 text-amber-950 shadow-glow-gold hover:brightness-105",
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {myMember?.ready ? t("campaign.lobby.notReady") : t("campaign.lobby.readyUp")}
          </button>
          <CharacterActions
            campaignId={campaign.id}
            sheet={mySheet}
            busy={busy}
            onRemove={onRemoveCharacter}
          />
          {(campaign.gameSettings?.multiCharacter ?? "off") !== "off" ? (
            <Link href={`/campaigns/${campaign.id}/character`} className="block text-center text-xs text-amber-300/80 hover:text-amber-200">
              {t("campaign.lobby.character.addAnother")}
            </Link>
          ) : null}
          <p className="text-center text-xs text-stone-600">
            {t("campaign.lobby.character.changeClearsReady")}
          </p>
        </>
      )}

      {/* Every seat but the solo player, whose single button readies up and
          begins in one stroke. A table with a person in the DM seat is never
          solo, however few players it has (Lobby.tsx), so the DM always lands
          here. */}
      {isSolo ? null : (
        <StartBlock canStart={canStart} busy={busy} blocker={blockerText} onStart={onStart} />
      )}
      {error ? <p className="motion-shake text-center text-sm text-red-400">{error}</p> : null}

      {isOwner ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="mx-auto flex items-center gap-1.5 pt-2 text-xs text-stone-600 transition-colors hover:text-red-400 disabled:opacity-60"
        >
          <Trash2 className="size-3.5" /> {t("campaign.lobby.deleteCampaign")}
        </button>
      ) : null}
    </section>
  );
}
