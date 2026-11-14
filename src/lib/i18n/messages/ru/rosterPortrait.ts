// Русский: строки состояния портрета в списке персонажей.
// Ключи те же, что в en/rosterPortrait.ts; формы .few и .many нужны только русскому.
import type { enRosterPortrait } from "../en/rosterPortrait.ts";

export const ruRosterPortrait: Partial<Record<keyof typeof enRosterPortrait, string>> & Record<string, string> = {
  "roster.painting": "Рисуется портрет…",
  "roster.failed": "Не удалось нарисовать портрет.",
  "roster.again": "Нарисовать портрет персонажа {name} заново",
  "roster.retry": "Повторить",
  "roster.ready": "Портрет персонажа {name} готов",
};
