// Русский: форма смены пароля.
// Ключи те же, что в en/authPassword.ts; формы .few и .many нужны только русскому.
import type { enAuthPassword } from "../en/authPassword.ts";

export const ruAuthPassword: Partial<Record<keyof typeof enAuthPassword, string>> & Record<string, string> = {
  "password.mismatch": "Новые пароли не совпадают.",
  "password.err": "Не удалось сменить пароль.",
  "password.network": "Не удалось связаться с сервером.",
  "password.current": "Текущий пароль",
  "password.new": "Новый пароль",
  "password.confirm": "Подтвердите новый пароль",
  "password.submit": "Сменить пароль",
};
