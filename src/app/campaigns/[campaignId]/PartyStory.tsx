"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import type { PartyState } from "@/lib/dm/party-logic";
import { PARTY_BACKSTORY_MAX } from "@/lib/dm/party-story";
import { offersStoryModel, useCapabilities } from "@/lib/use-capabilities";
import { ui } from "@/lib/ui";

const PARTY_BACKSTORY_API_ERRORS = {
  WORKSHOP_NO_PARTY: "campaign.session.party.backstory.error.workshop",
  INVALID_REQUEST: "campaign.session.party.backstory.error.invalid",
  NOT_ALLOWED: "campaign.session.party.backstory.error.permission",
  TOO_LONG: "campaign.session.party.backstory.error.tooLong",
  NO_CHARACTERS: "campaign.session.party.backstory.error.noCharacters",
} as const;

function partyStoryApiError(code: string, data: Record<string, unknown>, t: ReturnType<typeof useI18n>["t"]): string {
  switch (code) {
    case "WORKSHOP_NO_PARTY": return t(PARTY_BACKSTORY_API_ERRORS.WORKSHOP_NO_PARTY);
    case "INVALID_REQUEST": return t(PARTY_BACKSTORY_API_ERRORS.INVALID_REQUEST);
    case "NOT_ALLOWED": return t(PARTY_BACKSTORY_API_ERRORS.NOT_ALLOWED);
    case "TOO_LONG": return t(PARTY_BACKSTORY_API_ERRORS.TOO_LONG, { max: PARTY_BACKSTORY_MAX });
    case "NO_CHARACTERS": return t(PARTY_BACKSTORY_API_ERRORS.NO_CHARACTERS);
    default: return typeof data.error === "string" ? data.error : t("campaign.session.party.backstory.error.save");
  }
}
// Why this party is together (src/lib/dm/party-story.ts), in the lobby and
// on the table's Party tab. The backstory is optional, and an empty card asks
// for nothing: it says what the box is for and leaves it blank.
//
// It is the players': the lead, a DM seat and anyone with a character here
// may rewrite it, the latest save wins, and the card says who saved last. A save that lands
// while someone is mid-edit does not wipe their text; it tells them, and
// their own save would replace it.
export function PartyStory({
  campaignId,
  party,
  canWrite,
  hasCharacters,
  inPlay = false,
  className,
}: {
  campaignId: string;
  party: Pick<PartyState, "backstory" | "backstoryBy" | "backstoryAt"> | undefined;
  canWrite: boolean;
  // Whether anyone has a character yet: the draft button needs a party.
  hasCharacters: boolean;
  // Past the lobby: the arc is already planned, so the help says what an
  // edit reaches now.
  inPlay?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const saved = party?.backstory ?? "";
  const capabilities = useCapabilities();
  const [text, setText] = useState(saved);
  // The stored text this edit started from. When the server's copy moves
  // and the field still holds the old one, the field follows; when it holds
  // the viewer's own unsaved words, it keeps them and says so.
  const [base, setBase] = useState(saved);
  const [overtaken, setOvertaken] = useState(false);
  if (saved !== base) {
    setBase(saved);
    if (text.trim() === base.trim()) {
      setText(saved);
    } else if (text.trim() !== saved.trim()) {
      setOvertaken(true);
    }
  }
  const [busy, setBusy] = useState<"" | "save" | "draft">("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  // Focus follows the edit: a control that turns disabled under the keyboard
  // drops focus to the page, and a screen reader loses its place. A finished
  // save or draft returns to the backstory box.
  const backstoryRef = useRef<HTMLTextAreaElement>(null);
  // Set beside the state change, read once the render it causes has
  // committed.
  const focusBackstory = useRef(false);
  useEffect(() => {
    if (!focusBackstory.current) {
      return;
    }
    focusBackstory.current = false;
    backstoryRef.current?.focus();
  });

  const dirty = text.trim() !== saved.trim();

  async function post(body: unknown): Promise<Record<string, unknown> | null> {
    const response = await fetch(`/api/campaigns/${campaignId}/party/backstory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      setError(
        typeof data.errorCode === "string"
          ? partyStoryApiError(data.errorCode, data, t)
          : typeof data.error === "string"
            ? data.error
            : t("campaign.session.party.backstory.error.save"),
      );
      return null;
    }
    return data;
  }

  async function save() {
    setBusy("save");
    setError("");
    setNote("");
    try {
      const data = await post({ do: "save", text });
      if (data) {
        setText(text.trim());
        setOvertaken(false);
        setNote(text.trim() ? t("campaign.session.party.backstory.note.saved") : t("campaign.session.party.backstory.note.cleared"));
      }
    } catch {
      setError(t("campaign.session.networkError"));
    } finally {
      setBusy("");
      focusBackstory.current = true;
    }
  }

  async function draft() {
    setBusy("draft");
    setError("");
    setNote("");
    try {
      const data = await post({ do: "draft", current: text });
      if (data && typeof data.text === "string") {
        setText(data.text);
        setNote(t("campaign.session.party.backstory.note.draft"));
      }
    } catch {
      setError(t("campaign.session.networkError"));
    } finally {
      setBusy("");
      focusBackstory.current = true;
    }
  }

  const savedBy = party?.backstoryBy && saved ? party.backstoryBy : "";
  const savedAt = party?.backstoryAt && saved ? new Date(party.backstoryAt) : null;

  return (
    <div className={cn("space-y-3 text-sm", className)} data-party-story>
      <div>
        <span className={ui.sectionEyebrow}>{t("campaign.session.party.backstory.title")}</span>
        {canWrite ? (
          <>
            <textarea
              ref={backstoryRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              maxLength={PARTY_BACKSTORY_MAX}
              aria-label={t("campaign.session.party.backstory.title")}
              placeholder={t("campaign.session.party.backstory.placeholder")}
              className={cn(ui.input, "mt-1")}
            />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-party-backstory-save
                disabled={busy !== "" || !dirty}
                onClick={() => void save()}
                className={cn(ui.btnSmall, "min-h-10")}
              >
                {busy === "save" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {text.trim() || !saved ? t("campaign.session.party.backstory.save") : t("campaign.session.party.backstory.clear")}
              </button>
              {hasCharacters && offersStoryModel(capabilities) ? (
                <button type="button" disabled={busy !== ""} onClick={() => void draft()} className={cn(ui.btnSmall, "min-h-10")}>
                  {busy === "draft" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  {t("campaign.session.party.backstory.draft")}
                </button>
              ) : null}
              <span className="ml-auto text-[11px] text-stone-500">
                {text.length}/{PARTY_BACKSTORY_MAX}
              </span>
            </div>
          </>
        ) : (
          <p className={cn("mt-1 whitespace-pre-line", saved ? "text-stone-300" : "text-xs text-stone-500")}>
            {saved || t("campaign.session.party.backstory.empty")}
          </p>
        )}
        {overtaken ? (
          <p role="status" className="mt-1 text-xs text-amber-300">
            {t("campaign.session.party.backstory.overtaken", { name: party?.backstoryBy || t("campaign.session.party.backstory.someone") })}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-xs text-red-300">
            {error}
          </p>
        ) : null}
        {/* Always rendered, so a screen reader is already listening when a
            save's confirmation is written into it. */}
        <p role="status" data-party-story-status className={cn("text-xs text-emerald-300/80", note && !error ? "mt-1" : "sr-only")}>
          {note && !error ? note : ""}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {savedBy ? (savedAt && !Number.isNaN(savedAt.getTime()) ? t("campaign.session.party.backstory.lastSavedAt", { name: savedBy, date: savedAt.toLocaleDateString(lang) }) : t("campaign.session.party.backstory.lastSaved", { name: savedBy })) + " " : ""}
          {inPlay
            ? t("campaign.session.party.backstory.footer.play")
            : t("campaign.session.party.backstory.footer.lobby")}
          {t("campaign.session.party.backstory.footer.permissions")}
        </p>
      </div>
    </div>
  );
}
