import type { MessageKey } from "@/lib/i18n/messages";

const REFUSAL_MESSAGE_KEYS = {
  MULTICLASS_DISABLED: "builder.refusal.multiclass.disabled",
  DUPLICATE_CLASS: "builder.refusal.multiclass.duplicate",
  THIRD_CASTER_NOT_CONFIGURED: "builder.refusal.spellcasting.thirdCaster",
  BUNDLE_TOO_LARGE: "characters.err.import.tooLarge",
  NOT_CHARACTER_FILE: "characters.err.import.notCharacter",
  NOT_OGM_CHARACTER_FILE: "characters.err.import.notOgm",
  INVALID_CHARACTER_FILE_JSON: "characters.err.import.invalidJson",
  CHARACTER_NOT_FOUND: "characters.err.notFound",
  HERO_NOT_FOUND: "campaign.joinConfirm.error.heroNotFound",
  GM_SEAT_NO_CHARACTER: "campaign.joinConfirm.error.gmSeat",
  PICK_ONE_HERO: "campaign.joinConfirm.error.pickOneHero",
  HERO_ALREADY_HAS_CHARACTER: "campaign.joinConfirm.error.alreadyHasCharacter",
  CAMPAIGN_NOT_LOBBY: "campaign.joinConfirm.error.lobbyOnly",
} satisfies Record<string, MessageKey>;

// API refusals keep their original prose for older clients and unknown
// diagnostics. New clients translate only messages carrying a known code.
export function refusalText(
  data: unknown,
  fallback: string,
  t: (key: MessageKey) => string,
): string {
  const body = (data ?? {}) as {
    error?: unknown;
    problems?: unknown;
    problemCodes?: unknown;
    errorCode?: unknown;
  };
  const problems = Array.isArray(body.problems)
    ? body.problems.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
    : [];
  const messages = problems.length > 1
    ? problems
    : [typeof body.error === "string" && body.error ? body.error : (problems[0] ?? "")].filter(Boolean);
  if (!messages.length) return fallback;

  const codes = Array.isArray(body.problemCodes) ? body.problemCodes : [body.errorCode];
  const translated = messages.map((message, index) => {
    const code = codes[index];
    if (typeof code === "string" && code in REFUSAL_MESSAGE_KEYS) {
      return t(REFUSAL_MESSAGE_KEYS[code as keyof typeof REFUSAL_MESSAGE_KEYS]);
    }
    return message;
  });
  return translated.length > 1 ? translated.join("\n") : translated[0];
}
