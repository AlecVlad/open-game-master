// Русский: разделы листа персонажа из библиотеки (только чтение).
// Ключи те же, что в en/charSheet.ts; формы .few и .many нужны только русскому.
import type { enCharSheet } from "../en/charSheet.ts";

export const ruCharSheet: Partial<Record<keyof typeof enCharSheet, string>> & Record<string, string> = {
  "charSheet.kind.achievement": "Достижение",
  "charSheet.kind.item": "Сокровище",
  "charSheet.kind.relationship": "Связь",
  "charSheet.kind.death": "Смерть",
  "charSheet.kind.level_up": "Новый уровень",
  "charSheet.kind.story": "История",
  "charSheet.abilities": "Характеристики",
  "charSheet.hp": "Хиты",
  "charSheet.ac": "Класс доспеха",
  "charSheet.speed": "Скорость",
  "charSheet.ft": "{n} фт",
  "charSheet.speed.walk": "Их скорость ходьбы.",
  "charSheet.speed.base": "Базовая {base} фт, изменена надетым и особенностями.",
  "charSheet.coin": "Монеты",
  "charSheet.init": "Инициатива",
  "charSheet.pp": "Пассивное восприятие",
  "charSheet.prof": "Мастерство",
  "charSheet.dc": "СЛ спасброска от заклинаний",
  "charSheet.skills": "Навыки",
  "charSheet.training": "Языки и владения",
  "charSheet.spells": "Заклинания",
  "charSheet.equip": "Снаряжение",
  "charSheet.features": "Особенности и черты",
  "charSheet.feats": "Черты (feats)",
  "charSheet.backstory": "Предыстория",
  "charSheet.hopes": "Надежды на историю",
  "charSheet.story": "История на сегодня",
  "charSheet.empty": "Пока ничего не записано. Сюда попадают вехи из кампаний: победы, сокровища, связи и кое-что похуже.",
};
