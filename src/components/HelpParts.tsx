"use client";

import { Search, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { GameIcon } from "@/components/ui/GameIcon";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { textKey } from "@/lib/language/text-logic";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages/index";

const SECTION_TITLE_KEYS: Record<string, MessageKey> = {
  "Guided tours": "help.section.guidedTours",
  "Getting started": "help.section.gettingStarted",
  "The lobby": "help.section.lobby",
  "Talking to the GM": "help.section.talking",
  "Your hand in a fight": "help.section.fightHand",
  "When the GM gets it wrong": "help.section.gmWrong",
  "Report a problem": "help.section.report",
  "What the GM remembers": "help.section.memory",
  "The side panel": "help.section.sidePanel",
  "Dice": "help.section.dice",
  "Voice and narration": "help.section.voice",
  "Live voice chat": "help.section.liveVoice",
  "Ambience and music": "help.section.ambience",
  "Playing with a human GM": "help.section.humanGM",
  "Party lead": "help.section.partyLead",
  "Campaign plugins": "help.section.plugins",
  "New to D&D?": "help.section.newcomer",
  "About": "help.section.about",
  "What this is": "help.section.whatThisIs",
  "Taking your turn": "help.section.takingTurn",
  "How the game is run": "help.section.howRun",
  "One turn at a time": "help.section.oneTurn",
  "If a reply lands badly": "help.section.badReply",
  "If you get stuck": "help.section.stuck",
  "What a workshop is": "help.section.workshopWhat",
  "Into a campaign, and back out": "help.section.workshopImport",
  "Copying things": "help.section.workshopCopy",
  "With or without AI": "help.section.workshopAI",
  "Where the rules live": "help.section.workshopRules",
  "The tools, one by one": "help.section.workshopTools",
};

const MODE_LABEL_KEYS: Record<string, MessageKey> = {
  Do: "help.mode.do",
  Say: "help.mode.say",
  OOC: "help.mode.ooc",
  Direct: "help.mode.direct",
};



// The painted glyph each section of this dialog leads with, by title. The
// other help dialogs pass titles that are not here and keep their line icon.
const SECTION_GLYPHS: Record<string, string> = {
  "Guided tours": "pace-normal",
  "Getting started": "tab-context",
  "The lobby": "tab-party",
  "Talking to the GM": "tab-chat",
  "Your hand in a fight": "tab-battle",
  "When the GM gets it wrong": "rest-concentration-break",
  "Report a problem": "tab-context",
  "What the GM remembers": "tab-facts",
  "The side panel": "tab-session",
  Dice: "die-d20",
  "Voice and narration": "tab-story",
  "Live voice chat": "ui-voice",
  "Ambience and music": "tab-ambience",
  "Playing with a human GM": "tab-dm",
  "Party lead": "tab-lead",
  "Campaign plugins": "system-plugin",
  "New to D&D?": "tab-story",
  About: "system-lore",
};

function sectionId(title: string): string {
  return `help-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

// Exported (through HelpDialog) for HowToPlayDialog, which is the short orientation read to this
// dialog's full reference. Both used to carry byte-identical private copies,
// so a styling change had to be made twice or the two drifted apart.
export function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  const t = useT();
  const glyph = SECTION_GLYPHS[title];
  return (
    <section id={sectionId(title)} className="mb-6 scroll-mt-4 last:mb-0">
      {/* The kit heading's classes with either a painted glyph or, for the
          dialogs that have none, the line icon they always passed. */}
      <header className="section-head">
        {glyph ? (
          <GameIcon icon={{ kind: "glyph", key: glyph }} size="size-7" className="shrink-0" />
        ) : (
          <Icon className="size-4 shrink-0 text-amber-500/80" />
        )}
        <h3 className="section-head-title">{SECTION_TITLE_KEYS[title] ? t(SECTION_TITLE_KEYS[title]) : title}</h3>
        <span className="section-head-rule motion-rule" aria-hidden="true" />
      </header>
      <div className="space-y-2 text-sm leading-relaxed text-stone-400">{children}</div>
    </section>
  );
}

export function ModeRow({
  label,
  lead,
  children,
}: {
  label: string;
  lead?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex items-start gap-3">
      <span
        className={
          lead
            ? "mt-0.5 w-14 shrink-0 rounded-full bg-gradient-to-b from-ember-400 to-ember-600 px-2 py-0.5 text-center text-xs font-medium text-stone-950"
            : "mt-0.5 w-14 shrink-0 rounded-full bg-gradient-to-b from-amber-100 to-amber-400 px-2 py-0.5 text-center text-xs font-medium text-amber-950"
        }
      >
        {MODE_LABEL_KEYS[label] ? t(MODE_LABEL_KEYS[label]) : label}
      </span>
      <span>{children}</span>
    </div>
  );
}


// Everyday words for what a section covers that its title does not say, so
// "volume" finds the narration and ambience sections and "mic" finds voice
// chat. The search also reads each section's own text (below), so this list
// only needs the words the text itself never uses.
const SECTION_WORDS: Record<string, string> = {
  "Guided tours": "tour walkthrough replay spotlight обучение тур туры подсказка руководство повторить",
  "Getting started": "start begin new campaign join invite code character build first начало начать новая кампания одиночная игра присоединиться герой персонаж",
  "The lobby": "ready begin start invite room code settings waiting лобби комната готовность игроки код приглашение настройки",
  "Talking to the GM": "message type action speak ooc direct ask question composer общение мастер сообщение действие речь вне роли указание спросить вопрос",
  "Your hand in a fight": "combat battle attack cards spells turn initiative бой атака карточки заклинания ход инициатива оружие",
  "When the GM gets it wrong": "undo mistake reroll edit retry wrong fix ошибка исправить повторить откат продолжить переброс изменить проверка лора",
  "Report a problem": "bug broken error crash report problem github issue admin host проблема ошибка баг отчёт github сервер администратор",
  "What the GM remembers": "memory pin remember canon facts forget память закрепить факты секреты запомнить архив",
  "The side panel": "tabs inventory sheet hp party story notes chat settings layout arrange вкладки группа лист здоровье карта история заметки чат настройки расположение",
  Dice: "roll rolls secret physical real pixels bluetooth",
  "Voice and narration": "volume mute unmute sound speaker read aloud tts microphone mic dictation push to talk голос громкость звук озвучка диктовка микрофон речь",
  "Live voice chat": "microphone mic headphones call talk mute proximity side rooms голосовой чат микрофон наушники звонок разговор комнаты отключить",
  "Ambience and music": "volume sound music audio mute soundtrack атмосфера музыка звук окружение фон саундтрек",
  "Playing with a human GM": "human gm dm console beats assisted живой человек мастер ведущий ассистент",
  "Party lead": "lead owner rewind permissions ведущий группы владелец полномочия перемотка приглашение",
  "Campaign plugins": "world pack plugin setting install плагины кампания мир сеттинг установка набор",
  "New to D&D?": "rules beginner learn reference rulebook glossary новичок правила справочник книга правил обучение",
  About: "license credits version",
};

// Whether a section answers the search: every word in its title, its
// everyday words or its own text on the page.
export function helpMatches(title: string, query: string, text = ""): boolean {
  const words = textKey(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = textKey(`${title} ${SECTION_WORDS[title] ?? ""} ${text}`);
  return words.every((word) => haystack.includes(word));
}

function jumpToSection(title: string) {
  const target = document.getElementById(sectionId(title));
  if (!target) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  target.removeAttribute("data-flash");
  void target.offsetWidth;
  target.setAttribute("data-flash", "");
}

// Contents: every section one tap away, narrowed by the field. A search
// reads the sections' own words as well as their titles, so the question a
// person actually has ("volume", "mic", "inventory") finds the place that
// answers it.
export function HelpContents({
  withTours,
  withReport = false,
  initialSection,
}: {
  withTours: boolean;
  // Only the table has "Report a problem" (issue #459): the admin's button,
  // or for everyone else, who to ask.
  withReport?: boolean;
  initialSection?: string;
}) {
  const t = useT();
  const [find, setFind] = useState("");
  const needle = textKey(find);
  // Opened from a control that has a section of its own: brought into view
  // once the dialog has drawn it.
  useEffect(() => {
    if (!initialSection) return;
    const timer = window.setTimeout(() => jumpToSection(initialSection), 120);
    return () => window.clearTimeout(timer);
  }, [initialSection]);
  const contents = Object.keys(SECTION_GLYPHS).filter((title) => {
    if (title === "Guided tours" && !withTours) return false;
    if (title === "Report a problem" && !withReport) return false;
    if (!needle) return true;
    const text = typeof document === "undefined" ? "" : document.getElementById(sectionId(title))?.textContent ?? "";
    const translatedTitle = SECTION_TITLE_KEYS[title] ? t(SECTION_TITLE_KEYS[title]) : title;
    return helpMatches(title, needle, text) || helpMatches(translatedTitle, needle, text);
  });
  return (
    <nav aria-label={t("help.contents.aria")} className="mb-5">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-300/70" />
        <input
          value={find}
          onChange={(event) => setFind(event.target.value)}
          onKeyDown={(event) => {
            // Enter goes to the first section that answers.
            if (event.key === "Enter" && contents[0]) {
              event.preventDefault();
              jumpToSection(contents[0]);
            }
          }}
          placeholder={t("help.search.placeholder")}
          aria-label={t("help.search.aria")}
          className={cn(ui.input, "h-10 pl-9")}
        />
      </div>
      <div className="stagger-pop flex flex-wrap gap-1.5" aria-live="polite">
        {contents.map((title) => (
          <button
            key={title}
            type="button"
            onClick={() => jumpToSection(title)}
            className="motion-press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-stone-700/70 py-0.5 pl-1 pr-3 text-xs text-stone-300 hover:border-amber-500/40 hover:text-amber-100"
          >
            <GameIcon icon={{ kind: "glyph", key: SECTION_GLYPHS[title] }} size="size-6" />
            {SECTION_TITLE_KEYS[title] ? t(SECTION_TITLE_KEYS[title]) : title}
          </button>
        ))}
        {!contents.length ? <p className="text-xs text-stone-500">{t("help.search.empty")}</p> : null}
      </div>
    </nav>
  );
}