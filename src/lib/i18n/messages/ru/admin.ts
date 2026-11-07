// Русский: панель администратора. Ключи те же, что в en/admin.ts.
import type { enAdmin } from "../en/admin.ts";

export const ruAdmin: Partial<Record<keyof typeof enAdmin, string>> = {
  "admin.title": "Панель администратора",
  "admin.signedInAs": "Вы вошли как {name}",
  "admin.adminsOnly": "Только для администраторов.",
  "admin.backToCampaigns": "Назад к кампаниям",
  "admin.guided.title": "Пошаговая настройка",
  "admin.guided.blurb": "Рассказчик, картинки, голос, игроки и ваш собственный агент: по одному вопросу за раз.",
  "admin.guided.run": "Запустить",
  "admin.section": "Раздел администрирования",
  "admin.tab.settings": "Настройки сервера",
  "admin.tab.worlds": "Плагины кампаний",
  "admin.tab.addons": "Аддоны",
  "admin.tab.users": "Пользователи",
  "admin.tab.usage": "Использование",
  "admin.tab.reports": "Отчёты",
  "admin.tab.log": "Журнал сервера",
};
