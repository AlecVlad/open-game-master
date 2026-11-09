// Русский: выбор класса (мастерство, стили, опции) и владение инструментами в конструкторе.
// Ключи те же, что в en/builderChoices.ts; формы .few и .many нужны только русскому.
import type { enBuilderChoices } from "../en/builderChoices.ts";

export const ruBuilderChoices: Partial<Record<keyof typeof enBuilderChoices, string>> & Record<string, string> = {
  "builder.cc.exp.title": "Мастерство (выберите: {n})",
  "builder.cc.left": "Ещё выбрать: {n}. ",
  "builder.cc.exp.term": "Мастерство",
  "builder.cc.exp.mid": " удваивает ваш",
  "builder.cc.exp.term2": "бонус мастерства",
  "builder.cc.exp.post": " для выбранных навыков.",
  "builder.cc.exp.first": "Сначала выберите навыки класса выше.",
  "builder.cc.thieves": "Воровские инструменты",
  "builder.cc.thieves.info": "Ваш бонус мастерства удваивается для проверок, которые вы делаете воровскими инструментами.",
  "builder.cc.style.title": "Боевой стиль (выберите: {n})",
  "builder.cc.style.help": "Ещё выбрать: {n}. Боевой стиль — постоянное преимущество с одним видом оружия или доспеха; прочитайте каждую карточку перед выбором.",
  "builder.cc.opt.title": "{label} (выберите: {n})",
  "builder.cc.opt.help": "Это настоящие способности, которые получит ваш персонаж. Нажмите кнопку информации у любой из них, чтобы прочитать, что она делает.",
  "builder.cc.opt.req": "Требуется: {req}. ",
  "builder.cc.opt.req.meta": "Требуется: {req}",
  "builder.cc.sub.title": "{label} (выберите: 1)",
  "builder.cc.sub.left": "Ещё выбрать: 1. ",
  "builder.cc.sub.help": "Этого требует {sub}. Каждый вариант даёт вашему персонажу то, что написано на его карточке.",
  "builder.cc.src.class": "ваш класс {name}",
  "builder.cc.src.bg": "ваша предыстория {name}",
  "builder.cc.src.from": "Источник: {source}.",
  "builder.cc.tool.title.one": "Владение инструментами: {count} {label}",
  "builder.cc.tool.title.other": "Владение инструментами: {count} {label}",
  "builder.cc.tool.title.few": "Владение инструментами: {count} {label}",
  "builder.cc.tool.title.many": "Владение инструментами: {count} {label}",
};
