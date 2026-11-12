"use client";

import { Check, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { refusalText } from "@/app/characters/builder/refusal";
import {
  EMPTY_DRAFT,
  OwedPicksFields,
  picksFromDraft,
  useFeatDescOf,
  type PicksDraft,
} from "@/app/campaigns/[campaignId]/OwedPicksFields";
import type { SeatPicks } from "@/lib/characters/seat-picks";
import type { JoinChangeDetail, JoinPreview } from "@/lib/characters/join-changes";

import type { CreateSheetInput } from "@/lib/schemas/sheet";

// A hero about to take a seat: one from the player's library (their own, or
// a pregen an adventure brought), a ready-made starter, a pregen the table's
// DM offers its players (src/lib/db/pregen-offers.ts), or one the builder
// just made for this table ("Help me build"), not stored until it seats.
export type JoinHero =
  | { kind: "library" | "pregen" | "offered"; id: string; name: string }
  | { kind: "built"; id: string; name: string; sheet: CreateSheetInput };

// What the preview and the join are asked about this hero.
function previewBody(hero: JoinHero, flow: "join" | "replace", picks: SeatPicks | null) {
  if (hero.kind === "built") return { sheet: hero.sheet, flow };
  const withPicks = picks ? { picks } : {};
  if (hero.kind === "offered") return { offeredPregenId: hero.id, flow, ...withPicks };
  return hero.kind === "library" ? { libraryCharacterId: hero.id, flow, ...withPicks } : { pregenId: hero.id, flow, ...withPicks };
}

// The join itself: the route each kind of hero seats by.
function joinRequest(campaignId: string, hero: JoinHero, flow: "join" | "replace", picks: SeatPicks | null) {
  const withPicks = picks ? { picks } : {};
  if (hero.kind === "pregen" || hero.kind === "offered") {
    return {
      url: `/api/campaigns/${campaignId}/sheet/${hero.kind === "pregen" ? "pregen" : "offered"}`,
      method: "POST",
      body: { id: hero.id, ...withPicks },
    };
  }
  return {
    url: `/api/campaigns/${campaignId}/sheet`,
    method: flow === "join" ? "POST" : "PUT",
    // A built hero is stored as it seats, in the library too.
    body: hero.kind === "built" ? hero.sheet : { libraryCharacterId: hero.id, ...withPicks },
  };
}

type Preview = JoinPreview & { alreadyHere: boolean };
type Translate = ReturnType<typeof useI18n>["t"];

function previewProblemText(problem: string, index: number, preview: Preview, t: Translate): string {
  return refusalText(
    { error: problem, problemCodes: [preview.problemCodes?.[index] ?? null] },
    problem,
    t,
  );
}

function joinChangeText(change: JoinChangeDetail, t: Translate): string {
  switch (change.kind) {
    case "ownLevel":
      return t("campaign.joinConfirm.change.ownLevel", { level: change.level });
    case "levelUp":
      return t("campaign.joinConfirm.change.levelUp", { from: change.from, to: change.to });
    case "levelDown":
      return t("campaign.joinConfirm.change.levelDown", { level: change.level, from: change.from });
    case "classes": {
      const formatClasses = (entries: typeof change.from) =>
        entries.map((entry) => {
          const key = `charSheet.class.${entry.id}`;
          const localized = t(key as never);
          const name = localized === key ? entry.name : localized;
          return t("campaign.joinConfirm.change.classEntry", { className: name, level: entry.level });
        }).join(" / ");
      return t("campaign.joinConfirm.change.classes", {
        from: formatClasses(change.from),
        to: formatClasses(change.to),
      });
    }
    case "hitPoints":
      return t("campaign.joinConfirm.change.hitPoints", { from: change.from, to: change.to });
    case "improvementsReturned":
      return t("campaign.joinConfirm.change.improvementsReturned", { count: change.count });
    case "featsReturned":
      return t("campaign.joinConfirm.change.featsReturned", { feats: change.feats.join(", ") });
    case "spellcastingLost":
      return t("campaign.joinConfirm.change.spellcastingLost");
    case "spellsReturned":
      return t("campaign.joinConfirm.change.spellsReturned", { spells: change.spells.join(", ") });
    case "spellSlots": {
      const slots = change.slots.map((slot) =>
        t("campaign.joinConfirm.change.slot", { level: slot.level, count: slot.count }),
      ).join(", ");
      return t("campaign.joinConfirm.change.spellSlots", { slots });
    }
    case "noSpellSlots":
      return t("campaign.joinConfirm.change.noSpellSlots");
  }
}

async function askPreview(campaignId: string, body: unknown, t: ReturnType<typeof useI18n>["t"]): Promise<{ preview?: Preview; error?: string }> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/sheet/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.preview) {
      return { error: refusalText(data, t("campaign.joinConfirm.error.preview"), t) };
    }
    return { preview: data.preview };
  } catch {
    return { error: t("campaign.joinConfirm.error.server") };
  }
}

// The confirm sheet before a hero takes its seat (backlog F6). It shows the
// hero at the table's level, what joining changes, and the table's rules
// check, all answered by the server from the code the join itself runs
// (POST /sheet/preview, src/lib/characters/seat-preview.ts). Cancel changes
// nothing; Take the seat is the join.
//
// The choices the level earned and the hero has not made (a subclass, an
// Ability Score Improvement, class skills, expertise) are picked here with
// the level-up's own pickers (OwedPicksFields.tsx), or left: whatever is
// left stays owed, and the first level-up at the table offers it
// (src/lib/srd/owed-choices.ts). The picks are checked by the same preview
// as the player makes them, and the join applies them through the same
// admit path (src/lib/characters/seat-picks.ts).
export function JoinConfirmDialog({
  campaignId,
  hero,
  flow = "join",
  onClose,
  onSeated,
}: {
  campaignId: string;
  // The hero being confirmed; null keeps the sheet closed.
  hero: JoinHero | null;
  // join = a first seat; replace = a lobby switch from the current hero.
  flow?: "join" | "replace";
  onClose: () => void;
  onSeated: () => void;
}) {
  const { t } = useI18n();
  // The server's answer, kept with the hero it answers for: a sheet opened
  // on another hero shows its own check, never the last one's.
  const heroKey = hero ? `${hero.kind}:${hero.id}:${flow}` : "";
  const [answer, setAnswer] = useState<{ key: string; preview?: Preview; error?: string } | null>(null);
  const current = answer && answer.key === heroKey ? answer : null;
  const preview = current?.preview ?? null;
  const loadError = current?.error ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The owed choices picked so far, for this hero only.
  const [draftOf, setDraftOf] = useState<{ key: string; draft: PicksDraft }>({ key: "", draft: EMPTY_DRAFT });
  const draft = draftOf.key === heroKey ? draftOf.draft : EMPTY_DRAFT;
  const featDescOf = useFeatDescOf(draft);
  const owed = hero && hero.kind !== "built" ? (preview?.picks ?? null) : null;
  const picks = picksFromDraft(owed, draft, featDescOf);
  const picksKey = picks ? JSON.stringify(picks) : "";
  // The table's check of the hero with the picks made: the same preview,
  // asked again as they change. The pickers stay on the first answer.
  const [checked, setChecked] = useState<{ key: string; preview?: Preview; error?: string } | null>(null);
  const check = picksKey ? (checked && checked.key === `${heroKey}|${picksKey}` ? checked : null) : null;
  const shown = picksKey ? (check?.preview ?? null) : preview;
  const checking = Boolean(picksKey) && !check;

  useEffect(() => {
    if (!hero) {
      return;
    }
    let cancelled = false;
    const key = `${hero.kind}:${hero.id}:${flow}`;
    void askPreview(campaignId, previewBody(hero, flow, null), t).then((result) => {
      if (!cancelled) setAnswer({ key, ...result });
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId, hero, flow, t]);

  useEffect(() => {
    if (!hero || !picksKey) {
      return;
    }
    let cancelled = false;
    const key = `${hero.kind}:${hero.id}:${flow}|${picksKey}`;
    // A short wait, so a run of clicks asks once.
    const timer = setTimeout(() => {
      void askPreview(campaignId, previewBody(hero, flow, JSON.parse(picksKey) as SeatPicks), t).then((result) => {
        if (!cancelled) setChecked({ key, ...result });
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [campaignId, hero, flow, picksKey, t]);

  async function confirm() {
    if (!hero) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const request = joinRequest(campaignId, hero, flow, picks);
      const response = await fetch(request.url, {
        method: request.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(refusalText(data, t("campaign.joinConfirm.error.seat"), t));
        return;
      }
      onSeated();
    } catch {
      setError(t("campaign.joinConfirm.error.server"));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setError("");
    setDraftOf({ key: "", draft: EMPTY_DRAFT });
    onClose();
  }

  const name = preview?.name || hero?.name || t("campaign.joinConfirm.thisHero");
  const source = shown ?? preview;
  const changeLines = source?.changeDetails?.length
    ? source.changeDetails.map((change) => joinChangeText(change, t))
    : source?.changes ?? [];
  const owedLeft = shown?.owed ?? preview?.owed ?? [];
  const owedOnSheet = shown?.owedOnSheet ?? preview?.owedOnSheet ?? [];
  const sheetOwedLeft = owedLeft.filter((line) => owedOnSheet.includes(line));
  const levelUpOwedLeft = owedLeft.filter((line) => !owedOnSheet.includes(line));
  const owedNote = !sheetOwedLeft.length
    ? t("campaign.joinConfirm.owedNote.levelUp", { name, choices: levelUpOwedLeft.join("; ") })
    : !levelUpOwedLeft.length
      ? t("campaign.joinConfirm.owedNote.sheet", { name, choices: sheetOwedLeft.join("; ") })
      : t("campaign.joinConfirm.owedNote.split", { name, levelUp: levelUpOwedLeft.join("; "), sheet: sheetOwedLeft.join("; ") });
  const owedLeftLines = [
    ...(levelUpOwedLeft.length ? [t("campaign.joinConfirm.owedLeft.levelUp", { choices: levelUpOwedLeft.join("; ") })] : []),
    ...(sheetOwedLeft.length ? [t("campaign.joinConfirm.owedLeft.sheet", { choices: sheetOwedLeft.join("; ") })] : []),
  ];
  return (
    <Dialog
      open={hero !== null}
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
      title={flow === "replace" ? t("campaign.joinConfirm.title.replace", { name }) : t("campaign.joinConfirm.title.join", { name })}
    >
      <div className="space-y-4 text-sm" data-join-confirm aria-busy={(!preview && !loadError) || checking}>
        {!preview && !loadError ? (
          <p className="flex items-center gap-2 text-stone-400">
            <Loader2 className="size-4 animate-spin" /> {t("campaign.joinConfirm.checkingHero", { name })}
          </p>
        ) : null}
        {loadError ? (
          <p className="whitespace-pre-line text-red-400" role="alert">
            {loadError}
          </p>
        ) : null}
        {preview ? (
          <>
            {/* A hero refused outright (one who fell here) has nothing to
                say about joining: only the refusal below shows. */}
            {preview.alreadyHere || preview.changes.length > 0 || preview.rollsHp ? (
              <section className="space-y-1.5">
                <h3 className={ui.sectionEyebrow}>{t("campaign.joinConfirm.atTable")}</h3>
                {preview.alreadyHere ? (
                  <p className="text-stone-300">{t("campaign.joinConfirm.alreadyHere", { name })}</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-stone-300" data-join-changes>
                    {changeLines.map((line, index) => (
                      <li key={`${index}:${line}`}>{line}</li>
                    ))}
                  </ul>
                )}
                {preview.rollsHp ? (
                  <p className="text-xs text-stone-400">
                    {t(hero?.kind === "built" ? "campaign.joinConfirm.rollsHp.built" : "campaign.joinConfirm.rollsHp.existing", { name })}
                  </p>
                ) : null}
              </section>
            ) : null}

            {owed && !preview.alreadyHere && preview.ok ? (
              <section className="space-y-2" data-join-owed>
                <h3 className={ui.sectionEyebrow}>{t("campaign.joinConfirm.choicesNow")}</h3>
                <p className="text-xs text-stone-400">
                  {t("campaign.joinConfirm.choicesNowDescription", { name })}
                </p>
                <OwedPicksFields
                  owed={owed}
                  name={name}
                  draft={draft}
                  onChange={(next) => setDraftOf({ key: heroKey, draft: next })}
                  featDescOf={featDescOf}
                />
              </section>
            ) : null}

            {checking ? (
              <p className="flex items-center gap-2 text-stone-400" data-join-rules="checking">
                <Loader2 className="size-4 animate-spin" /> {t("campaign.joinConfirm.checkingPicks")}
              </p>
            ) : check?.error ? (
              <p className="whitespace-pre-line text-red-400" role="alert">
                {check.error}
              </p>
            ) : shown ? (
              <section className="space-y-1.5" data-join-rules={shown.ok ? "pass" : "fail"}>
                <h3 className={ui.sectionEyebrow}>{t("campaign.joinConfirm.tableRules")}</h3>
                {shown.ok ? (
                  <p className="flex items-center gap-2 text-emerald-300">
                    <Check className="size-4 shrink-0" /> {t(picks ? "campaign.joinConfirm.rules.passWithPicks" : "campaign.joinConfirm.rules.pass")}
                  </p>
                ) : (
                  <div className="space-y-1 text-red-300" role="alert">
                    <p className="flex items-center gap-2">
                      <TriangleAlert className="size-4 shrink-0" /> {t(picks && preview.ok ? "campaign.joinConfirm.rules.failWithPicks" : "campaign.joinConfirm.rules.failYet", { name })}
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {shown.problems.map((problem, index) => (
                        <li key={`${index}:${problem}`}>{previewProblemText(problem, index, shown, t)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ) : null}

            {shown?.ok && owedLeft.length && !owed ? (
              <section className="space-y-1.5" data-join-owed-left>
                <h3 className={ui.sectionEyebrow}>{t("campaign.joinConfirm.choicesLeft")}</h3>
                <ul className="list-disc space-y-1 pl-5 text-amber-100">
                  {owedLeft.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="text-xs text-stone-400">{owedNote}</p>
              </section>
            ) : shown?.ok && owed && owedLeft.length ? (
              <div className="space-y-1 text-xs text-amber-100" data-join-owed-left>
                {owedLeftLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p className="motion-shake whitespace-pre-line text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={close} disabled={busy} className={ui.btnSecondary}>
            {t("campaign.joinConfirm.cancel")}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || checking || !shown?.ok}
            aria-busy={busy}
            className={cn(ui.btnPrimary)}
            data-join-take
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {flow === "replace" ? t("campaign.joinConfirm.action.switch", { name }) : t("campaign.joinConfirm.action.takeSeat")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
