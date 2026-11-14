// Русский: общие элементы полей настроек админ-панели.
// Ключи те же, что в en/adminFields.ts; формы .few и .many нужны только русскому.
import type { enAdminFields } from "../en/adminFields.ts";

export const ruAdminFields: Partial<Record<keyof typeof enAdminFields, string>> & Record<string, string> = {
  "admin.fields.inherit.replaces": "Заменяет стартовую настройку ({value}) на этом сервере. Очистите поле, чтобы снова использовать её.",
  "admin.fields.inherit.inUse": "Используется: {value}, стартовая настройка сервера (.env.server или встроенное значение по умолчанию). Введите значение, чтобы заменить её.",
  "admin.fields.secret.set": "•••••••• (задан)",
  "admin.fields.secret.notSet": "Не задано",
  "admin.fields.secret.clear": "Очистить",
};
