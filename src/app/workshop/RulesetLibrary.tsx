"use client";

import { LoadFailed } from "@/app/campaigns/[campaignId]/PanelKit";
import { readLoad, useLoadStatus } from "@/lib/load-state";
import { EmptyState } from "@/components/EmptyState";
import { BookmarkPlus, Check, ChevronDown, Loader2 } from "lucide-react";
import { appConfirm } from "@/components/ui/ConfirmDialog";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ListHead, useListHead } from "@/app/workshop/ListHead";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { FieldLabel, GlyphPlate, RowMenu } from "@/app/workshop/kit";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import {
  countHouseRulings,
  REST_VARIANT_LABELS,
  VARIANT_RULE_KEYS,
  VARIANT_RULE_LABELS,
  type Ruleset,
  type RulesetChange,
  type VariantRules,
} from "@/lib/rulesets/logic";

const readRuleset = (ruleset: Ruleset) => ({ name: ruleset.name });

const VARIANT_TRANSLATION_KEYS: Record<keyof Omit<VariantRules, "restVariant">, string> = {
  flanking: "workshop.rulesets.variant.flanking",
  criticalFumbles: "workshop.rulesets.variant.criticalFumbles",
  encumbrance: "workshop.rulesets.variant.encumbrance",
  lingeringInjuries: "workshop.rulesets.variant.lingeringInjuries",
  powerfulCritical: "workshop.rulesets.variant.powerfulCritical",
  criticalDamageMods: "workshop.rulesets.variant.criticalDamageMods",
  ammunition: "workshop.rulesets.variant.ammunition",
  supplies: "workshop.rulesets.variant.supplies",
};
const REST_TRANSLATION_KEYS: Record<VariantRules["restVariant"], string> = {
  standard: "workshop.rulesets.rest.standard",
  gritty: "workshop.rulesets.rest.gritty",
  heroic: "workshop.rulesets.rest.heroic",
};
const CHANGE_LABEL_KEYS: Record<string, string> = {
  ...Object.fromEntries(VARIANT_RULE_KEYS.map((key) => [VARIANT_RULE_LABELS[key], VARIANT_TRANSLATION_KEYS[key]])),
  "Rest pace": "workshop.rulesets.rest.label",
};
const REST_VALUE_KEYS: Record<string, string> = {
  [REST_VARIANT_LABELS.standard]: REST_TRANSLATION_KEYS.standard,
  [REST_VARIANT_LABELS.gritty]: REST_TRANSLATION_KEYS.gritty,
  [REST_VARIANT_LABELS.heroic]: REST_TRANSLATION_KEYS.heroic,
};

function localizedVariantRules(rules: VariantRules, t: (key: string) => string): string[] {
  const active = VARIANT_RULE_KEYS.filter((key) => rules[key]).map((key) => t(VARIANT_TRANSLATION_KEYS[key]));
  if (rules.restVariant !== "standard") active.push(t(REST_TRANSLATION_KEYS[rules.restVariant]));
  return active;
}

function rulesetSummary(
  ruleset: Ruleset,
  t: (key: string) => string,
  tp: (key: string, count: number) => string,
): string {
  const variants = VARIANT_RULE_KEYS.filter((key) => ruleset.variantRules[key]).length +
    (ruleset.variantRules.restVariant !== "standard" ? 1 : 0);
  const rulings = countHouseRulings(ruleset.houseRulesText);
  const parts = [
    variants ? tp("workshop.rulesets.summary.variantRules", variants) : t("workshop.rulesets.summary.plain"),
    ...(rulings ? [tp("workshop.rulesets.summary.houseRulings", rulings)] : []),
  ];
  return parts.join(t("workshop.rulesets.summary.separator"));
}

function localizedVariantValue(value: boolean | string, t: (key: string) => string): string {
  if (typeof value === "boolean") return t(value ? "workshop.rulesets.value.on" : "workshop.rulesets.value.off");
  const key = REST_VALUE_KEYS[value];
  return key ? t(key) : value;
}




// The ruleset library, and applying one to a table.
//
// Shown above the ordinary rules editor in a workshop, so the relationship is
// visible: the library is where a table's rules are KEPT, and the editor
// below is this workshop's own copy. Applying overwrites the copy; the
// library is untouched either way.

function ChangeList({ changes }: { changes: RulesetChange[] }) {
  const { t, tp } = useI18n();
  const translate = (key: string) => t(key as never);
  if (!changes.length) {
    return <p className="text-xs text-stone-500">{t("workshop.rulesets.change.none")}</p>;
  }
  return (
    <ul className="space-y-0.5 text-xs text-stone-400">
      {changes.map((change, index) => (
        <li key={index}>
          {change.kind === "variant" ? (
            <>
              {CHANGE_LABEL_KEYS[change.label] ? translate(CHANGE_LABEL_KEYS[change.label]) : change.label}:{" "}
              <span className="text-stone-500">{localizedVariantValue(change.from, translate)}</span>{" "}
              <span aria-hidden="true">→</span>{" "}
              <span className="text-amber-200">{localizedVariantValue(change.to, translate)}</span>
            </>
          ) : (
            <>
              {tp("workshop.rulesets.change.houseRules", change.to)}
              {change.replaces ? (
                <span className="text-amber-300/90">
                  {" "}
                  {tp("workshop.rulesets.change.replaceWarning", change.from)}
                </span>
              ) : null}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function RulesetLibrary({
  campaignId,
  onApplied,
}: {
  // The table to apply onto. A workshop id is a campaign id.
  campaignId: string;
  onApplied?: () => void;
}) {
  const { t, tp } = useI18n();
  const translate = (key: string) => t(key as never);
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [loading, setLoading] = useState(true);
  // A refused or failed read is shown in the server's words with a way to
  // ask again, never as "nothing here yet" (issue 140).
  const { loaded, loadError, settle } = useLoadStatus();

  const head = useListHead(rulesets, readRuleset);
  const [openId, setOpenId] = useState<string | null>(null);
  const [changes, setChanges] = useState<RulesetChange[]>([]);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [busy, setBusy] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  const load = useCallback(
    () =>
      readLoad<{ rulesets?: Ruleset[] }>(fetch("/api/rulesets"), t("workshop.rulesets.resource")).then((outcome) => {
        settle(outcome);
        if (outcome.payload) {
          setRulesets(outcome.payload.rulesets ?? []);
        }
        setLoading(false);
      }),
    [settle, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Opening a ruleset asks the server what applying it WOULD do, rather than
  // computing it here from a stale copy of the campaign's settings. A
  // preview that could not be had is said so, never shown as no change.
  async function open(ruleset: Ruleset) {
    if (openId === ruleset.id) {
      setOpenId(null);
      return;
    }
    setOpenId(ruleset.id);
    setChanges([]);
    setPreviewFailed(false);
    const response = await fetch(`/api/rulesets/${ruleset.id}?preview=${encodeURIComponent(campaignId)}`).catch(() => null);
    if (response?.ok) {
      const data = await response.json();
      setChanges(data.changes ?? []);
    } else {
      setPreviewFailed(true);
    }
  }

  // The server's words for a refusal, or the connection's.
  const refused = async (response: Response | null, fallback: string) =>
    ((await response?.json().catch(() => null)) as { error?: string } | null)?.error ?? fallback;

  async function apply(ruleset: Ruleset) {
    setBusy(ruleset.id);
    setNote(null);
    try {
      const response = await fetch(`/api/rulesets/${ruleset.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, houseRules: mode }),
      }).catch(() => null);
      if (!response?.ok) {
        setNote({ tone: "error", text: await refused(response, t("workshop.rulesets.error.apply", { name: ruleset.name })) });
        return;
      }
      const data = await response.json();
      setNote({
        tone: "ok",
        text: data.changes?.length
          ? tp("workshop.rulesets.applied", data.changes.length, { name: ruleset.name })
          : t("workshop.rulesets.unchanged", { name: ruleset.name }),
      });
      setOpenId(null);
      onApplied?.();
    } finally {
      setBusy("");
    }
  }

  async function capture() {
    if (!saveName.trim()) {
      return;
    }
    setSaving(true);
    setNote(null);
    try {
      const response = await fetch("/api/rulesets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName.trim(), captureFrom: campaignId }),
      }).catch(() => null);
      if (!response?.ok) {
        setNote({ tone: "error", text: await refused(response, t("workshop.rulesets.error.save")) });
        return;
      }
      setSaveName("");
      setNote({ tone: "ok", text: t("workshop.rulesets.saved") });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(ruleset: Ruleset) {
    if (!await appConfirm(t("workshop.rulesets.confirmDelete", { name: ruleset.name }))) {
      return;
    }
    setNote(null);
    const response = await fetch(`/api/rulesets/${ruleset.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setNote({ tone: "error", text: await refused(response, t("workshop.rulesets.error.delete", { name: ruleset.name })) });
      return;
    }
    setRulesets((current) => current.filter((entry) => entry.id !== ruleset.id));
  }

  return (
    <section className={`${ui.card} mb-4 p-3`} data-tour="rules-library">
      <SectionHead title={t("workshop.rulesets.title")} glyph="system-rulesets" level="h2" />
      <p className="mb-3 text-xs text-stone-400">
        {t("workshop.rulesets.description")}
      </p>

      {loading ? (
        <div className="reveal mb-3 space-y-1.5" aria-busy="true">
          <div className="skeleton-block h-10 rounded-lg" />
          <div className="skeleton-block h-10 rounded-lg" />
        </div>
      ) : rulesets.length ? (
        <>
        <ListHead head={head} noun={[t("workshop.rulesets.noun.one"), t("workshop.rulesets.noun.many")]} placeholder={t("workshop.rulesets.search")} formatCount={(shown, total) => shown === total ? tp("workshop.rulesets.count.total", total) : tp("workshop.rulesets.count.filtered", shown, { total })} />
        <ul className="stagger mb-3 space-y-1.5">
          {head.shown.map((ruleset) => {
            // Opening is the row; deleting sits behind the kebab and the
            // right-click or long-press menu. Applying stays inside the opened
            // row, under the list of what it would change.
            const items: ContextMenuItem[] = [
              { id: "open", label: openId === ruleset.id ? t("workshop.rulesets.close") : t("workshop.rulesets.open"), glyph: "system-rulesets", onSelect: () => void open(ruleset) },
              { id: "delete", label: t("workshop.rulesets.delete"), glyph: "ui-delete", tone: "danger", separated: true, onSelect: () => void remove(ruleset) },
            ];
            return (
            <ContextMenu as="li" key={ruleset.id} label={ruleset.name} items={items} className="panel rounded-xl">
              <div className="flex items-center gap-3 p-2.5">
                <GlyphPlate glyph="system-rulesets" size="size-11" />
                <button
                  type="button"
                  onClick={() => open(ruleset)}
                  aria-expanded={openId === ruleset.id}
                  className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display tracking-wide text-amber-50">{ruleset.name}</span>
                    <span className="block truncate text-xs text-stone-500">{rulesetSummary(ruleset, translate, (key, count) => tp(key as never, count))}</span>
                  </span>
                  <ChevronDown className={cn("size-4 shrink-0 text-stone-500 transition-transform", openId === ruleset.id && "rotate-180")} aria-hidden="true" />
                </button>
                <RowMenu items={items} label={ruleset.name} />
              </div>
              {openId === ruleset.id ? (
                <div className="reveal space-y-3 border-t border-stone-800/70 p-3">
                  {localizedVariantRules(ruleset.variantRules, translate).length ? (
                    <ul className="stagger text-xs text-stone-400">
                      {localizedVariantRules(ruleset.variantRules, translate).map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div>
                    <FieldLabel className="mb-1 block">{t("workshop.rulesets.preview.title")}</FieldLabel>
                    {previewFailed ? (
                      <p role="alert" className="text-xs text-amber-300/90">
                        {t("workshop.rulesets.preview.failed")}
                      </p>
                    ) : (
                      <ChangeList changes={changes} />
                    )}
                  </div>
                  {/* Homebrew is not part of a ruleset: an author's whole shelf
                      already counts at every table they run, whatever it plays
                      (src/lib/content/scope.ts), so a list of "the Homebrew this
                      ruleset ships" admitted nothing and installed nothing
                      (workshop import audit F08). Said here, where the ticks were. */}
                  <div data-tour="rules-homebrew">
                    <SectionHead title={t("workshop.rulesets.homebrew.title")} glyph="system-homebrew" level="h4" />
                    <p className="text-xs text-stone-400">
                      {t("workshop.rulesets.homebrew.description")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-full sm:w-72">
                      <Select<"replace" | "append">
                        value={mode}
                        onChange={setMode}
                        label={t("workshop.rulesets.houseRules.label")}
                        options={[
                          { value: "replace", label: t("workshop.rulesets.houseRules.replace") },
                          { value: "append", label: t("workshop.rulesets.houseRules.append") },
                        ]}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => apply(ruleset)}
                      disabled={busy === ruleset.id}
                      className={ui.btnPrimary}
                    >
                      {busy === ruleset.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      {t("workshop.rulesets.apply")}
                    </button>
                  </div>
                </div>
              ) : null}
            </ContextMenu>
            );
          })}
        </ul>
        </>
      ) : (
        (loadError ? (
          <LoadFailed
            error={loadError}
            onRetry={() => void load()}
          />
        ) : loaded ? (
          <EmptyState
            size="md"
            art="scrolls"
            title={t("workshop.rulesets.empty")}
          />
        ) : null)
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm" data-tour="rules-save-as">
        <input
          value={saveName}
          onChange={(event) => setSaveName(event.target.value)}
          maxLength={80}
          placeholder={t("workshop.rulesets.savePlaceholder")}
          aria-label={t("workshop.rulesets.saveAria")}
          className={cn(ui.input, "w-full sm:w-64")}
        />
        <button
          type="button"
          onClick={capture}
          disabled={saving || !saveName.trim()}
          className={ui.btnSecondary}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <BookmarkPlus className="size-3.5" />
          )}
          {t("workshop.rulesets.save")}
        </button>
      </div>
      {note ? (
        <p role={note.tone === "error" ? "alert" : "status"} className={cn("mt-2 text-xs", note.tone === "error" ? "motion-shake text-red-400" : "live-in text-emerald-400")}>
          {note.text}
        </p>
      ) : null}
    </section>
  );
}
