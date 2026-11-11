"use client";

import { Square } from "lucide-react";
import { useEffect, useState } from "react";
import { D20Spinner } from "@/components/ui/D20Spinner";
import { Tooltip } from "@/components/ui/Tooltip";
import { formatElapsed } from "@/lib/dm/call-tracker-logic";
import type { CampaignState } from "@/app/campaigns/[campaignId]/useCampaignStream";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";
import type { DmJobStage } from "@/lib/dm/job-stage-logic";

const STATUS_WORDS: Record<Exclude<CampaignState["dmStatus"], "idle">, MessageKey> = {
  thinking: "campaign.session.dmStatus.thinking",
  rolling: "campaign.session.dmStatus.rolling",
  // Real dice, a held roll, or a player deciding on their thrown d20.
  awaiting_rolls: "campaign.session.dmStatus.awaitingRolls",
  narrating: "campaign.session.dmStatus.narrating",
  writing_chapter: "campaign.session.dmStatus.writingChapter",
  plotting_arc: "campaign.session.dmStatus.plottingArc",
};

const STAGE_WORDS: Record<DmJobStage, MessageKey> = {
  starting: "campaign.session.dmStatus.stage.starting",
  setting_scene: "campaign.session.dmStatus.stage.settingScene",
  searching_lore: "campaign.session.dmStatus.stage.searchingLore",
  waiting_model: "campaign.session.dmStatus.stage.waitingModel",
  resolving: "campaign.session.dmStatus.stage.resolving",
  closing_chapter: "campaign.session.dmStatus.stage.closingChapter",
};

// The DM's status beside the composer (issue #383): what it is doing, the
// step it is on and for how long, and for the lead a Stop. A turn that sat on
// one spinner forever with nothing said is what this replaces: the step names
// where a slow turn is, and Stop ends one that is stuck, leaving the halted
// notice and its Retry.
export function DmStatusLine({
  campaignId,
  dmStatus,
  dmJob,
  canStop,
}: {
  campaignId: string;
  dmStatus: CampaignState["dmStatus"];
  dmJob: CampaignState["dmJob"];
  canStop: boolean;
}) {
  const { t } = useI18n();
  // Zero until mounted, so the server render and the first client render
  // agree; the clock only ticks while a job runs.
  const [now, setNow] = useState(0);
  const [asked, setAsked] = useState("");
  const jobId = dmJob?.id ?? "";
  useEffect(() => {
    if (!jobId) {
      return;
    }
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [jobId]);

  if (dmStatus === "idle") {
    return null;
  }
  // A parked turn is waiting on people, not working: no step, no clock.
  const job = dmStatus === "awaiting_rolls" ? null : dmJob;
  const stopping = Boolean(job && (job.stopping || asked === job.id));
  const phrase = stopping
    ? t("campaign.session.dmStatus.stopping")
    : dmStatus === "thinking" && job && job.stage !== "starting"
      ? `${t(STAGE_WORDS[job.stage])}...`
      : t(STATUS_WORDS[dmStatus]);
  const elapsed = job && now ? formatElapsed(job.since, now) : "";

  async function stop() {
    if (!job || stopping) {
      return;
    }
    setAsked(job.id);
    // A refusal means the job already finished; the next status event says
    // what the DM is doing now, so there is nothing to report here.
    await fetch(`/api/campaigns/${campaignId}/dm-turn/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(() => null);
  }

  return (
    <span className="session-status live-in" data-busy={dmStatus}>
      <D20Spinner className="size-4 shrink-0 text-amber-500" />
      <span key={phrase} className="live-in">
        {phrase}
      </span>
      {elapsed ? <span className="tabular-nums text-stone-500">{elapsed}</span> : null}
      {canStop && job && !stopping ? (
        <Tooltip content={t("campaign.session.dmStatus.stopTooltip")}>
          <button
            type="button"
            onClick={() => void stop()}
            className="-my-0.5 ml-0.5 inline-flex items-center gap-1 rounded-full border border-red-900/60 px-1.5 py-0.5 text-[11px] text-red-200 transition-colors hover:bg-red-950/60"
            aria-label={t("campaign.session.dmStatus.stopAria")}
          >
            <Square className="size-2.5 fill-current" />
            {t("campaign.session.dmStatus.stop")}
          </button>
        </Tooltip>
      ) : null}
    </span>
  );
}
