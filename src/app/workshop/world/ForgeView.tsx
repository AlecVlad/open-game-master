"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { Select } from "@/components/ui/Select";
import { KitButton, PanelError } from "@/app/campaigns/[campaignId]/PanelKit";
import type { ForgeApplied, ForgeEntity, ForgeLink, ForgePreview } from "@/lib/worldforge/forge";
import type { WorldApi, WorldState } from "./useWorld";
import { TypeChip, typeOf } from "./world-ui";

// The forge, after WorldForge's: paste notes (a session recap, a page of a
// setting, another tool's brainstorm) and the model lists what in them
// deserves an entry and how those things stand with each other. Nothing is
// written until the DM ticks what to keep, and the forge only adds: a name
// the world already has shows as there, never rewritten. Unticked names can
// be kept as names to write later. Links alone, between entries the world
// already has, can be kept too, and the report after says exactly what was
// and was not applied (audit WF-08): every entry, link and name left out,
// with why. Drafting a world from an idea is a different operation, in the
// Outline view (OutlineView.tsx); the forge keeps to what the notes say.

type Row = ForgeEntity & { keep: boolean };
type LinkRow = ForgeLink & { keep: boolean };

const FORGE_LINK_KEYS: Record<string, string> = {
  "allied with": "workshop.contentImport.worldLinkLabel.alliedWith",
  "enemy of": "workshop.contentImport.worldLinkLabel.enemyOf",
  "friend of": "workshop.contentImport.worldLinkLabel.friendOf",
  "rival of": "workshop.contentImport.worldLinkLabel.rivalOf",
  loves: "workshop.contentImport.worldLinkLabel.loves",
  fears: "workshop.contentImport.worldLinkLabel.fears",
  serves: "workshop.contentImport.worldLinkLabel.serves",
  "mentor of": "workshop.contentImport.worldLinkLabel.mentorOf",
  "member of": "workshop.contentImport.worldLinkLabel.memberOf",
  rules: "workshop.contentImport.worldLinkLabel.rules",
  "lives in": "workshop.contentImport.worldLinkLabel.livesIn",
  "located in": "workshop.contentImport.worldLinkLabel.locatedIn",
  worships: "workshop.contentImport.worldLinkLabel.worships",
  guards: "workshop.contentImport.worldLinkLabel.guards",
  seeks: "workshop.contentImport.worldLinkLabel.seeks",
  created: "workshop.contentImport.worldLinkLabel.created",
  destroyed: "workshop.contentImport.worldLinkLabel.destroyed",
  "parent of": "workshop.contentImport.worldLinkLabel.parentOf",
  "child of": "workshop.contentImport.worldLinkLabel.childOf",
  "spouse of": "workshop.contentImport.worldLinkLabel.spouseOf",
  "sibling of": "workshop.contentImport.worldLinkLabel.siblingOf",
  "descended from": "workshop.contentImport.worldLinkLabel.descendedFrom",
  "superior of": "workshop.contentImport.worldLinkLabel.superiorOf",
  "reports to": "workshop.contentImport.worldLinkLabel.reportsTo",
  "liege of": "workshop.contentImport.worldLinkLabel.liegeOf",
  "vassal of": "workshop.contentImport.worldLinkLabel.vassalOf",
};

function forgeReportLines(applied: ForgeApplied, t: (key: string, params?: Record<string, string | number>) => string, tp: (key: string, count: number) => string) {
  const added = [
    applied.created ? tp("workshop.world.forge.report.count.entries", applied.created) : "",
    applied.links ? tp("workshop.world.forge.report.count.links", applied.links) : "",
  ].filter(Boolean);
  const kept = applied.stubs ? tp("workshop.world.forge.report.count.stubs", applied.stubs) : "";
  const lines: Array<{ text: string; left: boolean }> = [{
    text: added.length && kept
      ? t("workshop.world.forge.report.summary.addedWithStubs", { added: added.join(", "), kept })
      : added.length
        ? t("workshop.world.forge.report.summary.added", { added: added.join(", ") })
        : kept
          ? t("workshop.world.forge.report.summary.onlyStubs", { kept })
          : t("workshop.world.forge.report.summary.nothing"),
    left: false,
  }];
  if (applied.made.length) {
    lines.push({ text: t("workshop.world.forge.report.newEntries", { names: applied.made.map((row) => row.name).join(", ") }), left: false });
  }
  if (applied.failed.length) {
    const entries = applied.failed.map((row) => {
      const reason = row.errorCode ? t(row.errorCode as never, row.errorParams) : row.error;
      return `${row.name} (${reason})`;
    }).join("; ");
    lines.push({ text: t("workshop.world.forge.report.notAdded", { entries }), left: true });
  }
  if (applied.linksLeft.length) {
    const entries = applied.linksLeft.map((link) => {
      const label = FORGE_LINK_KEYS[link.label] ? t(FORGE_LINK_KEYS[link.label] as never) : link.label;
      const reason = link.whyCode ? t(link.whyCode as never, link.whyParams) : link.why;
      return `${link.from} ${label} ${link.to} (${reason})`;
    }).join("; ");
    lines.push({ text: t("workshop.world.forge.report.linksLeft", { entries }), left: true });
  }
  if (applied.stubsLeft.length) {
    const entries = applied.stubsLeft.map((stub) => {
      const reason = stub.whyCode ? t(stub.whyCode as never, stub.whyParams) : stub.why;
      return `${stub.name} (${reason})`;
    }).join("; ");
    lines.push({ text: t("workshop.world.forge.report.stubsLeft", { entries }), left: true });
  }
  return { lines, partial: applied.failed.length > 0 || applied.linksLeft.length > 0 || applied.stubsLeft.length > 0 };
}

export function ForgeView({ api, world, onOpen }: { api: WorldApi; world: WorldState; onOpen: (ref: string) => void }) {
  const { t, tp } = useI18n();
  const { doc, entities } = world;
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [stubTheRest, setStubTheRest] = useState(true);
  const [report, setReport] = useState<ForgeApplied | null>(null);
  const nameOf = (key: string) => rows?.find((row) => row.key === key)?.name ?? entities.find((entity) => entity.ref === key)?.name ?? key;

  async function forge() {
    setBusy(true);
    setReport(null);
    const payload = await api.ai("forge", { text, hint });
    setBusy(false);
    const preview = payload?.preview as ForgePreview | undefined;
    if (!preview) return;
    setRows(preview.entities.map((entity) => ({ ...entity, keep: !entity.existing })));
    setLinks(preview.links.map((link) => ({ ...link, keep: true })));
  }

  async function keep() {
    if (!rows) return;
    const chosen = rows.filter((row) => row.keep && !row.existing);
    setBusy(true);
    // Every ticked link goes, with the names on screen: one whose end was
    // not kept is reported as left out, not dropped without a word.
    const result = await api.ai("apply", {
      entities: chosen,
      links: links.filter((link) => link.keep).map((link) => ({ ...link, fromName: nameOf(link.from), toName: nameOf(link.to) })),
      stubs: stubTheRest ? rows.filter((row) => !row.keep && !row.existing).map((row) => row.name) : [],
    });
    setBusy(false);
    if (!result) return;
    setReport(result as unknown as ForgeApplied);
    setRows(null);
    setLinks([]);
    setText("");
  }

  const reportView = report ? forgeReportLines(report, (key, params) => t(key as never, params), (key, count) => tp(key as never, count)) : null;

  const set = (key: string, patch: Partial<Row>) => setRows((current) => current?.map((row) => (row.key === key ? { ...row, ...patch } : row)) ?? null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-400">{t("workshop.world.forge.intro")}</p>
      <textarea className={cn(ui.input, "min-h-36")} placeholder={t("workshop.world.forge.notesPlaceholder")} aria-label={t("workshop.world.forge.notesAria")} maxLength={20_000} value={text} onChange={(event) => setText(event.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <input className={cn(ui.input, "max-w-md flex-1 text-xs")} placeholder={t("workshop.world.forge.hintPlaceholder")} aria-label={t("workshop.world.forge.hintAria")} maxLength={300} value={hint} onChange={(event) => setHint(event.target.value)} />
        <KitButton tone="primary" busy={busy && !rows} disabled={busy || !text.trim()} onClick={forge} data-tour="world-forge">
          {busy && !rows ? null : <Sparkles className="size-3.5" />} {t("workshop.world.forge.button")}
        </KitButton>
      </div>
      {api.error ? <PanelError>{api.error}</PanelError> : null}
      {report ? (
        <div className={cn("motion-pop flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-xs text-stone-200", reportView?.partial ? "border-amber-600/50 bg-amber-900/15" : "border-emerald-700/40 bg-emerald-900/15")} role="status" data-testid="forge-report">
          {reportView?.lines.map((line, at) => (
            <p key={at} className={line.left ? "text-amber-200" : undefined}>{line.text}</p>
          ))}
        </div>
      ) : null}

      {rows ? (
        <section className="flex flex-col gap-2 animate-fade-up" aria-label={t("workshop.world.forge.foundAria")}>
          <h3 className="eyebrow text-[10px] text-amber-400/80">{t("workshop.world.forge.foundTitle", { count: rows.length })}</h3>
          <ul className="flex flex-col gap-1.5">
            {rows.map((row, index) => (
              <li key={row.key} className={cn("panel wf-rise flex flex-col gap-1.5 rounded-lg p-2.5", !row.keep && "opacity-60")} style={{ "--i": index } as React.CSSProperties}>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="checkbox" className="accent-amber-400" aria-label={t("workshop.world.forge.keepNameAria" as never, { name: row.name })} checked={row.keep} disabled={Boolean(row.existing)} onChange={(event) => set(row.key, { keep: event.target.checked })} />
                  <input className={cn(ui.input, "w-48 py-1 text-sm")} aria-label={t("workshop.world.forge.nameAria")} maxLength={80} value={row.name} disabled={Boolean(row.existing)} onChange={(event) => set(row.key, { name: event.target.value })} />
                  {row.existing ? (
                    <button type="button" onClick={() => onOpen(row.existing)} className="pk-chip text-[11px] text-stone-400">{t("workshop.world.forge.alreadyInWorld")}</button>
                  ) : (
                    <div className="w-44">
                      <Select label={t("workshop.world.forge.type")} size="sm" value={row.typeId} onChange={(typeId) => set(row.key, { typeId })} options={doc.types.map((type) => ({ value: type.id, label: type.name }))} />
                    </div>
                  )}
                  {row.existing ? <TypeChip type={typeOf(doc, entities.find((entity) => entity.ref === row.existing)!)} /> : null}
                </div>
                {!row.existing ? (
                  <textarea className={cn(ui.input, "min-h-12 text-xs")} aria-label={t("workshop.world.forge.summaryAria" as never, { name: row.name })} maxLength={2_000} value={row.summary} onChange={(event) => set(row.key, { summary: event.target.value })} />
                ) : null}
                {row.hiddenTruth && !row.existing ? <p className="text-xs text-red-300">{t("workshop.world.forge.hiddenTruth")} {row.hiddenTruth}</p> : null}
              </li>
            ))}
          </ul>
          {links.length ? (
            <>
              <h3 className="eyebrow mt-1 text-[10px] text-amber-400/80">{t("workshop.world.forge.links")}</h3>
              <ul className="flex flex-col gap-1">
                {links.map((link, index) => (
                  <li key={`${link.from}-${link.to}-${link.label}`} className="wf-rise flex items-center gap-2 text-sm text-stone-300" style={{ "--i": index } as React.CSSProperties}>
                    <input type="checkbox" className="accent-amber-400" aria-label={t("workshop.world.forge.keepLinkAria" as never, { from: nameOf(link.from), label: FORGE_LINK_KEYS[link.label] ? t(FORGE_LINK_KEYS[link.label] as never) : link.label, to: nameOf(link.to) })} checked={link.keep} onChange={(event) => setLinks((current) => current.map((entry, at) => (at === index ? { ...entry, keep: event.target.checked } : entry)))} />
                    {nameOf(link.from)} <span className="text-stone-500">{link.label}</span> {nameOf(link.to)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-stone-400">
            <input type="checkbox" className="accent-amber-400" checked={stubTheRest} onChange={(event) => setStubTheRest(event.target.checked)} />
            {t("workshop.world.forge.keepUnticked")}
          </label>
          <div className="flex justify-end gap-2">
            <KitButton tone="small" onClick={() => { setRows(null); setLinks([]); }}>{t("workshop.world.forge.discard")}</KitButton>
            <KitButton tone="primary" busy={busy} disabled={busy || !(rows.some((row) => row.keep && !row.existing) || links.some((link) => link.keep))} onClick={keep}>
              {busy ? null : <Check className="size-3.5" />} {t("workshop.world.forge.addTicked")}
            </KitButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}
