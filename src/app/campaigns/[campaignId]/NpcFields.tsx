"use client";

import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { Slider } from "@/components/ui/Slider";
import { PERSONALITY_AXES, clampAxis } from "@/lib/dm/npc-logic";
import {
  AXIS_LABELS,
  BLANK_PERSONALITY,
  removeRelation,
  setRelation,
  type NpcDraft,
  type RelationGraph,
} from "@/lib/npcs/forge";
import { textKey } from "@/lib/language/text-logic";

// The three parts of the NPC forge that are more than a text box.
//
// Split out of DmNpcForgePanel for the same reason MapTools was split out of
// the map studio: the panel around them is fetching, saving and error
// handling, and these are the fields themselves. Neither half decides
// anything; every change here becomes a draft the server validates
// (src/lib/npcs/forge.ts).

const AXIS_NAME_KEY: Record<(typeof PERSONALITY_AXES)[number], string> = {
  drive: "campaign.npcEditor.axis.drive",
  diligence: "campaign.npcEditor.axis.diligence",
  boldness: "campaign.npcEditor.axis.boldness",
  warmth: "campaign.npcEditor.axis.warmth",
  empathy: "campaign.npcEditor.axis.empathy",
  composure: "campaign.npcEditor.axis.composure",
};

function axisValueKey(axis: (typeof PERSONALITY_AXES)[number], value: number): string {
  const score = clampAxis(value);
  const variant = score === 0 ? "neutral" : score > 0 ? (score >= 2 ? "veryHigh" : "high") : (score <= -2 ? "veryLow" : "low");
  return "campaign.npcEditor.axisValue." + axis + "." + variant;
}

function relationValueKey(value: number): string {
  return "campaign.npcEditor.relation." + clampAxis(value);
}

// Who somebody is, as words rather than as numbers. The slider moves an
// integer the engine drifts and compares; the label beside it is the only
// part a DM should have to think in.
export function PersonalitySliders({
  draft,
  onChange,
}: {
  draft: NpcDraft;
  onChange: (draft: NpcDraft) => void;
}) {
  const { t } = useI18n();
  const personality = draft.personality ?? BLANK_PERSONALITY;
  return (
    <>
      {PERSONALITY_AXES.map((axis) => (
        <label key={axis} className="flex items-center gap-2 text-[11px] text-stone-500">
          <span className="w-16 shrink-0">{t(AXIS_NAME_KEY[axis] as never)}</span>
          <Slider
            min={-3}
            max={3}
            step={1}
            value={personality[axis] ?? 0}
            onChange={(next) =>
              onChange({
                ...draft,
                personality: { ...personality, [axis]: next },
              })
            }
            label={t(AXIS_NAME_KEY[axis] as never)}
            className="min-w-0 flex-1"
          />
          <span className="w-24 shrink-0 text-right text-stone-400">
            {t(axisValueKey(axis, personality[axis] ?? 0) as never)}
          </span>
        </label>
      ))}
      <p className="text-[10px] text-stone-600">
        {t("campaign.npcEditor.personality.note")}
      </p>
    </>
  );
}

export const GOAL_FIELDS = [
  ["scene", "Right now, in the next scene"],
  ["session", "Working toward over a few sessions"],
  ["ambition", "What they would give up everything for"],
] as const;

export type GoalField = (typeof GOAL_FIELDS)[number][0];

// Typing a goal is not the same as generating one: an emptied box has to
// clear the goal, where a generated blank has to leave it alone.
export function setGoal(draft: NpcDraft, field: GoalField, value: string): NpcDraft {
  const text = value.slice(0, field === "ambition" ? 300 : 200);
  if (field === "session") {
    return {
      ...draft,
      goals: {
        ...draft.goals,
        session: text
          ? {
              text,
              // The progress belongs to the chapter engine, which advances it
              // on background dice; editing the words must not reset it.
              progress: draft.goals.session?.progress ?? 0,
              target: draft.goals.session?.target ?? 3,
            }
          : undefined,
      },
    };
  }
  return { ...draft, goals: { ...draft.goals, [field]: text || undefined } };
}

export function goalText(draft: NpcDraft, field: GoalField): string {
  return field === "session"
    ? draft.goals.session?.text ?? ""
    : (draft.goals[field] as string | undefined) ?? "";
}

// How somebody feels about other people, and the half of that a stored JSON
// field cannot say: whether the other person agrees, and whether they exist.
// Relations are stored per NPC, so a grudge is one-sided until the other side
// writes one back, which is true to life and worth showing.
export function RelationEditor({
  draft,
  graph,
  others,
  onChange,
}: {
  draft: NpcDraft;
  graph: RelationGraph;
  // Everyone else on the roster, so a link can be made by picking a name
  // rather than by typing one and hoping.
  others: string[];
  onChange: (draft: NpcDraft) => void;
}) {
  const { t } = useI18n();
  const edgeFor = (name: string) =>
    graph.edges.find((entry) => {
      const pair = [textKey(entry.from), textKey(entry.to)];
      return pair.includes(textKey(name)) && pair.includes(textKey(draft.name));
    });

  return (
    <>
      {draft.relations.map((relation) => {
        const edge = edgeFor(relation.npcName);
        const theirScore = edge?.from === draft.name ? edge?.backScore ?? 0 : edge?.score ?? 0;
        return (
          <div key={relation.npcName} className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 shrink-0 truncate text-xs text-stone-300">
              {relation.npcName}
            </span>
            <Slider
              min={-3}
              max={3}
              step={1}
              value={relation.score}
              onChange={(next) =>
                onChange({
                  ...draft,
                  relations: setRelation(draft.relations, relation.npcName, next, relation.note),
                })
              }
              label={t("campaign.npcEditor.relation.slider", { name: relation.npcName })}
              className="w-24 shrink-0"
            />
            <span className="w-20 shrink-0 text-[11px] text-stone-400">
              {t(relationValueKey(relation.score) as never)}
            </span>
            <input
              value={relation.note ?? ""}
              onChange={(event) =>
                onChange({
                  ...draft,
                  relations: setRelation(
                    draft.relations,
                    relation.npcName,
                    relation.score,
                    event.target.value,
                  ),
                })
              }
              placeholder={t("campaign.npcEditor.relation.note")}
              className="min-w-20 flex-1 rounded-md border border-stone-700 bg-stone-950 px-1.5 py-0.5 text-[11px] text-stone-400"
            />
            {edge?.dangling ? (
              <span className="text-[10px] text-amber-300/80">{t("campaign.npcEditor.relation.unknown")}</span>
            ) : edge?.mutual ? (
              <span className="text-[10px] text-stone-600">
                {t("campaign.npcEditor.relation.theySay", { value: t(relationValueKey(theirScore) as never) })}
              </span>
            ) : (
              <span className="text-[10px] text-stone-600">{t("campaign.npcEditor.relation.oneSided")}</span>
            )}
            <button
              type="button"
              aria-label={t("campaign.npcEditor.relation.remove", { name: relation.npcName })}
              onClick={() =>
                onChange({
                  ...draft,
                  relations: removeRelation(draft.relations, relation.npcName),
                })
              }
              className="text-stone-600 hover:text-red-300"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-1">
        {others
          .filter(
            (name) =>
              !draft.relations.some(
                (relation) => textKey(relation.npcName) === textKey(name),
              ),
          )
          .map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange({ ...draft, relations: setRelation(draft.relations, name, 0) })}
              className="rounded-md border border-stone-700 px-1.5 py-0.5 text-[10px] text-stone-500 hover:text-stone-200"
            >
              + {name}
            </button>
          ))}
      </div>
    </>
  );
}
