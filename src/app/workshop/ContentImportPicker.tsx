"use client";

import { AlertTriangle, Hammer, Info, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { FieldLabel } from "@/app/workshop/kit";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ui } from "@/lib/ui";
import {
  IMPORT_KINDS,
  WORLD_RECORD_KINDS,
  SINGULAR_KINDS,
  standingUnsaid,
  type ImportKind,
  type ImportPlan,
} from "@/lib/workshop/import";
import type { ImportSourceSummary } from "@/app/workshop/types";

// Choosing what crosses over into a table.
//
// The source is a workshop or another campaign. Both are campaigns rows
// holding the same content tables, so both are the same copy, and the server
// decides which ones this person may copy out of
// (src/lib/db/import-sources.ts).
//
// Used in two places with one difference. In the lobby (and the table's
// Setup tab, once play has begun) a campaign already
// exists, so the picker asks the server what the import WOULD do and shows
// the collisions and overwrites. At campaign creation there is no campaign
// yet, so there is nothing to collide with: a fresh table is empty, and the
// counts from the source are the whole truth.

const IMPORT_KIND_KEYS: Record<ImportKind, string> = {
  lore: "workshop.contentImport.kind.lore",
  locations: "workshop.contentImport.kind.locations",
  overworld: "workshop.contentImport.kind.overworld",
  encounters: "workshop.contentImport.kind.encounters",
  tables: "workshop.contentImport.kind.tables",
  npcs: "workshop.contentImport.kind.npcs",
  factions: "workshop.contentImport.kind.factions",
  shops: "workshop.contentImport.kind.shops",
  maps: "workshop.contentImport.kind.maps",
  storyboard: "workshop.contentImport.kind.storyboard",
  world: "workshop.contentImport.kind.world",
  houseRules: "workshop.contentImport.kind.houseRules",
};

function importKindLabel(kind: ImportKind, t: (key: string, params?: Record<string, string | number>) => string): string {
  return t(IMPORT_KIND_KEYS[kind]);
}

export type ImportSelection = {
  sourceId: string;
  select: ImportKind[];
  houseRules: "replace" | "append";
  // What an earlier import from the same source brought: kept as this
  // campaign has it, or copied again under a number.
  again?: "skip" | "copy";
  // A board meeting the arc the table is playing: left alone, or added as
  // the next act (#157).
  arc?: "leave" | "append";
  // The chosen workshop has pregens ticked Offer to players, so choosing it
  // is worth sending with nothing ticked: the table then starts from it and
  // offers them (src/lib/db/campaign-workshops.ts). Not a control: set when
  // the source is chosen, from what it holds.
  offersParty?: boolean;
};

// Whether a selection brings anything to the table: kinds ticked, or a
// workshop whose offered pregens come with choosing it.
export function bringsSomething(selection: Pick<ImportSelection, "sourceId" | "select" | "offersParty">): boolean {
  return Boolean(selection.sourceId && (selection.select.length || selection.offersParty));
}

// With WorldForge ticked, a record kind it needs that is not ticked is one
// the DM leaves out on purpose (audit finding WF-07): said to the server so
// the plan names what goes, rather than bringing it anyway.
export function exclusionsOf(selection: Pick<ImportSelection, "select">): ImportKind[] {
  return selection.select.includes("world") ? WORLD_RECORD_KINDS.filter((kind) => !selection.select.includes(kind)) : [];
}

export const EMPTY_SELECTION: ImportSelection = {
  sourceId: "",
  select: [],
  houseRules: "replace",
  again: "skip",
  arc: "leave",
  offersParty: false,
};

export function ContentImportPicker({
  campaignId,
  selection,
  onChange,
  onImported,
  storyboardNote,
  onChosen,
}: {
  // Omitted at campaign creation, where the target does not exist yet.
  campaignId?: string;
  selection: ImportSelection;
  onChange: (selection: ImportSelection) => void;
  // Only meaningful with a campaignId: importing happens immediately.
  onImported?: (copied: number) => void;
  // Drawn under the choices when the board being brought in will write the
  // table's story arc (the AI Story Setup warning, issue 249).
  storyboardNote?: (arcComing: boolean) => ReactNode;
  // Told which source is chosen and whether its board will write the arc,
  // so a summary elsewhere (the creator's review) can name it and repeat the
  // warning.
  onChosen?: (chosen: { title: string; arcComing: boolean } | null) => void;
}) {
  const { t, tp } = useI18n();
  const importMessages: ImportMessages = {
    t: (key, params) => t(key as never, params),
    tp: (key, count, params) => tp(key, count, params),
  };
  const [sources, setSources] = useState<ImportSourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  // The preview could not be had: the button waits for one rather than
  // importing blind past collisions and overwrites it would have named.
  const [planFailed, setPlanFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // The list of sources could not be read, which is not "nothing to copy".
  const [sourcesFailed, setSourcesFailed] = useState(false);
  // What earlier imports kept as this campaign has it and the author has
  // not settled yet (src/lib/worldforge/import-kept.ts), read from the
  // entries themselves, so it is said again after a reload. The entry's
  // page in the World tab is where the author chooses.
  const [standing, setStanding] = useState<string[]>([]);
  const readStanding = useCallback(() => {
    if (!campaignId) return Promise.resolve();
    return fetch(`/api/campaigns/${campaignId}/import?kept=1`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setStanding(Array.isArray(data?.kept) ? data.kept : []))
      .catch(() => {
        // transient; the next import reads it again
      });
  }, [campaignId]);
  useEffect(() => {
    void readStanding();
  }, [readStanding]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/import-sources")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => {
        if (!cancelled && data) {
          setSources(data.sources ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setSourcesFailed(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A campaign cannot import from itself, and offering it would be the one
  // option guaranteed to fail.
  const offered = sources.filter((source) => source.id !== campaignId);
  const workshops = offered.filter((source) => source.kind === "workshop");
  const campaigns = offered.filter((source) => source.kind !== "workshop");
  const chosen = offered.find((source) => source.id === selection.sourceId) ?? null;

  // The available kinds are the ones this source actually holds. Offering a
  // tickbox for something that would copy nothing is a lie the DM only
  // discovers after pressing the button.
  const available = chosen
    ? IMPORT_KINDS.filter((kind) => (chosen.contents?.[kind] ?? 0) > 0)
    : [];
  // The board writes the table's arc: it compiles into one, it is ticked,
  // and the table has none it would be left out of (the plan says so once a
  // campaign exists to plan against).
  const arcComing =
    Boolean(chosen?.boardArc) && selection.select.includes("storyboard") && !plan?.board?.targetHasArc;
  // The chosen workshop's pregens a table that starts from it offers.
  const offeredPregens = chosen?.kind === "workshop" ? (chosen.offeredPregens ?? []) : [];
  const bringable = bringsSomething(selection);

  const chosenTitle = chosen?.title ?? null;
  useEffect(() => {
    onChosen?.(chosenTitle === null ? null : { title: chosenTitle, arcComing });
  }, [onChosen, chosenTitle, arcComing]);

  // The state lands in a .then callback rather than after an await, so the
  // refetch reads as "subscribe to an external system" to React and to the
  // effect linter, which is what it is. Same shape as DmMapStudioPanel.
  const refreshPlan = useCallback(() => {
    if (!campaignId || !selection.sourceId || !selection.select.length) {
      return Promise.resolve().then(() => {
        setPlan(null);
        setPlanFailed(false);
      });
    }
    const params = new URLSearchParams({
      sourceId: selection.sourceId,
      again: selection.again ?? "skip",
      arc: selection.arc ?? "leave",
    });
    for (const kind of selection.select) {
      params.append("select", kind);
    }
    for (const kind of exclusionsOf({ select: selection.select })) {
      params.append("exclude", kind);
    }
    return fetch(`/api/campaigns/${campaignId}/import?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        setPlan(data?.plan ?? null);
        setPlanFailed(!data?.plan);
      })
      .catch(() => {
        // The next change, or the retry under the choices, asks again.
        setPlan(null);
        setPlanFailed(true);
      });
  }, [campaignId, selection.sourceId, selection.select, selection.again, selection.arc]);

  useEffect(() => {
    void refreshPlan();
  }, [refreshPlan]);

  function choose(source: ImportSourceSummary | null) {
    if (!source) {
      onChange(EMPTY_SELECTION);
      return;
    }
    // Everything the source has, ticked. Bringing all of it is the common
    // case, and unticking is easier than hunting for what exists.
    onChange({
      ...selection,
      sourceId: source.id,
      select: IMPORT_KINDS.filter((kind) => (source.contents?.[kind] ?? 0) > 0),
      offersParty: source.kind === "workshop" && Boolean(source.offeredPregens?.length),
    });
  }

  // Ticking WorldForge ticks what it describes too (WF-07): its links,
  // secrets and pins point at those records. Unticking one afterwards is a
  // deliberate exclusion, and the plan says what it loses.
  function toggle(kind: ImportKind) {
    const on = !selection.select.includes(kind);
    const brought = on && kind === "world" ? WORLD_RECORD_KINDS.filter((other) => available.includes(other)) : [];
    const select = on ? [...new Set([...selection.select, kind, ...brought])] : selection.select.filter((entry) => entry !== kind);
    onChange({ ...selection, select: IMPORT_KINDS.filter((entry) => select.includes(entry)) });
  }

  async function importNow() {
    if (!campaignId || !bringable) {
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const outcome = await postContentImport(campaignId, selection, importMessages);
      if (!outcome.ok) {
        setNote({ tone: "error", text: outcome.error });
        return;
      }
      setNote({ tone: "ok", text: outcome.note });
      // Clearing the ticks re-runs the plan effect, which clears the plan.
      // Refetching here as well raced it with the old ticks and left the
      // last import's warnings and notes on screen. The table now starts
      // from the workshop, so its pregens need no second send either.
      onChange({ ...selection, select: [], offersParty: false });
      void readStanding();
      onImported?.(outcome.copied);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Loader2 className="size-4 animate-spin text-stone-500" />;
  }

  if (sourcesFailed) {
    return (
      <p role="alert" className="flex items-start gap-1.5 text-xs text-amber-300/90">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {t("workshop.contentImport.sourcesError")}
        </span>
      </p>
    );
  }

  if (!offered.length) {
    return (
      <p className="text-xs text-stone-500">
        {t("workshop.contentImport.sourcesEmpty")}
      </p>
    );
  }

  // Said beside an import's note too, less what the note already says.
  const unsaid = standingUnsaid(standing, note?.text);

  // What choosing a workshop with offered pregens brings, prep or none.
  const party = offeredPregens.length ? (
    <p className="flex items-start gap-1.5 text-xs text-stone-400" data-testid="import-party">
      <Info className="mt-0.5 size-3.5 shrink-0 text-sky-300/70" />
      <span>
        {t("workshop.contentImport.partyOffer", { count: offeredPregens.length, names: offeredPregens.join(", ") })}
      </span>
    </p>
  ) : null;

  // The button, or at creation what will happen. A plan with nothing left
  // to copy still sends a workshop whose pregens come with it.
  const action = campaignId ? (
    <div className="reveal flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={importNow}
        disabled={busy || !bringable || (Boolean(plan?.empty) && !selection.offersParty) || planFailed}
        className={ui.btnSmall}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Hammer className="size-3.5" />}
        {t("workshop.contentImport.bringIn")}
      </button>
      {note ? (
        <span
          role={note.tone === "error" ? "alert" : "status"}
          className={note.tone === "error" ? "motion-shake text-xs text-red-400" : "live-in text-xs text-emerald-400"}
        >
          {note.text}
        </span>
      ) : null}
    </div>
  ) : (
    <p className="text-xs text-stone-500">
      {t("workshop.contentImport.createdNotice")}
    </p>
  );

  return (
    <div className="space-y-3">
      {unsaid.length ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-300/90" data-testid="import-kept-standing">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {t("workshop.contentImport.keptStanding", { names: unsaid.join(" ") })}
          </span>
        </p>
      ) : null}
      <div className="block">
        <FieldLabel className="mb-1 block">{t("workshop.contentImport.source.label")}</FieldLabel>
        <Select
          label={t("workshop.contentImport.source.label")}
          value={selection.sourceId}
          onChange={(id) => choose(offered.find((source) => source.id === id) ?? null)}
          options={[
            { value: "", label: t("workshop.contentImport.source.none") },
            ...workshops.map((source) => ({
              value: source.id,
              label: source.title,
              group: t("workshop.contentImport.source.workshops"),
              icon: { kind: "glyph" as const, key: "system-storyboard" },
            })),
            ...campaigns.map((source) => ({
              value: source.id,
              label: source.title,
              group: t("workshop.contentImport.source.campaigns"),
              icon: { kind: "glyph" as const, key: "tab-campaigns" },
            })),
          ]}
        />
      </div>

      {chosen ? (
        available.length ? (
          <>
            <div className="stagger space-y-1">
              {available.map((kind) => (
                <div key={kind} className="flex min-h-9 items-center gap-2 text-sm text-stone-300">
                  <Switch on={selection.select.includes(kind)} onChange={() => toggle(kind)} label={importKindLabel(kind, importMessages.t)} />
                  <span>{importKindLabel(kind, importMessages.t)}</span>
                  {SINGULAR_KINDS.has(kind) ? null : (
                    <span className="text-xs text-stone-500">({chosen.contents[kind]})</span>
                  )}
                  {selection.select.includes("world") && (WORLD_RECORD_KINDS as readonly string[]).includes(kind) ? (
                    <span className="text-xs text-stone-500" data-testid={`import-world-needs-${kind}`}>
                      {selection.select.includes(kind) ? t("workshop.contentImport.world.needs") : t("workshop.contentImport.world.leftOut")}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {party}

            {selection.select.includes("houseRules") ? (
              <div className="block">
                <FieldLabel className="mb-1 block">{t("workshop.contentImport.houseRules.label")}</FieldLabel>
                <Select<"replace" | "append">
                  label={t("workshop.contentImport.houseRules.label")}
                  value={selection.houseRules}
                  onChange={(houseRules) => onChange({ ...selection, houseRules })}
                  options={[
                    { value: "replace", label: t("workshop.contentImport.houseRules.replace") },
                    { value: "append", label: t("workshop.contentImport.houseRules.append") },
                  ]}
                />
              </div>
            ) : null}

            {selection.select.includes("storyboard") && plan?.board?.targetHasArc ? (
              <div className="reveal block">
                <FieldLabel className="mb-1 block">{t("workshop.contentImport.boardBeats.label")}</FieldLabel>
                <Select<"leave" | "append">
                  label={t("workshop.contentImport.boardBeats.label")}
                  value={selection.arc ?? "leave"}
                  onChange={(arc) => onChange({ ...selection, arc })}
                  options={[
                    {
                      value: "leave",
                      label: t("workshop.contentImport.boardBeats.leave"),
                      hint: t("workshop.contentImport.boardBeats.leaveHint"),
                    },
                    {
                      value: "append",
                      label: t("workshop.contentImport.boardBeats.append", { act: plan.board.act }),
                      hint: t("workshop.contentImport.boardBeats.appendHint"),
                    },
                  ]}
                />
              </div>
            ) : null}

            {storyboardNote?.(arcComing)}

            {plan?.kept || selection.again === "copy" ? (
              <div className="reveal block">
                <FieldLabel className="mb-1 block">{t("workshop.contentImport.again.label")}</FieldLabel>
                <Select<"skip" | "copy">
                  label={t("workshop.contentImport.again.label")}
                  value={selection.again ?? "skip"}
                  onChange={(again) => onChange({ ...selection, again })}
                  options={[
                    { value: "skip", label: t("workshop.contentImport.again.keep") },
                    { value: "copy", label: t("workshop.contentImport.again.copy") },
                  ]}
                />
              </div>
            ) : null}

            {plan?.warnings.length ? (
              <ul className="stagger space-y-1">
                {plan.warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-1.5 text-xs text-amber-300/90"
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {plan?.notes?.length ? (
              <ul className="stagger space-y-1">
                {plan.notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-xs text-stone-400">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-sky-300/70" />
                    <span>{note.message}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {campaignId && planFailed ? (
              <p role="alert" className="flex flex-wrap items-center gap-1.5 text-xs text-amber-300/90">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>{t("workshop.contentImport.planFailed")}</span>
                <button type="button" onClick={() => void refreshPlan()} className={`${ui.btnSmall} min-h-10`}>
                  {t("workshop.contentImport.checkAgain")}
                </button>
              </p>
            ) : null}

            {action}
          </>
        ) : party ? (
          // A workshop of pregens alone is still a place to start from: the
          // table that does offers them, with nothing to copy.
          <>
            {party}
            {action}
          </>
        ) : (
          <p className="text-xs text-stone-500">
            {chosen.kind === "workshop"
              ? // Homebrew and pregens are not campaign prep: a workshop holding
                // only those is not empty, and saying so sent people looking for
                // a copy step that does not exist (workshop import audit F06).
                // Its pregens come with choosing it once one is offered.
                t("workshop.contentImport.emptyWorkshop")
              : t("workshop.contentImport.emptyCampaign")}
          </p>
        )
      ) : null}
    </div>
  );
}

export type ImportOutcome = { ok: true; copied: number; note: string } | { ok: false; error: string };

type ImportMessages = {
  t: (key: string, params?: Record<string, string | number>) => string;
  tp: (key: string, count: number, params?: Record<string, string | number>) => string;
};

// What an import brought, in one line for the person who asked for it.
// Server-authored conflict and reference notes remain data; the surrounding
// labels and every summary composed here follow the interface language.
function importNote(data: Record<string, unknown>, messages?: ImportMessages): string {
  const copied = Number(data.copied) || 0;
  const names = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
  const unresolved = names(data.unresolved);
  const offered = names(data.pregensOffered);
  if (!messages) {
    const lines = [
      copied || !offered.length ? `Brought ${copied} items across.` : "",
      data.kept ? `Kept ${String(data.kept)} already here.` : "",
      data.beatsAdded ? `${String(data.beatsAdded)} beats joined the arc.` : "",
      unresolved.length ? `No monster here answers to ${unresolved.join(", ")}: add them to your bestiary, or point those NPCs and fights at another.` : "",
      names(data.worldConflicts).join(" "),
      names(data.referenceNotes).join(" "),
      names(data.monstersBrought).length ? `Copied into this table's bestiary: ${names(data.monstersBrought).join(", ")}.` : "",
      names(data.monstersReused).length ? `Already in this table's bestiary: ${names(data.monstersReused).join(", ")}.` : "",
      names(data.itemsBrought).length ? `Copied into this table's Homebrew: ${names(data.itemsBrought).join(", ")}.` : "",
      names(data.itemsReused).length ? `Already in this table's Homebrew: ${names(data.itemsReused).join(", ")}.` : "",
      offered.length ? `Offered to players here: ${offered.join(", ")}.` : "",
    ];
    return lines.filter(Boolean).join(" ");
  }
  const { t, tp } = messages;
  const lines = [
    copied || !offered.length ? tp("workshop.contentImport.note.items", copied) : "",
    data.kept ? tp("workshop.contentImport.note.kept", Number(data.kept)) : "",
    data.beatsAdded ? tp("workshop.contentImport.note.beats", Number(data.beatsAdded)) : "",
    unresolved.length ? t("workshop.contentImport.note.unresolved", { names: unresolved.join(", ") }) : "",
    names(data.worldConflicts).join(" "),
    names(data.referenceNotes).join(" "),
    names(data.monstersBrought).length ? t("workshop.contentImport.note.monstersCopied", { names: names(data.monstersBrought).join(", ") }) : "",
    names(data.monstersReused).length ? t("workshop.contentImport.note.monstersReused", { names: names(data.monstersReused).join(", ") }) : "",
    names(data.itemsBrought).length ? t("workshop.contentImport.note.itemsCopied", { names: names(data.itemsBrought).join(", ") }) : "",
    names(data.itemsReused).length ? t("workshop.contentImport.note.itemsReused", { names: names(data.itemsReused).join(", ") }) : "",
    offered.length ? t("workshop.contentImport.note.pregensOffered", { names: offered.join(", ") }) : "",
  ];
  return lines.filter(Boolean).join(" ");
}

// One import, answered: what it brought, or why it brought nothing. A
// refusal and a dropped connection are both failures the caller must show.
export async function postContentImport(campaignId: string, selection: ImportSelection, messages?: ImportMessages): Promise<ImportOutcome> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...selection, exclude: exclusionsOf(selection) }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return { ok: false, error: typeof data.error === "string" && data.error ? data.error : messages?.t("workshop.contentImport.error.refused") ?? "The import was refused." };
    }
    return { ok: true, copied: Number(data.copied) || 0, note: importNote(data, messages) };
  } catch {
    return { ok: false, error: messages?.t("workshop.contentImport.error.connection") ?? "Could not reach the server." };
  }
}

// Posts the chosen import after a campaign row exists, the same pattern as
// submitWorldSetup in src/app/WorldSetupFields.tsx for the same reason: the
// campaign has to exist before anything can be written into it. Null when
// nothing was chosen; otherwise the outcome, which the creator shows, since
// a campaign that was made without the prep it was meant to start from is
// not a finished campaign. A workshop whose pregens come with it is a
// choice even with nothing ticked.
export async function submitContentImport(campaignId: string, selection: ImportSelection, messages?: ImportMessages): Promise<ImportOutcome | null> {
  if (!bringsSomething(selection)) {
    return null;
  }
  return postContentImport(campaignId, selection, messages);
}
