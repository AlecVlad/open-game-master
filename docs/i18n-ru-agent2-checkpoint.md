# Checkpoint: Russian localization work on `i18n-ru-agent2`

**Date:** 2026-11-10  
**Repository:** `AlecVlad/open-game-master`  
**Branch:** `i18n-ru-agent2`  
**Latest commit before this checkpoint:** `9ebd047347b9e296edd0c1f49a401ae2da199e95` — `i18n: register first-run setup dictionaries`  
**Comparison base:** `a0d156b0477d93364e1d5c6d5af0f06800dddd50`  
**Branch comparison at checkpoint:** 94 commits ahead, 0 behind; 27 changed files.  
**Merge / PR:** none. Do not merge this branch; the user keeps merge control.

## User's working agreement

- Work only in `i18n-ru-agent2`.
- Do not touch `workshop` or unrelated branches/areas.
- Do not merge or create a PR unless the user explicitly asks.
- Continue in small, reviewable chunks.
- The user plans to ask Claude to independently reassess progress later. Claude currently has no tokens, so preserve enough context for a clean handoff.

## What has been localized or wired so far

### Campaign creation

- Defaults and saved-default controls: `DefaultsFields.tsx`.
- World and setting fields: `WorldFields.tsx`.
- Party composition, difficulty, hit points, wealth, campaign length, ability-score reroll and dice hints: `PartyFields.tsx`.
- Narration voice, casting behavior, AI allies and companion modes: `NarratorFields.tsx`.
- Live voice-chat settings: `VoiceChatFields.tsx`.
- Experience-step headings, groups and multi-character choices: `ExperienceStep.tsx`.
- Feature rows, their hints and information dialogs: `SheetRows.tsx`.
- Variant-rule switches, rest lengths and their explanatory dialog: `RulesPanel.tsx` and `ExperienceStep.tsx`.
- Safety boundaries, X-card, strictness, tone and personality notes: `SafetyToneFields.tsx` and `SafetyFields.tsx`.
- Essentials group headings and world-building/house-rule/lore fields: `EssentialsStep.tsx` and `WorldSetupFields.tsx`.
- Group summaries and the review read-back: `summaries.ts`, `cover-sheet.ts`, `EssentialsStep.tsx`, `ExperienceStep.tsx`, and `ReviewStep.tsx`.
- Story Setup notice actions: `StorySetupNotice.tsx`.
- Kokoro language fallback note: `VoicePicker.tsx`.

### Message dictionaries

- Campaign creation strings were added to `src/lib/i18n/messages/en/createCampaign.ts` and `ru/createCampaign.ts`.
- Shared safety, tone and world-setup strings were added to `src/lib/i18n/messages/en/common.ts` and `ru/common.ts`.
- First-run setup dictionaries were created:
  - `src/lib/i18n/messages/en/setup.ts`
  - `src/lib/i18n/messages/ru/setup.ts`
- The new setup dictionaries are registered in `src/lib/i18n/messages/index.ts`.
- Each new first-run dictionary currently contains 150 entries.

Names, lore, descriptions and other content supplied by a campaign/world pack or by the user are intentionally kept as data. Technical model identifiers, commands, URLs and provider names are also not being translated.

## Tests and verification status

Test coverage was extended in:
- `scripts/test-i18n.mjs`: required EN/RU key checks for party controls, voice chat, narration/allies, experience groups, feature rows, variant rules, summaries, safety/tone, world setup, essentials, review and the new first-run setup dictionary.
- `scripts/test-campaign-creator-flow.mjs`: checks translated summaries while preserving the untranslated/default path.
- `scripts/test-world-portals.mjs`: checks the translated review cover.

**Important:** these tests were added/updated but have NOT been executed in this session. No local terminal/build environment is available through the current GitHub-only access. The workflow-run lookup for the latest known commit returned no runs. Do not report the tests, TypeScript check or build as passing until they are actually run and their output inspected.

Static inspection did confirm:
- the EN and RU first-run setup files are present on the branch;
- both are registered in the dictionary index;
- each contains 150 setup keys;
- the branch comparison reported 27 changed files and no commits behind the comparison base.

## Current incomplete area: first-run server setup at `/setup`

The dictionaries and key-coverage assertions exist, but the setup UI has **not yet been wired to them**. The screen/components are still largely English.

A previous attempted edit of `src/app/setup/page.tsx` stopped before writing because a local replacement-count assertion failed. Therefore `page.tsx` was not changed by that attempt.

Recommended continuation order:

1. Wire `src/app/setup/page.tsx` to `setup.page.*` (admin-only notice, device-world notice, load failure and navigation links).
2. Wire `src/app/setup/SetupWizard.tsx`: step labels/titles/blurbs, blockers, save errors, secondary/continue/done labels and accessible labels.
3. Wire `WelcomeStep.tsx` and shared setup UI in `SetupParts.tsx`.
4. Wire `StorytellerStep.tsx`, `AgentPanel.tsx` and `StartHints.tsx`; preserve provider/model names, model IDs, host names and terminal commands.
5. Wire `MediaSteps.tsx` (Pictures/Voice, ComfyUI/Kokoro, speech tests, dictation, model fields); keep technical command/config values intact.
6. Wire `PlayersStep.tsx` and `ReadyStep.tsx`.
7. Wire `YourAgentStep.tsx`; reuse existing `settings.agents.scope.*` keys for the agent permission labels/hints rather than duplicating translations.
8. Audit all visible text, dynamic statuses and API-returned errors; run the new i18n checks, creator-flow tests, TypeScript and build when a runnable environment/CI is available.

## Review notes for the next agent

- Treat this checkpoint as a handoff, not proof that the code is build-clean.
- Re-fetch current files from `i18n-ru-agent2` before editing; each GitHub update creates a commit and stale blob SHAs will fail.
- Avoid parallel writes to the same file.
- The current shared `Wizard` component already translates generic controls such as Back/Continue/progress; do not duplicate those keys unnecessarily.
- Keep tests honest: assertions are useful only after they have been run.
- After finishing first-run setup, resume the agreed broader order: audit the campaign-creation flow, then classify and translate the session area, then run the complete localization audit.
