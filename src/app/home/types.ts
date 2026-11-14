import type { CampaignSummary, HomeGlance } from "@/lib/campaign-types";
import { sessionWhenLocal } from "@/lib/dm/session-hold-logic";
import type { MessageKey } from "@/lib/i18n/messages/index";

// The translator of the calling component (useI18n()); without it every line
// stays English, as the server and scripts/test-home-glance.mjs read it.
export type HomeI18n = {
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  tp: (key: string, count: number, params?: Record<string, string | number>) => string;
};

const say = (i18n: HomeI18n | undefined, key: MessageKey, english: string, params?: Record<string, string | number>) =>
  i18n ? i18n.t(key, params) : english;

// What GET /api/campaigns hands the home screen: the summary row plus the
// name of the character this user plays there, or null when they have no
// sheet yet (a fresh lobby) or hold the DM seat instead, and the title
// screen's glance at the table (last narration, chapter, scene, faces).
// Local to the home screen because no other page lists campaigns with a
// "playing as".
export type HomeCampaign = CampaignSummary & { playingAs: string | null; glance?: HomeGlance };

// Copying prep out of a campaign follows story authority, exactly as
// /api/campaigns/[id]/clone demands: the seated DM if there is one, the party
// lead otherwise. Mirrored here only to decide whether to draw the button;
// the server decides whether it works.
export function steersStory(campaign: CampaignSummary, userId: string): boolean {
  return campaign.dmUserId
    ? campaign.dmUserId === userId || campaign.assistantDmUserId === userId
    : campaign.leadUserId === userId;
}

// Whether this user narrates the table rather than playing at it, which is
// why the hero has no "playing as" for them.
export function holdsDmSeat(campaign: CampaignSummary, userId: string): boolean {
  return campaign.dmUserId === userId || campaign.assistantDmUserId === userId;
}

// The table to put on the title screen: the most recently touched campaign
// that is still going. When every table has ended, the newest of those, so
// an account with only finished tales still opens on a painting rather than
// an empty stage; the title block says it is finished.
export function pickContinue(campaigns: HomeCampaign[]): HomeCampaign | null {
  let best: HomeCampaign | null = null;
  let lastEnded: HomeCampaign | null = null;
  for (const campaign of campaigns) {
    if (campaign.status === "ended") {
      if (!lastEnded || campaign.updatedAt > lastEnded.updatedAt) {
        lastEnded = campaign;
      }
      continue;
    }
    if (!best || campaign.updatedAt > best.updatedAt) {
      best = campaign;
    }
  }
  return best ?? lastEnded;
}

// "2 days ago" for the recap and the save slots. Coarse on purpose: a title
// screen is not a log.
export function agoLabel(iso: string | null | undefined, now = Date.now(), i18n?: HomeI18n): string {
  if (!iso) {
    return "";
  }
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return "";
  }
  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  const many = (key: string, count: number, english: string) => (i18n ? i18n.tp(key, count, { count }) : english);
  if (minutes < 2) return say(i18n, "home.ago.now", "just now");
  if (minutes < 60) return many("home.ago.minutes", minutes, `${minutes} minutes ago`);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? say(i18n, "home.ago.hour", "an hour ago") : many("home.ago.hours", hours, `${hours} hours ago`);
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? say(i18n, "home.ago.yesterday", "yesterday") : many("home.ago.days", days, `${days} days ago`);
  const weeks = Math.round(days / 7);
  if (weeks < 5) return weeks === 1 ? say(i18n, "home.ago.week", "a week ago") : many("home.ago.weeks", weeks, `${weeks} weeks ago`);
  const months = Math.round(days / 30);
  if (months < 12) return months <= 1 ? say(i18n, "home.ago.month", "a month ago") : many("home.ago.months", months, `${months} months ago`);
  const years = Math.round(days / 365);
  return years <= 1 ? say(i18n, "home.ago.year", "a year ago") : many("home.ago.years", years, `${years} years ago`);
}

// Roman numerals for chapter headings ("Chapter III"). Chapters are small
// integers; anything beyond the table's reach falls back to digits.
export function romanNumeral(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 3999) {
    return String(value);
  }
  const table: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let rest = value;
  let out = "";
  for (const [num, glyph] of table) {
    while (rest >= num) {
      out += glyph;
      rest -= num;
    }
  }
  return out;
}

// One line under a table's name: who you are there and how full it is.
export function seatLine(campaign: HomeCampaign, userId: string, i18n?: HomeI18n): string {
  const counts = { count: campaign.playerCount, max: campaign.maxPlayers };
  const seats = say(i18n, "home.seat.seats", `${campaign.playerCount} of ${campaign.maxPlayers} seats`, counts);
  if (campaign.status === "lobby") {
    return say(i18n, "home.seat.lobby", `Lobby · ${campaign.playerCount} of ${campaign.maxPlayers} ready`, counts);
  }
  const party = campaign.maxPlayers === 1 ? say(i18n, "home.seat.solo", "solo") : seats;
  if (campaign.playingAs) {
    return say(i18n, "home.seat.playing", `Playing as ${campaign.playingAs} · ${party}`, { name: campaign.playingAs, party });
  }
  if (holdsDmSeat(campaign, userId)) {
    return say(i18n, "home.seat.running", `Running the table · ${party}`, { party });
  }
  return say(i18n, "home.seat.none", `No character yet · ${party}`, { party });
}

// The chapter line: "Act II, Chapter III · The Drowned Lantern" (the act
// only once the arc has one), the act's name when the chapter has none yet,
// the scene after that, or the campaign's own description.
export function chapterLine(campaign: HomeCampaign, i18n?: HomeI18n): string {
  const chapter = campaign.glance?.chapter;
  const scene = (campaign as HomeCampaign & { scene?: string }).scene?.trim() || "";
  if (chapter) {
    const act = chapter.act ? say(i18n, "home.chap.act", `Act ${romanNumeral(chapter.act)}, `, { n: romanNumeral(chapter.act) }) : "";
    const head = `${act}${say(i18n, "home.chap.chapter", `Chapter ${romanNumeral(chapter.index)}`, { n: romanNumeral(chapter.index) })}`;
    const title = chapter.title.trim();
    if (title) return `${head} · ${title}`;
    const actTitle = chapter.actTitle?.trim() || "";
    if (actTitle) return `${head} · ${actTitle}`;
    if (scene) return `${head} · ${scene}`;
    return head;
  }
  if (scene) return scene;
  return campaign.description.trim();
}

// The slot's badge: where the table stands. A campaign in play between
// sessions (issue 586) says so, rather than "active" all week.
export function statusLabel(campaign: HomeCampaign, i18n?: HomeI18n): string {
  if (campaign.status === "active" && campaign.glance?.session?.between) {
    return say(i18n, "home.status.between", "between sessions");
  }
  if (i18n && (campaign.status === "lobby" || campaign.status === "active" || campaign.status === "ended")) {
    return i18n.t(`home.status.${campaign.status}` as MessageKey);
  }
  return campaign.status;
}

// When the table meets next, in the reader's own time: "Next session Fri,
// Nov 6, 7:00 PM". Empty when nothing is set, or from an older host.
export function nextSessionLine(campaign: HomeCampaign, i18n?: HomeI18n): string {
  const next = campaign.status === "ended" ? null : campaign.glance?.session?.next;
  const when = next ? sessionWhenLocal(next.startsAt) : "";
  return when ? say(i18n, "home.next", `Next session ${when}`, { when }) : "";
}

// The save slot's one line: what state the table is in, in a few words.
export function slotLine(campaign: HomeCampaign, userId: string, i18n?: HomeI18n): string {
  if (campaign.status === "lobby") {
    return say(i18n, "home.slot.ready", `${campaign.playerCount} of ${campaign.maxPlayers} ready`, { count: campaign.playerCount, max: campaign.maxPlayers });
  }
  if (campaign.status === "ended") {
    const ago = agoLabel(campaign.updatedAt, Date.now(), i18n);
    return ago ? say(i18n, "home.slot.finishedAgo", `Finished ${ago}`, { ago }) : say(i18n, "home.slot.finished", "Finished");
  }
  const next = nextSessionLine(campaign, i18n);
  if (next) {
    return next;
  }
  if (campaign.glance?.session?.between) {
    return say(i18n, "home.slot.between", "Between sessions");
  }
  if (holdsDmSeat(campaign, userId)) {
    return say(i18n, "home.slot.running", "Running the table");
  }
  const ago = agoLabel(campaign.glance?.recapAt ?? campaign.updatedAt, Date.now(), i18n);
  return ago ? say(i18n, "home.slot.lastPlayed", `Last played ${ago}`, { ago }) : say(i18n, "home.slot.inPlay", "In play");
}
