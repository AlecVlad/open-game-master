// Русский: общий пошаговый мастер.
// Ключи те же, что в en/wizard.ts; формы .few и .many нужны только русскому.
import type { enWizard } from "../en/wizard.ts";

export const ruWizard: Partial<Record<keyof typeof enWizard, string>> & Record<string, string> = {
  "wizard.done": "Готово",
  "wizard.step": "Шаг {n}",
  "wizard.cancel": "Отмена",
  "wizard.back": "Назад",
  "wizard.progress": "Шаг {n} / {total}",
  "wizard.show": "Показать",
  "wizard.dismiss": "Закрыть",
  "wizard.continue": "Продолжить",
};
