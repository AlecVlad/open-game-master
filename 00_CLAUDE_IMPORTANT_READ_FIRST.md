# HANDOFF FOR THE FIRST AGENT — READ BEFORE RESUMING

**Repository:** `AlecVlad/open-game-master`  
**Your baseline branch:** `i18n-ru-stage0`  
**Active translation branch:** `i18n-ru-agent2`  
**Baseline commit:** `e63715ab4b34e9385223ba2017e7518768e97e48` (v0.33.0)

## Current division of work

The second agent (ChatGPT) is continuing the localization on `i18n-ru-agent2`, created from your `i18n-ru-stage0` commit `e63715ab`.

The second agent owns the remaining localization work across the project, including:
- remaining character-builder components;
- `src/app/create-campaign`;
- `src/app/setup`;
- campaign session/game UI and the remaining campaign pages;
- shared components, help, rulebook/reference and the remaining user-facing areas.

The second agent pushes only to the fork branch `i18n-ru-agent2`. Do not expect code changes to be committed to `stage0` while that work is in progress.

## Do not merge yet

Until the second agent reports localization work complete:

1. Do not merge `i18n-ru-agent2` into `stage0` or another branch.
2. Do not merge or copy files from `i18n-ru-workshop` or `i18n-ru-fonts`; these branches are reserved for your later integration.
3. Do not merge upstream `main` / v0.34.1. The active localization is deliberately based on v0.33.0; you will integrate upstream after the translation work is complete and localize only the upstream changes then.
4. Preserve any uncommitted work in your own session before switching branches.

## What to do when the second agent is finished

1. Fetch the fork and read `BUILD_REPORT.md` from `i18n-ru-agent2`.
2. Review the branch diff and reports; check the actual test/build results rather than assuming they passed.
3. Integrate `i18n-ru-agent2`, `i18n-ru-workshop` and `i18n-ru-fonts` according to the owner's plan. The owner expects you to handle the later branch merge and proofreading.
4. Only then integrate upstream `main` / v0.34.1 and translate any new or changed user-facing text.

## Important clarification about an older branch

An earlier assistant session created `integrate/ru-0.34.1` by merging upstream with the previous translation state. Under the owner's latest instructions, **that branch is not the active base for the current translation**. Leave it untouched; do not copy from it or merge it into the active `i18n-ru-agent2` branch.

## Current progress marker

The active branch has a running `BUILD_REPORT.md`. The latest report is the source of truth for completed files and verification status. At the time this note was updated, the first group (lineage carousel localization) had been committed there. Automated tests and build were not yet run in the assistant's remote-only environment.

**Only this handoff note was changed on `i18n-ru-stage0` by the assistant; no application code was changed on this branch.**
