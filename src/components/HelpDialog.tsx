"use client";

import Link from "next/link";
import {
  BookOpen,
  Brain,
  Bug,
  Compass,
  Footprints,
  Crown,
  Dices,
  DoorOpen,
  Gavel,
  MessageSquareText,
  Mic,
  Music,
  PanelRight,
  Puzzle,
  RefreshCw,
  Swords,
  Volume2,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { GameIcon } from "@/components/ui/GameIcon";
import { HelpContents, ModeRow, Section } from "@/components/HelpParts";
import { ui } from "@/lib/ui";
import { useT } from "@/lib/i18n/provider";

// HowToPlayDialog and WorkshopHelpDialog import these from here.
export { ModeRow, Section };

// One walkthrough of the whole app: menus, side-panel tabs, composer modes,
// asking the DM, fixing a bad narration, what the DM remembers, dice, voice,
// lead powers and world packs. Opened from the home account menu and the
// in-session header.
export function HelpDialog({
  open,
  onOpenChange,
  tours,
  section,
  report,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // A section to open at, by its title, for a control that has one.
  section?: string;
  // The table offers its guided tours from here; each runs once on its own
  // and can be replayed at will. Other pages pass nothing.
  tours?: { label: string; detail: string; onStart: () => void }[];
  // The table's "Report a problem" (issue #459): Help is where someone
  // looks when something broke. The server's admin saves a report file
  // from here (onSave) or Admin > Server log; everyone else is told to ask
  // whoever runs the server, who can check its setup first. Other pages
  // pass nothing.
  report?: { onSave?: () => void };
}) {
  const t = useT();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("help.dialog.title")}
      icon={<GameIcon icon={{ kind: "glyph", key: "tab-story" }} size="size-7" />}
      width="w-[min(94vw,44rem)]"
    >
      <HelpContents withTours={Boolean(tours?.length)} withReport={Boolean(report)} initialSection={section} />
      {tours && tours.length ? (
        <Section icon={Footprints} title="Guided tours">
          <p>{t("help.guidedTours.intro")}</p>
          <div className="flex flex-wrap gap-2">
            {tours.map((tour) => (
              <button
                key={tour.label}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  tour.onStart();
                }}
                className={ui.btnSmall}
                title={tour.detail}
              >
                <Footprints className="size-4" /> {tour.label}
              </button>
            ))}
          </div>
        </Section>
      ) : null}
      <Section icon={Compass} title="Getting started">
        <p>{t("help.gettingStarted.routes")}</p>
        <p>{t("help.gettingStarted.heroes")}</p>
        <p>{t("help.gettingStarted.plugins")}</p>
      </Section>

      <Section icon={DoorOpen} title="The lobby">
        <p>{t("help.lobby.intro")}</p>
      </Section>

      <Section icon={MessageSquareText} title="Talking to the GM">
        <p>{t("help.talking.intro")}</p>
        <ModeRow label="Do">{t("help.mode.do.text")}</ModeRow>
        <ModeRow label="Say">{t("help.mode.say.text")}</ModeRow>
        <ModeRow label="OOC">{t("help.mode.ooc.text")}</ModeRow>
        <ModeRow label="Direct" lead>{t("help.mode.direct.text")}</ModeRow>
        <p>{t("help.talking.ask")}</p>
        <p>{t("help.talking.askNoTurn")}</p>
        <p>{t("help.talking.spotlight")}</p>
      </Section>

      <Section icon={Swords} title="Your hand in a fight">
        <p>{t("help.fight.hand")}</p>
        <p>{t("help.fight.use")}</p>
        <p>{t("help.fight.typing")}</p>
      </Section>

      <Section icon={RefreshCw} title="When the GM gets it wrong">
        <p>{t("help.gmWrong.intro")}</p>
        <ul className="list-none space-y-1.5">
          <li>{t("help.gmWrong.reroll")}</li>
          <li>{t("help.gmWrong.takes")}</li>
          <li>{t("help.gmWrong.continue")}</li>
          <li>{t("help.gmWrong.edit")}</li>
          <li>{t("help.gmWrong.lore")}</li>
        </ul>
        <p>{t("help.gmWrong.retry")}</p>
        <p>{t("help.gmWrong.feedback")}</p>
      </Section>

      {report ? (
        <Section icon={Bug} title="Report a problem">
          {report.onSave ? (
            <>
              <p>{t("help.report.admin")}</p>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  report.onSave?.();
                }}
                className={ui.btnSmall}
                data-report-problem
              >
                <Bug className="size-4" /> {t("help.report.button")}
              </button>
            </>
          ) : (
            <p data-report-ask-host>{t("help.report.host")}</p>
          )}
        </Section>
      ) : null}

      <Section icon={Brain} title="What the GM remembers">
        <p>{t("help.memory.summary")}</p>
        <ul className="list-none space-y-1.5">
          <li>{t("help.memory.pin")}</li>
          <li>{t("help.memory.facts")}</li>
          <li>{t("help.memory.lore")}</li>
          <li>{t("help.memory.bonds")}</li>
        </ul>
        <p>{t("help.memory.archive")}</p>
      </Section>

      <Section icon={PanelRight} title="The side panel">
        <ul className="list-none space-y-1.5">
          <li>{t("help.sidePanel.party")}</li>
          <li>{t("help.sidePanel.battle")}</li>
          <li>{t("help.sidePanel.map")}</li>
          <li>{t("help.sidePanel.story")}</li>
          <li>{t("help.sidePanel.notes")}</li>
          <li>{t("help.sidePanel.chat")}</li>
          <li>{t("help.sidePanel.world")}</li>
          <li>{t("help.sidePanel.context")}</li>
          <li>{t("help.sidePanel.settings")}</li>
        </ul>
        <p>{t("help.sidePanel.layout")}</p>
      </Section>

      <Section icon={Dices} title="Dice">
        <p>{t("help.dice.basics")}</p>
        <p>{t("help.dice.sources")}</p>
      </Section>

      <Section icon={Volume2} title="Voice and narration">
        <p>{t("help.voice.narration")}</p>
        <p>{t("help.voice.hotkey")}</p>
      </Section>

      <Section icon={Mic} title="Live voice chat">
        <p>{t("help.liveVoice.start")}</p>
        <p>{t("help.liveVoice.controls")}</p>
      </Section>

      <Section icon={Music} title="Ambience and music">
        <p>{t("help.ambience.setup")}</p>
        <p>{t("help.ambience.panel")}</p>
        <p>{t("help.ambience.library")}</p>
      </Section>

      <Section icon={Gavel} title="Playing with a human GM">
        <p>{t("help.humanGM.basics")}</p>
        <p>{t("help.humanGM.assisted")}</p>
        <p>{t("help.humanGM.beats")}</p>
      </Section>

      <Section icon={Crown} title="Party lead">
        <p>{t("help.partyLead.role")}</p>
        <p>{t("help.partyLead.story")}</p>
        <p>{t("help.partyLead.npc")}</p>
        <p>{t("help.partyLead.human")}</p>
      </Section>

      <Section icon={Puzzle} title="Campaign plugins">
        <p>{t("help.plugins.worldPack")}</p>
        <p>{t("help.plugins.names")}</p>
        <p>{t("help.plugins.install")}</p>
      </Section>

      <Section icon={BookOpen} title="New to D&amp;D?">
        <p>{t("help.newcomer.terms")}</p>
        <p>
          {t("help.newcomer.referenceIntro")}
          <Link href="/reference" className="text-amber-300 underline-offset-2 hover:underline">
            {t("help.newcomer.referenceLink")}
          </Link>
          {t("help.newcomer.middle")}
          <Link href="/rulebook" className="text-amber-300 underline-offset-2 hover:underline">
            {t("help.newcomer.rulebookLink")}
          </Link>
          {t("help.newcomer.rulebookOutro")}
        </p>
      </Section>

      <Section icon={BookOpen} title="About">
        <p>
          {t("help.about.description")}{" "}
          <Link href="/licenses" className="text-amber-300 underline-offset-2 hover:underline">
            {t("help.about.licensesLink")}
          </Link>
          .
        </p>
      </Section>
    </Dialog>
  );
}