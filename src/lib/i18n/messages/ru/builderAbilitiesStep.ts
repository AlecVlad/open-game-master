// Русский: шаг конструктора «Характеристики».
// Ключи те же, что в en/builderAbilitiesStep.ts; формы .few и .many нужны только русскому.
import type { enBuilderAbilitiesStep } from "../en/builderAbilitiesStep.ts";

export const ruBuilderAbilitiesStep: Partial<Record<keyof typeof enBuilderAbilitiesStep, string>> & Record<string, string> = {
  "builder.abil.or": " или ",
  "builder.abil.and": " и ",
  "builder.abil.leans.a": "Для класса {klass} важны: {needs}{then}.",
  "builder.abil.leans.an": "Для класса {klass} важны: {needs}{then}.",
  "builder.abil.then": ", затем {ability}",
  "builder.abil.place.a": "Расставить по классу {klass}",
  "builder.abil.place.an": "Расставить по классу {klass}",
  "builder.abil.owner.klass": "класса {klass}",
  "builder.abil.owner.none": "персонажа",
  "builder.abil.what.one": "улучшение",
  "builder.abil.what.plural": "улучшения",
  "builder.abil.asi.one": "Осталось выбрать одно улучшение. «Выбрать за меня» добавляет очки в основные характеристики {owner}, но никогда не в черту.",
  "builder.abil.asi.other": "Осталось выбрать улучшений: {count}. «Выбрать за меня» добавляет очки в основные характеристики {owner}, но никогда не в черту.",
  "builder.abil.asi.few": "Осталось выбрать улучшений: {count}. «Выбрать за меня» добавляет очки в основные характеристики {owner}, но никогда не в черту.",
  "builder.abil.asi.many": "Осталось выбрать улучшений: {count}. «Выбрать за меня» добавляет очки в основные характеристики {owner}, но никогда не в черту.",
};
