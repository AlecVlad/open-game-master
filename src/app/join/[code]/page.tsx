"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { CampaignCover } from "@/components/CampaignCover";
import AuthForm from "@/app/AuthForm";
import { D20Spinner } from "@/components/ui/D20Spinner";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionHead } from "@/components/ui/SectionHead";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { navigateTo } from "@/lib/navigation";
import { useT } from "@/lib/i18n/provider";

// Invite-link landing: /join/CODE. Logged-in users are joined and forwarded
// to the campaign; everyone else logs in or registers first, with the
// campaign they are joining shown above the form.
//
// The join endpoint only answers once the user has a session, so the
// campaign shown above the form comes from the code-scoped preview route,
// which reveals the table's shape (title, seats, level, cover) and nothing
// a stranger who guessed a code could use (src/lib/join-preview.ts).
type Preview = {
  title: string;
  status: "lobby" | "active" | "ended";
  playerCount: number;
  maxPlayers: number;
  startingLevel: number;
  genre: string;
  cover: { url: string } | null;
  seatOpen: boolean;
};

// The preview sends a stored genre id; display its localized name.
type Translate = ReturnType<typeof useT>;
const GENRE_KEYS = {
  high_fantasy: "createCampaign.identity.genre.high_fantasy.name",
  dark_fantasy: "createCampaign.identity.genre.dark_fantasy.name",
  mystery: "createCampaign.identity.genre.mystery.name",
  horror: "createCampaign.identity.genre.horror.name",
  cyberpunk: "createCampaign.identity.genre.cyberpunk.name",
  steampunk: "createCampaign.identity.genre.steampunk.name",
  post_apocalyptic: "createCampaign.identity.genre.post_apocalyptic.name",
  custom: "createCampaign.identity.genre.custom.name",
} as const;
const JOIN_ERROR_KEYS = {
  "Could not join the campaign.": "invite.error.joinFallback",
  "No campaign with that invite code.": "invite.error.invalidCode",
  "Invalid invite code.": "invite.error.invalidFormat",
  "That campaign has ended.": "invite.error.ended",
  "That campaign has already started.": "invite.error.started",
  "That campaign is full.": "invite.error.full",
  "Failed to join campaign.": "invite.error.joinFailed",
  "Set a new password to continue.": "invite.error.passwordChange",
} as const;
function genreLabel(genre: string, t: Translate): string {
  const key = GENRE_KEYS[genre as keyof typeof GENRE_KEYS];
  return key ? t(key) : genre.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function joinErrorMessage(message: string, t: Translate): string {
  const key = JOIN_ERROR_KEYS[message as keyof typeof JOIN_ERROR_KEYS];
  if (key) return t(key);
  const throttle = message.match(/^Too many attempts\. Try again in (\d+)s\.$/);
  if (throttle) return t("invite.error.tooManyAttempts", { seconds: Number(throttle[1]) });
  return message;
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const roomCode = code.toUpperCase();
  const t = useT();
  const [state, setState] = useState<"checking" | "auth" | "joining" | "error">("checking");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/campaigns/join/preview?code=${encodeURIComponent(roomCode)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { preview?: Preview } | null) => {
        if (!cancelled && data?.preview) {
          setPreview(data.preview);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roomCode, t]);

  const join = useCallback(async () => {
    setState("joining");
    try {
      const response = await fetch("/api/campaigns/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: roomCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(joinErrorMessage(data.error || "Could not join the campaign.", t));
        setState("error");
        return;
      }
      navigateTo(`/campaigns/${data.campaign.id}`);
    } catch {
      setError(t("invite.error.server"));
      setState("error");
    }
  }, [roomCode, t]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.user) {
          join();
        } else {
          setState("auth");
        }
      })
      .catch(() => setState("auth"));
  }, [join]);

  return (
    <main className="bg-starfield flex flex-1 items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm animate-fade-up-slow">
        {/* The invitation: the cover as the letterhead, sealed in wax. */}
        <section className={cn(ui.card, "ornate texture-noise invite-letter mb-8 p-3")} aria-label={t("invite.campaignInvite")}>
          <CampaignCover
            cover={preview?.cover ? { id: "", url: preview.cover.url } : null}
            title={preview?.title ?? t("invite.roomName", { code: roomCode })}
            genre={preview?.genre}
            seed={roomCode}
          />
          <div className="px-2 pb-3 pt-4 text-center">
            <p className="eyebrow text-[10px] text-amber-400/80">
              {preview ? t("invite.youAreInvitedTo") : t("invite.youAreInvited")}
            </p>
            <h1 className="gold-title mt-1 text-balance font-display text-2xl tracking-wide">
              {preview?.title ?? t("invite.joinTable")}
            </h1>
            {preview ? (
              <p className="reveal mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-stone-400">
                <span className="inline-flex items-center gap-1">
                  <GameIcon icon={{ kind: "glyph", key: "tab-party" }} size="size-5" />
                  {preview.playerCount}/{preview.maxPlayers} {t("invite.adventurers")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GameIcon icon={{ kind: "glyph", key: "tab-campaigns" }} size="size-5" />
                  {genreLabel(preview.genre, t)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GameIcon icon={{ kind: "glyph", key: "rest-level-up" }} size="size-5" />
                  Lvl {preview.startingLevel}
                </span>
                {preview.seatOpen ? null : <span className="w-full text-amber-300/90">{t("invite.seatClosed")}</span>}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-stone-500">
              {t("invite.roomCode")} <span className="room-chip">{roomCode}</span>
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/ui/wax-seal.webp" alt="" className="invite-seal" />
        </section>

        <div className={cn(ui.card, "ornate texture-noise auth-card shadow-elev-2")}>
          {state === "checking" || state === "joining" ? (
            <div className="reveal flex flex-col items-center gap-3 py-6" role="status">
              <D20Spinner className="size-7 text-amber-300" />
              <p className="font-serif text-sm text-stone-400">
                {state === "joining" ? t("invite.state.takingSeat") : t("invite.state.checkingSession")}
              </p>
            </div>
          ) : state === "error" ? (
            <div className="reveal space-y-4 text-center">
              <p
                role="alert"
                className="motion-shake rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </p>
              <Link href="/" className={ui.btnSecondary}>
                {t("invite.backToOgm")}
              </Link>
            </div>
          ) : (
            <>
              <SectionHead title={t("invite.signInToTakeSeat")} glyph="tab-admin" level="h2" />
              <AuthForm joinCode={roomCode} onAuthed={() => join()} />
              {/* A way out that is not the browser's back button, which an
                  installed app does not have. */}
              <p className="mt-4 text-center">
                <Link href="/" className="text-xs text-stone-500 hover:text-amber-200">
                  {t("invite.notNowBack")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
