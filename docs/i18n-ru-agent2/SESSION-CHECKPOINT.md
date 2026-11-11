# SESSION CHECKPOINT — read this first

Single restore point for Russian localization. After a chat interruption, read only this file first. Do not rescan the repository or read `STATUS.md` / `PLAN.md` unless a specific detail or criterion is needed.

## State
- Repository: `AlecVlad/open-game-master`
- Branch: `i18n-ru-agent2` — verify current HEAD on resume; do not trust a stored SHA.
- Active work: **Block 2 — Workshop import flows**.
- Block 1 — game session — remains formally open; do not create its DONE flag, merge branches, or open a PR.
- `STATUS.md` is an older detailed log and may lag this checkpoint. This checkpoint is authoritative for the current state.
- `PLAN.md` contains block boundaries and completion criteria; consult only when scope is unclear.

## Completed in the current pass
- `src/app/workshop/encounters/EncounterEvents.tsx`: event triggers, action kinds, form labels, hints, remove controls, accessibility labels and monster-arrival controls localized.
- `src/app/workshop/encounters/EncounterGround.tsx`: terrain brush names/effects, selected-square states, keyboard controls and the line shown to the party localized. Pure helpers `paint.ts` / `fight-ground-logic.ts` and terrain IDs were not changed.
- `src/app/campaigns/[campaignId]/TurnTraceSheet.tsx`: statuses, sources, outcomes, errors, call labels, pagination, rollback text, narration label, clock and counters localized. Known route errors are mapped to i18n; unknown server errors use a localized fallback.
- New dictionary pairs registered in `src/lib/i18n/messages/index.ts`: `en/ru/encounterEvents.ts` and `en/ru/turnTrace.ts`.
- Static checks: encounter-events dictionaries 117 EN / 117 RU, no missing pairs, duplicates or placeholder differences; turn-trace 53 EN / 57 RU, with the four extra RU `.few/.many` plural forms expected. Source key references were checked against the EN keys.
- Do not repeat these three components unless a targeted defect is found.

## Also completed in the current pass
- `DiceSourcesDialog.tsx` and `DiceTrayDialog.tsx`: dice source assignments, Pixels Bluetooth connection states, die labels, expression/bonus inputs, secret/public roll mode, audience privacy text, result badges, errors and accessibility labels localized.
- `ContextPanel.tsx`: context budget headings, block kinds/reasons, prompt-cache and model-call metrics, house-rule status, story-arc and world-lore summaries/reasons localized. User-authored event/lore names, tool IDs and raw backend failure details remain data.
- `ReportDialog.tsx`: reporting/blocking descriptions, target labels, report reasons, success states, actions and known API errors localized. Server reason values remain unchanged.
- `VoiceDock.tsx`, `SpeakerPicker.tsx` and `PushToTalk.tsx`: call button/count/close labels, speaker choices, and push-to-talk labels/tooltips localized. Shortcut names, character/monster names and mic/WebRTC behavior were preserved. Dictation engine error hints still come from the shared `useDictation` hook and have not been localized in this pass.
- `JoinConfirmDialog.tsx`: confirmation titles, loading/empty headings, table rules, choices, hit-point notes, actions, and local fallback errors localized. The hero's names and structured preview changes/problems returned by the server remain data; shared `owed-choices.ts` strings were replaced at this UI boundary where practical.
- `SessionHoldBanner.tsx`: ended-session title, schedule button/dialog, next-session line, countdown participant count, start-session action and body localized with locale-aware date formatting.
- `SummonDoor.tsx`: summon section label, begin/finish/cast actions, round/slot status, ritual controls, missing-slot explanation, and generic request fallbacks localized. Spell/creature names and detailed cast-guard refusal diagnostics returned by shared game rules remain data.
- `NarrationNote.tsx` (`NarrationNote` and `ImagesNote`): provider availability, model/network status and image backend explanations localized. Backend names, addresses and server settings remain technical data.
- `AddonViewSwitch.tsx`: board view radio-group labels, built-in board hint, options button/dialog and device-specific explanation localized; add-on-provided titles/descriptions remain metadata.
- `CharacterGate.tsx`: new-member and fallen-hero banner titles, descriptions and actions localized.
- `CharacterVoices.tsx`: voice groups, voice picker/pace labels, automatic voice assignment, descriptions, empty/loading states and generic save/network fallbacks localized. Voice IDs and roster names remain data.
- `CompanionCommand.tsx`: turn-control options, current-controller hint, group accessibility label and generic save/network errors localized; `commandedBy` values and account names remain unchanged.
- `CompanionBuilderDialog.tsx`: title, descriptions, library list, confirmation, actions, close label, submit button and generic API fallbacks localized. Companion IDs, sheets, levels and builder payloads remain unchanged; the embedded shared `CharacterBuilder` is not modified.
- `CompanionKeepButton.tsx` and `CompanionPaintButton.tsx`: save-to-library labels/tooltips, saved states, portrait generation labels/tooltips and generic errors localized. Companion IDs, portrait URLs and image queue polling remain unchanged.
- `DmMapLibraryPanel.tsx`: map-library resource/loading/empty states, create/import, deploy/open-scene feedback, copy/delete errors and map fallback title localized. Map names, IDs and imported content remain data.
- `DmMapStudioPanel.tsx`: board status, enemy count, preview/apply/open/close scene actions, seed labels and hotkey overlay group/mode/brush/edit labels localized. Map seeds, terrain values and tool modes remain unchanged.
- `NameMenu.tsx`: mention list accessibility label, party/people/place groups, no-match state, keyboard hints and not-yet-introduced marker localized. Search matching, insertion behavior and actual names remain unchanged.
- `PregenPicker.tsx`: default heading localized; pre-generated hero names, taglines and descriptions remain content data.
- The existing `campaignSession.ts` EN/RU pair was extended: dice dialogs added 40 keys, context trace has 80 keys, report dialog added 31 keys, voice controls added 20 keys. Voice dictionaries are 20 EN / 20 RU, no missing pairs, duplicates or placeholder differences. The two plural base keys are `tp()` groups with `.one/.few/.many/.other` variants in both dictionaries; validate their suffixed forms rather than treating the base key as missing.
- Do not repeat these components unless a targeted defect is found.

## Latest progress — 11 November 2026
- NPC authoring: `DmNpcForgePanel.tsx`, `NpcFields.tsx`, `workshop/cast/NpcEditorFields.tsx` and `AttractionPicker.tsx` are wired to i18n. Fixed labels, sliders, goals, relationships, attraction help, voice controls and the 32 standard race labels are translated. Race/gender IDs, NPC names and user-authored content are unchanged.
- NPC dictionary cleanup: duplicate `campaign.dmNpcForge.*` and `campaign.npcEditor.*` entries were removed. The NPC duplication suffix remains literal `(copy)` because it becomes part of the stored NPC name.
- Workshop bundle import: `ImportBundleButton.tsx`, `AddonImportButton.tsx` and `BundlePreview.tsx` are localized. Bundle-kind labels are mapped at the UI boundary; kinds, plugin IDs, importer data, filenames and API values remain unchanged. 54 EN/RU keys added.
- Workshop-to-campaign import: `ContentImportPicker.tsx` now localizes source selection, content kinds, WorldForge inclusion markers, house-rule and story-arc choices, reimport behavior, empty/error states, party pregen offer, and the import summary. 53 EN/RU keys added, including English one/other and Russian one/few/many/other summary forms.
- Static verification: direct keys used by the import picker are present in EN/RU; plural base keys have the expected forms; changed workshop and campaign dictionaries have no duplicate keys; placeholders match. Fixed English JSX labels were not found in the three import-flow components.
- Remaining in this flow: planner-generated `plan.warnings` / `plan.notes`, `worldConflicts` and `referenceNotes` are server-authored text and may still be English. They need stable reason codes and a dedicated localized renderer; do not translate them by fragile phrase matching. Unknown raw API errors also remain server data.
- TypeScript, lint, tests, production build and visual checks were not run. Keep those deferred and do not claim they passed.

## Workshop list audit — 11 November 2026
- `MonsterRows.tsx`: localized bestiary empty state, search, tally, actions and fixed stat labels.
- `CastList.tsx`: localized cast headings, search, counts/plurals, sorting, attitude labels, archive status, relationship summary and empty/no-match states. Unknown server attitude values remain unchanged.
- `MapGallery.tsx`: localized empty/search/no-match states, accessible open label and fixed map-theme labels. Theme IDs and map metadata remain unchanged.
- Checked all `ListHead` / `ListTally` callers: `EncounterRows` and `LoreRows` already use i18n; `TableRows` already supplies localized count and sort labels. The main Workshop shelf was already localized.
- Added 41 EN keys and 47 RU entries in `workshop.ts`; 6 extra RU entries are plural variants. Static checks: no duplicates, missing paired keys or placeholder mismatches.
- TypeScript, lint, tests, production build and visual checks were not run.

## Workshop target-party bar — 11 November 2026
- `TargetPartyBar.tsx`: localized party size/level controls, hero noun with Russian plural forms, save/saved states and the encounter-difficulty budget explanation.
- Added 9 EN keys and 11 RU entries in `workshop.ts`; extra RU entries are expected plural forms. Placeholder names match.
- API payload, party size/level values and XP thresholds are unchanged. No build or runtime tests were run.

## Workshop system cards — 11 November 2026
- `systems.ts`: added stable translation-key mapping by system ID; the IDs, routes and underlying system metadata remain unchanged.
- `SystemCards.tsx`: localized task shortcuts, section headings, system names/descriptions, total-prep count with Russian plural forms, explanatory copy and footer.
- Added 40 EN keys and 42 RU entries in `workshop.ts`; two extra RU entries are plural variants. Static checks: all source key references resolve, no duplicate keys, missing pairs or placeholder mismatches.
- TypeScript, lint, tests, production build and visual checks were not run.

## Workshop page shell and Create chooser — 11 November 2026
- `page.tsx`: localized hub tour/help labels, section-tour labels via stable system IDs, not-found state, back link and command-palette title/placeholder.
- `CreateChooser.tsx`: localized all 14 choice cards and all 19 creation steps (labels, details, destinations), groups, creation methods, model requirements, unavailable-state explanations and modal chrome. Copy is looked up by stable choice ID and step position.
- Added 8 EN/RU hub-page keys and 98 EN/RU Create-chooser keys. Static checks: all references resolve, no duplicates, no missing pairs and no placeholder mismatches.
- The original choice IDs, step routing data (prepare, href, system), model checks and server capability logic are unchanged. No TypeScript, lint, tests, build or visual checks were run.

## Workshop header — 11 November 2026
- `WorkshopHeader.tsx`: localized back link, rename labels, help tooltip/accessibility text, duplicate/delete labels and confirmation, and bundle-import label.
- Added 11 EN/RU keys in `workshop.ts`; dynamic workshop names keep matching placeholders. API routes and workshop titles remain unchanged.
- No TypeScript, lint, tests, build or visual checks were run.

## Workshop system view and command palette — 11 November 2026
- `systems.ts`: `systemCount` now accepts an optional i18n adapter; all system count phrases use stable keys and plural messages. Without the adapter it retains the old English fallback for non-UI callers.
- `SystemView.tsx`: section heading, side rail labels, count phrase and help accessibility/title text are localized by system ID.
- `page.tsx`: passes the active `t/tp` adapter to system count and command generation.
- `palette-commands.ts`: jump/create/help/back labels, groups and hints are localized by stable system/action IDs. Search keywords, command IDs, `prepare` callbacks and navigation behavior are unchanged.
- Added 67 EN entries and 93 RU entries (including the required `.few/.many` forms). Static check covered 52 referenced keys, duplicate keys and placeholder parity; all passed.
- TypeScript, lint, tests, production build and visual checks were not run.

## Workshop guided tours — 11 November 2026
- `GuidedTour.tsx`: added optional translation scope for shelf, hub and per-system tours; shared rail/help steps use shared keys. Navigation, timing, anchors, `prepare` actions and account completion tracking are unchanged.
- `WorkshopHelpDialog.tsx`: localized fixed section headings.
- Added 142 EN/RU key pairs for 71 tool-tour steps: 58 in `workshop.ts` and 13 in `worldforge-tour.ts`. Existing shelf/hub/common tours and GuidedTour controls already have their own keys.
- Static verification: 71 steps / 142 keys; no missing EN/RU keys, duplicate dictionary keys or placeholder mismatches. Source tour files were not changed, so IDs, anchors and `prepare` values are preserved.
- Text translated through DeepL EN→RU and proofread for game context. Glossary access is unavailable on the connected DeepL Free plan, so no glossary was applied. TypeScript, lint, tests, build and visual checks were not run.

## Workshop import planning, conflict notices and API errors — 11 November 2026
- `import.ts`, `import-board.ts`, `board-compile.ts` and `import-kinds.ts`: planner warnings/notes now carry stable reason codes and structured parameters. Legacy English `message` fields remain as fallback for older consumers. Arc refusal and prose diagnostics have separate codes.
- `ContentImportPicker.tsx`: renders planner notices, WorldForge merge conflicts and roll-table reference notes through localized keys. It translates known system field/type labels while preserving user-authored entry names, endpoints, custom-field names and source text.
- `world-forge-io.ts`, `world-link-merge.ts`, `world-forge-scenes.ts`, `content-import-refs.ts`, `content-import.ts` and the import API route: structured conflict/reference details are carried alongside legacy strings; duplicate WorldForge notices are suppressed in the UI.
- POST import failures now include stable `errorCode` values; the picker localizes these while retaining the original `error` text for compatibility.
- Russian display name for WorldForge is now **«Кузня миров»**, with case forms in all matching Workshop copy; technical IDs and file/API identifiers remain unchanged.
- Added matching EN/RU messages for planner notices, conflict details, field names, all 26 WorldForge link labels and import errors. Static dictionary validation: 796 EN / 855 RU entries, no duplicate keys, missing English bases or placeholder mismatches. Dynamic plural forms for import summaries are present.
- No TypeScript, lint, tests, build or visual checks were run. The branch's push-triggered smoke workflows only run on `main`; no PR workflow run exists for this working branch.

## WorldForge import/export reports — 12 November 2026
- `WorldForgePanel.tsx`: localized the import result summary, plural card counts, matched scenes/entries, link merge counts, skipped items and legacy conflict fallbacks. Structured WorldForge conflicts now translate slice, field and relation labels while preserving names and custom-field labels.
- `format.ts`, `world-forge-io.ts`, the World import API route and `atlas-region.ts`: added structured loss/note reason codes for import previews and completed imports, including size limits, truncated fields/names, missing or invalid content, scene capacity, Region-map placement and secret visibility. Legacy `losses` / `notes` strings remain in the payload.
- `WorldForgePanel.tsx` now renders structured loss and note details; `SceneLosses.tsx` renders the per-scene structured reasons. Export check also returns a structured storyboard-order note.
- Added 29 EN / 31 RU messages for the WorldForge report, import-loss and Region/export-note groups. Latest `workshop.ts` dictionary sizes: 950 EN / 1017 RU. Static checks: 98 direct keys resolve except intentional dynamic prefixes/plural bases; 38 report field labels, 26 relation labels, 8 slice labels, 3 import field labels and 9 import-kind labels all resolve; correct plural variants exist; no duplicate keys or placeholder mismatches.
- `ImportKept.tsx` was audited and already uses its 20 fixed i18n keys. Scene-loss tests were inspected for compatibility assertions; existing `scenes`, `losses`, `notes` and conflict strings are still returned. Tests were not executed.
- TypeScript, lint, automated tests, production build and visual/browser checks have not been run.

## WorldForge entry editor — 12 November 2026
- `EntityEditor.tsx`: localized fixed labels and hints for canon state, type/folder, the main text/article, aliases/tags, image, hidden truth, author notes, calendar fields, AI drafting and save actions.
- Added 58 EN/RU keys covering concurrent-edit clashes and values kept from an earlier import. Dynamic names, type labels, custom field labels/options, campaign text and field values remain unchanged.
- Static check: all 58 source keys exist in both dictionaries; placeholders match; no duplicate keys. Reviewed JSX balance for the changed conflict/kept notices. TypeScript and runtime checks remain unrun.

## WorldForge entry page — 12 November 2026
- `EntityPage.tsx`: localized fixed labels, actions, deletion confirmation, image-generation states and hints, accessibility text, table facts, links, events, secrets, hidden truth and author notes.
- Added 57 EN/RU keys in `workshop.ts`, including shelf/tool names and fixed table labels. User-created names, aliases, custom field values, event titles, secret titles and article content remain unchanged.
- Static verification: all 57 keys exist in both dictionaries; placeholders match; no duplicate keys were introduced. TypeScript, lint, tests, build and visual checks remain deferred.

## Atlas — map navigation and pin/region cards — 12 November 2026
- `AtlasView.tsx`: localized map creation, empty state, map navigation, interaction modes, region/pin placement instructions, accessibility labels and the explanation distinguishing Atlas pictures from battle maps.
- `AtlasCard.tsx`: localized pin/region editing, hidden-from-party controls, entry binding, region colour choices, notes and nested-map navigation. Names, user-authored notes and bound records remain data.
- Added 58 EN/RU base messages in `workshop.ts`; Russian plural forms were added for corner-count instructions. Static verification: keys, placeholders and duplicate checks passed. TypeScript/runtime tests remain deferred.

## Next work
Continue the Atlas audit with `AtlasRegion.tsx`, `AtlasEdit.tsx`, `AtlasParty.tsx` and `PlaceBattleMaps.tsx`, then `TimelineView.tsx`, `SecretsView.tsx` and `WikiView.tsx`. Localize fixed interface text and accessibility labels, while leaving user-created names, custom type/field names and content alone. Inspect `useWorld.ts` error messages before translating API errors. Then continue the remaining Workshop editors. Do not sync upstream or merge branches during translation.

## Low-token work protocol
- Read this file, then only the next target source file(s) and exact dictionary sections needed.
- Batch related reads in one tool call; use narrow line ranges. Never dump whole large files or reread an inspected file in the same pass.
- Change one coherent functional area; update source and EN/RU dictionaries together.
- Check only changed keys: presence/parity, duplicates, placeholders and dynamic-key variants.
- After each completed unit, update this checkpoint. Keep it short.
- Preserve API values, IDs, slugs, game mechanics, user-authored names/text and campaign data. Translate fixed UI text and known system messages only.
- TypeScript, lint, production build and visual checks remain deferred to Block 1.1 on the user's local machine. Do not claim these checks unless actually run.

## WorldForge — entry page and Atlas — 12 November 2026
- `EntityPage.tsx`: completed the missing 57 EN/RU dictionary messages for the entry-page UI; checked all source keys and placeholder parity.
- Atlas components completed: `AtlasView.tsx`, `AtlasCard.tsx`, `AtlasRegion.tsx`, `AtlasEdit.tsx`, `AtlasParty.tsx` and `PlaceBattleMaps.tsx`. Localized map navigation/creation, pins/regions, Region binding and placement sync, map framing/settings, delete-impact review, party visibility, battle-map and encounter linking, and accessibility text.
- User-created map/region/pin names, aliases, custom fields, record/article content and IDs remain data. Server-authored plan notes and raw API error details remain unchanged.
- Static dictionary audit: 191 direct source keys covered in EN/RU; all 7 plural groups have the required EN and RU suffixes; the 5 conditional delete keys exist in both dictionaries; no duplicate keys or missing placeholders. File tails restored to their normal TypeScript closings. TypeScript, lint, tests, build and visual checks remain deferred.

## WorldForge — Timeline — 12 November 2026
- `TimelineView.tsx`: localized calendar management, shared year-line explanation, event count/list, event forms, era/canon controls, linked people/places and calendar deletion confirmation. Lifespan warnings (event before birth / after death) now use locale-aware plural messages rather than English strings from the UI helper.
- Added 52 EN/RU messages in `workshop.ts`, including four dynamic canon-state labels and three plural groups (event count, years before birth, years after death). Static audit: 37 direct source keys covered; all 3 plural groups have the required EN `.one/.other` and RU `.one/.few/.many/.other` forms; dynamic canon keys present; no duplicate keys or placeholder mismatches. User-authored calendar/event names, era labels, event text, entity names, abbreviations and numeric values remain data.
- TypeScript, lint, tests, production build and visual checks remain deferred.

## WorldForge — Secrets — 12 November 2026
- `SecretsView.tsx`: localized open/learned states, party-knowledge switch, subject and keeper links, edit/delete labels, reveal-to-party flow, success feedback, lore-entry link/status, and secret/reveal forms.
- Reveal date uses the active interface language (`ru-RU` / `en-CA`). Success messages interpolate the player-facing lore entry title; secret titles, notes, keeper names, subject names, reveal text, and backend record IDs remain data.
- Added 44 EN/RU messages in `workshop.ts`, including two plural groups for open and learned secret counts. Static audit: 31 direct source keys covered; both plural groups have EN `.one/.other` and RU `.one/.few/.many/.other` forms; no missing keys, duplicate keys, or placeholder mismatches. TypeScript, lint, tests, production build and visual checks remain deferred.

## Resume
Continue with `WikiView.tsx`. Verify the branch HEAD before editing. Import/export reports, `EntityEditor.tsx`, `EntityPage.tsx`, all six Atlas components, `TimelineView.tsx` and `SecretsView.tsx` are localized. Block 1 remains formally open; do not merge, open a PR or create its DONE flag.
