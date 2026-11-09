// Русский: вкладка «Журнал сервера» админ-панели.
// Ключи те же, что в en/adminLog.ts; формы .few и .many нужны только русскому.
import type { enAdminLog } from "../en/adminLog.ts";

export const ruAdminLog: Partial<Record<keyof typeof enAdminLog, string>> & Record<string, string> = {
  "admin.log.filter.all": "Всё",
  "admin.log.filter.warn": "Предупреждения",
  "admin.log.filter.error": "Ошибки",
  "admin.log.clipboardRefused": "Буфер обмена отклонил копирование.",
  "admin.log.downloadFailed": "Не удалось скачать журнал.",
  "admin.log.title": "Журнал сервера",
  "admin.log.live": "В реальном времени",
  "admin.log.follow": "Следить за журналом в реальном времени",
  "admin.log.meta": "Последние {capacity} строк с момента запуска сервера: {date}. ",
  "admin.log.note.before": "Консоль сервера тоже хранит каждую строку (терминал, ",
  "admin.log.note.after": ", или local-server.log настольного приложения). Ключи и токены вырезаются. «Сообщить о проблеме» сохраняет последние строки и настройки сервера в один файл для обращения на GitHub; за столом эта кнопка находится в разделе «Справка».",
  "admin.log.show": "Показать",
  "admin.log.search": "Искать в журнале",
  "admin.log.copy": "Копировать",
  "admin.log.download": "Скачать",
  "admin.log.report": "Сообщить о проблеме",
  "admin.log.empty.nomatch": "Ничего не найдено",
  "admin.log.empty.none": "В журнале пока пусто",
  "admin.log.empty.hintFilter": "Попробуйте другой фильтр или поиск.",
  "admin.log.empty.hintNone": "Строки появятся здесь по мере того, как сервер их пишет.",
  "admin.log.copied.one": "Скопирована {count} строка.",
  "admin.log.copied.other": "Скопировано {count} строк.",
  "admin.log.copied.few": "Скопировано {count} строки.",
  "admin.log.copied.many": "Скопировано {count} строк.",
};
