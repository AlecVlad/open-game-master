"use client";

import {
  CircleHelp,
  Compass,
  Dices,
  Hourglass,
  MessageSquareText,
  RefreshCw,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ModeRow, Section } from "@/components/HelpDialog";
import { useT } from "@/lib/i18n/provider";

// Onboarding read for newcomers: what the app is, how to get a table running,
// who does the maths, and the table etiquette that follows from coalesced DM
// turns. HelpDialog stays the button-by-button reference.
export function HowToPlayDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("help.howto.dialog.title")}
      icon={<ScrollText className="size-5 text-amber-500/80" />}
      width="w-[min(94vw,44rem)]"
    >
      <Section icon={Sparkles} title="What this is">
        <p>{t("help.howto.what.app")}</p>
        <p>{t("help.howto.what.rules")}</p>
      </Section>

      <Section icon={Compass} title="Getting started">
        <p>{t("help.howto.start.campaign")}</p>
        <p>{t("help.howto.start.solo")}</p>
        <p>{t("help.howto.start.character")}</p>
      </Section>

      <Section icon={Dices} title="How the game is run">
        <p>{t("help.howto.rules.calc")}</p>
        <p>{t("help.howto.rules.audit")}</p>
      </Section>

      <Section icon={MessageSquareText} title="Taking your turn">
        <p>{t("help.howto.turn.intro")}</p>
        <ModeRow label="Do">{t("help.mode.do.text")}</ModeRow>
        <ModeRow label="Say">{t("help.mode.say.text")}</ModeRow>
        <ModeRow label="OOC">{t("help.mode.ooc.text")}</ModeRow>
        <p>{t("help.howto.ask")}</p>
      </Section>

      <Section icon={Hourglass} title="One turn at a time">
        <p>{t("help.howto.turn.wait")}</p>
        <p>{t("help.howto.turn.discuss")}</p>
        <p>{t("help.howto.turn.ooc")}</p>
      </Section>

      <Section icon={RefreshCw} title="If a reply lands badly">
        <p>{t("help.howto.reply.fix")}</p>
        <p>{t("help.howto.reply.shared")}</p>
      </Section>

      <Section icon={CircleHelp} title="If you get stuck">
        <p>{t("help.howto.stuck")}</p>
      </Section>
    </Dialog>
  );
}