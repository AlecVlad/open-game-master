"use client";

import { BookOpenText, Download, Hourglass, Lock, Map as MapIcon, MessageCircleQuestion, Network, PenLine, Shapes, Sparkles, Upload, Wand2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { workshopHref } from "@/lib/workshop/links";
import { mayLeaveDrafts } from "@/app/workshop/unsaved";
import { IconRail, type IconRailItem } from "@/components/ui/IconRail";
import { KitButton, Listed, PanelError } from "@/app/campaigns/[campaignId]/PanelKit";
import { useTourPrepare } from "@/lib/tours/prepare";
import { useWorld } from "./useWorld";
import { WikiView } from "./WikiView";
import { WebView } from "./WebView";
import { TimelineView } from "./TimelineView";
import { AtlasView } from "./AtlasView";
import { SecretsView } from "./SecretsView";
import { StubsView } from "./StubsView";
import { TypesView } from "./TypesView";
import { ForgeView } from "./ForgeView";
import { AskView } from "./AskView";
import { OutlineView } from "./OutlineView";
import { TablePrep } from "./TablePrep";
import type { OpenPrep } from "./PlaceBattleMaps";
import type { PlaceBindingKind } from "@/lib/worldforge/model";
import { offersImages, offersStoryModel, useCapabilities } from "@/lib/use-capabilities";
import type { SceneLoss } from "@/lib/worldforge/scenes";
import { SceneLosses } from "./SceneLosses";

// WorldForge in the workshop, and at the play table as the World tab.
// WorldForge is Smoebo's world-building app, built in with their blessing:
// a wiki of typed entries, the web of links between them, calendars and a
// timeline, an atlas of maps inside maps, secrets and who keeps them, and
// the names still to be written. Every entry is a record the table plays
// with (src/lib/worldforge/model.ts), so what is written here is what the
// Cast, the Region, Factions and Lore hold and what the AI DM is told.

type View = "wiki" | "web" | "timeline" | "atlas" | "secrets" | "stubs" | "types" | "outline" | "forge" | "ask";

// Outline, Forge and Ask need a text model; the rail leaves them out on a
// server that has none, and everything else works the same. Outline drafts
// a world from an idea (OutlineView.tsx) and Forge extracts from notes:
// two operations, two views. Drafting a world is the workshop's, not the
// play table's.
const AI_VIEWS: ReadonlySet<View> = new Set(["outline", "forge", "ask"]);
const WORKSHOP_VIEWS: ReadonlySet<View> = new Set(["outline"]);
const VIEW_LABEL_KEYS: Record<View, string> = {
  wiki: "workshop.world.view.wiki",
  outline: "workshop.world.view.outline",
  forge: "workshop.world.view.forge",
  ask: "workshop.world.view.ask",
  web: "workshop.world.view.web",
  timeline: "workshop.world.view.timeline",
  atlas: "workshop.world.view.atlas",
  secrets: "workshop.world.view.secrets",
  stubs: "workshop.world.view.stubs",
  types: "workshop.world.view.types",
};

const VIEWS: Array<{ value: View; label: string; icon: IconRailItem["icon"] }> = [
  { value: "wiki", label: "Wiki", icon: BookOpenText },
  { value: "outline", label: "Outline", icon: Wand2 },
  { value: "forge", label: "Forge", icon: Sparkles },
  { value: "ask", label: "Ask", icon: MessageCircleQuestion },
  { value: "web", label: "Web", icon: Network },
  { value: "timeline", label: "Timeline", icon: Hourglass },
  { value: "atlas", label: "Atlas", icon: MapIcon },
  { value: "secrets", label: "Secrets", icon: Lock },
  { value: "stubs", label: "To write", icon: PenLine },
  { value: "types", label: "Types", icon: Shapes },
];

type ImportReport = {
  created: number;
  updated: number;
  links: number;
  linksUpdated?: number;
  linksRemoved?: number;
  conflicts?: string[];
  conflictDetails?: WorldReportConflict[];
  matched?: string[];
  events: number;
  secrets: number;
  maps: number;
  beats: number;
  beatsUpdated?: number;
  scenesMatched?: string[];
  skipped: string[];
  losses?: string[];
  notes?: string[];
};

// A file that would not come in whole, waiting for the author's yes.
type Held = { text: string; losses: string[]; scenes: SceneLoss[]; notes: string[] };

// What a WorldForge file of this world could not carry, named before the
// download (audit WF-19).
type ExportCheck = { scenes: SceneLoss[]; notes: string[] };

const WORLD_REPORT_SLICE_KEYS: Record<string, string> = {
  entries: "workshop.contentImport.worldSlice.entries",
  folders: "workshop.contentImport.worldSlice.folders",
  calendars: "workshop.contentImport.worldSlice.calendars",
  events: "workshop.contentImport.worldSlice.events",
  secrets: "workshop.contentImport.worldSlice.secrets",
  stubs: "workshop.contentImport.worldSlice.stubs",
  maps: "workshop.contentImport.worldSlice.maps",
  pins: "workshop.contentImport.worldSlice.pins",
};
const WORLD_REPORT_FIELD_KEYS: Record<string, string> = {
  name: "name", title: "title", body: "body", text: "text", tagline: "tagline",
  notes: "notes", note: "note", article: "article", hiddenTruth: "hiddenTruth",
  canon: "canon", typeId: "typeId", folderId: "folderId", parentId: "parentId",
  aliases: "aliases", tags: "tags", portrait: "portrait", image: "image",
  knownBy: "knownBy", partyKnows: "partyKnows", subject: "subject", when: "when",
  refs: "refs", era: "era", regions: "regions", x: "position", y: "position",
  mapId: "mapId", linkedMapId: "linkedMapId", ref: "ref", status: "status",
  abbrev: "abbrev", epochOffset: "epochOffset", color: "color", source: "source",
  dmOnly: "dmOnly", npcId: "npcId", locationId: "locationId", fields: "custom",
};
const WORLD_REPORT_LINK_KEYS: Record<string, string> = {
  "allied with": "alliedWith", "enemy of": "enemyOf", "friend of": "friendOf",
  "rival of": "rivalOf", loves: "loves", fears: "fears", serves: "serves",
  "mentor of": "mentorOf", "member of": "memberOf", rules: "rules",
  "lives in": "livesIn", "located in": "locatedIn", worships: "worships",
  guards: "guards", seeks: "seeks", created: "created", destroyed: "destroyed",
  "parent of": "parentOf", "child of": "childOf", "spouse of": "spouseOf",
  "sibling of": "siblingOf", "descended from": "descendedFrom",
  "superior of": "superiorOf", "reports to": "reportsTo", "liege of": "liegeOf",
  "vassal of": "vassalOf",
};
type WorldReportConflict = { code: string; params: Record<string, string | number>; message: string };
function worldReportConflictText(
  notice: WorldReportConflict,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const params = { ...notice.params };
  if (typeof params.slice === "string" && WORLD_REPORT_SLICE_KEYS[params.slice]) {
    params.slice = t(WORLD_REPORT_SLICE_KEYS[params.slice] as never);
  }
  if (typeof params.field === "string") {
    if (params.field.startsWith("fields.")) {
      params.field = t("workshop.contentImport.worldField.custom" as never) + ": " + params.field.slice(7);
    } else if (WORLD_REPORT_FIELD_KEYS[params.field]) {
      params.field = t(("workshop.contentImport.worldField." + WORLD_REPORT_FIELD_KEYS[params.field]) as never);
    }
  }
  if ((notice.code.endsWith(".linkChanged") || notice.code.endsWith(".linkRemoved")) && typeof params.label === "string") {
    const linkKey = WORLD_REPORT_LINK_KEYS[params.label];
    if (linkKey) params.label = t(("workshop.contentImport.worldLinkLabel." + linkKey) as never);
  }
  return t(notice.code as never, params);
}

// The tool a record lives in, and optionally the record itself with the
// World entry to come back to (src/lib/workshop/links.ts).
export type OpenSystem = (system: string, record?: { id: string; from: string }) => void;

// Where the World tab was at this table, kept for this browser tab only: the
// campaign page has no address for it, and the tab's panel is drawn again
// each time it is opened. A browser with no storage starts on the wiki.
type Place = { view: View; entry: string | null };
const placeKey = (campaignId: string) => `odm:world-place:${campaignId}`;
function readPlace(campaignId: string): Place {
  try {
    const raw = JSON.parse(sessionStorage.getItem(placeKey(campaignId)) ?? "null") as Partial<Place> | null;
    const view = VIEWS.some((entry) => entry.value === raw?.view) ? (raw!.view as View) : "wiki";
    return { view, entry: typeof raw?.entry === "string" ? raw.entry : null };
  } catch {
    return { view: "wiki", entry: null };
  }
}
function keepPlace(campaignId: string, place: Place) {
  try {
    sessionStorage.setItem(placeKey(campaignId), JSON.stringify(place));
  } catch {
    // The place is a convenience; without storage the tab opens on the wiki.
  }
}

export function WorldForgePanel({
  campaignId,
  at = "workshop",
  canShowHandouts = false,
  onOpenSystem,
  onCreate,
  refreshKey = 0,
}: {
  campaignId: string;
  // The workshop, whose address holds the view and entry and which brings
  // files in and out; or the play table's World tab (audit WF-10), where the
  // world is the campaign's own copy, read and written through the routes
  // that answer only story authority, with no files and no Create.
  at?: "workshop" | "table";
  // The DM seat at the table, who may put a revealed secret on every screen
  // as a handout ("Show this now" is theirs alone).
  canShowHandouts?: boolean;
  // A record's own workshop tool. The table has none to open.
  onOpenSystem?: OpenSystem;
  // The workshop's Create chooser, offered while the world is empty.
  onCreate?: () => void;
  // Bumped when any record changed elsewhere (useWorkshopVersions).
  refreshKey?: number;
}) {
  const { t, tp } = useI18n();
  const api = useWorld(campaignId);
  const capabilities = useCapabilities();
  const canWrite = offersStoryModel(capabilities);
  const canPaint = offersImages(capabilities);
  // The view and the open entry live in the URL, so refresh and Back land
  // where the author was and an entry can be linked to (audit WF-11).
  // At the table the panel keeps them itself (readPlace).
  const atTable = at === "table";
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tablePlace, setTablePlace] = useState<Place>(() => (atTable ? readPlace(campaignId) : { view: "wiki", entry: null }));
  const askedView = atTable ? tablePlace.view : params.get("view");
  const chosenView: View = VIEWS.some((entry) => entry.value === askedView) ? (askedView as View) : "wiki";
  const view: View = (!canWrite && AI_VIEWS.has(chosenView)) || (atTable && WORKSHOP_VIEWS.has(chosenView)) ? "wiki" : chosenView;
  const focus = atTable ? tablePlace.entry : params.get("entry");
  // A move to another entry or view closes an open editor, so it asks first
  // when the editor has changes (src/app/workshop/unsaved.ts); a tour's
  // moves do not ask.
  async function go(next: { view?: View; entry?: string | null }, how: "push" | "replace" = "push") {
    if (how === "push" && !(await mayLeaveDrafts())) return;
    const place: Place = { view: next.view ?? chosenView, entry: next.entry === undefined ? focus : next.entry };
    if (atTable) {
      setTablePlace(place);
      keepPlace(campaignId, place);
      return;
    }
    const href = workshopHref(pathname, { system: "world", ...place });
    if (how === "replace") router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }
  const setView = (next: View) => void go({ view: next });
  const setFocus = (ref: string | null) => void go({ entry: ref });
  const [report, setReport] = useState<ImportReport | null>(null);
  const [reading, setReading] = useState(false);
  const [held, setHeld] = useState<Held | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const world = api.world;

  // Records changed here or in another tab: the world is read again. An
  // open entry editor keeps its draft (WF-02 handles a clash on save).
  const { refresh } = api;
  useEffect(() => {
    if (refreshKey) refresh();
  }, [refreshKey, refresh]);

  // The tour and the palette ask for a view, or for a new entry, by name
  // (src/lib/tours/prepare.ts).
  // A tour's steps replace the place rather than adding to history.
  // A tour step for a view this server does not offer here has nothing to
  // show (an AI view with no text model, a workshop view at the table), and
  // one already open needs no new place. The tour asks again on each render
  // of its step, so going there anyway replaced the place over and over:
  // the app's screens froze on Outline with no text model.
  const offered = (asked: View) =>
    VIEWS.some((entry) => entry.value === asked) && (canWrite || !AI_VIEWS.has(asked)) && !(atTable && WORKSHOP_VIEWS.has(asked));
  useTourPrepare((name) => {
    if (name.split(":")[0] === "open-world-entry" && view !== "wiki") void go({ view: "wiki" }, "replace");
    const asked = name.startsWith("world-view-") ? (name.slice("world-view-".length) as View) : null;
    if (asked && asked !== view && offered(asked)) void go({ view: asked }, "replace");
  });

  const open = (ref: string | null) => void go(ref ? { view: "wiki", entry: ref } : { entry: null });

  // A place's battle map or encounter (PlaceBattleMaps): the workshop's map
  // library or Encounters, with the way back to the place; at the table, a
  // sheet over the tab, after which the place's lines are read again (a
  // map whose walls were just drawn says so).
  const [tablePrep, setTablePrep] = useState<{ kind: PlaceBindingKind; id: string } | null>(null);
  const openPrep: OpenPrep | undefined = onOpenSystem
    ? (kind, id, from) => onOpenSystem(kind === "map" ? "maps" : "encounters", { id, from })
    : atTable
      ? (kind, id) => setTablePrep({ kind, id })
      : undefined;

  async function bringIn(text: string, accept: boolean) {
    setReading(true);
    setReport(null);
    setHeld(null);
    try {
      const result = await api.importFile(text, accept);
      if (result?.preview) {
        setHeld({ text, losses: (result.losses as string[]) ?? [], scenes: (result.scenes as SceneLoss[]) ?? [], notes: (result.notes as string[]) ?? [] });
      }
      else if (result) setReport(result as unknown as ImportReport);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function importFile(file: File) {
    await bringIn(await file.text(), false);
  }

  // Saving as a WorldForge file asks first what the file cannot carry, and
  // downloads straight away when the answer is nothing.
  const exportHref = `/api/campaigns/${campaignId}/world/export`;
  const [checking, setChecking] = useState(false);
  const [exportHeld, setExportHeld] = useState<ExportCheck | null>(null);
  const [exportError, setExportError] = useState("");
  function download() {
    const link = document.createElement("a");
    link.href = exportHref;
    link.download = "";
    link.click();
  }
  async function saveFile() {
    setChecking(true);
    setExportHeld(null);
    setExportError("");
    try {
      const response = await fetch(`${exportHref}?check=1`);
      const check = response.ok ? ((await response.json()) as ExportCheck) : null;
      if (!check) setExportError(t("workshop.world.panel.export.checkFailed"));
      else if (check.scenes.length) setExportHeld(check);
      else download();
    } catch {
      setExportError(t("workshop.world.panel.export.checkFailed"));
    } finally {
      setChecking(false);
    }
  }

  const counts: Partial<Record<View, number>> = world
    ? {
        wiki: world.entities.length,
        web: world.doc.links.length,
        timeline: world.doc.events.length,
        atlas: world.doc.maps.length,
        secrets: world.doc.secrets.filter((secret) => !secret.partyKnows).length,
        stubs: world.doc.stubs.filter((stub) => stub.status === "open").length,
      }
    : {};

  return (
    // A container: every view lays out by the width the panel has, not the
    // window's, so the table's side column gets the narrow layouts.
    <section className="@container flex flex-col gap-3" aria-label={t("workshop.system.world.label")} data-world-at={at}>
      {atTable ? (
        <p className="text-xs text-stone-500" data-testid="world-table-note">
          {t("workshop.world.panel.tableNote")}
        </p>
      ) : (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-stone-500">
          {t("workshop.world.panel.description")}
        </p>
        <span className="ml-auto flex gap-1.5">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])} />
          <KitButton tone="small" busy={reading} disabled={reading} onClick={() => fileRef.current?.click()} title={t("workshop.world.panel.import.title")} data-tour="world-import">
            {reading ? null : <Upload className="size-3.5" />} {t("workshop.world.panel.import.button")}
          </KitButton>
          <KitButton tone="small" busy={checking} disabled={checking} onClick={saveFile} title={t("workshop.world.panel.export.title")} data-tour="world-export">
            {checking ? null : <Download className="size-3.5" />} {t("workshop.world.panel.export.button")}
          </KitButton>
        </span>
      </div>
      )}
      {exportError ? <PanelError>{exportError}</PanelError> : null}
      {exportHeld ? (
        <div className="motion-pop flex flex-col gap-2 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100" role="alert" data-testid="world-export-losses">
          <span>{t("workshop.world.panel.export.lossWarning")}</span>
          <SceneLosses scenes={exportHeld.scenes} label={t("workshop.world.panel.export.lossesLabel")} />
          {exportHeld.notes.map((note) => (
            <span key={note} className="text-stone-300">{note}</span>
          ))}
          <span className="text-stone-300">{t("workshop.world.panel.export.bundleNote")}</span>
          <span className="flex flex-wrap gap-2">
            <a href={exportHref} download onClick={() => setExportHeld(null)} className="pk-tap inline-flex items-center gap-1.5 rounded-lg border border-stone-600/60 bg-stone-900/50 px-2.5 py-1 text-xs text-stone-300 hover:border-amber-500/40 hover:text-amber-100 motion-press">
              <Download className="size-3.5" /> {t("workshop.world.panel.export.saveAnyway")}
            </a>
            {onOpenSystem ? (
              <KitButton tone="small" onClick={() => onOpenSystem("share")}>
                {t("workshop.world.panel.export.shareInstead")}
              </KitButton>
            ) : null}
            <KitButton tone="small" onClick={() => setExportHeld(null)}>
              {t("workshop.world.panel.cancel")}
            </KitButton>
          </span>
        </div>
      ) : null}
      {held ? (
        <div className="motion-pop flex flex-col gap-2 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100" role="alert" data-testid="world-import-losses">
          <span>{t("workshop.world.panel.import.lossWarning")}</span>
          {held.losses.length ? (
            <ul className="list-disc pl-4">
              {held.losses.map((loss) => (
                <li key={loss}>{loss}</li>
              ))}
            </ul>
          ) : null}
          <SceneLosses scenes={held.scenes} label={t("workshop.world.panel.import.lossesLabel")} />
          {held.notes.map((note) => (
            <span key={note} className="text-stone-300">{note}</span>
          ))}
          <span className="flex flex-wrap gap-2">
            <KitButton tone="small" busy={reading} disabled={reading} onClick={() => bringIn(held.text, true)}>
              {t("workshop.world.panel.import.bringAnyway")}
            </KitButton>
            <KitButton tone="small" onClick={() => setHeld(null)}>
              {t("workshop.world.panel.cancel")}
            </KitButton>
          </span>
        </div>
      ) : null}
      {report ? (
        <div className="motion-pop rounded-lg border border-emerald-700/40 bg-emerald-900/15 px-3 py-2 text-xs text-stone-200" role="status">
          <p>{t("workshop.world.panel.report.summary", { created: report.created, updated: report.updated, links: report.links, events: report.events, secrets: report.secrets, maps: report.maps })}</p>
          {report.beats ? <span className="block">{tp("workshop.world.panel.report.beats", report.beats)}</span> : null}
          {report.beatsUpdated ? (
            <span className="block">{t("workshop.world.panel.report.beatsUpdated", { count: report.beatsUpdated })}</span>
          ) : null}
          {report.scenesMatched?.length ? (
            <span className="block text-amber-300">{t("workshop.world.panel.report.scenesMatched", { names: report.scenesMatched.join(", ") })}</span>
          ) : null}
          {report.linksUpdated || report.linksRemoved ? (
            <span className="block">{t("workshop.world.panel.report.links", { updated: report.linksUpdated ?? 0, removed: report.linksRemoved ?? 0 })}</span>
          ) : null}
          {report.conflictDetails?.length ? report.conflictDetails.map((detail, index) => (
            <span key={index} className="block text-amber-300">{worldReportConflictText(detail, t)}</span>
          )) : report.conflicts?.length ? (
            <span className="block text-amber-300">{report.conflicts.join(" ")}</span>
          ) : null}
          {report.matched?.length ? (
            <span className="block text-amber-300">{t("workshop.world.panel.report.matched", { names: report.matched.join(", ") })}</span>
          ) : null}
          {report.skipped.length ? <span className="block text-amber-300">{t("workshop.world.panel.report.skipped", { items: report.skipped.join("; ") })}</span> : null}
          {report.losses?.length ? <span className="block text-amber-300">{t("workshop.world.panel.report.losses", { items: report.losses.join(" ") })}</span> : null}
          {report.notes?.length ? <span className="block text-stone-300">{report.notes.join(" ")}</span> : null}
        </div>
      ) : null}
      {api.error && !world ? <PanelError>{api.error}</PanelError> : null}
      {!canWrite || !canPaint ? (
        <p className="text-[11px] text-stone-500" data-tour="world-ai-note">
          {!canWrite && !canPaint
            ? t("workshop.world.panel.capability.both")
            : !canWrite
              ? t("workshop.world.panel.capability.text")
              : t("workshop.world.panel.capability.images")}
        </p>
      ) : null}

      <IconRail
        items={VIEWS.filter((entry) => (canWrite || !AI_VIEWS.has(entry.value)) && !(atTable && WORKSHOP_VIEWS.has(entry.value))).map((entry) => ({ ...entry, label: t(VIEW_LABEL_KEYS[entry.value] as never), badge: counts[entry.value] || undefined, tour: `world-view-${entry.value}` }))}
        value={view}
        onChange={setView}
        orientation="horizontal"
        // The table's side column is narrow: every view stays in sight on
        // a second row rather than behind a sideways scroll, and the mark
        // follows the chosen view down a row (chip-rail, menus.css).
        className={cn("border-b border-stone-800/80 pb-1", atTable && "chip-rail flex-wrap")}
      />

      <Listed loaded={api.loaded} error={api.loadError} onRetry={api.refresh} loading={t("workshop.world.panel.loading")} rows={4}>
        {world ? (
          // Keyed by view so the incoming one rises in instead of cutting.
          <div key={view} className="motion-tab">
            {view === "wiki" ? <WikiView campaignId={campaignId} api={api} world={world} focus={focus} onFocus={setFocus} onOpenSystem={onOpenSystem} onOpenPrep={openPrep} onCreate={onCreate} onDraftWorld={canWrite && !atTable ? () => setView("outline") : undefined} atTable={atTable} canWrite={canWrite} canPaint={canPaint} /> : null}
            {view === "outline" ? <OutlineView api={api} world={world} onOpen={open} onOpenSystem={onOpenSystem} /> : null}
            {view === "forge" ? <ForgeView api={api} world={world} onOpen={open} /> : null}
            {view === "ask" ? <AskView api={api} world={world} onOpen={open} /> : null}
            {view === "web" ? <WebView world={world} focus={focus} onOpen={open} /> : null}
            {view === "timeline" ? <TimelineView api={api} world={world} onOpen={open} /> : null}
            {view === "atlas" ? <AtlasView campaignId={campaignId} api={api} world={world} onOpen={open} onOpenPrep={openPrep} atTable={atTable} /> : null}
            {view === "secrets" ? <SecretsView api={api} world={world} onOpen={open} atTable={atTable} canShowHandouts={canShowHandouts} /> : null}
            {view === "stubs" ? <StubsView api={api} world={world} onOpen={open} /> : null}
            {view === "types" ? <TypesView api={api} world={world} /> : null}
            {api.error && !["wiki", "forge", "ask"].includes(view) ? <PanelError className="mt-2">{api.error}</PanelError> : null}
          </div>
        ) : null}
      </Listed>
      {tablePrep ? (
        <TablePrep
          campaignId={campaignId}
          open={tablePrep}
          onClose={() => {
            setTablePrep(null);
            refresh();
          }}
        />
      ) : null}
    </section>
  );
}
