// Русский: коды-приглашения в разделе «Учётные записи» админ-панели.
// Ключи те же, что в en/adminInvites.ts; формы .few и .many нужны только русскому.
import type { enAdminInvites } from "../en/adminInvites.ts";

export const ruAdminInvites: Partial<Record<keyof typeof enAdminInvites, string>> & Record<string, string> = {
  "admin.invites.err.create": "Не удалось создать приглашение.",
  "admin.invites.err.network": "Не удалось связаться с сервером.",
  "admin.invites.revoke.confirm": "Отозвать приглашение {code}? Те, у кого оно осталось, не смогут по нему зарегистрироваться.",
  "admin.invites.revoke.title": "Отозвать это приглашение?",
  "admin.invites.revoke.action": "Отозвать",
  "admin.invites.revoke.hint": "Отозвать это приглашение",
  "admin.invites.revoke.aria": "Отозвать приглашение {code}",
  "admin.invites.loading": "Загрузка приглашений",
  "admin.invites.title": "Коды-приглашения",
  "admin.invites.note.label": "Заметка (необязательно)",
  "admin.invites.note.placeholder": "Для кого это приглашение",
  "admin.invites.uses": "Использований",
  "admin.invites.new": "Новое приглашение",
  "admin.invites.empty": "Кодов-приглашений пока нет. Никто не сможет зарегистрироваться, пока вы не создадите хотя бы один.",
  "admin.invites.copy": "Скопировать код-приглашение",
  "admin.invites.used": "использовано {used} из {max}",
};
