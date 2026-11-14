"use client";

import { PREREQUISITE_SUGGESTIONS } from "@/lib/workshop/pickers";
import { useT } from "@/lib/i18n/provider";
import { SelectField, TextField } from "@/app/workshop/homebrew/fields";
import type { EditorKind } from "@/app/workshop/homebrew/types";
import type { Data } from "@/app/workshop/homebrew/draft";
import { ArchetypeFields } from "@/app/workshop/homebrew/ArchetypeFields";
import { SpeciesFields } from "@/app/workshop/homebrew/SpeciesFields";
import { BackgroundFields } from "@/app/workshop/homebrew/BackgroundFields";
import { engineFeatNames } from "@/lib/srd/feat-effects";
import { compareNames } from "@/lib/language/text-logic";

// The character-option forms: feat, background, species, subclass. Each
// writes the field names the character builder already reads for the
// content pack's own rows, so a homebrew background shows its skills in
// the same picker an SRD one does.

// The feats the engines run, for a workshop feat to run as one.
const RUNS_AS_NAMES = engineFeatNames().slice().sort(compareNames);

function FeatFields({ data, set }: { data: Data; set: (patch: Data) => void }) {
  const t = useT();
  const runsAsOptions = [{ value: "", label: t("workshop.homebrew.feat.runsAs.own") }, ...RUNS_AS_NAMES.map((name) => ({ value: name, label: name }))];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <TextField
        label={t("workshop.homebrew.feat.prerequisite")}
        value={String(data.prerequisite ?? "")}
        onChange={(prerequisite) => set({ prerequisite })}
        placeholder={t("workshop.homebrew.feat.prerequisite.placeholder")}
        maxLength={200}
        hint={t("workshop.homebrew.feat.prerequisite.hint")}
        suggestions={PREREQUISITE_SUGGESTIONS}
      />
      <SelectField
        label={t("workshop.homebrew.feat.runsAs")}
        value={String(data.runsAs ?? "")}
        options={runsAsOptions}
        onChange={(runsAs) => set({ runsAs: runsAs || undefined })}
        hint={t("workshop.homebrew.feat.runsAs.hint")}
      />
    </div>
  );
}

export function OptionFields({
  kind,
  data,
  onChange,
  workshopClasses = [],
}: {
  kind: Exclude<EditorKind, "item" | "spell" | "hazard" | "class">;
  data: Data;
  onChange: (next: Data) => void;
  workshopClasses?: Array<{ id: string; name: string; subclassLevel?: number }>;
}) {
  const set = (patch: Data) => onChange({ ...data, ...patch });
  switch (kind) {
    case "feat":
      return <FeatFields data={data} set={set} />;
    case "background":
      return <BackgroundFields data={data} set={set} />;
    case "race":
      return <SpeciesFields data={data} set={set} />;
    case "archetype":
      return <ArchetypeFields data={data} set={set} workshopClasses={workshopClasses} />;
  }
}
