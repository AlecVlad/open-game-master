"use client";

import {
  BookOpen,
  CircleHelp,
  Copy,
  Footprints,
  Hammer,
  Share2,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { WORKSHOP_GUIDES } from "@/lib/tours/workshop-guide";
import { Dialog } from "@/components/ui/Dialog";
import { Section } from "@/components/HelpDialog";
import { useI18n, useT } from "@/lib/i18n/provider";
import { WORKSHOP_GUIDES_RU } from "@/lib/tours/workshop-guide-ru";

// The workshop's own help. The main HelpDialog is written for a table
// mid-session; a workshop has no table, no transcript and no AI turns, so
// its help is its own read: the tours it can replay, a guide per tool (the
// open tool first and unfolded), and the short version of what a workshop
// is and how prep reaches a campaign. Opened from the shelf, the hub and
// every tool.

export type HelpTour = { label: string; detail: string; onStart: () => void };

export function WorkshopHelpDialog({
  open,
  onOpenChange,
  tours,
  system,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The tours this page can start; each closes the dialog first.
  tours?: HelpTour[];
  // The tool open right now, whose guide leads and starts unfolded.
  system?: string | null;
}) {
  const t = useT();
  const { lang } = useI18n();
  const guideSource = lang === "ru" ? WORKSHOP_GUIDES_RU : WORKSHOP_GUIDES;
  const guides = [
    ...guideSource.filter((guide) => guide.id === system),
    ...guideSource.filter((guide) => guide.id !== system),
  ];
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("help.workshop.dialog.title")}
      icon={<CircleHelp className="size-5 text-amber-500/80" />}
      width="w-[min(94vw,44rem)]"
    >
      {tours && tours.length ? (
        <Section icon={Footprints} title={t("workshop.help.section.tours")}>
          <p>{t("help.workshop.tours.intro")}</p>
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
      <Section icon={Wrench} title={t("workshop.help.section.tools")}>
        <p>{t("help.workshop.tools.intro")}{system ? t("help.workshop.tools.current") : ""}</p>
        <div className="space-y-1.5">
          {guides.map((guide) => (
            <details
              key={guide.id}
              open={guide.id === system}
              className="group rounded-lg border border-stone-800 bg-stone-950/50"
            >
              <summary
                className={cn(
                  "cursor-pointer list-none px-3 py-2 font-display text-sm tracking-wide text-amber-100 marker:content-none",
                  "flex items-baseline gap-2",
                )}
              >
                <span>{guide.title}</span>
                <span className="text-xs font-normal normal-case tracking-normal text-stone-500">
                  {guide.purpose}
                </span>
              </summary>
              <div className="space-y-2 border-t border-stone-800/70 px-3 py-2">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-300">
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="text-sm text-stone-300"><span className="text-amber-200/90">{t("help.workshop.atTable.label")}</span> {guide.atTable}</p>
                {guide.tips.length ? (
                  <ul className="reveal space-y-1 text-xs text-stone-500">
                    {guide.tips.map((tip) => (
                      <li key={tip} className="flex gap-1.5">
                        <span className="text-amber-500/70">&#8226;</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </Section>
      <Section icon={Hammer} title={t("workshop.help.section.workshop")}>
        <p>{t("help.workshop.what")}</p>
      </Section>
      <Section icon={Share2} title={t("workshop.help.section.campaign")}>
        <p>{t("help.workshop.import")}</p>
      </Section>
      <Section icon={Copy} title={t("workshop.help.section.copy")}>
        <p>{t("help.workshop.copy")}</p>
      </Section>
      <Section icon={Sparkles} title={t("workshop.help.section.ai")}>
        <p>{t("help.workshop.ai")}</p>
      </Section>
      <Section icon={BookOpen} title={t("workshop.help.section.rules")}>
        <p>{t("help.workshop.rules")}</p>
      </Section>
    </Dialog>
  );
}