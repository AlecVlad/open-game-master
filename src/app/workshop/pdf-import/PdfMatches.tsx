"use client";

import { Check, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { searchKey } from "@/lib/language/text-logic";
import { ui } from "@/lib/ui";
import { useI18n } from "@/lib/i18n/provider";
import type { MatchOption } from "@/lib/pdf-import/match-logic";
import type { MatchView } from "@/lib/pdf-import/view";

// The review's "Match to SRD 5.1": every creature of the book the import
// could not match by name, each starting on its closest SRD 5.1 creature
// (the model's pick, a name it shares, or the closest guess from its type,
// size and challenge). The GM confirms each with one tap, picks another
// from the nearest few or searches the whole SRD, or keeps the book's own
// numbers; "Accept the rest" confirms every suggestion left at once. Each
// choice is saved as it is made, so the step survives leaving the page.
//
// Nothing here is disabled while a choice saves: a disabled control drops
// the keyboard's focus to the page. A pick is a choice made: choosing in the
// list confirms it, and the search is a button of its own, never an entry
// the arrow keys can land on.

export type MatchChoice = { srd: string | null; confirmed: boolean };

const KEEP = "__keep";

const HOW_KEYS = {
  name: "pdfImport.match.how.name",
  model: "pdfImport.match.how.model",
  guess: "pdfImport.match.how.guess",
  none: "pdfImport.match.how.none",
} as const;

export function PdfMatches({
  matches,
  srd,
  error,
  onChoose,
}: {
  matches: MatchView[];
  srd: MatchOption[];
  error: string;
  onChoose: (choices: Record<string, MatchChoice>) => void;
}) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  const left = matches.filter((match) => !match.confirmed);
  return (
    <section className="reveal mt-3 rounded-lg border border-amber-500/30 bg-stone-950/30 p-3" aria-labelledby="pdf-matches-head" data-testid="pdf-matches">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id="pdf-matches-head" ref={heading} tabIndex={-1} className="font-display text-sm text-amber-100 outline-none">
          {t("pdfImport.match.title")}
        </h3>
        <span className="text-xs text-stone-400" aria-live="polite">
          {left.length ? t("pdfImport.match.progress", { confirmed: matches.length - left.length, total: matches.length }) : t("pdfImport.match.all", { count: matches.length })}
        </span>
      </div>
      <p className="mt-1 text-xs text-stone-400">{t("pdfImport.match.explanation")}</p>
      {error ? (
        <p role="alert" className="motion-shake mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {left.length > 1 ? (
        <button
          type="button"
          onClick={() => {
            onChoose(Object.fromEntries(left.map((match) => [match.key, { srd: match.current, confirmed: true }])));
            // The button goes once nothing is left: the keyboard stays in
            // the step.
            heading.current?.focus();
          }}
          className={cn(ui.btnSmall, "mt-2 pointer-coarse:min-h-10")}
        >
          <Check className="size-3.5" aria-hidden="true" /> {left.length === 1 ? t("pdfImport.match.acceptOne") : t("pdfImport.match.acceptMany", { count: left.length })}
        </button>
      ) : null}
      <ul className="stagger mt-2 space-y-1.5">
        {matches.map((match) => (
          <MatchRow key={match.key} match={match} srd={srd} onChoose={(choice) => onChoose({ [match.key]: choice })} />
        ))}
      </ul>
    </section>
  );
}

function MatchRow({ match, srd, onChoose }: { match: MatchView; srd: MatchOption[]; onChoose: (choice: MatchChoice) => void }) {
  const { t } = useI18n();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const searchButton = useRef<HTMLButtonElement>(null);
  const found = useMemo(() => {
    const wanted = searchKey(query);
    if (!wanted) return [];
    return srd.filter((option) => searchKey(option.name).includes(wanted)).slice(0, 12);
  }, [query, srd]);
  // A pick from the search that is not among the nearest shows too.
  const options =
    match.current && !match.options.some((option) => option.name === match.current)
      ? [{ name: match.current, detail: srd.find((option) => option.name === match.current)?.detail ?? "" }, ...match.options]
      : match.options;
  const keepLabel = match.own ? t("pdfImport.match.keepOwn") : t("pdfImport.match.noMatch");
  const pages = match.pages.length ? `${t("pdfImport.pageShort")} ${match.pages.slice(0, 3).join(", ")}${match.pages.length > 3 ? "…" : ""}` : "";
  const pickedLabel = match.current ?? (match.own ? t("pdfImport.match.ownNumbers") : t("pdfImport.match.noMatchShort"));
  const closeSearch = () => {
    setSearching(false);
    setQuery("");
    searchButton.current?.focus();
  };

  return (
    <li className={cn("reveal min-w-0 rounded-md px-2 py-2", match.confirmed ? "bg-stone-900/30" : "bg-stone-900/60")} data-match={match.key}>
      {/* A select is as wide as its longest option unless held: on a phone
          the name sits above, the choice and its buttons share a line. */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <p className="truncate text-sm text-stone-100">{match.name}</p>
          <p className="text-xs text-stone-500">{[match.about, pages, match.suggested ? `${t("pdfImport.match.suggested")}: ${t(HOW_KEYS[match.how])}` : t(HOW_KEYS.none)].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:w-[30rem]">
          <label className="sr-only" htmlFor={`match-${match.key}`}>
            {t("pdfImport.match.for", { name: match.name })}
          </label>
          <select
            id={`match-${match.key}`}
            value={match.current ?? KEEP}
            onChange={(event) => onChoose({ srd: event.target.value === KEEP ? null : event.target.value, confirmed: true })}
            className={cn(ui.input, "w-0 min-w-0 flex-1 truncate py-1.5 pointer-coarse:min-h-10")}
          >
            <optgroup label={t("pdfImport.match.closest")}>
              {options.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                  {option.detail ? ` (${option.detail})` : ""}
                  {option.name === match.suggested ? `, ${t("pdfImport.match.suggested")}` : ""}
                </option>
              ))}
            </optgroup>
            <option value={KEEP}>{keepLabel}</option>
          </select>
          <button
            type="button"
            ref={searchButton}
            aria-expanded={searching}
            aria-controls={`match-search-${match.key}`}
            aria-label={t("pdfImport.match.searchFor", { name: match.name })}
            title={t("pdfImport.match.searchTitle")}
            onClick={() => (searching ? closeSearch() : setSearching(true))}
            className={cn(ui.btnSmall, "shrink-0 px-2 pointer-coarse:min-h-10 pointer-coarse:min-w-10")}
          >
            {searching ? <X className="size-3.5" aria-hidden="true" /> : <Search className="size-3.5" aria-hidden="true" />}
          </button>
          {/* The same button before and after: confirming keeps the focus. */}
          <button
            type="button"
            aria-pressed={match.confirmed}
            onClick={() => onChoose({ srd: match.current, confirmed: true })}
            aria-label={match.confirmed ? t("pdfImport.match.confirmedAria", { name: match.name, picked: pickedLabel }) : t("pdfImport.match.confirmAria", { picked: pickedLabel, name: match.name })}
            className={cn(ui.btnSmall, "shrink-0 pointer-coarse:min-h-10", match.confirmed && "border-emerald-500/40 text-emerald-300")}
          >
            <Check className={cn("size-3.5", match.confirmed && "motion-pop")} aria-hidden="true" /> {match.confirmed ? t("pdfImport.match.confirmed") : t("pdfImport.match.confirm")}
          </button>
        </div>
      </div>
      {searching ? (
        <div className="motion-pop mt-2" id={`match-search-${match.key}`}>
          <label className="relative block">
            <span className="sr-only">{t("pdfImport.match.searchFor", { name: match.name })}</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-500" aria-hidden="true" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeSearch();
              }}
              placeholder={t("pdfImport.match.searchPlaceholder")}
              className={cn(ui.input, "pl-8 pointer-coarse:min-h-10")}
            />
          </label>
          {query && !found.length ? <p className="mt-1 text-xs text-stone-500">{t("pdfImport.match.noResults")}</p> : null}
          <ul className="stagger mt-1 flex flex-wrap gap-1.5" aria-label={t("pdfImport.match.results", { name: match.name })}>
            {found.map((option) => (
              <li key={option.name}>
                <button
                  type="button"
                  onClick={() => {
                    onChoose({ srd: option.name, confirmed: true });
                    closeSearch();
                  }}
                  className={cn(ui.btnSmall, "pointer-coarse:min-h-10")}
                >
                  {option.name}
                  {option.detail ? <span className="text-xs text-stone-500">{option.detail}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
