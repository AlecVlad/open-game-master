// Русский: карточки плагинов и панель фильтров в Админ-панели > Плагины кампаний.
// Ключи те же, что в en/adminPlugins.ts; формы .few и .many нужны только русскому.
import type { enAdminPlugins } from "../en/adminPlugins.ts";

export const ruAdminPlugins: Partial<Record<keyof typeof enAdminPlugins, string>> & Record<string, string> = {
  "admin.plugins.bundled": "встроен",
  "admin.plugins.install": "Установить",
  "admin.plugins.update": "Обновить до v{version}",
  "admin.plugins.remove": "Удалить",
  "admin.plugins.ships": "Поставляется с приложением и не может быть удалён.",
  "admin.plugins.f.label": "Фильтр плагинов кампаний",
  "admin.plugins.f.search": "Поиск по названию, сеттингу или автору",
  "admin.plugins.f.searchAria": "Поиск плагинов кампаний",
  "admin.plugins.f.genre": "Жанр",
  "admin.plugins.f.everyGenre": "Все жанры",
  "admin.plugins.f.origin": "Оригинальные или фанатские",
  "admin.plugins.f.all": "Все",
  "admin.plugins.f.original": "Оригинальные",
  "admin.plugins.f.fan": "Фанатские",
};
