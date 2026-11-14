"use client";

import { EmptyState } from "@/components/EmptyState";
import { BookMarked, Check, Eye, EyeOff, Pin, PinOff, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { campaignApiErrorText } from "@/lib/i18n/campaignApiError";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { SectionHead } from "@/components/ui/SectionHead";
import { cn } from "@/lib/cn";
import type { WorldFact } from "@/lib/db/facts";
import { FACT_CATEGORIES, isSecretFact, isStorytellerFact, type FactCategory } from "@/lib/dm/fact-logic";
import { KitButton, PanelError, RowMenu, panelField, panelRow } from "./PanelKit";
import { DictateField } from "@/components/DictateField";
import { appendDictation } from "@/lib/dictation";

// The world-state fact sheet: server-tracked canon extracted at chapter
// close (plus manual pins). Everyone sees party-known facts; the lead can
// pin, edit, retire, add facts, and peek at DM-only secrets.

const CATEGORY_LABEL_KEY = {
  location: "campaign.fact.category.location",
  npc: "campaign.fact.category.npc",
  promise: "campaign.fact.category.promise",
  world: "campaign.fact.category.world",
  party: "campaign.fact.category.party",
  lore: "campaign.fact.category.lore",
} as const satisfies Record<FactCategory, string>;

// The painted glyph each heading leads with.
const CATEGORY_GLYPHS: Record<FactCategory, string> = {
  location: "tab-map",
  npc: "tab-bonds",
  promise: "coin-purse",
  world: "system-region",
  party: "tab-party",
  lore: "system-lore",
};

function FactCard({
  campaignId,
  fact,
  steersStory,
  refresh,
}: {
  campaignId: string;
  fact: WorldFact;
  steersStory: boolean;
  refresh: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(fact.fact);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/facts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factId: fact.id, ...payload }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(campaignApiErrorText(data, t("campaign.fact.error.update"), t));
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError(t("campaign.fact.error.server"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const pinTitle = fact.pinned ? t("campaign.fact.action.unpin") : t("campaign.fact.action.pin");
  const items: ContextMenuItem[] = steersStory
    ? [
        { id: "pin", label: pinTitle, glyph: "ui-pin", disabled: busy, onSelect: () => void patch({ pinned: !fact.pinned }) },
        { id: "edit", label: t("campaign.fact.action.edit"), glyph: "ui-edit", onSelect: () => setEditing(true) },
        {
          id: "retire",
          label: t("campaign.fact.action.retire"),
          glyph: "ui-delete",
          tone: "danger",
          separated: true,
          disabled: busy,
          onSelect: () => void patch({ status: "retired" }),
        },
      ]
    : [];

  return (
    <ContextMenu as="li" items={editing ? [] : items} label={fact.subject || t(CATEGORY_LABEL_KEY[fact.category])} className={panelRow}>
      {error ? <PanelError className="mb-2">{error}</PanelError> : null}
      {editing ? (
        <div className="reveal space-y-1.5">
          <DictateField label={t("campaign.fact.label")} onTranscript={(spoken) => setText((current) => appendDictation(current, spoken, 300))}>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              maxLength={300}
              aria-label={t("campaign.fact.label")}
              className={cn(panelField, "leading-5")}
            />
          </DictateField>
          <div className="flex gap-1.5">
            <KitButton
              tone="primary"
              disabled={busy || !text.trim()}
              busy={busy}
              onClick={async () => {
                if (await patch({ fact: text.trim() })) setEditing(false);
              }}
            >
              {busy ? null : <Check className="size-3.5" />}
              {t("common.action.save")}
            </KitButton>
            <KitButton
              onClick={() => {
                setEditing(false);
                setText(fact.fact);
              }}
            >
              <X className="size-3.5" /> {t("wizard.cancel")}
            </KitButton>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs leading-5 text-stone-300">
            {fact.pinned ? <Pin className="mr-1 inline size-3 text-amber-400" /> : null}
            {fact.subject ? (
              <span className="font-medium text-amber-200">{fact.subject}: </span>
            ) : null}
            {fact.fact}
          </p>
          <div className="mt-1 flex min-h-6 items-center gap-2 text-[11px] text-stone-500">
            <span className={isSecretFact(fact.knownBy) ? "text-violet-300" : undefined}>
              {isStorytellerFact(fact.knownBy) ? t("campaign.fact.known.storyteller") : isSecretFact(fact.knownBy) ? t("campaign.fact.known.gm") : t(CATEGORY_LABEL_KEY[fact.category])}
            </span>
            {steersStory ? (
              <span className="ml-auto flex shrink-0 items-center gap-0.5">
                <KitButton
                  tone="icon"
                  always
                  disabled={busy}
                  busy={busy}
                  onClick={() => patch({ pinned: !fact.pinned })}
                  title={pinTitle}
                  aria-label={pinTitle}
                  aria-pressed={fact.pinned}
                >
                  {busy ? null : fact.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                </KitButton>
                <RowMenu items={items} label={fact.subject || t(CATEGORY_LABEL_KEY[fact.category])} />
              </span>
            ) : null}
          </div>
        </>
      )}
    </ContextMenu>
  );
}

function FactComposer({
  campaignId,
  refresh,
}: {
  campaignId: string;
  refresh: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<FactCategory>("world");
  const [subject, setSubject] = useState("");
  const [fact, setFact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!fact.trim() || busy) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/facts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject: subject.trim(), fact: fact.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(campaignApiErrorText(data, t("campaign.fact.error.save"), t));
        return;
      }
      setSubject("");
      setFact("");
      await refresh();
    } catch {
      setError(t("campaign.fact.error.server"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel rounded-lg p-2.5">
      <SectionHead title={t("campaign.fact.section.pin")} glyph="tab-facts" level="h4" />
      <div data-pill-group="" role="group" aria-label={t("campaign.fact.category.label")} className="mb-1.5 flex flex-wrap gap-1">
        {FACT_CATEGORIES.map((value) => (
          <button
            data-on={category === value ? "" : undefined}
            aria-pressed={category === value}
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className="pk-pill pk-tap motion-press"
          >
            {t(CATEGORY_LABEL_KEY[value])}
          </button>
        ))}
      </div>
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        maxLength={80}
        placeholder={t("campaign.fact.placeholder.subject")}
        aria-label={t("campaign.fact.subject.label")}
        className={cn(panelField, "mb-1.5")}
      />
      <DictateField label={t("campaign.fact.label")} onTranscript={(text) => setFact((current) => appendDictation(current, text, 300))}>
        <textarea
          value={fact}
          onChange={(event) => setFact(event.target.value)}
          rows={2}
          maxLength={300}
          placeholder={t("campaign.fact.placeholder.text")}
          aria-label={t("campaign.fact.label")}
          className={cn(panelField, "leading-5")}
        />
      </DictateField>
      {error ? <PanelError className="mt-1">{error}</PanelError> : null}
      <KitButton tone="secondary" onClick={submit} disabled={busy || !fact.trim()} busy={busy} className="mt-1.5 w-full">
        {busy ? null : <BookMarked className="size-3.5" />}
        {t("campaign.fact.action.pinFact")}
      </KitButton>
    </div>
  );
}

export function FactsPanel({
  campaignId,
  facts,
  steersStory,
  refreshFacts,
}: {
  campaignId: string;
  facts: WorldFact[];
  steersStory: boolean;
  refreshFacts: () => Promise<void>;
}) {
  const { t } = useI18n();
  // Lead-only peek at DM secrets: fetched separately so the spoilers never
  // sit in shared state, and merged in only while the toggle is on.
  const [secrets, setSecrets] = useState<WorldFact[] | null>(null);
  const [secretsError, setSecretsError] = useState("");

  async function toggleSecrets() {
    if (secrets) {
      setSecrets(null);
      setSecretsError("");
      return;
    }
    setSecretsError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/facts?secrets=1`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSecretsError(campaignApiErrorText(data, t("campaign.fact.error.secretsLoad"), t));
        return;
      }
      setSecrets(((data.facts ?? []) as WorldFact[]).filter((fact) => isSecretFact(fact.knownBy)));
    } catch {
      setSecretsError(t("campaign.fact.error.server"));
    }
  }

  const refresh = async () => {
    await refreshFacts();
    if (secrets) {
      setSecrets(null);
      await toggleSecrets();
    }
  };

  const pinned = facts.filter((fact) => fact.pinned);

  return (
    <div className="space-y-3">
      {steersStory ? <FactComposer campaignId={campaignId} refresh={refresh} /> : null}

      {pinned.length ? (
        <div className="reveal space-y-1.5">
          <SectionHead title={t("campaign.fact.section.pinned")} glyph="tab-facts" aside={pinned.length} />
          <ul className="stagger space-y-1.5">
            {pinned.map((fact) => (
              <FactCard
                key={fact.id}
                campaignId={campaignId}
                fact={fact}
                steersStory={steersStory}
                refresh={refresh}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {FACT_CATEGORIES.map((category) => {
        const entries = facts.filter((fact) => fact.category === category && !fact.pinned);
        if (!entries.length) {
          return null;
        }
        return (
          <div key={category} className="space-y-1.5">
            <SectionHead title={t(CATEGORY_LABEL_KEY[category])} glyph={CATEGORY_GLYPHS[category]} aside={entries.length} />
            <ul className="stagger space-y-1.5">
              {entries.map((fact) => (
                <FactCard
                  key={fact.id}
                  campaignId={campaignId}
                  fact={fact}
                  steersStory={steersStory}
                  refresh={refresh}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {!facts.length ? (
        <EmptyState size="sm" art="board" title={steersStory ? t("campaign.fact.empty.lead") : t("campaign.fact.empty.player")} />
      ) : null}

      {steersStory ? (
        <div className="reveal space-y-1.5">
          <KitButton tone="link" onClick={toggleSecrets} aria-expanded={Boolean(secrets)}>
            {secrets ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {secrets ? t("campaign.fact.action.hideSecrets") : t("campaign.fact.action.showSecrets")}
          </KitButton>
          {secretsError ? <PanelError>{secretsError}</PanelError> : null}
          {secrets ? (
            secrets.length ? (
              <ul className="stagger space-y-1.5">
                {secrets.map((fact) => (
                  <FactCard
                    key={fact.id}
                    campaignId={campaignId}
                    fact={fact}
                    steersStory={steersStory}
                    refresh={refresh}
                  />
                ))}
              </ul>
            ) : (
              <p className="live-in px-1 text-xs text-stone-500">{t("campaign.fact.empty.none")}</p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
