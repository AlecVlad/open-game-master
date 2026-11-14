// Display conversion only. The rules engine and persisted D&D values stay
// in feet and pounds; this module converts the words and numbers people see.
export type MeasurementSystem = "si" | "imperial";

type LocaleLike = string;

function numberValue(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  if (normalized.includes("/")) {
    const [numerator, denominator] = normalized.split("/").map(Number);
    return denominator ? numerator / denominator : Number.NaN;
  }
  return Number(normalized);
}

function isRussian(locale: LocaleLike): boolean {
  return locale.toLowerCase().startsWith("ru");
}

function preserveTrailingPeriod(match: string, converted: string): string {
  return converted + (match.endsWith(".") ? "." : "");
}

function displayNumber(value: number, places: number, locale: LocaleLike): string {
  const rounded = Number(value.toFixed(places));
  const raw = String(rounded);
  return isRussian(locale)
    ? raw.replace(".", ",")
    : raw;
}

export function formatFeet(feet: number, system: MeasurementSystem = "imperial", locale = "english"): string {
  return system === "si"
    ? displayNumber(feet * 0.3048, 1, locale) + (isRussian(locale) ? " м" : " m")
    : displayNumber(feet, 1, locale) + " ft";
}

export function formatPounds(pounds: number, system: MeasurementSystem = "imperial", locale = "english"): string {
  if (system !== "si") {
    return displayNumber(pounds, 2, locale) + " lb";
  }
  const kilograms = pounds * 0.45359237;
  return kilograms < 0.01
    ? displayNumber(kilograms * 1000, 1, locale) + (isRussian(locale) ? " г" : " g")
    : displayNumber(kilograms, 2, locale) + (isRussian(locale) ? " кг" : " kg");
}

const AMOUNT = "(\\d+(?:[.,]\\d+)?|\\d+\\s*\\/\\s*\\d+)";

export function formatMeasurementText(
  text: string,
  system: MeasurementSystem = "imperial",
  locale: LocaleLike = "english",
): string {
  if (system !== "si" || !text) return text;
  const convert = (raw: string, factor: number, unit: string, places: number) =>
    displayNumber(numberValue(raw) * factor, places, locale) + " " + unit;
  let result = text;
  const rangeAmount = AMOUNT + "\\s*(?:-|–|—|to)\\s*" + AMOUNT;
  const convertRange = (units: string, factor: number, unit: string, places: number) => {
    result = result.replace(new RegExp(rangeAmount + "\\s*(?:" + units + ")(?![\\p{L}])", "giu"), (match, from: string, to: string) =>
      preserveTrailingPeriod(match, displayNumber(numberValue(from) * factor, places, locale) + "–" + displayNumber(numberValue(to) * factor, places, locale) + " " + unit),
    );
  };
  convertRange("mph", 1.609344, isRussian(locale) ? "км/ч" : "km/h", 0);
  convertRange("miles?|mi\\.?", 1.609344, isRussian(locale) ? "км" : "km", 1);
  convertRange("yards?|yds?\\.?|ярд(?:а|ов|ы)?", 0.9144, isRussian(locale) ? "м" : "m", 1);
  convertRange("feet|foot|ft\\.?|фут(?:а|ов|ы)?", 0.3048, isRussian(locale) ? "м" : "m", 1);
  convertRange("inches|inch|in\\.|дюйм(?:а|ов|ы)?", 2.54, isRussian(locale) ? "см" : "cm", 1);
  convertRange("pounds?|lbs?\\.?|фунт(?:а|ов|ы)?", 0.45359237, isRussian(locale) ? "кг" : "kg", 2);

  // Speed first: otherwise the "mi" part could be mistaken for a distance.
  result = result.replace(new RegExp(AMOUNT + "\\s*mph\\b", "giu"), (_match, raw: string) =>
    convert(raw, 1.609344, isRussian(locale) ? "км/ч" : "km/h", 0),
  );
  result = result.replace(new RegExp(AMOUNT + "\\s*(?:miles?|mi\\.?|миль|мили)(?![\\p{L}])", "giu"), (match, raw: string) =>
    preserveTrailingPeriod(match, convert(raw, 1.609344, isRussian(locale) ? "км" : "km", 1)),
  );
  result = result.replace(new RegExp(AMOUNT + "\\s*(?:yards?|yds?\\.?|ярд(?:а|ов|ы)?)(?![\\p{L}])", "giu"), (match, raw: string) =>
    preserveTrailingPeriod(match, convert(raw, 0.9144, isRussian(locale) ? "м" : "m", 1)),
  );
  result = result.replace(new RegExp(AMOUNT + "\\s*(?:-\\s*)?(?:feet|foot|ft\\.?|фут(?:а|ов|ы)?)(?![\\p{L}])", "giu"), (match, raw: string) =>
    preserveTrailingPeriod(match, convert(raw, 0.3048, isRussian(locale) ? "м" : "m", 1)),
  );
  result = result.replace(new RegExp(AMOUNT + "\\s*(?:inches|inch|in\\.|дюйм(?:а|ов|ы)?)(?![\\p{L}])", "giu"), (match, raw: string) =>
    preserveTrailingPeriod(match, convert(raw, 2.54, isRussian(locale) ? "см" : "cm", 1)),
  );
  result = result.replace(new RegExp(AMOUNT + "\\s*(?:pounds?|lbs?\\.?|фунт(?:а|ов|ы)?)(?![\\p{L}])", "giu"), (match, raw: string) =>
    preserveTrailingPeriod(match, convert(raw, 0.45359237, isRussian(locale) ? "кг" : "kg", 2)),
  );
  result = result.replace(new RegExp(AMOUNT + "\\s*(?:ounces?|oz\\.?|унци(?:я|и|й))(?![\\p{L}])", "giu"), (match, raw: string) =>
    preserveTrailingPeriod(match, convert(raw, 28.349523125, isRussian(locale) ? "г" : "g", 1)),
  );
  result = result.replace(new RegExp(AMOUNT + "\\s*(?:gallons?|gal\\.?|галлон(?:а|ов|ы)?)(?![\\p{L}])", "giu"), (match, raw: string) =>
    preserveTrailingPeriod(match, convert(raw, 3.785411784, isRussian(locale) ? "л" : "L", 2)),
  );
  result = result.replace(/(-?\d+(?:[.,]\d+)?)\s*°\s*F\b/giu, (_match, raw: string) => {
    const celsius = (numberValue(raw) - 32) * (5 / 9);
    return displayNumber(celsius, 1, locale) + " °C";
  });
  return result;
}
