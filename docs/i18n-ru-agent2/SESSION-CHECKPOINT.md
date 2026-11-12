# SESSION CHECKPOINT — read this first

Single restore point for Russian localization. After a chat interruption, read only this file first. Do not rescan the repository or read `STATUS.md` / `PLAN.md` unless a specific detail or criterion is needed.

## State
- Repository: `AlecVlad/open-game-master`
- Branch: `i18n-ru-agent2` — verify current HEAD on resume; do not trust a stored SHA.
- Active work: **Block 2 — Workshop: audit and localization of remaining editors and content workflows**.
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
- Keep those deferred and do not claim they passed.

## Workshop list audit — 11 November 2026
- `MonsterRows.tsx`: localized bestiary empty state, search, tally, actions and fixed stat labels.
- `CastList.tsx`: localized cast headings, search, counts/plurals, sorting, attitude labels, archive status, relationship summary and empty/no-match states. Unknown server attitude values remain unchanged.
- `MapGallery.tsx`: localized empty/search/no-match states, accessible open label and fixed map-theme labels. Theme IDs and map metadata remain unchanged.
- Checked all `ListHead` / `ListTally` callers: `EncounterRows` and `LoreRows` already use i18n; `TableRows` already supplies localized count and sort labels. The main Workshop shelf was already localized.
- Added 41 EN keys and 47 RU entries in `workshop.ts`; 6 extra RU entries are plural variants. Static checks: no duplicates, missing paired keys or placeholder mismatches.

## Workshop target-party bar — 11 November 2026
- `TargetPartyBar.tsx`: localized party size/level controls, hero noun with Russian plural forms, save/saved states and the encounter-difficulty budget explanation.
- Added 9 EN keys and 11 RU entries in `workshop.ts`; extra RU entries are expected plural forms. Placeholder names match.
- API payload, party size/level values and XP thresholds are unchanged. No build or runtime tests were run.

## Workshop system cards — 11 November 2026
- `systems.ts`: added stable translation-key mapping by system ID; the IDs, routes and underlying system metadata remain unchanged.
- `SystemCards.tsx`: localized task shortcuts, section headings, system names/descriptions, total-prep count with Russian plural forms, explanatory copy and footer.
- Added 40 EN keys and 42 RU entries in `workshop.ts`; two extra RU entries are plural variants. Static checks: all source key references resolve, no duplicate keys, missing pairs or placeholder mismatches.

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

## Workshop guided tours — 11 November 2026
- `GuidedTour.tsx`: added optional translation scope for shelf, hub and per-system tours; shared rail/help steps use shared keys. Navigation, timing, anchors, `prepare` actions and account completion tracking are unchanged.
- `WorkshopHelpDialog.tsx`: localized fixed section headings.
- Added 142 EN/RU key pairs for 71 tool-tour steps: 58 in `workshop.ts` and 13 in `worldforge-tour.ts`. Existing shelf/hub/common tours and GuidedTour controls already have their own keys.
- Static verification: 71 steps / 142 keys; no missing EN/RU keys, duplicate dictionary keys or placeholder mismatches. Source tour files were not changed, so IDs, anchors and `prepare` values are preserved.
- Text translated through DeepL EN→RU and proofread for game context.

## Workshop import planning, conflict notices and API errors — 11 November 2026
- `import.ts`, `import-board.ts`, `board-compile.ts` and `import-kinds.ts`: planner warnings/notes now carry stable reason codes and structured parameters. Legacy English `message` fields remain as fallback for older consumers. Arc refusal and prose diagnostics have separate codes.
- `ContentImportPicker.tsx`: renders planner notices, WorldForge merge conflicts and roll-table reference notes through localized keys. It translates known system field/type labels while preserving user-authored entry names, endpoints, custom-field names and source text.
- `world-forge-io.ts`, `world-link-merge.ts`, `world-forge-scenes.ts`, `content-import-refs.ts`, `content-import.ts` and the import API route: structured conflict/reference details are carried alongside legacy strings; duplicate WorldForge notices are suppressed in the UI.
- POST import failures now include stable `errorCode` values; the picker localizes these while retaining the original `error` text for compatibility.
- Russian display name for WorldForge is now **«Кузня миров»**, with case forms in all matching Workshop copy; technical IDs and file/API identifiers remain unchanged.
- Added matching EN/RU messages for planner notices, conflict details, field names, all 26 WorldForge link labels and import errors. Static dictionary validation: 796 EN / 855 RU entries, no duplicate keys, missing English bases or placeholder mismatches. Dynamic plural forms for import summaries are present.
- No TypeScript, lint, tests, build or visual checks were run.

## WorldForge import/export reports — 12 November 2026
- `WorldForgePanel.tsx`: localized the import result summary, plural card counts, matched scenes/entries, link merge counts, skipped items and legacy conflict fallbacks. Structured WorldForge conflicts now translate slice, field and relation labels while preserving names and custom-field labels.
- `format.ts`, `world-forge-io.ts`, the World import API route and `atlas-region.ts`: added structured loss/note reason codes for import previews and completed imports, including size limits, truncated fields/names, missing or invalid content, scene capacity, Region-map placement and secret visibility. Legacy `losses` / `notes` strings remain in the payload.
- `WorldForgePanel.tsx` now renders structured loss and note details; `SceneLosses.tsx` renders the per-scene structured reasons. Export check also returns a structured storyboard-order note.
- Added 29 EN / 31 RU messages for the WorldForge report, import-loss and Region/export-note groups. Latest `workshop.ts` dictionary sizes: 950 EN / 1017 RU. Static checks: 98 direct keys resolve except intentional dynamic prefixes/plural bases; 38 report field labels, 26 relation labels, 8 slice labels, 3 import field labels and 9 import-kind labels all resolve; correct plural variants exist; no duplicate keys or placeholder mismatches.
- `ImportKept.tsx` was audited and already uses its 20 fixed i18n keys. Scene-loss tests were inspected for compatibility assertions; existing `scenes`, `losses`, `notes` and conflict strings are still returned.

## WorldForge entry editor — 12 November 2026
- `EntityEditor.tsx`: localized fixed labels and hints for canon state, type/folder, the main text/article, aliases/tags, image, hidden truth, author notes, calendar fields, AI drafting and save actions.
- Added 58 EN/RU keys covering concurrent-edit clashes and values kept from an earlier import. Dynamic names, type labels, custom field labels/options, campaign text and field values remain unchanged.
- Static check: all 58 source keys exist in both dictionaries; placeholders match; no duplicate keys. Reviewed JSX balance for the changed conflict/kept notices.

## WorldForge entry page — 12 November 2026
- `EntityPage.tsx`: localized fixed labels, actions, deletion confirmation, image-generation states and hints, accessibility text, table facts, links, events, secrets, hidden truth and author notes.
- Added 57 EN/RU keys in `workshop.ts`, including shelf/tool names and fixed table labels. User-created names, aliases, custom field values, event titles, secret titles and article content remain unchanged.
- Static verification: all 57 keys exist in both dictionaries; placeholders match; no duplicate keys were introduced.

## Atlas — map navigation and pin/region cards — 12 November 2026
- `AtlasView.tsx`: localized map creation, empty state, map navigation, interaction modes, region/pin placement instructions, accessibility labels and the explanation distinguishing Atlas pictures from battle maps.
- `AtlasCard.tsx`: localized pin/region editing, hidden-from-party controls, entry binding, region colour choices, notes and nested-map navigation. Names, user-authored notes and bound records remain data.
- Added 58 EN/RU base messages in `workshop.ts`; Russian plural forms were added for corner-count instructions. Static verification: keys, placeholders and duplicate checks passed.

## Next work
- The WorldForge pass is complete across all 29 files in `src/app/workshop/world/`; do not repeat its completed Atlas, timeline, secrets, wiki or supporting-tool work without a targeted reason.
- Continue Block 2 with a source-first audit of the remaining Workshop systems named in `PLAN.md`: Plugin Wizard, Monster Editor, Map Editor, Encounter Form and Lore Editor. Some pieces may already have translations; verify integration and uncovered UI before changing anything.
- Finish the remaining creation/edit/save/import/export/publish paths, including validation, known system errors, empty/loading states and accessibility labels.
- The Reference module is not confirmed complete: `mainPage`, `comparison`, `desk`, `badges`, `calculators` and its EN/RU message wiring still need a fresh source audit.
- Do not sync upstream, merge branches or open a PR during translation.

## Low-token work protocol
- Read this file, then only the next target source file(s) and exact dictionary sections needed.
- Batch related reads in one tool call; use narrow line ranges. Never dump whole large files or reread an inspected file in the same pass.
- Change one coherent functional area; update source and EN/RU dictionaries together.
- Check only changed keys: presence/parity, duplicates, placeholders and dynamic-key variants.
- After each completed unit, update this checkpoint. Keep it short.
- Preserve API values, IDs, slugs, game mechanics, user-authored names/text and campaign data. Translate fixed UI text and known system messages only.
- Local validation (TypeScript, lint, tests, production build and browser checks) is performed on the user's local machine only after an explicit user command. Do not start these checks or use Remote Desktop independently.

## WorldForge — entry page and Atlas — 12 November 2026
- `EntityPage.tsx`: completed the missing 57 EN/RU dictionary messages for the entry-page UI; checked all source keys and placeholder parity.
- Atlas components completed: `AtlasView.tsx`, `AtlasCard.tsx`, `AtlasRegion.tsx`, `AtlasEdit.tsx`, `AtlasParty.tsx` and `PlaceBattleMaps.tsx`. Localized map navigation/creation, pins/regions, Region binding and placement sync, map framing/settings, delete-impact review, party visibility, battle-map and encounter linking, and accessibility text.
- User-created map/region/pin names, aliases, custom fields, record/article content and IDs remain data. Server-authored plan notes and raw API error details remain unchanged.
- Static dictionary audit: 191 direct source keys covered in EN/RU; all 7 plural groups have the required EN and RU suffixes; the 5 conditional delete keys exist in both dictionaries; no duplicate keys or missing placeholders. File tails restored to their normal TypeScript closings.

## WorldForge — Timeline — 12 November 2026
- `TimelineView.tsx`: localized calendar management, shared year-line explanation, event count/list, event forms, era/canon controls, linked people/places and calendar deletion confirmation. Lifespan warnings (event before birth / after death) now use locale-aware plural messages rather than English strings from the UI helper.
- Added 52 EN/RU messages in `workshop.ts`, including four dynamic canon-state labels and three plural groups (event count, years before birth, years after death). Static audit: 37 direct source keys covered; all 3 plural groups have the required EN `.one/.other` and RU `.one/.few/.many/.other` forms; dynamic canon keys present; no duplicate keys or placeholder mismatches. User-authored calendar/event names, era labels, event text, entity names, abbreviations and numeric values remain data.

## WorldForge — Secrets — 12 November 2026
- `SecretsView.tsx`: localized open/learned states, party-knowledge switch, subject and keeper links, edit/delete labels, reveal-to-party flow, success feedback, lore-entry link/status, and secret/reveal forms.
- Reveal date uses the active interface language (`ru-RU` / `en-CA`). Success messages interpolate the player-facing lore entry title; secret titles, notes, keeper names, subject names, reveal text, and backend record IDs remain data.
- Added 44 EN/RU messages in `workshop.ts`, including two plural groups for open and learned secret counts. Static audit: 31 direct source keys covered; both plural groups have EN `.one/.other` and RU `.one/.few/.many/.other` forms; no missing keys, duplicate keys, or placeholder mismatches.

## WorldForge — Wiki / Encyclopaedia — 12 November 2026
- `WikiView.tsx`: localized entry creation, shelf/category labels, type and folder navigation, folder removal confirmation, search, empty states, help text and text-model setup guidance.
- `EntryList.tsx`: localized list accessibility label and hidden-truth indicator label. `CreateButton` continues to use its own existing localization. User-defined type names, folder names, entry names and contents remain data.
- Added 44 EN/RU messages in `workshop.ts`, covering four shelves and all seven lore categories. Static audit: 30 direct source keys covered; dynamic shelf/category keys and conditional empty-state/scope keys exist in both dictionaries; no duplicate keys, missing keys, or placeholder mismatches.

## WorldForge — supporting tools and full component pass — 12 November 2026
- Localized supporting screens and shared controls: `AskView.tsx`, `BoundRecords.tsx`, `LinkEditor.tsx`, `PlayFields.tsx`, `WorldEntryLink.tsx`, `world-ui.tsx`, `OutlineView.tsx`, `PaintJobs.tsx`, `StubsView.tsx`, `TypesView.tsx` and `WebView.tsx`. Existing localization in `ForgeView.tsx`, `ImportKept.tsx`, `SceneLosses.tsx` and `WorldForgePanel.tsx` retained.
- Ask now localizes source passages, canon states and explanations, omitted/uncited passage counts and author-only labels. Relationship editor and graph localize built-in relation labels while retaining the underlying stored English identifiers. Outline links use the same display mapping; user-defined relation labels remain unchanged.
- Outline generator localizes category/shelf names, counts, task progress, status, retry/error messages and generated asset labels. Paint queue localizes confirmation, waiting/working/ready/failed states, image comparisons and earlier-picture controls. Stubs scan, type management, field controls, and table bindings are localized.
- Final support-screen dictionary audit: 217 direct keys covered across the reviewed supporting components; all 15 plural groups have the required EN `.one/.other` and RU `.one/.few/.many/.other` forms; dynamic shelf, category, relation, canon, field-kind, field-role, mode and view keys are present. No duplicate dictionary keys or placeholder mismatches. Additional item-kind and hierarchy-edge labels were added after the audit and confirmed present.
- Re-scanned all 29 TypeScript/TSX files in `src/app/workshop/world/` for visible fixed English UI strings. The remaining candidate lines were types, callbacks, server/data text or were corrected (including the second “Write it” action and the hierarchy tooltip).
- No TypeScript check, lint, tests, production build, or visual test was run.

## Homebrew Editor — class, subclass and hazard pass — 12 November 2026
- Added localization to the class editor fields in `ClassFields.tsx`, using the shared `workshop.homebrew.class.*` dictionary keys.
- Added localization to subclass editor labels in `ArchetypeFields.tsx`, including feature headings, levels, descriptions, feature actions and spellcasting-related labels where present.
- Added the first localization pass for the hazard editor in `HazardFields.tsx`: common field labels, detection/disable/save concepts, reset options, effects, visibility and GM notes. Its object-valued option constants were restored to plain strings after the automated JSX-label substitution; do not treat this as a final verification.
- The broader Homebrew editor translation now covers the shelf, shared editor shell, item and magic-item mechanics, spells and spell mechanics, species/ancestries, backgrounds, classes/subclasses and hazard UI. The remaining localized display strings in copy-source field summaries still need a focused pass.
- No TypeScript check, lint, tests, build, visual test, or broad English-string audit was run. Workshop block remains open.

## Atlas — structured review notices — 12 November 2026
- `AtlasRegion.tsx`: replaced the remaining hardcoded “Release from the Region” action with its i18n key; Region review notes and skipped-pin reasons now render structured localized details first, with legacy text fallback.
- `AtlasEdit.tsx` and `AtlasParty.tsx`: map-frame, delete-impact and party-visibility review notes use structured message codes; legacy `notes` strings remain available as fallback.
- `atlas-region.ts`, `atlas-edit.ts` and `party-atlas.ts`: added optional `noteDetails` / `reasonDetail` fields for generated system notices. Existing `notes` and `reason` fields are retained for older consumers and API compatibility.
- Added 9 EN/RU messages in `workshop.ts` for picture-only semantics, party visibility, skipped pin reasons, fixed map-frame positions and Region-map deletion. Corrected the two remaining English plural messages in the Russian Atlas dictionary.
- Static checks: all 9 new keys are present in both dictionaries; placeholders match; no duplicate new keys; all direct translation references in the four Atlas subcomponents resolve.

## Homebrew — copied-source field summaries — 12 November 2026
- `CopySource.tsx`: changed-field summaries now resolve known data-field IDs through i18n instead of displaying the English field labels. The translator is optional in the exported helper, so callers without it retain the existing English fallback; unknown field IDs remain untouched.
- Added 42 EN/RU messages under `workshop.homebrew.copy.field.*` for spell, item, feat, species, class and related fields. Source entries, custom data and field IDs are not translated.
- Static verification: all 42 keys exist in both dictionaries, none are duplicated, and every Russian label is non-empty.

## App entry and setup — 12 November 2026
- `src/app/setup/page.tsx`: replaced the final hardcoded “Open the admin panel” link label with the existing `setup.page.openAdmin` message key.
- Performed a focused top-level screen scan of `AuthForm.tsx`, `ChangePasswordForm.tsx`, `CreateCampaignDialog.tsx`, `WorldSetupFields.tsx`, `page.tsx`, `settings/page.tsx` and `setup/page.tsx`. No further fixed English labels were found in the inspected candidates; product name and input-code masks are intentionally unchanged.

## Campaign lobby and session end state — 12 November 2026
- `Lobby.tsx`: added `useI18n`; localized prep mode, return/navigation labels, section headings, Story Setup warnings, voice-transcription notice, character/campaign confirmation prompts and fixed error fallbacks. Raw server-provided `data.error` values remain untouched because they are API payloads, not local UI copy.
- `LobbyPieces.tsx`: localized the lobby hero eyebrow, campaign-settings tooltip, starting-level chip and physical-dice control copy.
- `LobbyParty.tsx`: localized party count, DM/co-DM/party-lead/owner labels, ready and muted statuses, real-dice note, seat-management controls, character list, open-seat plural sentence and companion management.
- `SessionView.tsx`: localized the completed-campaign banner title, return link and description.
- Added 69 EN/RU dictionary entries under `campaign.lobby.*` and `campaign.ended.*`. English and Russian plural categories are present; placeholders match; no duplicate added keys. A focused scan found no remaining raw English UI labels in the three lobby components.

## Lobby actions and invitation card — 12 November 2026
- `LobbyActions.tsx`: localized character edit/switch/remove actions, ready/start controls, DM guidance, deletion action, dynamic “what happens next” messages, and the four known start blockers. Name lists are adapted to Russian conjunction/“ещё N” wording only when `lang === "ru"`; the English names remain unchanged.
- `LobbyRoomCode.tsx`: localized room-code heading, QR instruction, copy/code/link/share buttons and screen-reader copy confirmations.
- `InviteShareDialog.tsx`: removed a duplicated hardcoded sentence from the room-code collision warning; the complete message was already present in the EN/RU `invite.codeHeld.*` dictionary entries.
- Added 34 EN/RU keys under `campaign.lobby.*` for action labels, next-step guidance, blockers and invite-card labels. Static key checks: all direct references in `LobbyActions.tsx`, `LobbyRoomCode.tsx` and `InviteShareDialog.tsx` resolve in their respective EN/RU dictionaries; placeholders are paired; no duplicate new keys. The invitation warning is no longer duplicated.
- Latest branch commit at checkpoint update: see branch HEAD. No TypeScript, lint, tests, production build or browser visual checks were run.

## Campaign session controls and error fallbacks — 12 November 2026
- `SessionView.tsx`: localized the fallback messages for table pause/resume, ending/starting a session, sending a player action and network failure. Server-provided error strings remain the preferred value and are not rewritten.
- Replaced the hardcoded end-session confirmation paragraph with an i18n message. The confirmation title and action label now reuse the existing `campaign.sessionHeader.endSession` translation.
- Added 7 EN/RU messages under `campaign.tableBreak.*`, `campaign.sessionHold.*` and `campaign.session.*`. Static checks: all 7 keys exist in both dictionaries, no duplicates were introduced, placeholders match, and the edited component no longer contains the fixed English fallback/confirmation phrases.
- `CharacterGate.tsx`, `JoinConfirmDialog.tsx`, `SessionBanner.tsx` and `SessionHoldBanner.tsx` were inspected in this pass; their visible copy already uses existing EN/RU messages. `SessionHeader.tsx` also resolves its visible labels through existing dictionary entries.

## Campaign details and settings — 12 November 2026
- `EditCampaignDialog.tsx`: localized the campaign details editor, field labels, difficulty choices and their explanatory text, cover-art actions/statuses, save action and fixed error fallbacks. Difficulty enum values remain unchanged; only their displayed labels and hints are translated.
- `SessionSettings.tsx`: localized the settings navigation, campaign summary, preparation import description and campaign-ending section. Reused existing campaign edit-tooltip/button messages and the existing ended-campaign title/body. The campaign summary now displays a translated difficulty label.
- Added 42 EN/RU messages under `campaign.editDialog.*` and `campaign.sessionSettings.*`. Static checks: all added keys are present in both dictionaries, no duplicate keys were introduced, placeholders match, and direct references in the edited components resolve against the dictionaries.
- API-provided error messages remain as supplied by the server; only local fallback text is translated.

## Table settings read-only summary and search — 12 November 2026
- `GameSettingsPanel.tsx`: localized the read-only and edit headings, explanatory text, visible setting summaries, save status, search field and empty-search state. Server settings and enum values remain unchanged; summary text is selected by the existing stored values.
- Localized the fallback used when a settings PATCH fails; server-provided error strings remain untouched.
- Added 62 EN/RU messages under `campaign.gameSettings.*`. Static checks: key completeness, no duplicates, placeholder parity and direct message references passed.
- The detailed editor groups in `GameSettingsGroups.tsx` and group titles/summaries in `table-settings-groups.ts` were completed in the follow-up pass below.

## Campaign table settings editor and group summaries — 12 November 2026
- `GameSettingsGroups.tsx`: localized world packs, genre presets and descriptions, custom-world field, table-language choices, campaign length, character dice/HP/wealth/stats/multiclassing, narration, character voices, maps, theatre inserts, ambience, AI delegation, story setup, outcome checks, Living World, allies, narrator memory stages, Bonds, romance, companion conscience, joining permissions, response pacing, item/vitals approvals, GM reminders, battle-board options and every voice-chat rule.
- Preserved stored enum values and IDs, pack names and user-authored world text. Localized the table-language picker and custom-world label during the final focused scan. Russian search terms were added to the hidden group keyword index.
- `table-settings-groups.ts` and `GameSettingsPanel.tsx`: group titles and compact summaries now use the active locale. Shared safety, bonds, board and voice summaries reuse existing campaign-creator messages. The optional translator keeps the pure helper fallback behavior intact for existing callers.
- Added 248 EN/RU entries across the world/character, narration/atmosphere, AI/memory/bonds, player/console/board/voice-chat and group-summary passes. Six plural-specific console reminder messages cover Russian singular/few/many forms and English singular/plural forms.
- Static verification: 308 `campaign.gameSettings.*` entries have exact EN/RU key parity; no duplicates; all matching placeholders agree; all direct group-summary message references resolve; no remaining obvious hardcoded English UI candidates in `GameSettingsGroups.tsx`; unused reroll and world-preset imports were removed.

## Character builder — ability, feat and racial cantrip controls — 12 November 2026
- `AbilityEditor.tsx`: the ability-score heading now uses the existing translated `builder.extra.ability.title` key.
- `FeatChoicesFields.tsx`: localized all seven placeholder labels (language, weapon, damage type, spell list, spellcasting ability, armor training and tool) using the existing EN/RU builder messages.
- `RacialCantripPicker.tsx`: localized the bonus-cantrip heading, selected-count status, help text, catalog button/section, search label and placeholder. Reused existing pluralized `builder.extra.lineage.choice.cantrip` messages for the count/list phrase; removed the English-only number word helper. Spell list IDs and spell names remain unchanged.
- `KitChoicesSection.tsx`: localized the starting-kit armor class caption.
- Added 7 EN/RU messages under `builder.racialCantrip.*` and `builder.kit.*`. Static checks: all direct refs resolve, no duplicate keys, and placeholders match.
- `EquipmentSection.tsx` already maps catalog shelf categories through existing translated `builder.gear.shelf.*` keys; no code change was needed there.

## Resume
The WorldForge component pass is complete across all 29 files in `src/app/workshop/world/`: core views, Atlas, timeline, secrets, wiki, Ask, outline generation, paint queue, relationship graph/editor, type manager, bound records, play fields and shared pickers. Continue with the broader app-level localization audit outside this folder and fix any remaining visible English UI. Verify branch HEAD before editing. Follow the local-validation rule in Low-token work protocol. Block 1 remains formally open; do not merge, open a PR or create its DONE flag.


## Workshop — hazard editor — 12 November 2026
- `HazardFields.tsx`: localized trap, poison and disease editor headings, fields, options, summaries, hints and accessibility labels. Existing ability, damage-type, condition and skill labels reuse shared dictionary keys; internal IDs and game-mechanic values remain unchanged.
- `ChipList`: added optional localized remove-label callback; callers that do not supply it retain the existing fallback.
- Added 88 EN/RU message pairs, including the missing unconscious condition label. Static checks: all 97 direct translation references resolve; no duplicate dictionary keys, missing pairs or placeholder mismatches were found.
- Post-commit source review caught and fixed one remaining `DAMAGE_OPTIONS` reference: the trap editor now builds its translated damage options locally. Confirmed no leftover fixed English label/title/hint/placeholder attributes or undefined legacy option constant in `HazardFields.tsx`.


## Campaign invite landing page — 12 November 2026
- `src/app/join/[code]/page.tsx` now uses `useT` for its invitation heading, fallback title, genre name, party count, closed-seat notice, room code, progress states, navigation links and accessibility label.
- Added 21 EN/RU messages to `src/lib/i18n/messages/{en,ru}/invite.ts`. Existing campaign genre names are reused from the create-campaign dictionary rather than duplicated.
- Known API errors are mapped to localized messages: invalid/unknown code, ended/full/started campaign, mandatory password change, too many attempts (with seconds interpolated), and join fallback. Unknown server errors remain visible rather than being guessed at.
- Static checks: all 15 direct translation calls resolve in both dictionaries; placeholder parity is intact; no visible hard-coded English UI strings remain in the join page.
- New commits: `e94a896` (join page), `a6131ba` (English messages), `f17d65d` (Russian messages). Branch HEAD verified at `f17d65d9a598b25a964204ca6ae82c38129f0b3a`.

## Reference module — post-commit verification — 12 November 2026
- Current source checks: none.
- Remaining checks not confirmed: mainPage, comparison, desk, badges, calculators, englishMessages, russianMessages.
- Latest pass localized the calculator presentation layer; formulas and underlying calculator data were not changed.
