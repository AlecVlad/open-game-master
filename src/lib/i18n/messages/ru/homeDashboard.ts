// Русский: каркас главного экрана (шапка, строка состояния, подтверждения).
// Ключи те же, что в en/homeDashboard.ts; формы .few и .many нужны только русскому.
import type { enHomeDashboard } from "../en/homeDashboard.ts";

export const ruHomeDashboard: Partial<Record<keyof typeof enHomeDashboard, string>> & Record<string, string> = {
  "home.dash.del.confirm": "Удалить «{title}» для всех? Все персонажи, сообщения и прогресс истории будут потеряны. Это нельзя отменить.",
  "home.dash.del.err": "Не удалось удалить «{title}».",
  "home.dash.clone.err": "Не удалось создать копию.",
  "home.dash.del.ownerOnly": "Удалить эту кампанию может только её владелец.",
  "home.dash.clone.notFound": "Кампания не найдена или недоступна для копирования.",
  "home.dash.clone.invalid": "Запрос на копирование содержит неверные данные.",
  "home.dash.howto.tip": "Что это за приложение и как устроен стол",
  "home.dash.howto": "Как играть",
  "home.dash.stage": "Титульный экран",
  "home.dash.wait": "Будим мастера",
  "home.dash.off": "Нет ИИ-рассказчика · столы ведут люди",
  "home.dash.awake": "Мастер бодрствует",
  "home.dash.dozing": "Мастер не отвечает",
};
