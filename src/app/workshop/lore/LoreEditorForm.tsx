"use client";

import { AlertTriangle, Eye, EyeOff, FileText, Loader2, Trash2, Users, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { GameIcon } from "@/components/ui/GameIcon";
import { SectionHead } from "@/components/ui/SectionHead";
import { Select } from "@/components/ui/Select";
import { appendTerm, insertAt } from "@/lib/workshop/pickers";
import { AddFromList } from "@/components/ui/AddFromList";
import { Markdown } from "@/components/ui/Markdown";
import { LORE_BODY_MAX, LORE_STYLES, WORLD_LORE_CATEGORIES, loreBodyOverflow, type LoreLinkTarget, type LoreStyle, type WorldLoreCategory } from "@/lib/dm/world-lore-logic";
import { checkProse } from "@/lib/workshop/prose-check";
import { LoreImageField, VisibilitySelect } from "@/app/workshop/lore/LoreFields";
import type { LoreDraft } from "@/app/workshop/lore/types";
import { DictateField } from "@/components/DictateField";
import { appendDictation } from "@/lib/dictation";
import { textKey } from "@/lib/language/text-logic";

// The binder's author form (docs/vtt-parity-implementation-plan.md
// sections 5.1 to 5.6): who reads it, how it is dressed, the picture and
// the PDF that ride with it, a [[ autocomplete as you type, and a live
// preview beside the text above lg and as a tab below it.

// Every chip here is ui.btnSmall trimmed to chip size; the lit colours say
// who reads the entry, so they stay per choice.
// The rows that hold them carry text-xs: a button inherits its font here.
const chip = cn(ui.btnSmall, "px-2.5 py-1.5");
const STYLE_KEYS: Record<LoreStyle, string> = {
  plain: "campaign.lore.style.plain",
  parchment: "campaign.lore.style.parchment",
  notice: "campaign.lore.style.notice",
};

export function LoreEditorForm({
  draft,
  onChange,
  linkable,
  knownTags,
  members,
  targets,
  rows,
}: {
  draft: LoreDraft;
  onChange: (next: LoreDraft) => void;
  linkable: Array<{ value: string; label: string }>;
  knownTags: string[];
  // The table, for the "some players" audience; absent in the workshop.
  members?: Array<{ userId: string; username: string }>;
  targets: LoreLinkTarget[];
  rows: boolean;
}) {
  const { t } = useI18n();
  const categoryOptions = WORLD_LORE_CATEGORIES.map((category) => ({
    value: category,
    label: t(`campaign.lore.category.${category}` as never),
    icon: { kind: "glyph" as const, key: "system-lore" },
  }));
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState<"write" | "preview">("write");
  const [complete, setComplete] = useState<{ at: number; query: string } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const pdfRef = useRef<HTMLInputElement>(null);
  // The cap, said beside the text with what would be lost (issue #302);
  // the routes refuse the same way. The readability note is a heuristic
  // the author may dismiss.
  const overflow = Boolean(loreBodyOverflow(draft.body));
  const lostText = draft.body.slice(LORE_BODY_MAX).trim();
  const shownLostText = lostText.length > 60 ? `${lostText.slice(0, 60).trimEnd()}...` : lostText;
  const overflowMessage = t("campaign.lore.editor.overflow", {
    length: draft.body.length.toLocaleString(),
    max: LORE_BODY_MAX.toLocaleString(),
    lost: (draft.body.length - LORE_BODY_MAX).toLocaleString(),
    excerpt: shownLostText ? `: “${shownLostText}”` : "",
  });
  const proseMessages = prose.map((warning) => {
    const count = Number(warning.message.match(/^\\d+/)?.[0] ?? 0);
    if (warning.kind === "joined-sentences") return t("campaign.lore.editor.prose.joined", { count });
    if (warning.kind === "long-run") {
      const minimum = Number(warning.message.match(/of (\\d+) or more/)?.[1] ?? 28);
      return t("campaign.lore.editor.prose.longRun", { count, minimum });
    }
    return t("campaign.lore.editor.prose.fewSpaces");
  });
  const proseWarning = t("campaign.lore.editor.prose.warning", {
    warnings: proseMessages.join(" "),
    example: prose[0]?.samples[0] ? t("campaign.lore.editor.prose.example", { sample: prose[0].samples[0] }) : "",
  });
  const prose = checkProse(draft.body);
  const proseKey = prose.map((warning) => warning.kind).join(",");
  const [dismissed, setDismissed] = useState("");

  function insertLink(title: string) {
    const field = bodyRef.current;
    const at = complete ? complete.at : field?.selectionStart ?? draft.body.length;
    // A typed "[[que" is replaced whole; a picked link lands at the caret.
    const before = complete ? draft.body.slice(0, at) : draft.body.slice(0, at);
    const after = complete ? draft.body.slice(at + 2 + complete.query.length) : draft.body.slice(at);
    const next = insertAt(`${before}${after}`, before.length, `[[${title}]]`);
    onChange({ ...draft, body: next.text });
    setComplete(null);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(next.caret, next.caret);
    });
  }

  // Typing "[[" opens the list; the letters after it filter; Escape closes.
  function onBodyChange(value: string, caret: number) {
    onChange({ ...draft, body: value });
    const open = value.lastIndexOf("[[", caret);
    if (open !== -1 && !value.slice(open, caret).includes("]]") && caret - open <= 40) {
      setComplete({ at: open, query: value.slice(open + 2, caret) });
    } else {
      setComplete(null);
    }
  }
  const suggestions = useMemo(() => {
    if (!complete) {
      return [];
    }
    const needle = textKey(complete.query);
    return linkable.filter((option) => textKey(option.value).includes(needle)).slice(0, 8);
  }, [complete, linkable]);

  async function uploadPdf(file: File) {
    setPdfBusy(true);
    setPdfError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, name: file.name, type: "application/pdf" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPdfError(t("campaign.lore.errors.pdf"));
        return;
      }
      onChange({ ...draft, attachmentPath: payload.url });
    } catch {
      setPdfError(t("campaign.lore.errors.pdf"));
    } finally {
      setPdfBusy(false);
    }
  }

  const textarea = (
    <div className="relative text-sm">
      <DictateField
        label={t("campaign.lore.editor.bodyLabel")}
        onTranscript={(text) => {
          const next = appendDictation(draft.body, text, LORE_BODY_MAX);
          onBodyChange(next, next.length);
        }}
      >
        <textarea
          ref={bodyRef}
          value={draft.body}
          onChange={(event) => onBodyChange(event.target.value, event.target.selectionStart ?? event.target.value.length)}
          onKeyDown={(event) => {
            if (!complete) {
              return;
            }
            if (event.key === "Escape") {
              setComplete(null);
            } else if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              insertLink(suggestions[0].value);
            }
          }}
          rows={rows ? 10 : 5}
          maxLength={LORE_BODY_MAX}
          placeholder={t("campaign.lore.editor.bodyPlaceholder")}
          data-tour="lore-body"
          className={cn(ui.input, "leading-5")}
        />
      </DictateField>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-[11px]">
        <span className={cn("font-mono", overflow ? "text-red-400" : draft.body.length > LORE_BODY_MAX * 0.8 ? "text-amber-300" : "text-stone-500")} data-testid="lore-length">
          {draft.body.length.toLocaleString("en-US")} / {LORE_BODY_MAX.toLocaleString("en-US")}
        </span>
        {overflow ? (
          <span className="motion-shake w-full text-red-400" role="alert">
            {overflowMessage}
          </span>
        ) : null}
        {prose.length && dismissed !== proseKey ? (
          <span className="reveal flex w-full items-start gap-1.5 text-amber-300/90" data-testid="prose-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {proseWarning}{" "}
              <button type="button" onClick={() => setDismissed(proseKey)} className="underline">
                {t("campaign.lore.editor.dismiss")}
              </button>
            </span>
          </span>
        ) : null}
      </div>
      {complete && suggestions.length ? (
        <ul role="listbox" className="panel fx-pop absolute left-2 top-full z-20 mt-0.5 w-64 rounded-lg p-1 text-xs shadow-elev-2">
          {suggestions.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => insertLink(option.value)}
                className={cn(ui.btnSmall, "w-full border-transparent bg-transparent text-left shadow-none", index === 0 && "bg-amber-400/10 text-amber-100")}
              >
                <GameIcon icon={{ kind: "glyph", key: "system-lore" }} size="size-5" />
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
  const previewPane = (
    <div className="panel min-h-24 rounded-lg p-3">
      {draft.body.trim() ? (
        <Markdown source={draft.body} targets={targets} style={draft.style} dmView />
      ) : (
        <p className="text-xs italic text-stone-500">{t("campaign.lore.editor.nothingPreview")}</p>
      )}
    </div>
  );

  return (
    <>
      <SectionHead title={t("campaign.lore.editor.entry")} glyph="system-lore" className="mb-0" />
      <div className="flex flex-wrap gap-1.5 sm:flex-nowrap" data-tour="lore-title">
        <span className="w-full sm:w-48 sm:shrink-0">
          <Select<WorldLoreCategory>
            label={t("campaign.lore.editor.category")}
            value={draft.category}
            onChange={(category) => onChange({ ...draft, category })}
            options={categoryOptions}
          />
        </span>
        <input
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          maxLength={120}
          placeholder={t("campaign.lore.editor.titlePlaceholder")}
          className={cn(ui.input, "min-w-0 flex-1")}
        />
      </div>
      <div data-pill-group="" className="flex items-center gap-1.5 text-xs lg:hidden">
        {(["write", "preview"] as const).map((tab) => (
          <button data-on={preview === tab ? "" : undefined}
            key={tab}
            type="button"
            aria-pressed={preview === tab}
            onClick={() => setPreview(tab)}
            className={cn(chip, preview === tab ? "border-amber-700 bg-amber-950/40 text-amber-100" : "")}
          >
            {tab === "write" ? t("campaign.lore.editor.write") : t("campaign.lore.editor.preview")}
          </button>
        ))}
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <div className={cn(preview === "preview" && "hidden lg:block")}>{textarea}</div>
        <div className={cn(preview === "write" && "hidden lg:block")}>{previewPane}</div>
      </div>
      {linkable.length ? (
        <div className="reveal flex flex-wrap items-center gap-1.5" data-tour="lore-link">
          <AddFromList prompt={t("campaign.lore.editor.linkPrompt")} options={linkable} onPick={insertLink} />
          <span className="text-[11px] text-stone-500">{t("campaign.lore.editor.linkHint")}</span>
        </div>
      ) : null}
      <SectionHead title={t("campaign.lore.editor.visibility")} glyph="tab-party" className="mb-0 pt-1" />
      <VisibilitySelect value={draft.visibility} onChange={(visibility) => onChange({ ...draft, visibility })} />
      {draft.visibility === "party" && members?.length ? (
        <AudienceSelect
          audience={draft.audience}
          members={members}
          onChange={(audience) => onChange({ ...draft, audience })}
        />
      ) : null}
      <SectionHead title={t("campaign.lore.editor.style")} glyph="tab-handout" className="mb-0 pt-1" />
      <div data-pill-group="" className="flex flex-wrap items-center gap-1.5 text-xs">
        {LORE_STYLES.map((style) => (
          <button data-on={draft.style === style ? "" : undefined}
            key={style}
            type="button"
            aria-pressed={draft.style === style}
            onClick={() => onChange({ ...draft, style })}
            className={cn(chip, draft.style === style ? "border-amber-700 bg-amber-950/40 text-amber-100" : "")}
          >
            {t(STYLE_KEYS[style] as never)}
          </button>
        ))}
        <span className="text-[11px] text-stone-500">{t("campaign.lore.editor.styleHint")}</span>
      </div>
      <LoreImageField imagePath={draft.imagePath} onChange={(imagePath) => onChange({ ...draft, imagePath })} />
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadPdf(file);
            }
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={pdfBusy}
          onClick={() => pdfRef.current?.click()}
          className={chip}
        >
          {pdfBusy ? <Loader2 className="size-3 animate-spin" /> : <FileText className="size-3" />}
          {draft.attachmentPath ? t("campaign.lore.editor.replacePdf") : t("campaign.lore.editor.attachPdf")}
        </button>
        {draft.attachmentPath ? (
          <>
            {typeof window !== "undefined" && window.odm?.openDocument ? (
              // In the apps a link would open the system browser without the
              // session; the shell fetches it with the session instead.
              <button
                type="button"
                onClick={() => void window.odm?.openDocument?.(draft.attachmentPath ?? "")}
                className="text-[11px] text-amber-200 underline"
              >
                {t("campaign.lore.editor.openPdf")}
              </button>
            ) : (
              <a href={draft.attachmentPath} target="_blank" rel="noreferrer" className="text-[11px] text-amber-200 underline">
                Open it
              </a>
            )}
            <button type="button" onClick={() => onChange({ ...draft, attachmentPath: "" })} className={chip}>
              <Trash2 className="size-3" /> {t("campaign.lore.editor.removePdf")}
            </button>
          </>
        ) : null}
        <span className="text-[11px] text-stone-500">{t("campaign.lore.editor.rulesHint")}</span>
        {pdfError ? <span className="motion-shake inline-block text-[11px] text-red-400">{pdfError}</span> : null}
      </div>
      <SectionHead title={t("campaign.lore.editor.tags")} glyph="tab-facts" className="mb-0 pt-1" />
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={draft.tags}
          onChange={(event) => onChange({ ...draft, tags: event.target.value })}
          placeholder={t("campaign.lore.editor.tagsPlaceholder")}
          className={cn(ui.input, "min-w-40 flex-1")}
        />
        <AddFromList prompt={t("campaign.lore.editor.addTag")} options={knownTags} onPick={(tag) => onChange({ ...draft, tags: appendTerm(draft.tags, tag) })} />
      </div>
    </>
  );
}

// The third chip (section 5.1): the table, or some of it by name.
function AudienceSelect({
  audience,
  members,
  onChange,
}: {
  audience: string[] | null;
  members: Array<{ userId: string; username: string }>;
  onChange: (audience: string[] | null) => void;
}) {
  const { t } = useI18n();
  const some = audience !== null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <button
        type="button"
        aria-pressed={!some}
        onClick={() => onChange(null)}
        className={cn(chip, !some ? "border-emerald-700 bg-emerald-950/40 text-emerald-200" : "")}
      >
        <Users className="size-3" /> {t("campaign.lore.editor.everyone")}
      </button>
      <button
        type="button"
        aria-pressed={some}
        onClick={() => onChange(some ? audience : [])}
        className={cn(chip, some ? "border-sky-700 bg-sky-950/40 text-sky-200" : "")}
      >
        <Eye className="size-3" /> {t("campaign.lore.editor.somePlayers")}
      </button>
      {some
        ? members.map((member) => {
            const on = audience.includes(member.userId);
            return (
              <button
                key={member.userId}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? audience.filter((id) => id !== member.userId) : [...audience, member.userId])}
                className={cn(chip, on ? "border-sky-600 bg-sky-950/60 text-sky-100" : "text-stone-500")}
              >
                {on ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                {member.username}
              </button>
            );
          })
        : null}
      {some && audience.length === 0 ? (
        <span className="flex items-center gap-1 text-[11px] text-amber-300">
          <X className="size-3" /> {t("campaign.lore.editor.pickAudience")}
        </span>
      ) : null}
    </div>
  );
}
