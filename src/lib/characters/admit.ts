// The one door every character sheet comes through. Each route that stores
// a sheet (the table, the library, a file, a library character entering
// play, a companion) asks here, and gets back either the sheet to store,
// with every derived value written by the server, or the list of what is
// wrong with it. The rules are src/lib/srd/sheet-legality.ts; the rows they
// are judged against are looked up by src/lib/characters/catalog.ts.
import { abilityPlaceFor, legalityContextsFor, type ContextInput } from "@/lib/characters/catalog";
import { spendAbilityPool, spendWealthRolls } from "@/lib/db/creation-rolls";
import type { CreateSheetInput } from "@/lib/schemas/sheet";
import type { GearProblemDetail } from "@/lib/srd/gear-problems";
import { legalizeSheet } from "@/lib/srd/sheet-legality";

export type Admitted =
  | {
      ok: true;
      sheet: CreateSheetInput;
      // Hit dice the server rolled for a table that rolls its hit points.
      rolledHp?: number[];
      // Picks a file left open that it could not have made (issue #430).
      owed?: string[];
      // Call once the character is stored: the rolls it was made with are
      // spent, so the next character throws its own.
      settle: () => void;
    }
  | { ok: false; problems: string[]; problemDetails?: Array<GearProblemDetail | null> };

export function admitSheet(
  input: Omit<ContextInput, "sheet"> & { sheet: CreateSheetInput },
): Admitted {
  // A race id can name more than one row (src/lib/characters/catalog.ts
  // raceCandidatesFor): the sheet passes when it is legal under one of them,
  // and is otherwise told what is wrong under the first.
  const contexts = legalityContextsFor(input);
  const verdicts = contexts.map((candidate) => ({
    context: candidate,
    judged: legalizeSheet(input.sheet, candidate),
  }));
  const passed = verdicts.find((verdict) => !verdict.judged.problems.length);
  if (!passed) {
    return {
      ok: false,
      problems: verdicts[0].judged.problems,
      problemDetails: verdicts[0].judged.problemDetails,
    };
  }
  const { context, judged } = passed;
  // Whether the scores needed the pool the server rolled: they did when the
  // same sheet does not pass without it.
  const usedPool =
    Boolean(context.abilityPool) &&
    legalizeSheet(input.sheet, { ...context, abilityPool: null, rollDie: () => 1 }).problems.length > 0;
  return {
    ok: true,
    sheet: judged.sheet,
    ...(judged.rolled?.hp ? { rolledHp: judged.rolled.hp } : {}),
    ...(judged.owed?.length ? { owed: judged.owed } : {}),
    settle: () => {
      if (usedPool) {
        spendAbilityPool(input.userId, abilityPlaceFor(input));
      }
      if (input.campaign && context.wealthRoll !== null && context.wealthRoll !== undefined) {
        spendWealthRolls(input.userId, input.campaign.id);
      }
    },
  };
}

// Only exact, fixed diagnostics receive a code. Variable messages can include
// content-pack names and player choices, so they remain untouched until their
// source can provide structured parameters rather than guessed text matches.
const STABLE_REFUSAL_CODES: Readonly<Record<string, string>> = {
  "This table turns multiclassing off; a character made here holds one class.": "MULTICLASS_DISABLED",
  "A character holds each class once; the class list names one twice.": "DUPLICATE_CLASS",
  "This subclass is not configured to use the third-caster spellcasting progression.": "THIRD_CASTER_NOT_CONFIGURED",
  "You already have a character in this campaign.": "HERO_ALREADY_HAS_CHARACTER",
  "Characters can only be changed in the lobby.": "CAMPAIGN_NOT_LOBBY",
};

// Return codes in the same order as the messages. Unknown, variable diagnostics
// deliberately stay null until their source can provide structured parameters.
const GEAR_REFUSAL_CODES: Readonly<Record<string, string>> = {
  homebrew: "STARTING_GEAR_HOMEBREW",
  magic: "STARTING_GEAR_MAGIC",
  unpriced: "STARTING_GEAR_UNPRICED",
  insufficientFunds: "STARTING_GEAR_INSUFFICIENT_FUNDS",
  invalidOption: "STARTING_GEAR_INVALID_OPTION",
  notProficient: "STARTING_GEAR_NOT_PROFICIENT",
  invalidSlot: "STARTING_GEAR_INVALID_SLOT",
  invalidBackgroundChoice: "STARTING_GEAR_INVALID_BACKGROUND_CHOICE",
};

export function refusalCodes(
  problems: string[],
  problemDetails?: Array<GearProblemDetail | null>,
): Array<string | null> {
  return problems.map((problem, index) => {
    const detail = problemDetails?.[index];
    return detail ? (GEAR_REFUSAL_CODES[detail.code] ?? null) : (STABLE_REFUSAL_CODES[problem] ?? null);
  });
}

// The refusal every door answers with: the first problem as the message a
// screen shows, and the whole list for one that can show more. Codes and
// parameters are additive; the original English fields stay for older clients.
export function refusal(
  problems: string[],
  status = 400,
  problemDetails?: Array<GearProblemDetail | null>,
): Response {
  const problemParams = problems.map((_, index) => problemDetails?.[index]?.params ?? null);
  return Response.json(
    {
      error: problems[0] ?? "That character is not within the rules.",
      problems,
      problemCodes: refusalCodes(problems, problemDetails),
      ...(problemParams.some((params) => params !== null) ? { problemParams } : {}),
    },
    { status },
  );
}
