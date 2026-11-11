import { BEAT_LABELS, BODY_MAX, ROUTE_LABELS, TITLE_MAX, boardGraph, type Beat, type BeatLinks } from "../workshop/board.ts";
import { parseRef } from "./model.ts";

// The storyboard as WorldForge scenes, and what that conversion cannot
// carry (audit WF-19). A WorldForge story is a list of scenes in order,
// each with a title, a gist, a point-of-view character, a place and a
// cast. A storyboard is a graph of typed cards: arrows that branch, routes
// that say what each arrow means, and picks of a battle map and a prepared
// fight. Everything a list cannot hold is named here, card by card, before
// a file is written, the way WF-06 names what an entry loses. The whole
// adventure travels in a workshop bundle (src/lib/workshop/bundle.ts).
//
// The contract, both ways:
//   - out: cards in reading order (board.ts boardGraph), title and text as
//     the scene's title and gist, Who and Where as its point of view and
//     place when those records are in the world;
//   - in: each story a row of "Something happens" cards in the file's
//     order, each leading to the next, Who and Where from the scene's
//     point of view and place when the file has them as a Cast member and
//     a place.
// Pure: the database half is src/lib/db/world-forge-io.ts.

// What one scene loses, by its title.
export type SceneLossDetail = { code: string; params: Record<string, string | number> };
export type SceneLoss = { scene: string; lost: string[]; details?: SceneLossDetail[] };

const quoted = (text: string) => `“${text}”`;

function addSceneLoss(lost: string[], details: SceneLossDetail[], message: string, code: string, params: Record<string, string | number> = {}) {
  lost.push(message);
  details.push({ code, params });
}

// Scene losses as plain lines, for the places that list losses as text.
export function sceneLossLines(scenes: SceneLoss[]): string[] {
  return scenes.map((scene) => `Scene ${quoted(scene.scene)} loses ${scene.lost.join("; ")}.`);
}

export type SceneExportPlan = {
  // The cards in the order the file lists them.
  order: Beat[];
  scenes: SceneLoss[];
  notes: string[];
};

// `inWorld` says whether a card's Who or Where travels as a world entry;
// `nameOf` names what a card picked, for the report.
export function planSceneExport(
  beats: Beat[],
  inWorld: (field: "npcId" | "locationId", id: string) => boolean,
  nameOf: (field: keyof BeatLinks, id: string) => string | undefined = () => undefined,
): SceneExportPlan {
  const board = boardGraph(beats);
  const byId = new Map(board.nodes.map((node) => [node.id, node]));
  const order = board.order.map((id) => byId.get(id)!).filter(Boolean);
  const titleOf = (id: string) => quoted(byId.get(id)?.title ?? "a card");
  const picked = (what: string, field: keyof BeatLinks, id: string) => {
    const name = nameOf(field, id);
    return name ? `${what}, ${quoted(name)}` : what;
  };
  const scenes: SceneLoss[] = [];
  order.forEach((card, at) => {
    const node = byId.get(card.id)!;
    const next = order[at + 1]?.id;
    const lost: string[] = [];
    const details: SceneLossDetail[] = [];
    if (node.kind !== 'event') addSceneLoss(lost, details, `its kind, ${quoted(BEAT_LABELS[node.kind])} (it comes back as ${quoted(BEAT_LABELS.event)})`, 'workshop.world.sceneLoss.export.kind', { kind: node.kind, eventKind: 'event' });
    for (const target of node.out) {
      const route = node.routes?.[target];
      const meaning = route ? `${ROUTE_LABELS[route.kind]}${route.label ? `: ${quoted(route.label)}` : ""}` : "";
      const routeKind = route?.kind ?? '';
      const routeLabel = route?.label ?? '';
      if (target !== next && !meaning) addSceneLoss(lost, details, `its arrow to ${titleOf(target)}`, 'workshop.world.sceneLoss.export.arrow', { title: byId.get(target)?.title ?? 'a card' });
      else if (target !== next) addSceneLoss(lost, details, `its arrow to ${titleOf(target)}${meaning ? ` (${meaning})` : ''}`, 'workshop.world.sceneLoss.export.arrowWithMeaning', { title: byId.get(target)?.title ?? 'a card', routeKind, routeLabel });
      else if (meaning) addSceneLoss(lost, details, `what its arrow to ${titleOf(target)} means (${meaning})`, 'workshop.world.sceneLoss.export.arrowMeaning', { title: byId.get(target)?.title ?? 'a card', routeKind, routeLabel });
    }
    // A list leads each scene to the next: an arrow the board does not
    // have comes back on the other side.
    if (next && !node.out.includes(next)) addSceneLoss(lost, details, `its place in the line: it comes back leading to ${titleOf(next)}, which it does not lead to here`, 'workshop.world.sceneLoss.export.sequence', { title: byId.get(next)?.title ?? 'a card' });
    if (node.links.mapId) addSceneLoss(lost, details, picked('its battle map', 'mapId', node.links.mapId), 'workshop.world.sceneLoss.export.battleMap', { name: nameOf('mapId', node.links.mapId) ?? 'a map' });
    if (node.links.encounterId) addSceneLoss(lost, details, picked('its prepared fight', 'encounterId', node.links.encounterId), 'workshop.world.sceneLoss.export.preparedFight', { name: nameOf('encounterId', node.links.encounterId) ?? 'an encounter' });
    if (node.links.npcId && !inWorld('npcId', node.links.npcId)) addSceneLoss(lost, details, `${picked('its Who', 'npcId', node.links.npcId)}, who is not in this world`, 'workshop.world.sceneLoss.export.whoMissing', { name: nameOf('npcId', node.links.npcId) ?? 'an entry' });
    if (node.links.locationId && !inWorld('locationId', node.links.locationId)) addSceneLoss(lost, details, `${picked('its Where', 'locationId', node.links.locationId)}, which is not in this world`, 'workshop.world.sceneLoss.export.placeMissing', { name: nameOf('locationId', node.links.locationId) ?? 'a place' });
    if (lost.length) scenes.push({ scene: node.title, lost, details });
  });
  const notes = order.length
    ? ["The storyboard goes out as one story of scenes in reading order. Where each card sits on the board is not kept, and a card opened elsewhere comes back as one in a row."]
    : [];
  return { order, scenes, notes };
}

// ---- in ----

// A scene as a storyboard card. `wfId` is the scene's own id in the file,
// which is how a second import of the same world finds the card it made.
// `pov` and `place` are the file's stand-in refs (format.ts).
export type ImportedBeat = { wfId: string; title: string; body: string; story: string; order: number; pov: string; place: string };

type Raw = Record<string, unknown>;
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// A file's scenes as cards in each story's order, and what each scene holds
// that a card does not. `refOf` turns a file's entity id into its stand-in
// ref ("" when the file has no such entry), `key` cleans a file id, and
// `nameOf` names a stand-in ref. `leftOut` counts scenes with no title or
// no order, which have no place on a board.
export function readScenes(input: {
  scenes: Raw[];
  bodies: Raw;
  stories: Map<string, string>;
  refOf: (value: unknown) => string;
  key: (value: unknown) => string;
  nameOf: (ref: string) => string | undefined;
}): { beats: ImportedBeat[]; sceneLosses: SceneLoss[]; leftOut: number } {
  const { refOf, key, nameOf } = input;
  const placed = input.scenes.filter((scene) => text(scene.title, TITLE_MAX) && typeof scene.order === "number");
  const sceneLosses: SceneLoss[] = [];
  const beats = placed
    .sort((a, b) => text(a.storyId, 80).localeCompare(text(b.storyId, 80)) || (a.order as number) - (b.order as number))
    .map((scene) => {
      const title = text(scene.title, TITLE_MAX);
      const lost: string[] = [];
      const details: SceneLossDetail[] = [];
      if (text(scene.title, 1_000).length > TITLE_MAX) addSceneLoss(lost, details, `the end of its title (a card's title holds ${TITLE_MAX} characters)`, 'workshop.world.sceneLoss.import.titleTooLong', { limit: TITLE_MAX });
      // The gist and the scene's written text, one after the other on the
      // card when both fit; the gist alone when they do not.
      const gist = text(scene.gist, Infinity);
      const written = text(input.bodies[key(scene.id)], Infinity);
      let body = gist && written && gist !== written ? `${gist}\n\n${written}` : gist || written;
      if (body.length > BODY_MAX) {
        if (gist && written && gist.length <= BODY_MAX) {
          addSceneLoss(lost, details, `its written text (${written.length.toLocaleString('en')} characters), which does not fit on a card beside its gist`, 'workshop.world.sceneLoss.import.writtenTextTooLong', { count: written.length });
          body = gist;
        } else {
          addSceneLoss(lost, details, `the end of its text (a card holds ${BODY_MAX.toLocaleString('en')} characters)`, 'workshop.world.sceneLoss.import.bodyTooLong', { limit: BODY_MAX });
          body = body.slice(0, BODY_MAX).trimEnd();
        }
      }
      // A card's Who is one Cast member and its Where one place.
      const pick = (value: unknown, shelf: "npc" | "location", what: string, needs: string) => {
        if (!key(value)) return "";
        const ref = refOf(value);
        if (!ref) addSceneLoss(lost, details, `its ${what}, which names an entry the file does not have`, 'workshop.world.sceneLoss.import.referenceMissing', { field: what === 'point of view' ? 'pov' : 'place' });
        else if (parseRef(ref)?.shelf !== shelf) addSceneLoss(lost, details, `its ${what}, ${quoted(nameOf(ref) ?? 'an entry')}, which is not ${needs}`, 'workshop.world.sceneLoss.import.referenceWrongKind', { field: what === 'point of view' ? 'pov' : 'place', name: nameOf(ref) ?? 'an entry', expected: shelf });
        return ref;
      };
      const pov = pick(scene.povEntityId, "npc", "point of view", "a Cast member");
      const place = pick(scene.locationEntityId, "location", "place", "a place");
      const listed = Array.isArray(scene.castEntityIds) ? scene.castEntityIds.slice(0, 60) : [];
      const cast = [...new Set(listed.filter((id) => key(id)).map((id) => refOf(id) || `?${key(id)}`))].filter((ref) => ref !== pov);
      if (cast.length) {
        const named = cast.map((ref) => (nameOf(ref) !== undefined ? quoted(nameOf(ref)!) : "an entry the file does not have"));
        addSceneLoss(lost, details, `its cast beyond its point of view: ${named.join(', ')} (a card names one Who)`, 'workshop.world.sceneLoss.import.extraCast', { names: named.join(', ') });
      }
      if (lost.length) sceneLosses.push({ scene: title, lost, details });
      return { wfId: key(scene.id), title, body, story: input.stories.get(key(scene.storyId)) ?? "", order: scene.order as number, pov, place };
    });
  return { beats, sceneLosses, leftOut: input.scenes.length - placed.length };
}
