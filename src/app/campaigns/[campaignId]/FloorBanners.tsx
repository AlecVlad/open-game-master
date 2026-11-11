"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { SessionBanner, bannerButtonClass } from "@/app/campaigns/[campaignId]/SessionBanner";
import type { Floor } from "@/lib/db/campaigns";
import type { PublicEncounter } from "@/lib/db/encounter-view";
import { extraTurnTag, litOrderRows, orderRowKey } from "@/lib/battlemap/initiative-rows";
import { floorNoticeKey, liveNotice, type HandNotice } from "@/lib/battlemap/hand-table";
import type { CharacterSheet } from "@/lib/schemas/sheet";

// Spotlight, held-responses, and initiative banners above the composer;
// the lead gets the release/skip buttons, the current player gets End turn.
export function FloorBanners({
  campaignId,
  floor,
  spotlighted,
  heldSpotlightNames,
  encounter,
  steersStory,
  meUserId = "",
  onRelease,
}: {
  campaignId: string;
  floor: Floor;
  spotlighted: CharacterSheet[];
  heldSpotlightNames: string[];
  encounter?: PublicEncounter | null;
  steersStory: boolean;
  meUserId?: string;
  onRelease: () => void;
}) {
  const { t } = useI18n();
  const [endingTurn, setEndingTurn] = useState(false);
  // The end-turn route's refusal, in its own words, under the banner, for
  // the turn it answered only (issue 668).
  const [refusalEntry, setRefusalEntry] = useState<HandNotice | null>(null);
  const refusalKey = floorNoticeKey(floor);
  const refusal = liveNotice(refusalEntry, refusalKey);
  const setRefusal = (text: string) => setRefusalEntry(text ? { text, key: refusalKey } : null);
  const myInitiativeTurn =
    floor.mode === "initiative" && meUserId !== "" && floor.userIds.includes(meUserId);

  // Attacks no longer end the turn by themselves (movement and bonus
  // actions stay open), so this is the player's way to say "done".
  async function endTurn() {
    setEndingTurn(true);
    setRefusal("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/encounter/end-turn`, { method: "POST" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setRefusal(data.error ?? t("campaign.session.floor.endTurnFailed"));
      }
    } catch {
      setRefusal(t("campaign.session.floor.tableUnreachable"));
    } finally {
      setEndingTurn(false);
    }
  }

  return (
    <>
      {floor.mode === "initiative" ? (
        <SessionBanner
          glyph="attitude-hostile"
          tone="blood"
          title={<>{t("campaign.session.floor.round", { round: floor.round })}</>}
          actions={
            myInitiativeTurn || steersStory ? (
              <>
                {myInitiativeTurn ? (
                  <button
                    type="button"
                    onClick={endTurn}
                    disabled={endingTurn}
                    className={bannerButtonClass(true)}
                    title={t("campaign.session.floor.endTurnHint")}
                  >
                    {t("campaign.session.floor.endTurn")}
                  </button>
                ) : null}
                {steersStory ? (
                  <button
                    type="button"
                    onClick={onRelease}
                    className={bannerButtonClass()}
                    title={t("campaign.session.floor.skipTurnHint")}
                  >
                    {t("campaign.session.floor.skipTurn")}
                  </button>
                ) : null}
              </>
            ) : null
          }
        >
          <span className="block truncate">
              {encounter?.orderReady && encounter.order.length ? (
                <>
                  {encounter.order.map((entry, index) => {
                    // A player's order leaves hidden combatants out, so the
                    // pointer's index can point past them; the engine names
                    // who it rests on. A thief's second round-1 turn is a
                    // second row with the same id (Thief's Reflexes).
                    const current = litOrderRows(encounter.order, encounter.turnIndex, encounter.acting, encounter.enemiesUp).includes(index);
                    return (
                      <span
                        key={orderRowKey(entry, index)}
                        title={extraTurnTag(entry)?.title}
                        className={cn(
                          "transition-opacity duration-200",
                          current ? "font-semibold" : "opacity-60",
                        )}
                      >
                        {index > 0 ? " > " : ""}
                        {entry.name}
                        {entry.reflex ? <sup className="motion-pop ml-0.5 text-[9px] text-amber-300">{extraTurnTag(entry)?.short}</sup> : null}
                      </span>
                    );
                  })}
                </>
              ) : (
                <>{t("campaign.session.floor.playerTurn", { name: floor.currentName })}</>
              )}
          </span>
          {refusal ? (
            <span key={refusal} role="alert" className="mt-0.5 block animate-fade-up text-xs text-amber-200">
              {refusal}
            </span>
          ) : null}
        </SessionBanner>
      ) : null}
      {floor.mode === "spotlight" ? (
        <SessionBanner
          glyph="sense-truesight"
          title={floor.respondedUserIds.length ? t("campaign.session.floor.spotlightWaiting") : t("campaign.session.floor.spotlight")}
          lead={
            spotlighted.some((sheet) => sheet.portrait) ? (
              <span className="flex shrink-0 -space-x-2">
                {spotlighted
                  .filter((sheet) => sheet.portrait)
                  .slice(0, 4)
                  .map((sheet) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={sheet.id}
                      src={sheet.portrait!.url}
                      alt=""
                      className="size-8 rounded-full border border-amber-500/60 object-cover shadow-glow-gold"
                    />
                  ))}
              </span>
            ) : undefined
          }
          actions={
            steersStory ? (
              <button type="button" onClick={onRelease} className={bannerButtonClass(true)}>
                {t("campaign.session.floor.release")}
              </button>
            ) : null
          }
        >
            <span>
              {spotlighted.length
                ? spotlighted.map((sheet, index) => {
                    const responded = floor.respondedUserIds.includes(sheet.userId);
                    return (
                      <span
                        key={sheet.id}
                        className={responded ? "opacity-50" : undefined}
                      >
                        {index > 0 ? ", " : ""}
                        {sheet.name}
                        {responded ? <Check className="inline size-3 align-baseline" /> : null}
                      </span>
                    );
                  })
                : t("campaign.session.floor.someone")}
              {floor.prompt ? (
                <span className="opacity-80"> · {floor.prompt}</span>
              ) : null}
            </span>
        </SessionBanner>
      ) : null}
      {floor.mode === "hold" && floor.next.mode === "initiative" && encounter?.enemyTurns ? (
        // A fight held for the enemies' turns (src/lib/dm/enemies-due.ts).
        // Reactions still go through. Held responses wrap the fight's floor
        // too, and keep their own banner below.
        <SessionBanner
          glyph="tab-battle"
          title={t("campaign.session.floor.enemyTurns")}
          actions={
            steersStory ? (
              <button type="button" onClick={onRelease} className={bannerButtonClass(true)}>
                {t("campaign.session.floor.handOnTurn")}
              </button>
            ) : null
          }
        >
          <span>
            {t("campaign.session.floor.enemiesActBefore", { name: floor.next.currentName || t("campaign.session.floor.nextTurn") })}
          </span>
        </SessionBanner>
      ) : floor.mode === "hold" ? (
        <SessionBanner
          glyph="rest-inspiration"
          title={t("campaign.session.floor.responsesHeld")}
          actions={
            steersStory ? (
              <button type="button" onClick={onRelease} className={bannerButtonClass(true)}>
                {t("campaign.session.floor.allowResponses")}
              </button>
            ) : null
          }
        >
          <span>
            {t("campaign.session.floor.talkItOver")}
            {heldSpotlightNames.length ? (
              <span className="opacity-80">
                {" "}
                {t("campaign.session.floor.nextSpotlight", { names: heldSpotlightNames.join(", ") })}
              </span>
            ) : null}
          </span>
        </SessionBanner>
      ) : null}
    </>
  );
}
