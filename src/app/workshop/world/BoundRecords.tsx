"use client";

import { Link2, Plus, Swords, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { KitButton, PanelError } from "@/app/campaigns/[campaignId]/PanelKit";
import { ContentPick } from "@/components/ui/ContentPick";
import { Select } from "@/components/ui/Select";
import { BINDINGS_MAX, isPlaceBinding, type Binding, type BindingKind, type PlaceBindingKind } from "@/lib/worldforge/model";
import type { WorldEntity } from "@/lib/db/world-forge";
import type { WorldApi } from "./useWorld";
import type { OpenSystem } from "./WorldForgePanel";

// "Use at the table": the playable records a World entry stands for (audit
// finding WF-17). A creature's stat block in the Bestiary, an artifact's
// item in Homebrew: made from the entry, or picked from the author's own
// shelf or the rulebook, opened in their own tools, and a stat block put
// into a fight as that exact monster. The entry keeps a link, never a copy
// (src/lib/worldforge/model.ts Binding).

// A place's battle maps and encounters are its own section (PlaceBattleMaps).
type RecordKind = Exclude<BindingKind, PlaceBindingKind>;
type Own = { ref: string; name: string };

export function BoundRecords({
  campaignId,
  entity,
  api,
  loreOnly,
  onOpenSystem,
}: {
  campaignId: string;
  entity: WorldEntity;
  api: WorldApi;
  // An artifact with no item linked: lore the table cannot hold yet.
  loreOnly: boolean;
  // Absent at the play table (WikiView): a fight added to is said here
  // instead of opened in the workshop's Encounters.
  onOpenSystem?: OpenSystem;
}) {
  const { t } = useI18n();
  const words: Record<RecordKind, { one: string; plural: string; tool: string; system: string }> = {
    monster: { one: t("workshop.world.boundRecords.monster.one"), plural: t("workshop.world.boundRecords.monster.plural"), tool: t("workshop.world.boundRecords.monster.tool"), system: "bestiary" },
    item: { one: t("workshop.world.boundRecords.item.one"), plural: t("workshop.world.boundRecords.item.plural"), tool: t("workshop.world.boundRecords.item.tool"), system: "homebrew" },
  };
  const [adding, setAdding] = useState<RecordKind | null>(null);
  const [own, setOwn] = useState<Own[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fighting, setFighting] = useState<string | null>(null);
  const [fights, setFights] = useState<Array<{ id: string; name: string }>>([]);
  const [fight, setFight] = useState("__new");
  const [added, setAdded] = useState("");
  const bindings = entity.entry.bindings;
  const full = bindings.length >= BINDINGS_MAX;

  // The author's own shelf for the kind being linked: there with or without
  // the rulebook's content pack.
  useEffect(() => {
    if (!adding) return;
    let cancelled = false;
    const url = adding === "monster" ? `/api/campaigns/${campaignId}/dm/bestiary` : `/api/homebrew?kind=item`;
    fetch(url)
      .then((response) => (response.ok ? response.json() : {}))
      .then((data: { monsters?: Array<{ id: string; draft: { name: string } }>; entries?: Array<{ id: string; name: string }> }) => {
        if (cancelled) return;
        const rows = adding === "monster" ? (data.monsters ?? []).map((monster) => ({ id: monster.id, name: monster.draft.name })) : data.entries ?? [];
        setOwn(rows.map((row) => ({ ref: `homebrew:${row.id}`, name: row.name })));
      })
      .catch(() => setOwn([]));
    return () => {
      cancelled = true;
    };
  }, [adding, campaignId]);

  // The workshop's fights, for "Add to a fight".
  useEffect(() => {
    if (!fighting) return;
    let cancelled = false;
    fetch(`/api/campaigns/${campaignId}/dm/encounter-templates`)
      .then((response) => (response.ok ? response.json() : {}))
      .then((data: { templates?: Array<{ id: string; name: string }> }) => {
        if (!cancelled) setFights((data.templates ?? []).map((template) => ({ id: template.id, name: template.name })));
      })
      .catch(() => setFights([]));
    return () => {
      cancelled = true;
    };
  }, [fighting, campaignId]);

  // Links change as a field of the entry: with what the page opened with,
  // so a link someone else added meanwhile is not lost (WF-02).
  async function setLinks(next: Binding[]) {
    setBusy(true);
    setError("");
    const outcome = await api.update(entity.ref, { bindings: next }, { bindings });
    setBusy(false);
    if (!outcome) setError(api.error || t("workshop.world.boundRecords.error.linkNotSaved"));
    else if ("conflicts" in outcome) setError(t("workshop.world.boundRecords.error.conflict"));
    return Boolean(outcome && !("conflicts" in outcome));
  }

  async function link(kind: RecordKind, ref: string) {
    if (bindings.some((binding) => binding.kind === kind && binding.ref === ref)) {
      setAdding(null);
      return;
    }
    if (await setLinks([...bindings, { kind, ref }])) setAdding(null);
  }

  // A new record on the author's shelf, named for the entry, then linked.
  async function make(kind: RecordKind) {
    setBusy(true);
    setError("");
    const response =
      kind === "monster"
        ? await fetch(`/api/campaigns/${campaignId}/dm/bestiary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: "cr", name: entity.name, cr: 1 }) })
        : await fetch(`/api/homebrew`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "item", name: entity.name, data: {} }) });
    const data = (await response.json().catch(() => ({}))) as { monster?: { id: string }; entry?: { id: string }; error?: string };
    setBusy(false);
    const id = data.monster?.id ?? data.entry?.id;
    if (!response.ok || !id) {
      setError(data.error ?? t("workshop.world.boundRecords.error.make", { type: words[kind].one }));
      return;
    }
    await link(kind, `homebrew:${id}`);
  }

  async function addToFight(ref: string) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/campaigns/${campaignId}/world/entities/${encodeURIComponent(entity.ref)}/encounter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monster: ref, ...(fight !== "__new" ? { templateId: fight } : {}) }),
    });
    const data = (await response.json().catch(() => ({}))) as { templateId?: string; error?: string };
    setBusy(false);
    if (!response.ok || !data.templateId) {
      setError(data.error ?? t("workshop.world.boundRecords.error.fight"));
      return;
    }
    setFighting(null);
    if (onOpenSystem) onOpenSystem("encounters", { id: data.templateId, from: entity.ref });
    else setAdded(fight === "__new" ? t("workshop.world.boundRecords.fight.newAdded", { name: entity.name }) : t("workshop.world.boundRecords.fight.added", { name: fights.find((entry) => entry.id === fight)?.name ?? t("workshop.world.boundRecords.fight.fallback") }));
  }

  // Every WorldForge page is the DM's (requireStoryAuthority): linking needs
  // no model, so it is offered wherever the page is.
  if (entity.shelf === "npc") return null;

  return (
    <section className="flex flex-col gap-2" data-testid="world-bound">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow text-[10px] text-stone-500">{t("workshop.world.boundRecords.heading")}</span>
        {loreOnly ? (
          <span className="rounded-md border border-amber-700/50 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-amber-300" data-testid="world-lore-only" title={t("workshop.world.boundRecords.loreOnly.title")}>
            {t("workshop.world.boundRecords.loreOnly.label")}
          </span>
        ) : null}
      </div>
      {loreOnly ? <p className="text-xs text-stone-400">{t("workshop.world.boundRecords.loreOnly.explanation")}</p> : null}

      {entity.bound.flatMap((record) => (isPlaceBinding(record.kind) ? [] : [{ ...record, kind: record.kind as RecordKind }])).map((record) => (
        <div key={`${record.kind}|${record.ref}`} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-stone-700/60 px-2 py-1.5 text-sm" data-testid="world-bound-record">
          <span className="text-[10px] uppercase tracking-[0.12em] text-stone-500">{words[record.kind].one}</span>
          {record.found ? (
            <span className="text-stone-100">
              {record.name}
              {record.detail ? <span className="text-stone-500"> · {record.detail}</span> : null}
            </span>
          ) : (
            <span className="text-amber-300">{t("workshop.world.boundRecords.notFound")}</span>
          )}
          <span className="ml-auto flex flex-wrap gap-1">
            {record.found && record.ownId && onOpenSystem ? (
              <KitButton tone="small" onClick={() => onOpenSystem(words[record.kind].system, { id: record.ownId, from: entity.ref })} title={t("workshop.world.boundRecords.openInTool", { tool: words[record.kind].tool })}>{t("workshop.world.boundRecords.open")}</KitButton>
            ) : null}
            {record.found && record.kind === "monster" ? (
              <KitButton tone="small" onClick={() => setFighting(fighting === record.ref ? null : record.ref)} aria-expanded={fighting === record.ref}>
                <Swords className="size-3.5" /> {t("workshop.world.boundRecords.addToFight")}
              </KitButton>
            ) : null}
            <KitButton tone="small" busy={busy} disabled={busy} onClick={() => void setLinks(bindings.filter((binding) => !(binding.kind === record.kind && binding.ref === record.ref)))} title={t("workshop.world.boundRecords.unlink.title")}>
              <Unlink className="size-3.5" /> {t("workshop.world.boundRecords.unlink.action")}
            </KitButton>
          </span>
          {fighting === record.ref ? (
            <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
              <Select
                label={t("workshop.world.boundRecords.fight.which")}
                value={fight}
                onChange={setFight}
                options={[{ value: "__new", label: t("workshop.world.boundRecords.fight.newOption", { name: entity.name }) }, ...fights.map((entry) => ({ value: entry.id, label: entry.name }))]}
              />
              <KitButton tone="primary" busy={busy} disabled={busy} onClick={() => void addToFight(record.ref)}>
                {t("workshop.world.boundRecords.fight.addIt")}
              </KitButton>
            </div>
          ) : null}
        </div>
      ))}

      {!full ? (
        adding ? (
          <div className="flex flex-col gap-1.5 rounded-lg border border-stone-700/60 p-2" data-testid="world-bound-adding">
            <span className="text-xs text-stone-400">{t(adding === "monster" ? "workshop.world.boundRecords.linkFromOwn.monster" : "workshop.world.boundRecords.linkFromOwn.item", { tool: words[adding].tool })}</span>
            {own.length ? (
              <Select
                label={t("workshop.world.boundRecords.ownShelf", { type: words[adding].plural })}
                value="__none"
                placeholder={t("workshop.world.boundRecords.ownShelf", { type: words[adding].plural })}
                onChange={(ref) => ref !== "__none" && void link(adding, ref)}
                options={[{ value: "__none", label: t("workshop.world.boundRecords.pickOwn") }, ...own.map((row) => ({ value: row.ref, label: row.name }))]}
              />
            ) : null}
            <ContentPick
              kind={adding === "monster" ? "monsters" : "items"}
              label={t(adding === "monster" ? "workshop.world.boundRecords.rulebook.monster" : "workshop.world.boundRecords.rulebook.item")}
              placeholder={t(adding === "monster" ? "workshop.world.boundRecords.rulebook.exampleMonster" : "workshop.world.boundRecords.rulebook.exampleItem")}
              onPick={(entry) => entry.slug && void link(adding, entry.slug)}
            />
            <span className="flex flex-wrap gap-1.5">
              <KitButton tone="small" busy={busy} disabled={busy} onClick={() => void make(adding)}>
                <Plus className="size-3.5" /> {t("workshop.world.boundRecords.makeNew", { name: entity.name })}
              </KitButton>
              <KitButton tone="small" onClick={() => setAdding(null)}>
                {t("workshop.cancel")}
              </KitButton>
            </span>
          </div>
        ) : (
          <span className="flex flex-wrap gap-1.5">
            <KitButton tone="small" onClick={() => setAdding("monster")}>
              <Link2 className="size-3.5" /> {t("workshop.world.boundRecords.monster.one")}
            </KitButton>
            <KitButton tone="small" onClick={() => setAdding("item")}>
              <Link2 className="size-3.5" /> {t("workshop.world.boundRecords.item.one")}
            </KitButton>
          </span>
        )
      ) : null}
      {added ? <p className="text-xs text-emerald-300" role="status">{added}</p> : null}
      {error ? <PanelError>{error}</PanelError> : null}
    </section>
  );
}
