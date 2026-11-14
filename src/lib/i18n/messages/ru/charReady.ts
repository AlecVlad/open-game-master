// Русский: страница «герой готов».
// Ключи те же, что в en/charReady.ts; формы .few и .many нужны только русскому.
import type { enCharReady } from "../en/charReady.ts";

export const ruCharReady: Partial<Record<keyof typeof enCharReady, string>> & Record<string, string> = {
  "charReady.err.save": "Не удалось сохранить. Попробуйте ещё раз.",
  "charReady.notfound": "Персонаж не найден.",
  "charReady.back": "Назад в библиотеку",
  "charReady.alt": "Портрет персонажа {name}",
  "charReady.alt.ph": "{name}, портрет-заглушка",
  "charReady.ready": "{name} готов к игре",
  "charReady.line": "{level} уровень, {ancestry} {calling}",
  "charReady.painting": "Портрет ещё рисуется. Когда будет готов, он появится здесь.",
  "charReady.failed": "Не удалось нарисовать портрет. Нарисовать или загрузить его можно на листе.",
  "charReady.tips": "Три вещи, которые стоит попробовать в свой ход",
  "charReady.tips.none": "Ваш лист перечисляет всё, что вы можете делать, когда сядете за стол.",
  "charReady.skip": "Больше не показывать",
  "charReady.bring": "Привести к столу",
  "charReady.done": "Готово",
};
