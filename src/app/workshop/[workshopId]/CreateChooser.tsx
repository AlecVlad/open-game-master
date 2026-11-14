"use client";

import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { ui } from "@/lib/ui";
import { offersImages, offersStoryModel, useCapabilities } from "@/lib/use-capabilities";
import {
  CREATE_CHOICES,
  missingModels,
  offeredWays,
  stepUnavailable,
  type CreateGroup,
  type CreateStep,
} from "@/lib/workshop/create-choices";

// The workshop's Create chooser (audit finding WF-08): what to make first,
// then the way in, each with the tool it lands in. Every way opens the
// tool that already makes that thing (src/lib/workshop/create-choices.ts);
// nothing is made here.

const GROUPS: CreateGroup[] = ["world", "playable", "picture"];

const CREATE_COPY_KEYS = {
  "outline": {
    "label": "workshop.create.choice.outline.label",
    "blurb": "workshop.create.choice.outline.blurb",
    "lands": "workshop.create.choice.outline.lands",
    "steps": [
      {
        "label": "workshop.create.choice.outline.step.0.label",
        "detail": "workshop.create.choice.outline.step.0.detail"
      },
      {
        "label": "workshop.create.choice.outline.step.1.label",
        "detail": "workshop.create.choice.outline.step.1.detail"
      },
      {
        "label": "workshop.create.choice.outline.step.2.label",
        "detail": "workshop.create.choice.outline.step.2.detail"
      }
    ]
  },
  "npc": {
    "label": "workshop.create.choice.npc.label",
    "blurb": "workshop.create.choice.npc.blurb",
    "lands": "workshop.create.choice.npc.lands",
    "steps": [
      {
        "label": "workshop.create.choice.npc.step.0.label",
        "detail": "workshop.create.choice.npc.step.0.detail"
      }
    ]
  },
  "place": {
    "label": "workshop.create.choice.place.label",
    "blurb": "workshop.create.choice.place.blurb",
    "lands": "workshop.create.choice.place.lands",
    "steps": [
      {
        "label": "workshop.create.choice.place.step.0.label",
        "detail": "workshop.create.choice.place.step.0.detail"
      }
    ]
  },
  "pc": {
    "label": "workshop.create.choice.pc.label",
    "blurb": "workshop.create.choice.pc.blurb",
    "lands": "workshop.create.choice.pc.lands",
    "steps": [
      {
        "label": "workshop.create.choice.pc.step.0.label",
        "detail": "workshop.create.choice.pc.step.0.detail"
      },
      {
        "label": "workshop.create.choice.pc.step.1.label",
        "detail": "workshop.create.choice.pc.step.1.detail"
      }
    ]
  },
  "creature": {
    "label": "workshop.create.choice.creature.label",
    "blurb": "workshop.create.choice.creature.blurb",
    "lands": "workshop.create.choice.creature.lands",
    "steps": [
      {
        "label": "workshop.create.choice.creature.step.0.label",
        "detail": "workshop.create.choice.creature.step.0.detail"
      }
    ]
  },
  "item": {
    "label": "workshop.create.choice.item.label",
    "blurb": "workshop.create.choice.item.blurb",
    "lands": "workshop.create.choice.item.lands",
    "steps": [
      {
        "label": "workshop.create.choice.item.step.0.label",
        "detail": "workshop.create.choice.item.step.0.detail"
      }
    ]
  },
  "shop": {
    "label": "workshop.create.choice.shop.label",
    "blurb": "workshop.create.choice.shop.blurb",
    "lands": "workshop.create.choice.shop.lands",
    "steps": [
      {
        "label": "workshop.create.choice.shop.step.0.label",
        "detail": "workshop.create.choice.shop.step.0.detail"
      }
    ]
  },
  "spell": {
    "label": "workshop.create.choice.spell.label",
    "blurb": "workshop.create.choice.spell.blurb",
    "lands": "workshop.create.choice.spell.lands",
    "steps": [
      {
        "label": "workshop.create.choice.spell.step.0.label",
        "detail": "workshop.create.choice.spell.step.0.detail"
      }
    ]
  },
  "option": {
    "label": "workshop.create.choice.option.label",
    "blurb": "workshop.create.choice.option.blurb",
    "lands": "workshop.create.choice.option.lands",
    "steps": [
      {
        "label": "workshop.create.choice.option.step.0.label",
        "detail": "workshop.create.choice.option.step.0.detail"
      }
    ]
  },
  "region": {
    "label": "workshop.create.choice.region.label",
    "blurb": "workshop.create.choice.region.blurb",
    "lands": "workshop.create.choice.region.lands",
    "steps": [
      {
        "label": "workshop.create.choice.region.step.0.label",
        "detail": "workshop.create.choice.region.step.0.detail"
      }
    ]
  },
  "map": {
    "label": "workshop.create.choice.map.label",
    "blurb": "workshop.create.choice.map.blurb",
    "lands": "workshop.create.choice.map.lands",
    "steps": [
      {
        "label": "workshop.create.choice.map.step.0.label",
        "detail": "workshop.create.choice.map.step.0.detail"
      }
    ]
  },
  "encounter": {
    "label": "workshop.create.choice.encounter.label",
    "blurb": "workshop.create.choice.encounter.blurb",
    "lands": "workshop.create.choice.encounter.lands",
    "steps": [
      {
        "label": "workshop.create.choice.encounter.step.0.label",
        "detail": "workshop.create.choice.encounter.step.0.detail"
      }
    ]
  },
  "table": {
    "label": "workshop.create.choice.table.label",
    "blurb": "workshop.create.choice.table.blurb",
    "lands": "workshop.create.choice.table.lands",
    "steps": [
      {
        "label": "workshop.create.choice.table.step.0.label",
        "detail": "workshop.create.choice.table.step.0.detail"
      }
    ]
  },
  "illustration": {
    "label": "workshop.create.choice.illustration.label",
    "blurb": "workshop.create.choice.illustration.blurb",
    "lands": "workshop.create.choice.illustration.lands",
    "steps": [
      {
        "label": "workshop.create.choice.illustration.step.0.label",
        "detail": "workshop.create.choice.illustration.step.0.detail"
      },
      {
        "label": "workshop.create.choice.illustration.step.1.label",
        "detail": "workshop.create.choice.illustration.step.1.detail"
      },
      {
        "label": "workshop.create.choice.illustration.step.2.label",
        "detail": "workshop.create.choice.illustration.step.2.detail"
      }
    ]
  }
} as const;
const GROUP_COPY_KEYS = {
  world: "workshop.create.group.world",
  playable: "workshop.create.group.playable",
  picture: "workshop.create.group.picture",
} as const;
const WAY_COPY_KEYS = {
  blank: "workshop.create.way.blank",
  copy: "workshop.create.way.copy",
  upload: "workshop.create.way.upload",
  draft: "workshop.create.way.draft",
  extract: "workshop.create.way.extract",
} as const;
const MODEL_COPY_KEYS = {
  story: "workshop.create.model.story",
  images: "workshop.create.model.images",
} as const;

export function CreateButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClick} className={cn(ui.btnSmall, className)} data-testid="create-open" data-tour="workshop-create">
      <Plus className="size-4" /> {t("workshop.create.action")}
    </button>
  );
}

// The hub's task row asks for one thing straight away ("Prepare a fight"):
// the chooser opens on that choice, with the way back to everything else.
export const HUB_TASKS: ReadonlyArray<{ id: string; label: string; glyph: string }> = [
  { id: "encounter", label: "Prepare a fight", glyph: "system-encounters" },
  { id: "map", label: "Make a map", glyph: "system-maps" },
  { id: "npc", label: "Create an NPC", glyph: "system-cast" },
  { id: "outline", label: "Build a world", glyph: "system-world" },
];

export function CreateChooser({
  open,
  onOpenChange,
  onGo,
  startAt = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGo: (step: CreateStep) => void;
  // A choice to open on (HUB_TASKS); the chooser is keyed on it.
  startAt?: string | null;
}) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<string | null>(startAt);
  const capabilities = useCapabilities();
  const models = { story: offersStoryModel(capabilities), images: offersImages(capabilities) };
  const choice = CREATE_CHOICES.find((entry) => entry.id === picked) ?? null;
  const choiceCopy = choice ? CREATE_COPY_KEYS[choice.id as keyof typeof CREATE_COPY_KEYS] : null;

  function close(next: boolean) {
    if (!next) setPicked(null);
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={close} title={choiceCopy ? t("workshop.create.title.choice", { name: t(choiceCopy.label) }) : t("workshop.createChooser.title")} className="lg:w-[min(96vw,44rem)]">
      {choice ? (
        <div className="flex flex-col gap-3" data-testid="create-steps">
          <button type="button" onClick={() => setPicked(null)} className={cn(ui.btnSmall, "w-fit border-transparent bg-transparent px-1 text-stone-400 shadow-none")}>
            <ArrowLeft className="size-4" /> {t("workshop.create.back")}
          </button>
          <p className="text-sm text-stone-300">{choiceCopy ? t(choiceCopy.blurb) : ""}</p>
          <p className="text-xs text-stone-500">
            {t("workshop.create.lands.label")} <span className="text-amber-200" data-testid="create-lands">{choiceCopy ? t(choiceCopy.lands) : ""}</span>
          </p>
          {missingModels(choice, models)
            .filter((model) => choice.steps.some((step) => !stepUnavailable(step, models) && step.drafts === model))
            .map((model) => (
              <p key={model} className="text-[11px] text-stone-500" data-testid="create-enable">
                {t("workshop.create.draft.unavailable.choice", { needs: t(MODEL_COPY_KEYS[model]) })}
              </p>
            ))}
          {choice.steps.map((step, index) => {
            const stepCopy = choiceCopy?.steps[index];
            const ways = offeredWays(step, models);
            const off = stepUnavailable(step, models);
            return (
              <button
                key={`${choice.id}-${index}`}
                type="button"
                disabled={off}
                onClick={() => {
                  close(false);
                  onGo(step);
                }}
                className="panel flex flex-col gap-1.5 rounded-lg p-3 text-left motion-press disabled:opacity-50"
                data-testid="create-step"
              >
                <span className="flex items-center gap-2 text-sm text-amber-100">
                  {stepCopy ? t(stepCopy.label) : step.label} <ArrowRight className="ml-auto size-4 text-stone-500" />
                </span>
                <span className="text-xs text-stone-400">{off ? t("workshop.create.draft.unavailable.step", { needs: t(MODEL_COPY_KEYS[step.needs ?? step.drafts ?? "story"]) }) : stepCopy ? t(stepCopy.detail) : step.detail}</span>
                <span className="flex flex-wrap gap-1">
                  {ways.map((way) => (
                    <span key={way} className="rounded-md border border-stone-700/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-stone-400">
                      {t(WAY_COPY_KEYS[way])}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="create-choices">
          <p className="text-sm text-stone-400">{t("workshop.create.intro")}</p>
          {!models.story ? (
            <p className="text-xs text-stone-500" data-testid="create-no-ai">
              {t("workshop.create.noTextModel")}
            </p>
          ) : null}
          {GROUPS.map((group) => (
            <section key={group} className="flex flex-col gap-1.5">
              <h3 className="eyebrow text-[10px] text-stone-500">{t(GROUP_COPY_KEYS[group])}</h3>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {CREATE_CHOICES.filter((entry) => entry.group === group).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setPicked(entry.id)}
                    className="flex flex-col rounded-lg border border-stone-700/60 px-2.5 py-2 text-left motion-press hover:border-amber-600/50"
                    data-testid={`create-choice-${entry.id}`}
                  >
                    <span className="text-sm text-stone-100">{entry.label}</span>
                    <span className="text-xs text-stone-500">{entry.lands}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Sheet>
  );
}
