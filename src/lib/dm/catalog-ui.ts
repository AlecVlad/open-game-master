import type { CatalogEntry, CatalogField } from "@/lib/dm/catalog-types";
import type { MessageKey } from "@/lib/i18n/messages/index.ts";
import type { Params } from "@/lib/i18n/core.ts";

type Translate = (key: MessageKey, params?: Params) => string;

// The catalog is also consumed by the model and the dispatcher. Its names,
// field names and option values are protocol identifiers, not display text.
// Translate only the human-facing copy on a clone, leaving every submitted
// value and every matching key exactly as the engine expects.
function displayText(t: Translate, key: string, fallback: string, sharedKey?: string): string {
  const translated = t(key as MessageKey);
  if (translated !== key) return translated;
  if (sharedKey) {
    const shared = t(sharedKey as MessageKey);
    if (shared !== sharedKey) return shared;
  }
  return fallback;
}

export function localizeCatalogField(field: CatalogField, entryName: string, t: Translate): CatalogField {
  const base = `campaign.dmCatalog.${entryName}.field.${field.name}`;
  return {
    ...field,
    label: displayText(t, `${base}.label`, field.label, `campaign.dmCatalog.shared.field.${field.name}.label`),
    ...(field.placeholder
      ? { placeholder: displayText(t, `${base}.placeholder`, field.placeholder, `campaign.dmCatalog.shared.field.${field.name}.placeholder`) }
      : {}),
    ...(field.help ? { help: displayText(t, `${base}.help`, field.help, `campaign.dmCatalog.shared.field.${field.name}.help`) } : {}),
    ...(field.options
      ? {
          options: field.options.map((option) => {
            let fallback = option.label;
            if (entryName === "afflict" && field.name === "name") {
              if (fallback.startsWith("Disease: ")) {
                fallback = `${displayText(t, "campaign.dmCatalog.afflict.optionPrefix.disease", "Disease")}: ${fallback.slice("Disease: ".length)}`;
              } else if (fallback.startsWith("Poison: ")) {
                fallback = `${displayText(t, "campaign.dmCatalog.afflict.optionPrefix.poison", "Poison")}: ${fallback.slice("Poison: ".length)}`;
              }
            }
            return {
              ...option,
              label: displayText(t, `${base}.option.${option.value}`, fallback, `campaign.dmCatalog.shared.option.${option.value}`),
            };
          }),
        }
      : {}),
    ...(field.other
      ? {
          other: {
            ...field.other,
            label: displayText(t, `${base}.other.label`, field.other.label, `campaign.dmCatalog.shared.field.${field.name}.other.label`),
            ...(field.other.placeholder
              ? { placeholder: displayText(t, `${base}.other.placeholder`, field.other.placeholder, `campaign.dmCatalog.shared.field.${field.name}.other.placeholder`) }
              : {}),
          },
        }
      : {}),
    ...(field.host?.older
      ? {
          host: {
            ...field.host,
            older: {
              ...field.host.older,
              label: displayText(t, `${base}.older.label`, field.host.older.label),
              ...(field.host.older.help
                ? { help: displayText(t, `${base}.older.help`, field.host.older.help) }
                : {}),
            },
          },
        }
      : {}),
  };
}

export function localizeCatalogEntry(entry: CatalogEntry, t: Translate): CatalogEntry {
  const base = `campaign.dmCatalog.${entry.name}`;
  return {
    ...entry,
    label: displayText(t, `${base}.label`, entry.label),
    summary: displayText(t, `${base}.summary`, entry.summary),
    fields: entry.fields.map((field) => localizeCatalogField(field, entry.name, t)),
    ...(entry.confirm
      ? {
          confirm: {
            ...entry.confirm,
            message: displayText(t, `${base}.confirm`, entry.confirm.message),
          },
        }
      : {}),
  };
}
