// Русский: завершающий шаг конструктора.
// Ключи те же, что в en/builderFinish.ts; формы .few и .many нужны только русскому.
import type { enBuilderFinish } from "../en/builderFinish.ts";

export const ruBuilderFinish: Partial<Record<keyof typeof enBuilderFinish, string>> & Record<string, string> = {
  "builder.finish.derived": "Производные значения",
  "builder.finish.hp": "Макс. хиты",
  "builder.finish.ac": "КД",
  "builder.finish.gold": "Золото",
  "builder.finish.rolled": "Брошено сервером: {gold} зм по {dice}. ",
  "builder.finish.speed": "Скорость {n} фт",
  "builder.finish.prof": "Маст. {n}",
  "builder.finish.init": "Инициатива {n}",
  "builder.finish.pp": "Пассивное восприятие {n}",
  "builder.finish.dc": "СЛ заклинаний {n}",
  "builder.finish.atk": "Атака заклинанием {n}",
  "builder.finish.place": "Место за столом",
  "builder.finish.place.help": "Это ничего не меняет на листе, только то, как персонаж вступает в кампанию.",
  "builder.finish.pc": "Персонаж, которым играю я",
  "builder.finish.ally": "Союзник, которым играет ведущий",
  "builder.finish.ally.note": "Спутники предлагаются, когда группа добавляет нового, на том уровне, на котором играет этот стол. Никому не придётся создавать их заново.",
  "builder.finish.pc.note": "Вступает в кампанию как ваш персонаж, которым вы управляете.",
  "builder.finish.feats": "Черты (feats)",
  "builder.finish.feats.help": "Черты, которые этот персонаж уже имеет. Новые черты приходят вместе с повышением характеристик.",
  "builder.finish.retry": "Повторить",
  "builder.finish.refused": "Сервер не сохранил персонажа:",
};
