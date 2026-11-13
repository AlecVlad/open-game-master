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
import { gearProblemText } from "../src/app/characters/builder/gearProblemText.ts";
import { refusalText } from "../src/app/characters/builder/refusal.ts";
import { campaignApiErrorText } from "../src/lib/i18n/campaignApiError.ts";
import { notificationText } from "../src/lib/i18n/notificationText.ts";
import { readLoad, readWrite, UNREACHABLE, UNREADABLE } from "../src/lib/load-state.ts";
import { featOwedText } from "../src/app/characters/builder/featOwedText.ts";
import { featPrerequisiteText } from "../src/app/characters/builder/featPrereqText.ts";
import { multiclassPrerequisiteText } from "../src/app/characters/builder/multiclassPrereqText.ts";

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

// The admin/account/social block is audited as complete: unlike optional
// content areas, these core screens must not silently fall back to English.
const fullyLocalizedAreas = [
  "admin.",
  "friends.",
  "notifications.",
  "invite.",
  "auth.",
  "door.",
  "password.",
  "settings.",
];
for (const prefix of fullyLocalizedAreas) {
  const missing = Object.keys(DICTIONARIES.en).filter((key) => key.startsWith(prefix) && !(key in DICTIONARIES.ru));
  assert.deepEqual(missing, [], `Russian messages are missing for ${prefix}: ${missing.join(", ")}`);
}

// Campaign record panels audited in block 3 must not silently fall back to English.
const campaignPanelAreas = [
  "campaign.fact.",
  "campaign.factions.",
  "campaign.pins.",
  "campaign.quest.",
  "campaign.timeline.",
  "campaign.notes.",
  "campaign.relationship.",
  "campaign.overworld.",
];
for (const prefix of campaignPanelAreas) {
  const missing = Object.keys(DICTIONARIES.en).filter((key) => key.startsWith(prefix) && !(key in DICTIONARIES.ru));
  assert.deepEqual(missing, [], `Russian campaign-panel messages are missing for ${prefix}: ${missing.join(", ")}`);
}

const fightSetupReadoutMessages = [
  "workshop.testFight.setup.readout.saved",
  "workshop.testFight.setup.readout.party.standIns",
  "workshop.testFight.setup.readout.party.characters",
  "workshop.testFight.setup.readout.party.elsewhere",
  "workshop.testFight.setup.readout.foes.summary",
  "workshop.testFight.setup.readout.foes.unchanged",
  "workshop.testFight.setup.readout.foe.dead",
  "workshop.testFight.setup.readout.foe.fled",
  "workshop.testFight.setup.readout.foe.hp",
  "workshop.testFight.setup.readout.foe.hidden",
  "workshop.testFight.setup.readout.foe.detail",
  "workshop.testFight.setup.readout.party.summary",
  "workshop.testFight.setup.readout.hero.dying",
  "workshop.testFight.setup.readout.hero.zeroHp",
  "workshop.testFight.setup.readout.hero.slotsSpent",
  "workshop.testFight.setup.readout.hero.detail",
  "workshop.testFight.setup.readout.initiative",
  "workshop.testFight.setup.readout.dice.summary",
  "workshop.testFight.setup.readout.dice.seed",
  "workshop.testFight.setup.readout.dice.forced",
  "workshop.testFight.setup.readout.dice.forcedNamed",
  "workshop.testFight.setup.readout.dice.forcedRoller",
  "workshop.testFight.setup.readout.dice.kind.any",
  "workshop.testFight.setup.readout.dice.kind.attack",
  "workshop.testFight.setup.readout.dice.kind.damage",
  "workshop.testFight.setup.readout.dice.kind.save",
  "workshop.testFight.setup.readout.dice.kind.deathSave",
  "workshop.testFight.setup.readout.dice.kind.initiative",
  "workshop.testFight.setup.readout.dice.kind.check",
  "workshop.testFight.setup.readout.dice.roller.next",
  "workshop.testFight.setup.readout.dice.roller.enemy",
  "workshop.testFight.setup.readout.dice.roller.hero",
  "workshop.testFight.setup.readout.notice.opened",
  "workshop.testFight.setup.readout.notice.initiativeReplaced",
  "workshop.testFight.setup.readout.notice.partyStartsFresh",
  "workshop.homebrew.item.condition.invisible",
  "workshop.homebrew.item.condition.unconscious",
];
for (const key of fightSetupReadoutMessages) {
  assert.ok(key in DICTIONARIES.en, `English saved-fight readout message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian saved-fight readout message missing: ${key}`);
  assert.notEqual(translate(DICTIONARIES, "ru", key), key, `Russian saved-fight readout fell back to its key: ${key}`);
}
const levelUpRefusalCases = [
  ["LEVEL_UP_ALREADY_TAKEN", "charSheet.levelUp.error.alreadyTaken", { name: "Corin", level: 3, nextLevel: 4 }, "Corin уже достиг 3-го уровня. Следующий — 4-й."],
  ["LEVEL_UP_ALREADY_AT_MAX", "charSheet.levelUp.error.alreadyAtMax", { name: "Corin", level: 20 }, "Corin уже достиг максимального уровня — 20."],
  ["LEVEL_UP_COSMETIC_FIELDS_ONLY", "charSheet.levelUp.error.cosmeticFieldsOnly", {}, "Вне повышения уровня можно менять только портрет, заметки, предысторию и пожелания к истории. Чтобы изменить остальные параметры, обратитесь к ведущему кампании."],
];
for (const [code, key, params, expected] of levelUpRefusalCases) {
  assert.ok(key in DICTIONARIES.en, `English level-up refusal message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian level-up refusal message missing: ${key}`);
  const actual = refusalText(
    { error: "legacy English text", errorCode: code, errorParams: params },
    "fallback",
    (messageKey, messageParams) => translate(DICTIONARIES, "ru", messageKey, messageParams),
  );
  assert.equal(actual, expected, `refusal ${code} did not localize`);
}
const levelUpBuilderRefusalCases = [
  ["LEVEL_UP_CHARACTER_DEAD", "charSheet.levelUp.block.dead", { name: "Corin" }, "Corin мёртв. Мёртвые персонажи не получают уровни."],
  ["LEVEL_UP_CHARACTER_ZERO_HP", "charSheet.levelUp.block.zeroHp", { name: "Corin" }, "У Corin 0 хитов. Повысить уровень можно, когда персонаж снова сможет действовать."],
  ["LEVEL_UP_MAX_LEVEL", "charSheet.levelUp.block.maxLevel", {}, "Уровень персонажа не может превышать 20."],
  ["LEVEL_UP_WRONG_SEQUENCE", "charSheet.levelUp.error.wrongSequence", { name: "Corin", level: 3, nextLevel: 4 }, "Corin сейчас на 3-м уровне; следующий — 4-й. Повышать уровень можно только по одному."],
  ["LEVEL_UP_XP_REQUIRED", "charSheet.levelUp.block.xp", { name: "Corin", level: 2, required: 300, current: 0 }, "Для 2-го уровня требуется 300 опыта, а у Corin сейчас 0. Уровень получают за игру или по решению ведущего."],
  ["LEVEL_UP_UNKNOWN_CLASS", "charSheet.levelUp.error.unknownClass", {}, "Запрошенный класс недоступен."],
  ["LEVEL_UP_MULTICLASS_DISABLED", "charSheet.levelUp.error.multiclassDisabled", {}, "Мультиклассирование отключено в настройках этой кампании."],
  ["LEVEL_UP_SUBCLASS_ALREADY_SET", "charSheet.levelUp.error.subclassAlreadySet", { name: "Corin", subclass: "Champion" }, "У персонажа Corin уже выбран подкласс «Champion». Подкласс выбирают только один раз."],
  ["LEVEL_UP_SUBCLASS_TOO_EARLY", "charSheet.levelUp.error.subclassTooEarly", { className: "Fighter", classLevel: 2, requiredLevel: 3 }, "Класс «Fighter» получает подкласс на 3-м уровне класса. Сейчас уровень класса — 2."],
  ["LEVEL_UP_SUBCLASS_NOT_OFFERED", "charSheet.levelUp.error.subclassNotOffered", { subclass: "Storm", className: "Wizard" }, "Подкласс «Storm» недоступен для класса «Wizard»."],
];
for (const [code, key, params, expected] of levelUpBuilderRefusalCases) {
  assert.ok(key in DICTIONARIES.en, `English level-up builder refusal missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian level-up builder refusal missing: ${key}`);
  const actual = refusalText(
    { error: "legacy English text", errorCode: code, errorParams: params },
    "fallback",
    (messageKey, messageParams) => translate(DICTIONARIES, "ru", messageKey, messageParams),
  );
  assert.equal(actual, expected, `level-up builder refusal ${code} did not localize`);
}
const levelUpChoiceRefusalCases = [
  ["LEVEL_UP_ABILITY_LOWERED", "charSheet.levelUp.error.abilityLowered", { ability: "str", current: 16, requested: 15 }, "Улучшение характеристик не может уменьшать значение Сила с 16 до 15. Оно позволяет только повышать характеристики."],
  ["LEVEL_UP_ABILITY_CAP", "charSheet.levelUp.error.abilityCap", { ability: "str", maximum: 20 }, "Улучшение характеристик не позволяет повысить Сила выше 20."],
  ["LEVEL_UP_ASI_TOO_MANY", "charSheet.levelUp.error.asiTooMany", { name: "Corin", owed: 1, requested: 2 }, "На этом уровне персонажу Corin положено вариантов улучшения характеристик: 1. Получено вариантов: 2."],
  ["LEVEL_UP_ASI_NOT_GRANTED", "charSheet.levelUp.error.asiNotGranted", { classLevel: 2 }, "2-й уровень класса не даёт улучшения характеристик."],
  ["LEVEL_UP_FEAT_ALREADY_TAKEN", "charSheet.levelUp.error.featAlreadyTaken", { name: "Corin", feat: "Lucky" }, "У персонажа Corin уже есть черта «Lucky». Каждую черту можно выбрать только один раз."],
  ["LEVEL_UP_FEAT_NOT_OFFERED", "charSheet.levelUp.error.featNotOffered", { feat: "Lucky" }, "Черта «Lucky» недоступна в этой кампании."],
  ["LEVEL_UP_FEAT_PREREQUISITE", "charSheet.levelUp.error.featPrerequisite", { name: "Corin", feat: "Lucky" }, "Персонаж Corin не выполняет предварительные условия для черты «Lucky»."],
  ["LEVEL_UP_EXPERTISE_TOO_MANY", "charSheet.levelUp.error.expertiseTooMany", { name: "Corin", slots: 1, held: 1, requested: 1 }, "Персонажу Corin положено вариантов экспертизы: 1; уже выбрано: 1. Нельзя добавить ещё 1."],
  ["LEVEL_UP_EXPERTISE_NOT_AVAILABLE", "charSheet.levelUp.error.expertiseNotAvailable", {}, "На текущих уровнях классов персонажу не положен выбор экспертизы."],
  ["LEVEL_UP_EXPERTISE_REQUIRES_PROFICIENCY", "charSheet.levelUp.error.expertiseProficiency", { name: "Corin", skills: "perception" }, "Экспертиза требует владения навыком. У персонажа Corin нет владения: perception."],
  ["LEVEL_UP_FIGHTING_STYLE_NOT_OFFERED", "charSheet.levelUp.error.fightingStyleNotOffered", { name: "Corin", style: "Great Weapon Fighting" }, "Классы персонажа Corin не предлагают боевой стиль «Great Weapon Fighting»."],
];
for (const [code, key, params, expected] of levelUpChoiceRefusalCases) {
  assert.ok(key in DICTIONARIES.en, `English level-up choice refusal missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian level-up choice refusal missing: ${key}`);
  const actual = refusalText(
    { error: "legacy English text", errorCode: code, errorParams: params },
    "fallback",
    (messageKey, messageParams) => translate(DICTIONARIES, "ru", messageKey, messageParams),
  );
  assert.equal(actual, expected, `level-up choice refusal ${code} did not localize`);
}

const tableViewMessages = [
  "campaign.tableView.error.memberOnly",
  "campaign.tableView.backToCampaigns",
  "campaign.tableView.backToTable",
  "campaign.session.formation.removeFromFormation",
];
for (const key of tableViewMessages) {
  assert.ok(key in DICTIONARIES.en, `English table-view message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian table-view message missing: ${key}`);
}

const marketErrorMessages = [
  "campaign.market.error.shopOutOfReach",
  "campaign.market.error.shopOutOfReachNoPlace",
  "campaign.market.error.shopAtPlace",
  "campaign.market.error.nothingChanged",
  "campaign.market.error.nothingRolled",
  "campaign.market.error.characterUnavailable",
  "campaign.market.error.reason.dead",
  "campaign.market.error.reason.turned",
  "campaign.market.error.reason.down",
  "campaign.market.error.reason.condition",
  "campaign.market.error.condition.incapacitated",
  "campaign.market.error.condition.paralyzed",
  "campaign.market.error.condition.stunned",
  "campaign.market.error.condition.unconscious",
  "campaign.market.error.condition.petrified",
  "campaign.market.error.action.buy",
  "campaign.market.error.action.sell",
  "campaign.market.error.action.haggle",
  "campaign.market.error.itemNotStocked",
  "campaign.market.error.itemNotStockedEmpty",
  "campaign.market.error.stockQuantity",
  "campaign.market.error.insufficientFunds",
  "campaign.market.error.carryingCapacity",
  "campaign.market.error.shopDoesNotBuy",
  "campaign.market.error.itemNotCarried",
  "campaign.market.error.unknownItem",
  "campaign.market.error.nothingCarried",
  "campaign.market.error.magicItemNotAccepted",
  "campaign.market.error.haggleAlreadyUsed",
  "campaign.market.error.deceptionAlreadyUsed",
  "campaign.market.error.companionUnavailable",
  "campaign.market.error.invalidHaggleSkill",
  "campaign.market.error.haggleCheckUnavailable",
  "campaign.market.error.characterMissing",
  "campaign.market.error.shopMissing",
  "campaign.market.error.noCharacter",
  "campaign.market.error.invalidTradeAction",
];
for (const key of marketErrorMessages) {
  assert.ok(key in DICTIONARIES.en, `English market refusal message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian market refusal message missing: ${key}`);
  assert.notEqual(translate(DICTIONARIES, "ru", key), key, `Russian market refusal message fell back to its key: ${key}`);
}

const campaignRulesMessages = [
  "campaign.session.rules.houseRules",
  "campaign.session.rules.loading",
  "campaign.session.rules.noneSet",
  "campaign.session.rules.loadFailed",
  "campaign.session.rules.invalidSettings",
  "campaign.session.rules.houseRulesPlaceholder",
  "campaign.session.rules.houseRulesAria",
  "campaign.session.rules.save",
  "campaign.session.rules.saving",
  "campaign.session.rules.unsaved",
  "campaign.session.rules.saveFailed",
  "campaign.session.rules.changeFailed",
  "campaign.session.rules.network",
  "campaign.session.rules.restHint",
  "campaign.session.rules.noVariants",
  "campaign.session.rules.sections",
  "campaign.session.rules.sectionsHint",
  "campaign.session.rules.section.disable",
  "campaign.session.rules.section.enable",
  "campaign.session.rules.section.pin",
  "campaign.session.rules.section.unpin",
  "campaign.session.prep.aria",
  "createCampaign.experience.variantRules.title",
  "createCampaign.experience.variantRules.restLengths",
  "createCampaign.experience.variantRules.on",
  "createCampaign.experience.variantRules.off",
  "createCampaign.experience.variantRules.flanking.label",
  "createCampaign.experience.variantRules.flanking.tip",
  "createCampaign.experience.variantRules.criticalFumbles.label",
  "createCampaign.experience.variantRules.criticalFumbles.tip",
  "createCampaign.experience.variantRules.encumbrance.label",
  "createCampaign.experience.variantRules.encumbrance.tip",
  "createCampaign.experience.variantRules.lingeringInjuries.label",
  "createCampaign.experience.variantRules.lingeringInjuries.tip",
  "createCampaign.experience.variantRules.powerfulCritical.label",
  "createCampaign.experience.variantRules.powerfulCritical.tip",
  "createCampaign.experience.variantRules.criticalDamageMods.label",
  "createCampaign.experience.variantRules.criticalDamageMods.tip",
  "createCampaign.experience.variantRules.ammunition.label",
  "createCampaign.experience.variantRules.ammunition.tip",
  "createCampaign.experience.variantRules.supplies.label",
  "createCampaign.experience.variantRules.supplies.tip",
  "createCampaign.experience.variantRules.rest.standard",
  "createCampaign.experience.variantRules.rest.gritty",
  "createCampaign.experience.variantRules.rest.heroic",
];
for (const key of campaignRulesMessages) {
  assert.ok(key in DICTIONARIES.en, `English campaign-rules message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian campaign-rules message missing: ${key}`);
}

const mapApiErrorMessages = [
  "campaign.mapPanel.error.locationNotFound",
  "campaign.mapPanel.error.imageNotUploaded",
  "campaign.mapPanel.error.imageModelUnavailable",
  "campaign.mapPanel.error.uploadInvalid",
  "campaign.mapPanel.error.uploadUnsupportedType",
  "campaign.mapPanel.error.uploadTooLarge",
  "campaign.mapPanel.error.uploadDimensionsTooLarge",
];
for (const key of mapApiErrorMessages) {
  assert.ok(key in DICTIONARIES.en, `English map API error message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian map API error message missing: ${key}`);
}

const mapPopulateMessages = [
  "campaign.mapPanel.populate.alreadyPopulated",
  "campaign.mapPanel.populate.placeNotFound",
];
for (const key of mapPopulateMessages) {
  assert.ok(key in DICTIONARIES.en, `English map-population message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian map-population message missing: ${key}`);
}

const dmSquarePickMessages = [
  "campaign.dmSquarePick.absent",
  "campaign.dmSquarePick.armed",
  "campaign.dmSquarePick.stop",
  "campaign.dmSquarePick.pick",
];
for (const key of dmSquarePickMessages) {
  assert.ok(key in DICTIONARIES.en, `English battlemap square-pick message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian battlemap square-pick message missing: ${key}`);
}

const messageContentMessages = [
  "campaign.session.messageContent.illustrationFailed",
  "campaign.session.messageContent.waitingForRender",
];
for (const key of messageContentMessages) {
  assert.ok(key in DICTIONARIES.en, `English message-content message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian message-content message missing: ${key}`);
}

const messageActionMessages = [
  "campaign.session.messages.uploadFailed",
  "campaign.session.messages.pictureAttachFailed",
  "campaign.session.messages.gameMaster",
  "campaign.session.messages.gameMasterOoc",
  "campaign.session.messages.messageActions",
  "campaign.session.messages.reroll",
  "campaign.session.messages.rerollLabel",
  "campaign.session.messages.rerollHint",
  "campaign.session.messages.continueScene",
  "campaign.session.messages.continueSceneLabel",
  "campaign.session.messages.continueSceneHint",
  "campaign.session.messages.edit",
  "campaign.session.messages.editLabel",
  "campaign.session.messages.editHint",
  "campaign.session.messages.pinMemory",
  "campaign.session.messages.pinMemoryLabel",
  "campaign.session.messages.pinMemoryHint",
  "campaign.session.messages.loreCheck",
  "campaign.session.messages.loreCheckLabel",
  "campaign.session.messages.loreCheckHint",
  "campaign.session.messages.addFacts",
  "campaign.session.messages.addFactsLabel",
  "campaign.session.messages.addFactsHint",
  "campaign.session.messages.replacePicture",
  "campaign.session.messages.addPicture",
  "campaign.session.messages.replacePictureHint",
  "campaign.session.messages.addPictureHint",
  "campaign.session.messages.readAloud",
  "campaign.session.messages.readAloudLabel",
  "campaign.session.messages.readAloudHint",
  "campaign.session.messages.previousTake",
  "campaign.session.messages.nextTake",
  "campaign.session.messages.passageActions",
  "campaign.session.messages.scene",
  "campaign.session.messages.illustrating",
  "campaign.session.messages.trying",
  "campaign.session.messages.tryAgain",
  "campaign.session.messages.mapOf",
  "campaign.session.messages.chartingArea",
];
for (const key of messageActionMessages) {
  assert.ok(key in DICTIONARIES.en, `English message-action message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian message-action message missing: ${key}`);
}

const battleMapPanelMessages = [
  "campaign.session.battle.health.unharmed",
  "campaign.session.battle.health.hurt",
  "campaign.session.battle.health.bloodied",
  "campaign.session.battle.health.badlyHurt",
  "campaign.session.battle.health.critical",
  "campaign.session.battle.health.down",
  "campaign.session.battle.edge.noLineOfSight",
  "campaign.session.battle.edge.cover",
  "campaign.session.battle.edge.flanked",
  "campaign.session.battle.edge.rangedDisadvantage",
  "campaign.session.battle.areaCaught",
  "campaign.session.battle.measured",
  "campaign.session.battle.error.initiativeMustBeInRange",
  "campaign.session.battle.undoMoveAction",
  "campaign.session.battle.roundLabel",
  "campaign.session.battle.currentTurnName",
  "campaign.session.battle.yourOrdersFor",
  "campaign.session.battle.ariaYourOrdersFor",
  "campaign.session.battle.ariaYourTurn",
  "campaign.session.battle.ariaTurnFor",
  "campaign.session.battle.enemyTurnsDue",
  "campaign.session.battle.acted",
  "campaign.session.battle.extraTurn.extraNow",
  "campaign.session.battle.extraTurn.thiefReflex",
  "campaign.session.battle.extraTurn.extraTurn",
  "campaign.session.battle.extraTurn.shortSecond",
  "campaign.session.battle.extraTurn.shortExtra",
];
for (const key of battleMapPanelMessages) {
  assert.ok(key in DICTIONARIES.en, `English battle-map message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian battle-map message missing: ${key}`);
}

const messageAndMomentsMessages = [
  "common.gameMaster",
  "campaign.session.messageItem.speakerThroughGm",
  "campaign.session.dmStatus.thinking.1",
  "campaign.session.dmStatus.thinking.2",
  "campaign.session.dmStatus.thinking.3",
  "campaign.session.dmStatus.thinking.4",
  "campaign.session.dmStatus.thinking.5",
  "campaign.session.dmStatus.thinking.6",
  "campaign.session.dmStatus.thinking.7",
  "campaign.session.dmStatus.rolling.1",
  "campaign.session.dmStatus.rolling.2",
  "campaign.session.dmStatus.rolling.3",
  "campaign.session.dmStatus.rolling.4",
  "campaign.session.dmStatus.rolling.5",
  "campaign.session.dmStatus.rolling.6",
  "campaign.session.dmStatus.rolling.7",
  "campaign.session.dmStatus.awaitingRolls.1",
  "campaign.session.dmStatus.awaitingRolls.2",
  "campaign.session.dmStatus.awaitingRolls.3",
  "campaign.session.dmStatus.awaitingRolls.4",
  "campaign.session.dmStatus.awaitingRolls.5",
  "campaign.session.dmStatus.awaitingRolls.6",
  "campaign.session.dmStatus.narrating.1",
  "campaign.session.dmStatus.narrating.2",
  "campaign.session.dmStatus.narrating.3",
  "campaign.session.dmStatus.narrating.4",
  "campaign.session.dmStatus.narrating.5",
  "campaign.session.dmStatus.narrating.6",
  "campaign.session.dmStatus.writingChapter.1",
  "campaign.session.dmStatus.writingChapter.2",
  "campaign.session.dmStatus.writingChapter.3",
  "campaign.session.dmStatus.writingChapter.4",
  "campaign.session.dmStatus.writingChapter.5",
  "campaign.session.dmStatus.writingChapter.6",
  "campaign.session.dmStatus.plottingArc.1",
  "campaign.session.dmStatus.plottingArc.2",
  "campaign.session.dmStatus.plottingArc.3",
  "campaign.session.dmStatus.plottingArc.4",
  "campaign.session.dmStatus.plottingArc.5",
  "campaign.session.dmStatus.plottingArc.6",
  "campaign.session.moments.levelUp",
  "campaign.session.moments.reachesLevel",
  "campaign.session.moments.dismiss",
  "campaign.session.moments.rest.long",
  "campaign.session.moments.rest.short",
  "campaign.session.moments.rest.fullyRestored",
  "campaign.session.moments.rest.hitPoints",
  "campaign.session.moments.rest.rested",
  "campaign.session.moments.rest.returnToTable",
  "campaign.session.moments.loot.treasure",
  "campaign.session.moments.loot.rare",
  "campaign.session.moments.loot.added",
  "campaign.session.moments.travel.discovered",
  "campaign.session.moments.travel.partyArrives",
];
for (const key of messageAndMomentsMessages) {
  assert.ok(key in DICTIONARIES.en, `English message/moment message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian message/moment message missing: ${key}`);
}

const narrationAndMapLabelMessages = [
  "campaign.session.inlineMessageEditor.label",
  "campaign.session.inlineMessageEditor.save",
  "campaign.session.inlineMessageEditor.cancel",
  "campaign.session.inlineMessageEditor.keyboardHint",
  "campaign.session.labelSheet.loading",
  "campaign.session.labelSheet.missing",
];
for (const key of narrationAndMapLabelMessages) {
  assert.ok(key in DICTIONARIES.en, `English narration/map-label message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian narration/map-label message missing: ${key}`);
}

const encounterDeployMessages = ["campaign.session.encounterPrep.deploy"];
for (const key of encounterDeployMessages) {
  assert.ok(key in DICTIONARIES.en, `English encounter deploy message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian encounter deploy message missing: ${key}`);
}

const dmBestiaryMessages = [
  "campaign.dmBestiary.loadWhat",
  "campaign.dmBestiary.sourceUnavailable",
  "campaign.dmBestiary.createFailed",
  "campaign.dmBestiary.saveFailed",
  "campaign.dmBestiary.linkedWorldEntries",
  "campaign.dmBestiary.confirmForget",
  "campaign.dmBestiary.confirmForgetTitle",
  "campaign.dmBestiary.confirmForgetAction",
  "campaign.dmBestiary.deleteFailed",
  "campaign.dmBestiary.network",
  "campaign.dmBestiary.buildTitle",
  "campaign.dmBestiary.monsterTitle",
  "campaign.dmBestiary.loading",
  "campaign.dmBestiary.yourMonsters",
  "campaign.dmBestiary.empty",
  "campaign.dmBestiary.closeStatBlock",
  "campaign.dmBestiary.openStatBlock",
  "campaign.dmBestiary.duplicate",
  "campaign.dmBestiary.delete",
];
for (const key of dmBestiaryMessages) {
  assert.ok(key in DICTIONARIES.en, `English DM bestiary message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian DM bestiary message missing: ${key}`);
}

const eventLogRevertMessages = [
  "campaign.session.eventLog.revertTurn",
  "campaign.session.eventLog.revertTurnCount",
];
for (const key of eventLogRevertMessages) {
  assert.ok(key in DICTIONARIES.en, `English event-log revert message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian event-log revert message missing: ${key}`);
}

const npcGraphMessages = [
  "campaign.dmNpcForge.graph.empty",
  "campaign.dmNpcForge.graph.aria",
  "campaign.dmNpcForge.graph.openNode",
  "campaign.dmNpcForge.graph.unwrittenNode",
  "campaign.dmNpcForge.graph.edge.close",
  "campaign.dmNpcForge.graph.edge.friendly",
  "campaign.dmNpcForge.graph.edge.hates",
  "campaign.dmNpcForge.graph.edge.wary",
  "campaign.dmNpcForge.graph.edge.knows",
];
for (const key of npcGraphMessages) {
  assert.ok(key in DICTIONARIES.en, `English NPC graph message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian NPC graph message missing: ${key}`);
}

const renarrateMessages = [
  "campaign.session.renarrate.title",
  "campaign.session.renarrate.description",
  "campaign.session.renarrate.capped",
  "campaign.session.renarrate.variation",
  "campaign.session.renarrate.temperatureLabel",
  "campaign.session.renarrate.guidance",
  "campaign.session.renarrate.placeholder",
  "campaign.session.renarrate.preset.darker",
  "campaign.session.renarrate.preset.dialogue",
  "campaign.session.renarrate.preset.shorter",
  "campaign.session.renarrate.preset.sensory",
  "campaign.session.renarrate.cancel",
  "campaign.session.renarrate.writing",
  "campaign.session.renarrate.submit",
  "campaign.session.renarrate.error.generic",
  "campaign.session.renarrate.error.network",
  "campaign.session.renarrate.error.campaignNotFound",
  "campaign.session.renarrate.error.messageNotFound",
  "campaign.session.renarrate.error.notDmNarration",
  "campaign.session.renarrate.error.noTurn",
  "campaign.session.renarrate.error.turnNotFound",
  "campaign.session.renarrate.error.noConversation",
  "campaign.session.renarrate.error.variantsCapped",
  "campaign.session.renarrate.error.modelUnavailable",
  "campaign.session.renarrate.error.emptyNarration",
  "campaign.session.renarrate.error.storeFailed",
  "campaign.session.renarrate.error.variantNotFound",
  "campaign.session.renarrate.error.selectFailed",
  "campaign.session.renarrate.error.invalidSelect",
  "campaign.session.renarrate.error.invalidReroll",
  "campaign.session.renarrate.error.notLatest",
  "campaign.session.renarrate.error.dmBusy",
  "campaign.session.renarrate.error.sessionHeld",
];
for (const key of renarrateMessages) {
  assert.ok(key in DICTIONARIES.en, `English narration-reroll message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian narration-reroll message missing: ${key}`);
}
const placePartOfMessages = [
  "campaign.overworld.placePartOf.title",
  "campaign.overworld.placePartOf.description",
  "campaign.overworld.placePartOf.aria",
  "campaign.overworld.placePartOf.ownPlace",
  "campaign.overworld.placePartOf.partOf",
  "campaign.overworld.placePartOf.addParentHint",
  "campaign.overworld.placePartOf.error.generic",
  "campaign.overworld.placePartOf.error.serverTooOld",
  "campaign.overworld.placePartOf.error.network",
];
for (const key of placePartOfMessages) {
  assert.ok(key in DICTIONARIES.en, `English place-parent message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian place-parent message missing: ${key}`);
}

const sharedComponentMessages = [
  "common.actionsFor",
  "hotkeyOverlay.title", "hotkeyOverlay.footer",
  "voicePicker.serverDefault", "voicePicker.serverDefaultVoice", "voicePicker.custom", "voicePicker.customHint", "voicePicker.customAria",
  "rulebook.title",
  "rulebook.edition",
  "rulebook.fifthEdition",
  "rulebook.search.placeholder",
  "rulebook.search.aria",
  "rulebook.search.clear",
  "rulebook.search.first40",
  "rulebook.search.results.one",
  "rulebook.search.results.other",
  "rulebook.search.results.few",
  "rulebook.search.results.many",
  "rulebook.search.noResults",
  "rulebook.search.turning",
  "rulebook.search.opening",
  "rulebook.section.atTable",
  "rulebook.section.bookmarks",
  "rulebook.section.contents",
  "rulebook.bookNumber",
  "rulebook.legalNotice",
  "rulebook.legalInformation",
  "rulebook.contentsAndSearch",
  "rulebook.error.contents",
  "rulebook.tryAgain",
  "rulebook.error.pageNotFound",
  "rulebook.previousPage",
  "rulebook.nextPage",
  "rulebook.removeBookmark",
  "rulebook.bookmarkPage",
  "rulebook.openBook",
  "rulebook.frontispiece.summary",
  "rulebook.frontispiece.books",
  "rulebook.frontispiece.navigation",
  "rulebook.beginAtChapterOne",
  "rulebook.close",
  "rulebook.support.engine",
  "rulebook.support.structured",
  "rulebook.support.editable",
  "rulebook.support.reference",
  "rulebook.prep.makeWorkshopFirst",
  "rulebook.prep.writeSubclass",
  "rulebook.prep.startCopy",
  "rulebook.where.halfDragonTemplate",
  "rulebook.where.customizingNpcs",
  "rulebook.where.racialTraits",
  "rulebook.where.beyondFirstLevel",
  "rulebook.where.multiclassing",
  "rulebook.where.alignment",
  "rulebook.where.languages",
  "rulebook.where.inspiration",
  "rulebook.where.backgrounds",
  "rulebook.where.coinage",
  "rulebook.where.sellingTreasure",
  "rulebook.where.armor",
  "rulebook.where.weapons",
  "rulebook.where.adventuringGear",
  "rulebook.where.tools",
  "rulebook.where.mountsAndVehicles",
  "rulebook.where.tradeGoods",
  "rulebook.where.expenses",
  "rulebook.where.feats",
  "rulebook.where.abilityScores",
  "rulebook.where.adventuring",
  "rulebook.where.combat",
  "rulebook.where.spellcasting",
  "rulebook.where.spellLists",
  "rulebook.where.traps",
  "rulebook.where.diseases",
  "rulebook.where.madness",
  "rulebook.where.objects",
  "rulebook.where.poisons",
  "rulebook.where.magicItems",
  "rulebook.where.sentientMagicItems",
  "rulebook.where.artifacts",
  "rulebook.where.monsterStatistics",
  "rulebook.where.nonplayerCharacters",
  "rulebook.where.conditions",
  "rulebook.where.gods",
  "rulebook.where.planes",
  "rulebook.where.legalInformation",
  "rulebook.where.spellEngine",
  "rulebook.where.spellEditable",
  "rulebook.where.itemEngine",
  "rulebook.where.itemEditable",
  "rulebook.where.monster",
  "rulebook.where.race",
  "rulebook.where.class",
  "rulebook.template.ammunitionFamily",
  "rulebook.template.armorFamily",
  "rulebook.template.shieldFamily",
  "numberStepper.lower", "numberStepper.raise",
  "markdown.roll", "markdown.targetType.lore", "markdown.targetType.npc", "markdown.targetType.place", "markdown.targetType.map",
  "markdown.unresolvedLink", "markdown.onlyGmReads",
  "diamondStepper.steps", "diamondStepper.backToStep", "diamondStepper.goToStep", "diamondStepper.step",
  "imageLightbox.enlarge", "imageLightbox.download", "imageLightbox.close",
  "dialog.close",
  "about.title", "about.error.load", "about.loading", "about.version", "about.serverName",
  "about.row.build", "about.row.commit", "about.row.built", "about.row.updateChannel", "about.row.checkedAt",
  "about.update.off.deviceWorld", "about.update.off.server", "about.update.unknown",
  "about.update.kind.stable", "about.update.kind.beta", "about.update.kind.release",
  "about.update.available", "about.update.whatsNew", "about.update.ownerUpdates", "about.update.ahead", "about.update.current",
  "about.build.unknown", "about.build.release", "about.build.changes", "about.build.basedOn", "about.build.development", "about.build.localChanges",
  "about.copy.copied", "about.copy.bugReport", "about.copy.details", "about.checkAgain", "about.server.connected",
  "about.releaseNotes", "about.reportProblem", "about.tellHost",
  "report.title", "report.error.options", "report.error.make", "report.error.save", "report.saved", "report.where.device",
  "report.openForm", "report.done", "report.description", "report.checkFirst.title", "report.checkFirst.hint",
  "report.file.contents", "report.loading", "report.cancel", "report.save",
  "report.part.setup.label", "report.part.setup.hint", "report.part.pageErrors.label", "report.part.pageErrors.hint",
  "report.part.turnTimings.label", "report.part.turnTimings.hint", "report.part.serverLog.label", "report.part.serverLog.hint",
  "report.part.transcript.label", "report.part.transcript.hint", "report.part.turnRecords.label", "report.part.turnRecords.hint",
  "commandPalette.title", "commandPalette.placeholder", "commandPalette.chip", "commandPalette.open",
  "commandPalette.shortcut", "commandPalette.close", "commandPalette.empty", "commandPalette.move", "commandPalette.run", "commandPalette.count",
  "deviceSettings.systemDefault", "deviceSettings.microphone.fallback", "deviceSettings.output.fallback",
  "deviceSettings.microphone.open", "deviceSettings.microphone.ptt", "deviceSettings.microphone.title", "deviceSettings.microphone.description",
  "deviceSettings.microphone.recordingDevice", "deviceSettings.microphone.allowAccess", "deviceSettings.microphone.recordingLevel",
  "deviceSettings.microphone.stopTest", "deviceSettings.microphone.test", "deviceSettings.microphone.mode",
  "deviceSettings.microphone.modePtt", "deviceSettings.microphone.dictationKey",
  "deviceSettings.playback.title", "deviceSettings.playback.description", "deviceSettings.playback.device", "deviceSettings.playback.test",
  "deviceSettings.playback.systemSettings", "deviceSettings.playback.voiceChat", "deviceSettings.playback.narration",
  "deviceSettings.playback.narrationReadAloud", "deviceSettings.playback.ambience", "deviceSettings.playback.room", "deviceSettings.playback.music",
  "deviceSettings.dice.title", "deviceSettings.dice.roll3d", "deviceSettings.dice.shake", "deviceSettings.dice.shakeHint", "deviceSettings.dice.physical",
  "deviceSettings.effects.title", "deviceSettings.effects.full", "deviceSettings.effects.lowAuto", "deviceSettings.effects.auto",
  "deviceSettings.effects.manual", "deviceSettings.effects.choose", "deviceSettings.effects.paintedMaps",
  "deviceSettings.effects.paintedMapsHint", "deviceSettings.effects.chime",
  "deletionBanner.message", "deletionBanner.error", "deletionBanner.keep",
  "assistantLink.title", "assistantLink.copyLabel", "assistantLink.hint",
  "correction.announce.saved", "correction.announce.prompt", "correction.group.aria", "correction.saved",
  "correction.prompt", "correction.reason.wrongRule", "correction.reason.wrongNumber", "correction.reason.wrongTarget",
  "correction.reason.story", "correction.reason.changedMind", "correction.close",
  "campaignCover.alt", "campaignCover.emptyAlt", "campaignCover.loading",
  "handout.found", "handout.source", "handout.openPages", "handout.download", "handout.takeDown", "handout.foldAway",
  "pageSkeleton.loadingTable", "pageSkeleton.loading",
  "serverAddress.dialog.aria", "serverAddress.eyebrow", "serverAddress.close", "serverAddress.preparing",
  "serverAddress.copied", "serverAddress.copy", "serverAddress.share", "serverAddress.description",
  "serverAddress.hide", "serverAddress.show", "serverAddress.title", "serverAddress.qrAlt",
  "agentConnect.programLabel", "agentConnect.program.other", "agentConnect.copyThis", "agentConnect.copyLabel",
  "agentConnect.where.claude", "agentConnect.where.codex", "agentConnect.where.opencode", "agentConnect.where.other",
  "agentConnect.askExample", "agentConnect.example", "agentConnect.connected", "agentConnect.firstCall",
  "agentConnect.arrived", "agentConnect.at", "agentConnect.noCall", "agentConnect.waiting",
  "voicePreview.tooltip", "voicePreview.aria", "voicePreview.error.playback", "voicePreview.error.unknown",
  "voicePreview.error.narrationOff", "voicePreview.error.limit",
  "worldPackGallery.places", "worldPackGallery.factions",
  "confirmDialog.areYouSure", "confirmDialog.yes", "confirmDialog.cancel", "confirmDialog.noticeTitle", "confirmDialog.ok",
  "promptDialog.save", "promptDialog.cancel",
  "dateTimePicker.placeholder", "dateTimePicker.earlierMonth", "dateTimePicker.laterMonth",
  "dateTimePicker.hour", "dateTimePicker.minute", "select.placeholder",
  "infoDialog.armor", "infoDialog.weapon", "infoDialog.description",
  "infoDialog.loading", "infoDialog.noDescription", "infoDialog.noDetails", "infoDialog.requiresAttunement",
  "infoDialog.chipHint",
  "infoDialog.magicBonus", "infoDialog.weight", "infoDialog.value", "infoDialog.acBonus", "infoDialog.armorClass",
  "infoDialog.damage", "infoDialog.none", "infoDialog.range", "infoDialog.shield", "infoDialog.shieldNote",
  "infoDialog.dexterity", "infoDialog.strength", "infoDialog.strengthRequired", "infoDialog.strengthNone",
  "infoDialog.stealth", "infoDialog.stealthDisadvantage", "infoDialog.stealthNone",
  "infoDialog.weaponBonusLabel", "infoDialog.weaponBonusNote", "infoDialog.noDamageLabel", "infoDialog.noDamageNote", "infoDialog.whatIs",
  "infoDialog.contentBestEffort", "infoDialog.contentNeeds.one", "infoDialog.contentNeeds.many", "infoDialog.contentNeeds.leyLines",
  "infoDialog.need.strife", "infoDialog.need.fatigue", "infoDialog.need.rattled", "infoDialog.need.expertiseDice",
  "infoDialog.need.exertion", "infoDialog.need.maneuvers", "infoDialog.need.bloodied", "infoDialog.need.leyLines",
  "diceLook.preview.webgl", "diceLook.startFrom", "diceLook.preset.aria",
  "diceLook.color.face", "diceLook.color.numbers", "diceLook.outline.label", "diceLook.outline.aria",
  "diceLook.outline.toggle", "diceLook.pattern", "diceLook.finish", "diceLook.accountHint", "diceLook.reset",
  "diceLook.dialog.title", "diceLook.button.title", "diceLook.button.customize", "diceLook.summary.ownColours",
  "diceLook.summary.presetDice", "diceLook.summary.pattern", "diceLook.summary.finish",
  "diceLook.summary.done", "diceLook.summary.customize",
  ...["radiant", "fire", "ice", "poison", "acid", "thunder", "air", "water", "earth", "force", "necrotic", "bloodmoon", "starrynight", "glitterparty", "astralsea", "dragon", "bronze", "onyx", "ivory"].map((id) => `diceLook.preset.${id}`),
  ...["none", "paper", "marble", "cloudy", "speckles", "glitter", "stars", "stainedglass", "wood", "metal", "fire", "ice", "water", "astral", "skulls", "dragon", "leopard"].map((id) => `diceLook.texture.${id}`),
  ...["plastic", "glass", "metal", "wood", "none"].map((id) => `diceLook.material.${id}`),
  "dictate.defaultLabel", "dictate.aria.finish", "dictate.aria.start", "dictate.title.finish", "dictate.title.start",
  "dictate.waitingMicrophone", "dictate.stopsAt", "dictate.listening", "dictate.discard", "dictate.transcribing",
  "dictate.transcribingPart", "dictate.dismiss",
  "dictate.error.noWords", "dictate.error.partial", "dictate.error.server", "dictate.error.generic",
  "dictate.error.device", "dictate.error.deviceUnavailable", "dictate.error.noService", "dictate.error.https",
  "dictate.error.unsupportedMic", "dictate.error.recordingUnsupported", "dictate.error.microphonePermission",
  "dictate.error.missingAudio", "dictate.error.recordingTooLong", "dictate.error.speechServiceFailed",
  "dictate.error.speechServiceUnreachable", "dictate.error.audioFormat", "dictate.error.builtinFailed",
  "dictate.error.openAiKey", "dictate.error.openAiFailed", "dictate.error.openAiUnreachable",
  "dictationShortcut.pressKeys", "dictationShortcut.none", "dictationShortcut.cancel", "dictationShortcut.change",
  "dictationShortcut.set", "dictationShortcut.clear", "dictationShortcut.saved", "dictationShortcut.hint.listening", "dictationShortcut.hint.idle",
  "dictationShortcut.problem.system", "dictationShortcut.problem.ptt", "dictationShortcut.problem.editing",
  "dictationShortcut.problem.reservedFunction", "dictationShortcut.problem.closeWindow", "dictationShortcut.problem.typing",
  "dictationShortcut.problem.browserShortcut", "dictationShortcut.problem.browserMenu",
  "dictationShortcut.problem.desktopShortcut", "dictationShortcut.problem.altgrCharacter",
  "schedule.quickTimes", "schedule.quick.morning", "schedule.quick.afternoon", "schedule.quick.evening", "schedule.quick.late",
  "schedule.rsvp.going", "schedule.rsvp.maybe", "schedule.rsvp.out", "schedule.someone",
  "schedule.title", "schedule.plan", "schedule.when", "schedule.pickDate", "schedule.duration", "schedule.duration.selector",
  "schedule.title.label", "schedule.title.placeholder", "schedule.note.label", "schedule.note.placeholder", "schedule.create",
  "schedule.empty.title", "schedule.empty.hint", "schedule.cancelled", "schedule.move", "schedule.callOff",
  "schedule.newDate", "schedule.moveIt", "schedule.error.pickDate", "schedule.error.pickNewDate", "schedule.error.plan",
  "schedule.error.move", "schedule.error.network", "schedule.error.past", "schedule.error.invalid", "schedule.error.missing",
  "schedule.cancel.confirm",
  "report.checkFirst.updateAvailable", "report.checkFirst.noNarrator", "report.checkFirst.backendNeedsKey",
  "report.checkFirst.backendUnreachable", "report.checkFirst.modelMissing", "report.checkFirst.modelWarning",
  "report.checkFirst.backendTestFailed", "report.checkFirst.narratorAddressMissing", "report.checkFirst.ollamaCompatWindow",
  "report.checkFirst.windowAssumed", "report.checkFirst.windowShort", "report.checkFirst.windowNoFights",
  "report.checkFirst.windowTight", "report.checkFirst.modelTooSmall", "report.checkFirst.localMemoryLow",
  "report.checkFirst.agentNotConfigured", "report.checkFirst.agentUnavailable", "report.checkFirst.agentNotInstalled",
  "report.checkFirst.agentSignedOut", "report.checkFirst.pictureModelMissing", "report.checkFirst.pictureBackendUnreachable",
  "report.checkFirst.narrationModelMissing", "report.checkFirst.narrationServerUnreachable",
  "report.checkFirst.dictationModelMissing", "report.checkFirst.unknown",
];
for (const key of sharedComponentMessages) {
  assert.ok(key in DICTIONARIES.en, `English shared-component message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian shared-component message missing: ${key}`);
}
// Model catalog notes: every stable warning and summary part has an English and Russian label.
const modelNoteMessages = [
  "modelNote.warning.notListed",
  "modelNote.warning.noTools.story.server",
  "modelNote.warning.noTools.utility.server",
  "modelNote.warning.noTools.story.catalog",
  "modelNote.warning.noTools.utility.catalog",
  "modelNote.warning.tooBig",
  "modelNote.warning.unknownImageModel",
  "modelNote.warning.deprecated",
  "modelNote.warning.preRelease",
  "modelNote.warning.notImage",
  "modelNote.warning.notText",
  "modelNote.warning.localCatalogNoTools",
  "modelNote.warning.storyWindow.short",
  "modelNote.warning.storyWindow.noFights",
  "modelNote.warning.storyWindow.tight",
  "modelNote.warning.smallContext",
  "modelNote.summary.notInCatalog",
  "modelNote.summary.context",
  "modelNote.summary.paintsPictures",
  "modelNote.summary.toolCalls",
  "modelNote.summary.reasoning",
  "modelNote.summary.seesPictures",
  "modelNote.summary.openWeights",
  "modelNote.summary.free",
  "modelNote.summary.price",
  "modelNote.summary.status.deprecated",
  "modelNote.summary.status.beta",
  "modelNote.summary.status.alpha",
  "modelNote.summary.modelName",
  "modelNote.status.beta",
  "modelNote.status.alpha"
];
for (const key of modelNoteMessages) {
  assert.ok(key in DICTIONARIES.en, `English model-note message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian model-note message missing: ${key}`);
  const params = (value) => [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
  assert.deepEqual(params(DICTIONARIES.en[key]), params(DICTIONARIES.ru[key]), `Model-note placeholders differ: ${key}`);
}
assert.equal(translate(DICTIONARIES, "ru", "modelNote.warning.tooBig", { sizeGb: 24, budgetGb: 16 }), "Модель слишком велика для этого устройства: веса занимают 24 ГБ при доступном бюджете памяти 16 ГБ.");

// Rulebook search result count: the reader uses locale-aware plural forms.
for (const suffix of ["one", "other"]) {
  assert.ok(`rulebook.search.results.${suffix}` in DICTIONARIES.en, `English rulebook search plural missing: ${suffix}`);
}
for (const suffix of ["one", "few", "many", "other"]) {
  assert.ok(`rulebook.search.results.${suffix}` in DICTIONARIES.ru, `Russian rulebook search plural missing: ${suffix}`);
}
for (const count of [1, 2, 5]) {
  for (const lang of ["en", "ru"]) {
    const rendered = translatePlural(DICTIONARIES, lang, "rulebook.search.results", count);
    assert.ok(!rendered.includes("{count}"), `${lang} rulebook search count was not filled: ${count}`);
    assert.notEqual(rendered, "rulebook.search.results", `${lang} rulebook search plural fell back to its key: ${count}`);
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

// Campaign creation and update forms translate stable API refusals by code.
const campaignApiMessages = [
  "campaign.companionCommand.error.invalid",
  "campaign.companionCommand.error.notFound",
  "campaign.companionCommand.error.playerRequired",
  "createCampaign.dialog.error.adminOnly",
  "createCampaign.dialog.error.passwordChange",
  "createCampaign.dialog.error.invalidSettings",
  "createCampaign.identity.dm.missing",
  "campaign.editDialog.error.invalidUpdate",
  "campaign.editDialog.error.partyLead",
  "campaign.editDialog.error.ended",
  "campaign.editDialog.error.maxPlayers",
  "campaign.editDialog.error.ownerOrGm",
  "campaign.editDialog.error.alreadyStarted",
];
for (const key of campaignApiMessages) {
  assert.ok(key in DICTIONARIES.en, `English campaign API message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian campaign API message missing: ${key}`);
}

// Character bundle import: fixed format errors and sheet refusals are translated by code.
for (const key of ["characters.err.notFound"]) {
  assert.ok(key in DICTIONARIES.en, `English character message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian character message missing: ${key}`);
}

const characterImportMessages = [
  "characters.err.import.tooLarge",
  "characters.err.import.notCharacter",
  "characters.err.import.notOgm",
  "characters.err.import.invalidJson",
];
for (const key of characterImportMessages) {
  assert.ok(key in DICTIONARIES.en, `English character-import message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian character-import message missing: ${key}`);
}

// Hero route cards share their copy across the lobby, join page and mid-game gate.
const heroRouteMessages = [
  "campaign.session.heroRoutes.ready.title",
  "campaign.session.heroRoutes.ready.blurb",
  "campaign.session.heroRoutes.ready.badge",
  "campaign.session.heroRoutes.library.title",
  "campaign.session.heroRoutes.library.badge",
  "campaign.session.heroRoutes.library.line",
  "campaign.session.heroRoutes.library.line.empty",
  "campaign.session.heroRoutes.library.more",
  "campaign.session.heroRoutes.build.title",
  "campaign.session.heroRoutes.build.blurb",
];
for (const key of heroRouteMessages) {
  assert.ok(key in DICTIONARIES.en, `English hero-route message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian hero-route message missing: ${key}`);
}

// Campaign cover editing and image uploads use stable API codes for fixed errors.
const campaignCoverMessages = [
  "campaign.editDialog.cover.error.invalidImage",
  "campaign.editDialog.cover.error.save",
  "campaign.editDialog.cover.error.noImageBackend",
  "campaign.editDialog.cover.upload.error.invalid",
  "campaign.editDialog.cover.upload.error.type",
  "campaign.editDialog.cover.upload.error.size",
  "campaign.editDialog.cover.upload.error.dimensions",
];
for (const key of campaignCoverMessages) {
  assert.ok(key in DICTIONARIES.en, `English campaign-cover message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian campaign-cover message missing: ${key}`);
}

// Campaign lobby API refusals with fixed meanings are localized by stable code.
const lobbyErrorMessages = [
  "campaign.lobby.error.oneCharacterOnly",
  "campaign.lobby.error.chooseCharacter",
  "campaign.lobby.error.notYourCharacter",
  "campaign.lobby.error.combatSwitchWait",
  "campaign.lobby.error.invalidReady",
  "campaign.lobby.error.noGmSeat",
  "campaign.lobby.error.assignSeatPermission",
  "campaign.lobby.error.invalidSeatRequest",
  "campaign.lobby.error.playerNotAtTable",
  "campaign.lobby.error.coGmDifferent",
  "campaign.lobby.error.humanGameNeedsGm",
  "campaign.lobby.error.seatMoveFailed",
  "campaign.lobby.error.noCharacterToRemove",
];
for (const key of lobbyErrorMessages) {
  assert.ok(key in DICTIONARIES.en, `English lobby error missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian lobby error missing: ${key}`);
}

// Character validation responses expose codes only for exact, stable server diagnostics.
// Join-confirmation changes are structured so the prose follows the selected UI language.
const joinChangeMessages = [
  "campaign.joinConfirm.change.ownLevel",
  "campaign.joinConfirm.change.levelUp",
  "campaign.joinConfirm.change.levelDown",
  "campaign.joinConfirm.change.classEntry",
  "campaign.joinConfirm.change.classes",
  "campaign.joinConfirm.change.hitPoints",
  "campaign.joinConfirm.change.improvementsReturned",
  "campaign.joinConfirm.change.featsReturned",
  "campaign.joinConfirm.change.spellcastingLost",
  "campaign.joinConfirm.change.spellsReturned",
  "campaign.joinConfirm.change.spellSlots",
  "campaign.joinConfirm.change.slot",
  "campaign.joinConfirm.change.noSpellSlots",
];
for (const key of joinChangeMessages) {
  assert.ok(key in DICTIONARIES.en, `English join-change message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian join-change message missing: ${key}`);
}

const joinConfirmErrorMessages = [
  "campaign.joinConfirm.error.heroNotFound",
  "campaign.joinConfirm.error.gmSeat",
  "campaign.joinConfirm.error.pickOneHero",
  "campaign.joinConfirm.error.alreadyHasCharacter",
  "campaign.joinConfirm.error.lobbyOnly",
  "campaign.joinConfirm.error.picksUnreadable",
  "campaign.joinConfirm.error.noCharacterToSwitch",
  "campaign.joinConfirm.error.updateFailed",
  "campaign.joinConfirm.error.companionRole",
  "campaign.joinConfirm.error.heroFell",
  "campaign.joinConfirm.error.pregenAlreadyMine",
  "campaign.joinConfirm.error.pregenAlreadyTaken",
  "campaign.joinConfirm.error.pregenCopyAlreadyMine",
  "campaign.joinConfirm.error.pregenCopyPlayedByAnother",
  "campaign.joinConfirm.error.offeredPregenJoinOnly",
];
for (const key of joinConfirmErrorMessages) {
  assert.ok(key in DICTIONARIES.en, `English join-confirm error missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian join-confirm error missing: ${key}`);
}
assert.equal(
  translate(DICTIONARIES, "ru", "campaign.joinConfirm.error.pregenAlreadyTaken", { name: "Thessaly" }),
  "«Thessaly» за этим столом уже занят.",
);
assert.equal(
  translate(DICTIONARIES, "ru", "campaign.joinConfirm.error.heroFell", { name: "Pip" }),
  "«Pip» погиб за этим игровым столом. Выберите другого персонажа.",
);
assert.equal(
  translate(DICTIONARIES, "ru", "dictationShortcut.problem.altgrCharacter", { key: "Ctrl+Alt+Q", typed: "@" }),
  "На этой клавиатуре комбинация Ctrl+Alt+Q вводит символ «@». Выберите другую, чтобы она не мешала вводу текста.",
);

const characterRefusalMessages = [
  "builder.refusal.multiclass.disabled",
  "builder.refusal.multiclass.duplicate",
  "builder.refusal.spellcasting.thirdCaster",
];
for (const key of characterRefusalMessages) {
  assert.ok(key in DICTIONARIES.en, `English character-refusal message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian character-refusal message missing: ${key}`);
}

// Campaign AI panel copy is complete in both languages, and every placeholder has a matching partner.
const campaignAiMessages = [
  "campaign.storyAi.title",
  "campaign.storyAi.viewer.description",
  "campaign.storyAi.editor.description",
  "campaign.storyAi.editor.deviceChoice",
  "campaign.storyAi.editor.serverChoice",
  "campaign.storyAi.summary.storyteller",
  "campaign.storyAi.summary.utility",
  "campaign.storyAi.summary.images",
  "campaign.storyAi.summary.passages",
  "campaign.storyAi.summary.modelOnServer",
  "campaign.storyAi.summary.serverModel",
  "campaign.storyAi.summary.auto",
  "campaign.storyAi.summary.style",
  "campaign.storyAi.summary.off",
  "campaign.storyAi.provider.custom",
  "campaign.storyAi.provider.local",
  "campaign.storyAi.provider.none",
  "campaign.storyAi.provider.harness",
  "campaign.storyAi.provider.harnessNamed",
  "campaign.storyAi.provider.harnessNamedModel",
  "campaign.storyAi.backend.comfyui",
  "campaign.storyAi.backend.openai",
  "campaign.storyAi.backend.mflux",
  "campaign.storyAi.backend.sdnq",
  "campaign.storyAi.backend.harness",
  "campaign.storyAi.backend.localModel",
  "campaign.storyAi.backend.custom",
  "campaign.storyAi.endpoint.openai",
  "campaign.storyAi.endpoint.openrouter",
  "campaign.storyAi.device.explanation",
  "campaign.storyAi.device.changeHome",
  "campaign.storyAi.device.changeHost",
  "campaign.storyAi.device.homeButton",
  "campaign.storyAi.label.storyteller",
  "campaign.storyAi.label.utility",
  "campaign.storyAi.label.model",
  "campaign.storyAi.label.baseUrl",
  "campaign.storyAi.label.apiKey",
  "campaign.storyAi.label.utilityProvider",
  "campaign.storyAi.label.utilityModel",
  "campaign.storyAi.label.utilityUrl",
  "campaign.storyAi.label.utilityApiKey",
  "campaign.storyAi.label.images",
  "campaign.storyAi.label.artStyle",
  "campaign.storyAi.label.maps",
  "campaign.storyAi.label.scenes",
  "campaign.storyAi.label.mapsStyle",
  "campaign.storyAi.label.scenesStyle",
  "campaign.storyAi.label.passages",
  "campaign.storyAi.note.agent",
  "campaign.storyAi.note.modelOnServer",
  "campaign.storyAi.note.modelInherited",
  "campaign.storyAi.note.adminOnly",
  "campaign.storyAi.note.blankFallback",
  "campaign.storyAi.key.set",
  "campaign.storyAi.key.notSet",
  "campaign.storyAi.key.clear",
  "campaign.storyAi.utility.modelPlaceholder",
  "campaign.storyAi.utility.urlPlaceholder",
  "campaign.storyAi.utility.keyPlaceholder",
  "campaign.storyAi.image.off",
  "campaign.storyAi.image.aspect.square",
  "campaign.storyAi.image.aspect.portrait",
  "campaign.storyAi.image.aspect.landscape",
  "campaign.storyAi.image.speed.fast",
  "campaign.storyAi.image.speed.slow",
  "campaign.storyAi.image.pictureShape",
  "campaign.storyAi.image.pictureSpeed",
  "campaign.storyAi.image.autoScenes",
  "campaign.storyAi.warning.deviceModel",
  "campaign.storyAi.warning.serverModel",
  "campaign.storyAi.warning.model",
  "campaign.storyAi.warning.deviceKey",
  "campaign.storyAi.warning.serverKey",
  "campaign.storyAi.warning.key",
  "campaign.storyAi.warning.noBackend",
  "campaign.storyAi.artStyle.setting",
  "campaign.storyAi.artStyle.painted",
  "campaign.storyAi.artStyle.ink",
  "campaign.storyAi.artStyle.realistic",
  "campaign.storyAi.artStyle.comic",
  "campaign.storyAi.artStyle.custom",
  "campaign.storyAi.artStyleNote.setting",
  "campaign.storyAi.artStyleNote.painted",
  "campaign.storyAi.artStyleNote.ink",
  "campaign.storyAi.artStyleNote.realistic",
  "campaign.storyAi.artStyleNote.comic",
  "campaign.storyAi.artStyleNote.custom",
  "campaign.storyAi.customStyle.mapsPlaceholder",
  "campaign.storyAi.customStyle.scenesPlaceholder",
  "campaign.storyAi.proseSize.tiny",
  "campaign.storyAi.proseSize.xsmall",
  "campaign.storyAi.proseSize.small",
  "campaign.storyAi.proseSize.medium",
  "campaign.storyAi.proseSize.large",
  "campaign.storyAi.proseSize.xlarge",
  "campaign.storyAi.proseSize.xxlarge",
  "campaign.storyAi.proseSize.huge",
  "campaign.storyAi.proseSize.giant",
  "campaign.storyAi.proseSize.description",
  "campaign.storyAi.error.notSaved",
  "campaign.storyAi.error.network",
  "campaign.storyAi.error.invalid",
  "campaign.storyAi.error.agentUnavailable",
  "campaign.storyAi.error.agentImagesUnavailable",
  "campaign.storyAi.error.campaignMissing"
];
for (const key of campaignAiMessages) {
  assert.ok(key in DICTIONARIES.en, `English campaign-AI message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian campaign-AI message missing: ${key}`);
  const params = (value) => [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
  assert.deepEqual(params(DICTIONARIES.en[key]), params(DICTIONARIES.ru[key]), `Campaign-AI placeholders differ: ${key}`);
}
assert.equal(translate(DICTIONARIES, "ru", "campaign.storyAi.summary.storyteller", { name: "Модель 12B" }), "Рассказчик: Модель 12B");
assert.equal(translate(DICTIONARIES, "ru", "campaign.storyAi.provider.harnessNamedModel", { label: "Codex", model: "GPT" }), "Агент сервера: Codex (модель GPT)");

// Companion-builder network failures use the existing translated fallback.
assert.ok("campaign.companionBuilder.error.server" in DICTIONARIES.en, "English companion-builder network error missing");
assert.ok("campaign.companionBuilder.error.server" in DICTIONARIES.ru, "Russian companion-builder network error missing");

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

// The starter-pack tag in the equipment browser is interface copy, not an item name.
assert.ok("builder.gear.starter.kitTag" in DICTIONARIES.en, "English starter-kit tag missing");
assert.ok("builder.gear.starter.kitTag" in DICTIONARIES.ru, "Russian starter-kit tag missing");

const characterSheetAccessibilityKey = "charSheet.spellSlot.recoverAria";
assert.ok(characterSheetAccessibilityKey in DICTIONARIES.en, "English spell-slot recovery label missing");
assert.ok(characterSheetAccessibilityKey in DICTIONARIES.ru, "Russian spell-slot recovery label missing");
assert.equal(
  translate(DICTIONARIES, "ru", characterSheetAccessibilityKey, { label: "1-го уровня" }),
  "Вернуть ячейку заклинания 1-го уровня",
  "Russian spell-slot recovery label must preserve and interpolate its level",
);

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

// Session schedule duration uses the same hour count but each language's own plural forms.
for (const suffix of ["one", "other"]) {
  assert.ok(`schedule.duration.hours.${suffix}` in DICTIONARIES.en, `English schedule duration form missing: ${suffix}`);
  assert.ok(`schedule.duration.session.${suffix}` in DICTIONARIES.en, `English session duration form missing: ${suffix}`);
}
for (const suffix of ["one", "few", "many", "other"]) {
  assert.ok(`schedule.duration.hours.${suffix}` in DICTIONARIES.ru, `Russian schedule duration form missing: ${suffix}`);
  assert.ok(`schedule.duration.session.${suffix}` in DICTIONARIES.ru, `Russian session duration form missing: ${suffix}`);
}
for (const count of [1, 2, 5]) {
  assert.ok(!translatePlural(DICTIONARIES, "ru", "schedule.duration.hours", count).includes("{count}"));
  assert.ok(!translatePlural(DICTIONARIES, "ru", "schedule.duration.session", count).includes("{count}"));
}

// Inbox messages are reconstructed per recipient from structured event data.
const notificationT = (key, params) => translate(DICTIONARIES, "ru", key, params);
const notificationKeys = [
  "notifications.message.scheduled",
  "notifications.message.scheduledUntitled",
  "notifications.message.updated",
  "notifications.message.updatedUntitled",
  "notifications.message.cancelled",
  "notifications.message.cancelledUntitled",
  "notifications.message.rsvpNo",
  "notifications.message.rsvpNoUntitled",
  "notifications.message.reminder",
  "notifications.message.reminderUntitled",
  "notifications.message.starting",
  "notifications.message.startingUntitled",
  "notifications.message.campaignIdle",
];
for (const key of notificationKeys) {
  assert.ok(key in DICTIONARIES.en, `English notification message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian notification message missing: ${key}`);
}
const localizedScheduled = notificationText("session_scheduled", {
  campaignTitle: "Тихая гавань", sessionTitle: "Врата", startsAt: "2026-09-05T19:00:00.000Z",
}, "Legacy English notification.", "ru", notificationT);
assert.match(localizedScheduled, /Тихая гавань/);
assert.match(localizedScheduled, /Врата/);
assert.match(localizedScheduled, /UTC/);
assert.ok(!localizedScheduled.includes("Legacy English"));
const localizedUntitledRsvp = notificationText("rsvp", {
  username: "Artem", campaignTitle: "Тихая гавань", sessionTitle: "",
}, "Legacy English notification.", "ru", notificationT);
assert.match(localizedUntitledRsvp, /Artem/);
assert.match(localizedUntitledRsvp, /не сможет прийти/);
const localizedReminder = notificationText("session_reminder", {
  campaignTitle: "Тихая гавань", sessionTitle: "Врата", startsAt: "2026-09-05T19:00:00.000Z",
}, "Legacy English reminder.", "ru", notificationT);
assert.match(localizedReminder, /Напоминание/);
assert.match(localizedReminder, /Врата/);
const localizedStarting = notificationText("session_starting", {
  campaignTitle: "Тихая гавань", sessionTitle: "Врата", startsAt: "2026-09-05T19:00:00.000Z",
}, "Legacy English starting message.", "ru", notificationT);
assert.match(localizedStarting, /начинается/);
assert.match(localizedStarting, /За стол/);
const localizedIdle = notificationText("campaign_idle", {
  campaignTitle: "Тихая гавань",
}, "Legacy English idle message.", "ru", notificationT);
assert.match(localizedIdle, /давно тихо/);
assert.match(localizedIdle, /Тихая гавань/);
assert.equal(notificationText("session_scheduled", undefined, "Old saved notification.", "ru", notificationT), "Old saved notification.");
assert.equal(notificationText("future_kind", { campaignTitle: "Table" }, "Unknown event body.", "ru", notificationT), "Unknown event body.");
// Shared campaign membership and story-authority refusals carry stable codes.
const campaignApiT = (key) => translate(DICTIONARIES, "ru", key);
const campaignApiCases = [
  ["PASSWORD_CHANGE_REQUIRED", "createCampaign.dialog.error.passwordChange"],
  ["AUTH_REQUIRED", "auth.err.notLoggedIn"],
  ["CAMPAIGN_NOT_FOUND", "campaign.session.rules.error.campaignNotFound"],
  ["STORY_GAME_MASTER_REQUIRED", "campaign.session.rules.error.gameMasterRequired"],
  ["STORY_PARTY_LEAD_REQUIRED", "campaign.session.rules.error.partyLeadRequired"],
  ["INVALID_HOUSE_RULES", "campaign.session.rules.error.invalidHouseRules"],
  ["INVALID_RULE_CHUNK_UPDATE", "campaign.session.rules.error.invalidChunkUpdate"],
  ["RULE_CHUNK_NOT_FOUND", "campaign.session.rules.error.chunkNotFound"],
  ["INVALID_GAME_SETTINGS", "campaign.session.rules.invalidSettings"],
  ["FACTS_ADD_LEAD_REQUIRED", "campaign.fact.error.addLead"],
  ["FACTS_EDIT_LEAD_REQUIRED", "campaign.fact.error.editLead"],
  ["INVALID_FACT", "campaign.fact.error.invalid"],
  ["INVALID_FACT_PATCH", "campaign.fact.error.invalidPatch"],
  ["FACT_NOT_FOUND", "campaign.fact.error.notFound"],
  ["FACTION_NAME_REQUIRED", "campaign.factions.error.nameRequired"],
  ["FACTION_IMAGE_NOT_UPLOADED", "campaign.factions.error.imageNotUploaded"],
  ["FACTION_NOT_FOUND", "campaign.factions.error.notFound"],
  ["WORKSHOP_NO_FACTION_STANDING", "campaign.factions.error.noWorkshopStanding"],
  ["INVALID_NOTE", "campaign.notes.error.invalid"],
  ["NOTE_CHARACTER_NOT_FOUND", "campaign.notes.error.characterNotFound"],
  ["NOTE_NOT_FOUND", "campaign.notes.error.notFound"],
  ["INVALID_NOTE_UPDATE", "campaign.notes.error.invalidUpdate"],
  ["NOTE_AUTHOR_REQUIRED", "campaign.notes.error.authorRequired"],
  ["NOTE_PIN_LEAD_REQUIRED", "campaign.notes.error.pinLeadRequired"],
  ["NOTE_APPROVE_LEAD_REQUIRED", "campaign.notes.error.approveLeadRequired"],
  ["NOTE_DELETE_FORBIDDEN", "campaign.notes.error.deleteForbidden"],
  ["QUEST_TITLE_REQUIRED", "campaign.quest.error.titleRequired"],
  ["QUEST_NOT_FOUND", "campaign.quest.error.notFound"],
  ["QUEST_FROM_STORY", "campaign.quest.error.fromStory"],
  ["PIN_TEXT_REQUIRED", "campaign.pins.error.textRequired"],
  ["PIN_TOO_LONG", "campaign.pins.error.tooLong"],
  ["PIN_ALREADY_PINNED", "campaign.pins.error.alreadyPinned"],
  ["PIN_BUDGET_FULL", "campaign.pins.error.budgetFull"],
  ["INVALID_PIN", "campaign.pins.error.invalid"],
  ["PIN_MESSAGE_NOT_FOUND", "campaign.pins.error.messageNotFound"],
  ["INVALID_UNPIN", "campaign.pins.error.invalidUnpin"],
  ["PIN_REMOVE_FORBIDDEN", "campaign.pins.error.removeForbidden"],
  ["INVITE_REGENERATE_FAILED", "invite.error.regenerate"],
  ["NARRATION_MESSAGE_NOT_FOUND", "campaign.narrationFailure.error.messageNotFound"],
  ["NARRATION_GM_ONLY", "campaign.narrationFailure.error.gmOnly"],
  ["NARRATION_DISABLED", "campaign.narrationFailure.error.disabled"],
  ["NARRATION_RENDER_FAILED", "campaign.narrationFailure.error.render"],
  ["FIGHT_SETUP_NO_ACTIVE_FIGHT", "workshop.testFight.setup.error.noActiveFight"],
  ["FIGHT_SETUP_INITIATIVE_NOT_READY", "workshop.testFight.setup.error.initiativeNotReady"],
  ["FIGHT_SETUP_NO_PREPARED_FIGHT", "workshop.testFight.setup.error.noPreparedFight"],
  ["FIGHT_SETUP_NOT_TEST_AUTHOR", "workshop.testFight.setup.error.notTestAuthor"],
  ["FIGHT_SETUP_SOURCE_MISSING", "workshop.testFight.setup.error.sourceMissing"],
  ["FIGHT_SETUP_MAP_SAVE_FAILED", "workshop.testFight.setup.error.mapSaveFailed"],
];
for (const [code, key] of campaignApiCases) {
  assert.ok(key in DICTIONARIES.en, `English campaign API message missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian campaign API message missing: ${key}`);
  assert.equal(
    campaignApiErrorText({ error: "Legacy English response.", errorCode: code }, "Fallback.", campaignApiT),
    campaignApiT(key),
    `Campaign API code ${code} must use its localized message`,
  );
}
assert.equal(
  campaignApiErrorText({ error: "A dynamic server detail.", errorCode: "UNKNOWN_CODE" }, "Fallback.", campaignApiT),
  "A dynamic server detail.",
  "Unknown campaign API errors must preserve the server's original text",
);
const refusedRulesLoad = await readLoad(
  Promise.resolve(new Response(JSON.stringify({ error: "Only the Game Master can do that.", errorCode: "STORY_GAME_MASTER_REQUIRED" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  })),
  "House rules",
  (body, status) => campaignApiErrorText(body, `The server answered ${status}.`, campaignApiT),
  (_what, reason) => `Не удалось загрузить домашние правила. ${reason}`,
);
assert.equal(
  refusedRulesLoad.error,
  `Не удалось загрузить домашние правила. ${campaignApiT("campaign.session.rules.error.gameMasterRequired")}`,
);
const unreachableRulesLoad = await readLoad(
  Promise.reject(new Error("offline")),
  "House rules",
  (body, status) => campaignApiErrorText(body, `The server answered ${status}.`, campaignApiT),
  (_what, reason) => reason === UNREACHABLE
    ? campaignApiT("campaign.session.rules.network")
    : reason === UNREADABLE
      ? campaignApiT("campaign.session.rules.loadFailed")
      : reason,
);
assert.equal(unreachableRulesLoad.error, campaignApiT("campaign.session.rules.network"));
const refusedFactionWrite = await readWrite(
  Promise.resolve(new Response(JSON.stringify({ error: "A faction needs a name.", errorCode: "FACTION_NAME_REQUIRED" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  })),
  "Could not save the faction.",
  (body, status) => campaignApiErrorText(body, `The server answered ${status}.`, campaignApiT),
);
assert.equal(refusedFactionWrite.error, campaignApiT("campaign.factions.error.nameRequired"));
assert.equal(refusedFactionWrite.unanswered, false);

// Starting equipment diagnostics are structured and translated in the builder.
const gearDiagnosticKeys = [
  "builder.gear.source.stored",
  "builder.gear.source.rolledTable",
  "builder.gear.source.rolledPrompt",
  "builder.gear.source.background",
  "builder.gear.source.spent",
  "builder.gear.problem.homebrew",
  "builder.gear.problem.magic",
  "builder.gear.problem.unpriced",
  "builder.gear.problem.insufficientFunds",
  "builder.gear.problem.invalidOption",
  "builder.gear.problem.notProficient",
  "builder.gear.problem.invalidSlot",
  "builder.gear.problem.invalidBackgroundChoice",
  "builder.gear.wealth.error.campaignNotAccessible",
  "builder.gear.wealth.error.notRolled",
  "builder.gear.wealth.error.invalidRequest",
  "builder.gear.wealth.error.network"
];
for (const key of gearDiagnosticKeys) {
  assert.ok(key in DICTIONARIES.en, `English gear diagnostic missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian gear diagnostic missing: ${key}`);
  assert.notEqual(translate(DICTIONARIES, "ru", key), key, `Russian gear diagnostic fell back to its key: ${key}`);
}
assert.ok(translate(DICTIONARIES, "ru", "builder.gear.problem.magic", { name: "Мешок хранения" }).includes("Мешок хранения"));
assert.ok(translate(DICTIONARIES, "ru", "builder.gear.problem.insufficientFunds", { cost: "20 зм", available: "5 зм", shortfall: "15 зм" }).includes("15 зм"));
const gearT = (key, params) => translate(DICTIONARIES, "ru", key, params);
const gearRefusalCases = [
  ["STARTING_GEAR_HOMEBREW", { name: "Авторский меч" }, /Авторский меч/],
  ["STARTING_GEAR_MAGIC", { name: "Магический клинок" }, /Магический клинок/],
  ["STARTING_GEAR_UNPRICED", { name: "Редкий предмет" }, /Редкий предмет/],
  ["STARTING_GEAR_INSUFFICIENT_FUNDS", { cost: "20 зм", available: "5 зм", shortfall: "15 зм" }, /15 зм/],
  ["STARTING_GEAR_INVALID_OPTION", { className: "жрец", options: "булава или молот" }, /жрец/],
  ["STARTING_GEAR_NOT_PROFICIENT", { className: "жрец", option: "боевой молот", alternatives: "булава" }, /боевой молот/],
  ["STARTING_GEAR_INVALID_SLOT", { name: "Дубина", slotFilter: "martial-melee", className: "варвар", option: "оружие" }, /воинское оружие ближнего боя/],
  ["STARTING_GEAR_INVALID_BACKGROUND_CHOICE", { options: "кинжал или молот", choice: "двуручный меч" }, /двуручный меч/],
];
for (const [code, params, expected] of gearRefusalCases) {
  const message = refusalText({
    error: "Legacy diagnostic",
    problems: ["Legacy diagnostic"],
    problemCodes: [code],
    problemParams: [params],
  }, "fallback", gearT);
  assert.notEqual(message, "Legacy diagnostic", `refusal code ${code} was not translated`);
  assert.match(message, expected, `refusal code ${code} lost its parameters`);
}

const campaignEntryRefusals = [
  ["COMPANION_SETTING_OFF", {}, /отключены спутники/],
  ["COMPANION_GUESTS_ONLY", {}, /только временные гости/],
  ["COMPANION_AUTO_GUESTS", {}, /режиме «Авто»/],
  ["COMPANION_ROSTER_FULL", {}, /максимальное число постоянных спутников/],
  ["COMPANION_ALREADY_HERE", { name: "Брин" }, /Брин/],
  ["COMPANION_LEFT_PARTY", { name: "Элла" }, /Элла/],
  ["COMPANION_NOT_IN_LIBRARY", {}, /нет в вашей библиотеке/],
  ["INVALID_COMPANION_SHEET", {}, /прочитать лист спутника/],
  ["PORTRAIT_NO_IMAGE_MODEL", {}, /нет модели для генерации изображений/],
  ["MULTICLASS_NOT_ALLOWED_FOR_CHARACTER", { name: "Илвана" }, /Илвана/],
  ["CAMPAIGN_NOT_FOUND", {}, /Кампания не найдена/],
  ["STORY_GAME_MASTER_REQUIRED", {}, /только ведущий/],
  ["STORY_PARTY_LEAD_REQUIRED", {}, /лидер группы/],
  ["AUTH_REQUIRED", {}, /в систему/],
  ["PASSWORD_CHANGE_REQUIRED", {}, /пароль/],
  ["JOIN_INVALID_INVITE_CODE", {}, /корректный код приглашения/],
  ["JOIN_INVITE_NOT_FOUND", {}, /таким кодом приглашения не найдена/],
  ["JOIN_CAMPAIGN_ENDED", {}, /уже завершена/],
  ["JOIN_CAMPAIGN_STARTED", {}, /присоединение закрыто/],
  ["JOIN_CAMPAIGN_FULL", {}, /нет свободных мест/],
  ["JOIN_THROTTLED", { seconds: 17 }, /через 17 с/],
  ["JOIN_FAILED", {}, /не удалось присоединиться к кампании/],
  ["CAMPAIGN_CREATION_ADMIN_ONLY", {}, /администратор/],
  ["STARTER_INVALID_REQUEST", {}, /не удалось прочитать запрос/],
  ["STARTER_NO_STORYTELLER", {}, /не настроен рассказчик/],
  ["CAMPAIGN_DELETE_OWNER_ONLY", {}, /только её владелец/],
  ["CAMPAIGN_CLONE_NOT_FOUND", {}, /недоступна для копирования/],
  ["INVALID_CAMPAIGN_CLONE", {}, /копирование содержит неверные данные/],
];
for (const [code, params, expected] of campaignEntryRefusals) {
  const message = refusalText({
    error: "Legacy diagnostic",
    errorCode: code,
    errorParams: params,
  }, "fallback", gearT);
  assert.notEqual(message, "Legacy diagnostic", `campaign-entry code ${code} was not translated`);
  assert.match(message, expected, `campaign-entry code ${code} lost its translation or parameters`);
}
assert.match(gearProblemText({ code: "magic", params: { name: "Меч" } }, gearT), /Меч/);
assert.match(gearProblemText({ code: "invalidOption", params: { className: "жрец", options: "булава, молот" } }, gearT), /жрец/);
assert.match(gearProblemText({ code: "notProficient", params: { className: "жрец", option: "боевой молот", alternatives: "булава" } }, gearT), /боевой молот/);
assert.match(gearProblemText({ code: "invalidSlot", params: { name: "Дубина", slotFilter: "martial-melee", className: "варвар", option: "оружие" } }, gearT), /ячейке/);
assert.match(gearProblemText({ code: "invalidBackgroundChoice", params: { options: "кинжал, молот", choice: "двуручный меч" } }, gearT), /двуручный меч/);

for (const suffix of ["one", "other"]) {
  assert.ok(`builder.gear.problem.more.${suffix}` in DICTIONARIES.en, `English gear problem plural missing: ${suffix}`);
}
for (const suffix of ["one", "few", "many", "other"]) {
  assert.ok(`builder.gear.problem.more.${suffix}` in DICTIONARIES.ru, `Russian gear problem plural missing: ${suffix}`);
}
for (const count of [1, 2, 5]) {
  assert.ok(!translatePlural(DICTIONARIES, "ru", "builder.gear.problem.more", count).includes("{count}"));
}


// Character-builder step blockers use stable keys and parameters, not raw English text.
const builderBlockKeys = [
  "builder.block.identity.name",
  "builder.block.background.missing",
  "builder.block.background.skills",
  "builder.block.background.tools",
  "builder.block.ancestry.missing",
  "builder.block.ancestry.variant",
  "builder.block.ancestry.languages",
  "builder.block.ancestry.asi",
  "builder.block.ancestry.skills",
  "builder.block.ancestry.skillsFromList",
  "builder.block.ancestry.tool",
  "builder.block.ancestry.cantrip",
  "builder.block.ancestry.feat",
  "builder.block.ancestry.dragon",
  "builder.block.ancestry.repeatSkills",
  "builder.block.calling.missing",
  "builder.block.calling.skills",
  "builder.block.calling.subclass",
  "builder.block.calling.styles",
  "builder.block.calling.expertise",
  "builder.block.calling.options",
  "builder.block.calling.subclassOption",
  "builder.block.multiclass.disabled",
  "builder.block.multiclass.subclass",
  "builder.block.multiclass.skills",
  "builder.block.spells.cantripsMissing",
  "builder.block.spells.cantripsOver",
  "builder.block.spells.bookMissing",
  "builder.block.spells.bookOver",
  "builder.block.spells.preparedBookMissing",
  "builder.block.spells.preparedMissing",
  "builder.block.spells.preparedOver",
  "builder.block.spells.noSpells",
  "builder.block.abilities.missing",
  "builder.block.abilities.standardArray",
  "builder.block.abilities.pointBuyRange",
  "builder.block.abilities.pointBuyOver",
  "builder.block.abilities.rollMismatch",
  "builder.block.abilities.asi"
];
for (const key of builderBlockKeys) {
  assert.ok(key in DICTIONARIES.en, `English builder blocker missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian builder blocker missing: ${key}`);
  assert.notEqual(translate(DICTIONARIES, "ru", key), key, `Russian builder blocker fell back to its key: ${key}`);
}
assert.ok(translate(DICTIONARIES, "ru", "builder.block.background.skills", { backgroundName: "Аколит" }).includes("Аколит"));
assert.ok(translate(DICTIONARIES, "ru", "builder.block.spells.bookOver", { count: 2, level: 3, limit: 10 }).includes("10"));

// Feat requirements are formatted from structured counts, not parsed English sentences.
const featBlockKeys = [
  "builder.block.feat.choices",
  "builder.block.feat.pickCount",
  "builder.block.feat.shared",
  "builder.block.feat.kind.languages",
  "builder.block.feat.kind.skills",
  "builder.block.feat.kind.expertise",
  "builder.block.feat.kind.weapons",
  "builder.block.feat.kind.tools",
  "builder.block.feat.kind.damageType",
  "builder.block.feat.kind.classList",
  "builder.block.feat.kind.spellAbility",
  "builder.block.feat.kind.attackCantrip",
  "builder.block.feat.kind.cantrip",
  "builder.block.feat.kind.ritualSpell",
  "builder.block.feat.kind.spell",
  "builder.block.feat.spellLevel",
  "builder.block.feat.schools",
  "builder.block.feat.kind.armor",
  "builder.block.feat.school.abjuration",
  "builder.block.feat.school.conjuration",
  "builder.block.feat.school.divination",
  "builder.block.feat.school.enchantment",
  "builder.block.feat.school.evocation",
  "builder.block.feat.school.illusion",
  "builder.block.feat.school.necromancy",
  "builder.block.feat.school.transmutation"
];
for (const key of featBlockKeys) {
  assert.ok(key in DICTIONARIES.en, `English feat blocker missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian feat blocker missing: ${key}`);
}
const featT = (key, params) => translate(DICTIONARIES, "ru", key, params);
const linguistOwed = featOwedText({
  kind: "picks", feat: "Linguist", languages: 3, skills: 0, expertise: 0,
  weapons: 0, tools: 0, shared: 0, sharedKinds: "", damageType: "no",
}, featT);
assert.match(linguistOwed, /языки/);
assert.match(linguistOwed, /3/);
const mysticOwed = featOwedText({
  kind: "spells", feat: "Mystical Talent", listChoice: "yes", abilityChoice: "no",
  cantrips: 2, attackCantrip: "no", spells: 1, spellLevel: 1, schools: "", ritualBook: "no",
}, featT);
assert.match(mysticOwed, /список заклинаний класса/);
assert.match(mysticOwed, /заговоры/);
assert.match(mysticOwed, /заклинания/);
const schoolOwed = featOwedText({
  kind: "spells", feat: "Fey Touched", listChoice: "no", abilityChoice: "no",
  cantrips: 0, attackCantrip: "no", spells: 1, spellLevel: 1, schools: "divination,enchantment", ritualBook: "no",
}, featT);
assert.match(schoolOwed, /прорицание/);
assert.match(schoolOwed, /очарование/);
const armorOwed = featOwedText({
  kind: "picks", feat: "Heavy Armor Master", languages: 0, skills: 0, expertise: 0,
  weapons: 0, tools: 0, shared: 1, sharedKinds: "armor", damageType: "no",
}, featT);
assert.match(armorOwed, /доспехи и щиты/);

const featPrerequisiteKeys = [
  "builder.block.feat.prerequisite",
  "builder.block.feat.requirement.abilityScore",
  "builder.block.feat.requirement.armor",
  "builder.block.feat.requirement.spellcasting",
  "builder.block.feat.requirement.race",
  "builder.block.feat.requirement.level",
  "builder.block.feat.requirement.skills",
  "builder.block.feat.requirement.vehicle",
  "builder.block.feat.requirement.weapon",
  "builder.block.feat.requirement.and",
  "builder.block.feat.requirement.or",
  "builder.block.feat.ability.str",
  "builder.block.feat.ability.dex",
  "builder.block.feat.ability.con",
  "builder.block.feat.ability.int",
  "builder.block.feat.ability.wis",
  "builder.block.feat.ability.cha",
  "builder.block.feat.armor.light",
  "builder.block.feat.armor.medium",
  "builder.block.feat.armor.heavy",
  "builder.block.feat.weapon.simple",
  "builder.block.feat.weapon.martial",
  "builder.block.feat.weapon.ranged",
  "builder.block.feat.weapon.melee",
  "builder.block.abilities.multiclassPrerequisite"
];
for (const key of featPrerequisiteKeys) {
  assert.ok(key in DICTIONARIES.en, `English feat prerequisite missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian feat prerequisite missing: ${key}`);
}
const featPrereqT = (key, params) => translate(DICTIONARIES, "ru", key, params);
const prereqText = featPrerequisiteText({
  feat: "Resilient",
  requirements: JSON.stringify([{ code: "abilityScore", abilities: ["str"], minimum: 13, actual: [10] }]),
}, featPrereqT);
assert.match(prereqText, /Resilient/);
assert.match(prereqText, /Сила/);
assert.match(prereqText, /13/);
assert.match(prereqText, /10/);
const skillPrereqText = featPrerequisiteText({
  feat: "Skilled",
  requirements: JSON.stringify([{ code: "skills", skills: ["animal_handling", "sleight_of_hand"] }]),
}, featPrereqT);
assert.match(skillPrereqText, /Уход за животными/);
assert.match(skillPrereqText, /Ловкость рук/);
const multiclassPrereqT = (key, params) => translate(DICTIONARIES, "ru", key, params);
const fighterPrereqText = multiclassPrerequisiteText({
  className: "Воин",
  alternatives: JSON.stringify([["str"], ["dex"]]),
  minimum: 13,
}, multiclassPrereqT);
assert.match(fighterPrereqText, /Сила/);
assert.match(fighterPrereqText, /Ловкость/);
assert.match(fighterPrereqText, /или/);
const monkPrereqText = multiclassPrerequisiteText({
  className: "Монах",
  alternatives: JSON.stringify([["dex", "wis"]]),
  minimum: 13,
}, multiclassPrereqT);
assert.match(monkPrereqText, /Ловкость/);
assert.match(monkPrereqText, /Мудрость/);


// Campaign creator defaults keep their validation and network errors in the interface language.
for (const key of [
  "createCampaign.defaults.error.invalid",
  "createCampaign.defaults.error.read",
  "createCampaign.defaults.error.readNetwork",
  "createCampaign.defaults.error.saveNetwork",
  "createCampaign.defaults.error.removeNetwork",
  "createCampaign.defaults.error.remove",
]) {
  assert.ok(key in DICTIONARIES.en, `English saved-default error missing: ${key}`);
  assert.ok(key in DICTIONARIES.ru, `Russian saved-default error missing: ${key}`);
  assert.notEqual(translate(DICTIONARIES, "ru", key), key);
}
assert.match(translate(DICTIONARIES, "ru", "createCampaign.defaults.error.invalid"), /формат/);
assert.match(translate(DICTIONARIES, "ru", "createCampaign.defaults.error.saveNetwork"), /не сохранены/);
assert.match(translate(DICTIONARIES, "ru", "createCampaign.defaults.error.removeNetwork"), /не удалены/);

// Report (not fail on) what Russian still lacks, so progress is visible.
const missing = Object.keys(DICTIONARIES.en).filter((key) => !(key in DICTIONARIES.ru));
console.log(`i18n: ${Object.keys(DICTIONARIES.en).length} messages, ${missing.length} not yet in Russian`);
if (missing.length > 0) {
  console.log(`  untranslated: ${missing.join(", ")}`);
}
console.log("i18n tests passed");
