// Assert-based tests for the interface-language core and its message files.
// Run with: node scripts/test-i18n.mjs
import assert from "node:assert/strict";
import {
  DEFAULT_LANG,
  LANGS,
  interpolate,
  isLang,
  pickLang,
  pluralCategory,
  translate,
  translatePlural,
} from "../src/lib/i18n/core.ts";
import { DICTIONARIES } from "../src/lib/i18n/messages/index.ts";
import { localizeStoryboardError } from "../src/lib/workshop/storyboard-api-i18n.ts";

// Language choice: the cookie wins, then Accept-Language, then English.
assert.equal(pickLang("ru", "en-US,en;q=0.9"), "ru");
assert.equal(pickLang(undefined, "ru-RU,ru;q=0.9,en;q=0.8"), "ru");
assert.equal(pickLang(undefined, "de-DE,fr;q=0.9,ru;q=0.5"), "ru");
assert.equal(pickLang("xx", "en-GB"), "en");
assert.equal(pickLang(undefined, null), DEFAULT_LANG);
assert.equal(isLang("ru"), true);
assert.equal(isLang("klingon"), false);

// Parameters: replaced where named, left as written where missing.
assert.equal(interpolate("Hi {name}", { name: "Ada" }), "Hi Ada");
assert.equal(interpolate("Hi {name}", {}), "Hi {name}");
assert.equal(interpolate("Plain"), "Plain");

// Lookup: the language, else English, else the key.
const dicts = {
  en: { a: "A", b: "B", "n.one": "{count} file", "n.other": "{count} files" },
  ru: { a: "А", "n.one": "{count} файл", "n.few": "{count} файла", "n.many": "{count} файлов", "n.other": "{count} файла" },
};
assert.equal(translate(dicts, "ru", "a"), "А");
assert.equal(translate(dicts, "ru", "b"), "B");
assert.equal(translate(dicts, "ru", "zzz"), "zzz");

// Russian plurals: 1 file, 2-4 files, 5-20 files, 21 file, 22 files, 25 files.
const ru = (n) => translatePlural(dicts, "ru", "n", n);
assert.equal(ru(1), "1 файл");
assert.equal(ru(2), "2 файла");
assert.equal(ru(5), "5 файлов");
assert.equal(ru(11), "11 файлов");
assert.equal(ru(21), "21 файл");
assert.equal(ru(22), "22 файла");
assert.equal(ru(25), "25 файлов");
assert.equal(translatePlural(dicts, "en", "n", 1), "1 file");
assert.equal(translatePlural(dicts, "en", "n", 3), "3 files");
assert.equal(pluralCategory("ru", 3), "few");

// The shipped messages: every language's keys exist in English (no stray
// keys), every {placeholder} in English is in the translation, and Russian
// carries no placeholder English lacks.
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
for (const lang of LANGS) {
  for (const [key, text] of Object.entries(DICTIONARIES[lang])) {
    // A language may have plural forms English lacks (Russian .few and .many):
    // they stand on English's ".other" of the same message.
    const base = /\.(zero|two|few|many)$/.test(key) ? key.replace(/\.[a-z]+$/, ".other") : key;
    assert.ok(base in DICTIONARIES.en, `${lang} has the key "${key}" English lacks`);
    assert.deepEqual(placeholders(text), placeholders(DICTIONARIES.en[base]), `${lang} "${key}" placeholders differ`);
  }
}

// Party backstory: every fixed label, state and known API refusal has both language forms.
const partyBackstoryMessages = [
  "campaign.session.party.backstory.title",
  "campaign.session.party.backstory.placeholder",
  "campaign.session.party.backstory.save",
  "campaign.session.party.backstory.clear",
  "campaign.session.party.backstory.draft",
  "campaign.session.party.backstory.empty",
  "campaign.session.party.backstory.someone",
  "campaign.session.party.backstory.overtaken",
  "campaign.session.party.backstory.error.save",
  "campaign.session.party.backstory.error.workshop",
  "campaign.session.party.backstory.error.invalid",
  "campaign.session.party.backstory.error.permission",
  "campaign.session.party.backstory.error.tooLong",
  "campaign.session.party.backstory.error.noCharacters",
  "campaign.session.party.backstory.note.saved",
  "campaign.session.party.backstory.note.cleared",
  "campaign.session.party.backstory.note.draft",
  "campaign.session.party.backstory.lastSaved",
  "campaign.session.party.backstory.lastSavedAt",
  "campaign.session.party.backstory.footer.play",
  "campaign.session.party.backstory.footer.lobby",
  "campaign.session.party.backstory.footer.permissions",
];
for (const key of partyBackstoryMessages) {
  assert.ok(key in DICTIONARIES.en, `English party-backstory message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian party-backstory message missing: ${key}`);
}

// Companion relationship labels must follow the selected interface language.
for (const key of ["campaign.relationship.romance.with", "campaign.relationship.romance.title"]) {
  assert.ok(key in DICTIONARIES.en, `English relationship message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian relationship message missing: ${key}`);
}

// The campaign world-identity screens are considered one complete translation unit.
const identityMessages = Object.keys(DICTIONARIES.en).filter((key) => key.startsWith("createCampaign.identity."));
const untranslatedIdentityMessages = identityMessages.filter((key) => !(key in DICTIONARIES.ru));
assert.deepEqual(untranslatedIdentityMessages, [], "campaign identity messages must be translated into Russian");

const worldScreenGenres = ["high_fantasy", "dark_fantasy", "mystery", "horror", "cyberpunk", "steampunk", "post_apocalyptic", "custom"];
const worldScreenParts = ["dmFlavor", "fact.maps", "fact.names", "fact.people"];
for (const genre of worldScreenGenres) {
  for (const part of worldScreenParts) {
    const key = `createCampaign.identity.genre.${genre}.${part}`;
    assert.ok(key in DICTIONARIES.en, `English world-screen message missing: ${key}`);
    assert.ok(key in DICTIONARIES.ru, `Russian world-screen message missing: ${key}`);
  }
}

for (const climate of ["temperate", "arid", "boreal", "tropical", "blighted"]) {
  const key = `createCampaign.identity.climate.${climate}`;
  assert.ok(key in DICTIONARIES.en && key in DICTIONARIES.ru, `Climate label missing: ${key}`);
}

for (const language of ["english", "danish", "dutch", "finnish", "french", "german", "hungarian", "indonesian", "irish", "italian", "norwegian", "portuguese", "russian", "spanish", "swedish"]) {
  const key = `createCampaign.identity.tableLanguage.${language}`;
  assert.ok(key in DICTIONARIES.en && key in DICTIONARIES.ru, `Table-language label missing: ${key}`);
}

// The party and character-rule controls are one translation unit.
const partyMessages = Object.keys(DICTIONARIES.en).filter((key) => key.startsWith("createCampaign.party."));
const untranslatedPartyMessages = partyMessages.filter((key) => !(key in DICTIONARIES.ru));
assert.deepEqual(untranslatedPartyMessages, [], "campaign party messages must be translated into Russian");

for (const difficulty of ["easy", "normal", "hard", "deadly"]) {
  for (const suffix of ["", "Hint"]) {
    const key = `createCampaign.party.difficulty.${difficulty}${suffix}`;
    assert.ok(key in DICTIONARIES.en && key in DICTIONARIES.ru, `Difficulty message missing: ${key}`);
  }
}

for (const choice of ["average", "rolled", "max"]) {
  const key = `createCampaign.party.hp.${choice}`;
  assert.ok(key in DICTIONARIES.en && key in DICTIONARIES.ru, `Hit point choice missing: ${key}`);
}

for (const wealth of ["equipment", "rolled"]) {
  const key = `createCampaign.party.wealth.${wealth}`;
  assert.ok(key in DICTIONARIES.en && key in DICTIONARIES.ru, `Starting wealth choice missing: ${key}`);
}

assert.ok("createCampaign.party.stats.serverDetail" in DICTIONARIES.en, "English server reroll detail missing");
assert.ok("createCampaign.party.stats.serverDetail" in DICTIONARIES.ru, "Russian server reroll detail missing");

const voiceChatMessages = [
  "title", "toggle", "toggleHint", "turnFloor", "turn.off", "turn.soft", "turn.strict",
  "proximity", "proximityHint", "hearingRange", "hearingRangeValue", "whisperShout", "whisperShoutHint",
  "wallsMuffle", "wallsMuffleHint", "downedDeaf", "downedDeafHint", "serverHelp",
].map((part) => `createCampaign.experience.voiceChat.${part}`);
for (const key of voiceChatMessages) {
  assert.ok(key in DICTIONARIES.en, `English voice-chat message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian voice-chat message missing: ${key}`);
}

const narrationMessages = [
  "serverMissing", "narratorVoice", "pace", "charactersLabel", "casting.infoIntro",
  "casting.narrator", "casting.characters", "casting.between", "casting.separate",
  "casting.infoLabel", "casting.narratorReads", "casting.narratorReadsHint",
  "casting.eachSpeaker", "casting.eachSpeakerHint", "casting.autoHelp", "casting.manualHelp",
  "casting.changeVoiceLater", "casting.characterVoicesPlace", "offNote", "allies.label",
  "allies.mode.auto", "allies.mode.full", "allies.mode.guests", "allies.mode.off",
  "allies.soloHelp", "allies.groupHelp", "allies.partyMembersAtOnce", "allies.guestsAtOnce",
].map((part) => `createCampaign.experience.narration.${part}`);
for (const key of narrationMessages) {
  assert.ok(key in DICTIONARIES.en, `English narration message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian narration message missing: ${key}`);
}

assert.ok("voicePicker.narratorLanguageNote" in DICTIONARIES.en, "English narrator language note missing");
assert.ok("voicePicker.narratorLanguageNote" in DICTIONARIES.ru, "Russian narrator language note missing");

const sheetRowMessages = [
  "aiStorySetup.label", "aiStorySetup.hint",
  "narrationGuard.label", "narrationGuard.hint",
  "worldSimulation.label", "worldSimulation.hint",
  "ttsEnabled.label", "ttsEnabled.hint", "ttsEnabled.noService",
  "mapsEnabled.label", "mapsEnabled.hint", "mapsEnabled.noPainter",
  "ambienceEnabled.label", "ambienceEnabled.hint",
  "ambienceAuto.label", "ambienceAuto.hint",
  "presentation.label", "presentation.hint",
  "relationships.label", "relationships.hint",
  "romance.label", "romance.hint",
  "multiCharacter.off", "multiCharacter.oneActive", "multiCharacter.allActive", "multiCharacter.hint",
  "midGameJoinOpen.label", "midGameJoinOpen.hint",
  "holdSubmissions.label", "holdSubmissions.hint",
  "multiclassingEnabled.label", "multiclassingEnabled.hint",
  "inventoryApprovals.label", "inventoryApprovals.hint",
  "vitalsApprovals.label", "vitalsApprovals.hint",
  "boardDrawing.label", "boardDrawing.hint",
  "enemyIntent.label", "enemyIntent.hint",
  "info.livingWorld.label", "info.livingWorld.text",
  "info.bonds.label", "info.bonds.text",
  "info.romance.label", "info.romance.text",
  "info.narrationGuard.label", "info.narrationGuard.text",
].map((part) => `createCampaign.experience.sheet.${part}`);
for (const key of sheetRowMessages) {
  assert.ok(key in DICTIONARIES.en, `English sheet-row message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian sheet-row message missing: ${key}`);
}

const experienceShellMessages = [
  "intro", "counter", "narration.title", "narration.note", "atmosphere.title",
  "safety.title", "more.title", "optional", "ai.title", "bonds.title", "players.title",
  "board.title", "variants.title", "variants.info", "variants.infoLabel",
  "multiCharacter.label", "multiCharacter.oneEach", "multiCharacter.severalOne",
  "multiCharacter.severalAll", "multiCharacter.hint.off", "multiCharacter.hint.oneActive",
  "multiCharacter.hint.allActive",
].map((part) => `createCampaign.experience.${part}`);
for (const key of experienceShellMessages) {
  assert.ok(key in DICTIONARIES.en, `English experience-step message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian experience-step message missing: ${key}`);
}

const variantRuleIds = [
  "flanking", "criticalFumbles", "encumbrance", "lingeringInjuries",
  "powerfulCritical", "criticalDamageMods", "ammunition", "supplies",
];
const variantRuleMessages = ["title", "restLengths", "on", "off"];
for (const id of variantRuleIds) {
  variantRuleMessages.push(`${id}.label`, `${id}.tip`);
}
for (const rest of ["standard", "gritty", "heroic"]) {
  variantRuleMessages.push(`rest.${rest}`);
}
for (const part of variantRuleMessages) {
  const key = `createCampaign.experience.variantRules.${part}`;
  assert.ok(key in DICTIONARIES.en, `English variant-rule message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian variant-rule message missing: ${key}`);
}

const summaryMessages = Object.keys(DICTIONARIES.en).filter((key) => key.startsWith("createCampaign.summary."));
const untranslatedSummaryMessages = summaryMessages.filter((key) => !(key in DICTIONARIES.ru));
assert.deepEqual(untranslatedSummaryMessages, [], "campaign summary messages must be translated into Russian");

const safetyToneMessages = [
  "safety.label", "safety.xCardOn", "safety.xCardOff",
  "safety.boundary.family", "safety.boundary.standard", "safety.boundary.mature",
  "safety.lines.label", "safety.lines.hint", "safety.veils.label", "safety.veils.hint",
  "safety.romanceNote", "strictness.label", "strictness.lenient", "strictness.standard", "strictness.harsh",
  "tone.label", "tone.upToThree", "tone.choosePersonality", "tone.personalitiesInfoLabel",
  "tone.personalitiesInfoIntro", "tone.voicePart", "personalityNote.active", "personalityNote.inactive",
  "tone.grim", "tone.hopeful", "tone.whimsical", "tone.epic", "tone.intimate", "tone.pulpy", "tone.eerie", "tone.political",
].map((part) => `safetyTone.${part}`);
for (const key of safetyToneMessages) {
  assert.ok(key in DICTIONARIES.en, `English safety-tone message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian safety-tone message missing: ${key}`);
}

const essentialsMessages = [
  "more.title", "optional", "group.world", "group.character", "group.prep", "bringPrep",
].map((part) => `createCampaign.essentials.${part}`);
for (const key of essentialsMessages) {
  assert.ok(key in DICTIONARIES.en, `English essentials message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian essentials message missing: ${key}`);
}

const worldSetupMessages = [
  "worldBuilding", "collapsibleSummary", "houseRules.label", "houseRules.placeholder",
  "houseRules.help", "lore.label", "loreCategory.label", "loreCategory.geography",
  "loreCategory.factions", "loreCategory.history", "loreCategory.magic",
  "loreCategory.culture", "loreCategory.religion", "loreCategory.other",
  "loreTitle.placeholder", "loreTitle.remove", "loreBody.placeholder",
  "lore.add", "lore.help",
].map((part) => `worldSetup.${part}`);
for (const key of worldSetupMessages) {
  assert.ok(key in DICTIONARIES.en, `English world setup message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian world setup message missing: ${key}`);
}

const reviewMessages = ["dmMode.ai", "dmMode.steered", "dmMode.human", "dmMode.assisted",
"prep.from", "prep.none", "prep.workshop", "tableFeatures", "cover.untitledAdventure","cover.untitledCampaign","cover.defaultTheme","cover.party.solo","cover.party.players","cover.meta","cover.lengthActs.short","cover.lengthActs.standard","cover.lengthActs.epic","cover.level","cover.chip.climate","cover.chip.length","cover.packSetting","row.runsGame","row.setting","row.party","row.difficulty","row.dice","row.narration","row.safety","row.rules","row.prep","row.tableFeatures", "rulesBook","edit","editAria","lobby.solo","lobby.group","soloAiMissing","followUp.adventureIntro","followUp.campaignIntro","followUp.help","followUp.openAdventure","followUp.openCampaign","storyClash"].map((part) => `createCampaign.review.${part}`);
for (const key of reviewMessages) {
  assert.ok(key in DICTIONARIES.en, `English review message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian review message missing: ${key}`);
}
assert.ok("storySetupNotice.turnOff" in DICTIONARIES.en && "storySetupNotice.turnOff" in DICTIONARIES.ru, "Story Setup off action must be translated");
assert.ok("storySetupNotice.keep" in DICTIONARIES.en && "storySetupNotice.keep" in DICTIONARIES.ru, "Story Setup keep action must be translated");

const setupMessages = [
  "page.adminOnly", "page.backCampaigns", "page.deviceWorld", "page.openAdmin", "page.loadFailed",
  "wizard.saveFailed", "wizard.storyRequired", "wizard.storyPickModel", "wizard.storyCheckKey", "wizard.storyChooseProgram",
  "wizard.voiceKokoroAddress", "wizard.voiceOpenAiKey", "wizard.voicePickModel", "wizard.leave", "wizard.title",
  "wizard.saving", "wizard.begin", "wizard.startCampaign",
  "step.welcome.label", "step.welcome.eyebrow", "step.welcome.title", "step.welcome.blurb",
  "step.story.label", "step.story.eyebrow", "step.story.title", "step.story.blurb", "step.story.later.label", "step.story.later.title",
  "step.pictures.label", "step.pictures.eyebrow", "step.pictures.title", "step.pictures.blurb", "step.pictures.skip.label", "step.pictures.skip.title",
  "step.voice.label", "step.voice.eyebrow", "step.voice.title", "step.voice.blurb", "step.voice.skip.label", "step.voice.skip.title",
  "step.players.label", "step.players.eyebrow", "step.players.title", "step.players.blurb", "step.players.skip.label", "step.players.skip.title",
  "step.agent.label", "step.agent.eyebrow", "step.agent.title", "step.agent.blurb",
  "step.ready.label", "step.ready.eyebrow", "step.ready.title", "step.ready.blurb",
  "welcome.serverName", "welcome.serverNameHelp", "welcome.whatWeSetUp",
  "welcome.stop.story.title", "welcome.stop.story.line", "welcome.stop.pictures.title", "welcome.stop.pictures.line",
  "welcome.stop.voice.title", "welcome.stop.voice.line", "welcome.stop.players.title", "welcome.stop.players.line",
  "welcome.stop.agent.title", "welcome.stop.agent.line", "welcome.scanning", "welcome.found", "welcome.nothing",
  "welcome.nothingHelp", "welcome.foundService", "welcome.foundServiceModels",
  "players.findTitle", "players.homeNetwork", "players.networkAddress", "players.noNetwork", "players.internetOptional",
  "players.publicAddressPlaceholder", "players.publicAddressAria", "players.publicAddressHelp", "players.signupTitle",
  "players.signupAria", "players.invite.title", "players.invite.sub", "players.recommended", "players.open.title",
  "players.open.sub", "players.fineAtHome", "players.closed.title", "players.closed.sub", "players.openWarning", "players.roomCodeHelp",
  "parts.suggested", "parts.useSuggestion", "parts.recommended",
  "ready.header", "ready.recheck", "ready.change", "ready.tryStory", "ready.tryAgent",
  "ready.story.title", "ready.story.none", "ready.story.asking", "ready.story.answering", "ready.story.notReadyAgent", "ready.story.notReadyModel",
  "ready.pictures.title", "ready.pictures.off", "ready.pictures.asking", "ready.pictures.found", "ready.pictures.notSet", "ready.pictures.comfyui", "ready.pictures.openai", "ready.pictures.agent", "ready.pictures.needsModel", "ready.pictures.notAnswering",
  "ready.narration.title", "ready.narration.off", "ready.narration.asking", "ready.narration.found", "ready.narration.notSet", "ready.narration.kokoro", "ready.narration.openai", "ready.narration.needsModel", "ready.narration.notAnswering",
  "ready.dictation.title", "ready.dictation.asking", "ready.dictation.ready", "ready.dictation.whisper", "ready.dictation.builtin", "ready.dictation.openai", "ready.dictation.off",
  "ready.players.title", "ready.players.invite", "ready.players.open", "ready.players.closed",
  "ready.agent.title", "ready.agent.connected", "ready.agent.notConnected",
  "agent.defaultName", "agent.connectionMade", "agent.tokenHelp", "agent.manageTokens", "agent.description",
  "agent.name", "agent.permissions", "agent.makeConnection", "agent.connectionError", "agent.serverError"
].map((part) => `setup.${part}`);
for (const key of setupMessages) {
  assert.ok(key in DICTIONARIES.en, `English setup message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian setup message missing: ${key}`);
}

// Storyboard: every kind and hint is translated, and its counts use
// the complete English/Russian plural sets.
const storyboardKinds = ["setting", "backstory", "event", "encounter", "hook", "secret", "npcMoment"];
for (const kind of storyboardKinds) {
  for (const family of ["kind", "hint"]) {
    const key = `campaign.storyboard.${family}.${kind}`;
    assert.ok(key in DICTIONARIES.en, `English Storyboard message missing: ${key}`);
    assert.ok(key in DICTIONARIES.ru, `Russian Storyboard message missing: ${key}`);
    assert.notEqual(translate(DICTIONARIES, "ru", key), key, `Russian Storyboard message fell back to its key: ${key}`);
  }
}
const storyboardStaticMessages = [
  "campaign.storyboard.delete",
  "campaign.storyboard.route.tag.choice",
  "campaign.storyboard.route.tag.optional",
  "campaign.storyboard.link.missing",
  "campaign.storyboard.suggestion.reason.generic",
];
for (const key of storyboardStaticMessages) {
  assert.ok(key in DICTIONARIES.en, `English Storyboard message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian Storyboard message missing: ${key}`);
}

const storyboardPluralKeys = [
  "campaign.storyboard.missingPicks",
  "campaign.storyboard.leadsTo",
  "campaign.storyboard.routesToChoose",
  "campaign.storyboard.optionalRoutes",
  "campaign.storyboard.shared.chapterDraws",
  "campaign.storyboard.compile.lore",
  "campaign.storyboard.compile.quests",
  "campaign.storyboard.compile.encounters",
  "campaign.storyboard.compile.notes",
  "campaign.storyboard.compile.moments",
  "campaign.storyboard.compile.arc",
  "campaign.storyboard.error.lostCharacters",
  "campaign.storyboard.characters",
  "campaign.storyboard.prose.joined",
  "campaign.storyboard.prose.longRun",
];
for (const key of storyboardPluralKeys) {
  for (const suffix of ["one", "other"]) {
    assert.ok(`${key}.${suffix}` in DICTIONARIES.en, `English plural form missing: ${key}.${suffix}`);
  }
  for (const suffix of ["one", "few", "many", "other"]) {
    assert.ok(`${key}.${suffix}` in DICTIONARIES.ru, `Russian plural form missing: ${key}.${suffix}`);
  }
  for (const count of [1, 2, 5]) {
    const rendered = translatePlural(DICTIONARIES, "ru", key, count);
    assert.ok(!rendered.includes("{count}"), `Russian plural placeholder was not filled: ${key}, ${count}`);
    assert.notEqual(rendered, key, `Russian plural message fell back to its key: ${key}`);
  }
}

// The API boundary translates the stable diagnostics without changing the
// pure checkBeat() messages used by the board logic and its tests.
assert.equal(
  localizeStoryboardError("A card needs a title, even a bad one.", "ru"),
  translate(DICTIONARIES, "ru", "campaign.storyboard.error.titleRequired"),
);
assert.equal(
  localizeStoryboardError("No such card.", "ru"),
  translate(DICTIONARIES, "ru", "campaign.storyboard.error.missingCard"),
);
const overflow = localizeStoryboardError(
  'This card\'s text is 4,001 characters; the limit is 4,000. The last 1 would be lost: "слово".',
  "ru",
);
assert.ok(overflow.includes("будет потерян 1 символ"), "single-character overflow must use singular verb agreement");
assert.ok(overflow.includes("«слово»"), "overflow excerpt must be preserved");
const overflowMany = localizeStoryboardError(
  'This card\'s text is 4,005 characters; the limit is 4,000. The last 5 would be lost.',
  "ru",
);
assert.ok(overflowMany.includes("будут потеряны 5 символов"), "multi-character overflow must use plural verb agreement");

// Report (not fail on) what Russian still lacks, so progress is visible.
const missing = Object.keys(DICTIONARIES.en).filter((key) => !(key in DICTIONARIES.ru));
console.log(`i18n: ${Object.keys(DICTIONARIES.en).length} messages, ${missing.length} not yet in Russian`);
if (missing.length > 0) {
  console.log(`  untranslated: ${missing.join(", ")}`);
}
console.log("i18n tests passed");
