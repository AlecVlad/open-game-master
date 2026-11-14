"use client";

import { SectionHead } from "@/components/ui/SectionHead";
import { useI18n } from "@/lib/i18n/provider";
import { ui } from "@/lib/ui";
import { OMISSION_GROUPS, type PackOmission } from "@/lib/workshop/to-pack-omissions";

// What a world pack leaves out of this workshop, kind by kind, each with
// the entries it names (src/lib/workshop/to-pack-omissions.ts). Shown on
// the Plugin tool's Publish tab before anything is published, and in the
// Share tool after a pack draft is compiled. A kind with a few entries
// opens with them listed; a long one opens on a tap, and lists them all.

const OPEN_UP_TO = 6;
const GROUP_KEY: Record<PackOmission["group"], string> = {
  setting: "campaign.omissionReport.group.setting",
  world: "campaign.omissionReport.group.world",
  scenario: "campaign.omissionReport.group.scenario",
};
const LABEL_KEY: Record<string, string> = {
  atlas: "campaign.omissionReport.label.atlas",
  timeline: "campaign.omissionReport.label.timeline",
  secrets: "campaign.omissionReport.label.secrets",
  held: "campaign.omissionReport.label.held",
  storyboard: "campaign.omissionReport.label.storyboard",
  fields: "campaign.omissionReport.label.fields",
  links: "campaign.omissionReport.label.links",
  cast: "campaign.omissionReport.label.cast",
  "faction-details": "campaign.omissionReport.label.factionDetails",
  notes: "campaign.omissionReport.label.notes",
  pictures: "campaign.omissionReport.label.pictures",
  shortened: "campaign.omissionReport.label.shortened",
  monsters: "campaign.omissionReport.label.monsters",
  homebrew: "campaign.omissionReport.label.homebrew",
  encounters: "campaign.omissionReport.label.encounters",
  maps: "campaign.omissionReport.label.maps",
  bindings: "campaign.omissionReport.label.bindings",
  tables: "campaign.omissionReport.label.tables",
  shops: "campaign.omissionReport.label.shops",
  pregens: "campaign.omissionReport.label.pregens",
  region: "campaign.omissionReport.label.region",
  rules: "campaign.omissionReport.label.rules",
};
const REASON_KEY: Record<string, string> = Object.fromEntries(
  Object.keys(LABEL_KEY).map((key) => [key, "campaign.omissionReport.reason." + key]),
);

export function OmissionReport({
  omissions,
  notes = [],
  loading = false,
  error = "",
}: {
  omissions: PackOmission[];
  // General lines said once, above the list (a pack's reskin tables).
  notes?: string[];
  loading?: boolean;
  error?: string;
}) {
  const { t, tp } = useI18n();
  const groups = (Object.keys(OMISSION_GROUPS) as Array<PackOmission["group"]>)
    .map((group) => ({ group, items: omissions.filter((omission) => omission.group === group) }))
    .filter((entry) => entry.items.length);
  const count = omissions.reduce((sum, omission) => sum + omission.assets.length, 0);

  return (
    <section className={ui.card + " p-4"} data-testid="pack-omissions" aria-labelledby="pack-omissions-title" aria-busy={loading}>
      <SectionHead
        title={<span id="pack-omissions-title">{t("campaign.omissionReport.title")}</span>}
        glyph="quest-failed"
        aside={count ? <span className="text-[11px] text-stone-500">{tp("campaign.omissionReport.entries", count)}</span> : undefined}
      />
      <p className="mb-3 text-[11px] text-stone-500">
        {t("campaign.omissionReport.description")}
      </p>
      {notes.map((note) => (
        <p key={note} className="mb-2 text-xs text-stone-400">
          {note}
        </p>
      ))}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {loading && !omissions.length ? <p className="text-xs text-stone-500">{t("campaign.omissionReport.loading")}</p> : null}
      {!loading && !error && !groups.length ? (
        <p className="text-xs text-emerald-300/90">{t("campaign.omissionReport.none")}</p>
      ) : null}
      <div className="space-y-4">
        {groups.map(({ group, items }) => (
          <div key={group} data-group={group}>
            <h4 className="mb-1.5 font-display text-[11px] tracking-[0.1em] text-amber-300/85">{t(GROUP_KEY[group] as never)}</h4>
            <ul className="space-y-1.5">
              {items.map((omission) => (
                <li key={omission.key} data-omission={omission.key}>
                  <details open={omission.assets.length <= OPEN_UP_TO} className="group rounded-md border border-stone-800/80 bg-stone-950/40">
                    <summary className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40">
                      <span className="flex-1">{LABEL_KEY[omission.key] ? t(LABEL_KEY[omission.key] as never) : omission.label}</span>
                      <span className="text-[11px] text-stone-500">{omission.assets.length}</span>
                    </summary>
                    <div className="px-2.5 pb-2">
                      <p className="mb-1.5 text-[11px] text-stone-500">{REASON_KEY[omission.key] ? t(REASON_KEY[omission.key] as never) : omission.reason}</p>
                      <ul className="space-y-0.5 text-xs text-stone-300">
                        {omission.assets.map((asset, index) => (
                          <li key={`${index}-${asset}`} className="flex gap-2 break-words">
                            <span aria-hidden="true" className="text-stone-600">
                              ·
                            </span>
                            <span className="min-w-0">{asset}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
