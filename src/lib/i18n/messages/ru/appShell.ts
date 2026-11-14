// Русский: общее меню аккаунта и навигация приложения.
import type { enAppShell } from "../en/appShell.ts";

export const ruAppShell: Partial<Record<keyof typeof enAppShell, string>> = {
  "appShell.home.tooltip": "Вернуться на главный экран приложения",
  "appShell.home": "Главный экран приложения",
  "appShell.menu.tooltip": "Меню аккаунта и приложения",
  "appShell.account": "Аккаунт",
  "appShell.role.admin": "Администратор сервера",
  "appShell.role.adventurer": "Искатель приключений",
  "appShell.menu.campaigns": "Все кампании",
  "appShell.menu.characters": "Персонажи",
  "appShell.menu.rulebook": "Книга правил",
  "appShell.menu.friends": "Друзья",
  "appShell.menu.settings": "Настройки",
  "appShell.menu.admin": "Панель администратора",
  "appShell.menu.help": "Помощь",
  "appShell.menu.aboutServer": "О сервере",
  "appShell.menu.about": "О приложении",
  "appShell.appSettings": "Настройки приложения",
  "appShell.appGuide": "Руководство по приложению",
  "appShell.menu.logout": "Выйти",
};
