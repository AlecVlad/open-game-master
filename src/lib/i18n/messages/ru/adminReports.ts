// Русский: вкладка «Отчёты» админ-панели.
// Ключи те же, что в en/adminReports.ts; формы .few и .many нужны только русскому.
import type { enAdminReports } from "../en/adminReports.ts";

export const ruAdminReports: Partial<Record<keyof typeof enAdminReports, string>> & Record<string, string> = {
  "admin.reports.reason.harassment": "Травля",
  "admin.reports.reason.sexual": "Сексуальный контент",
  "admin.reports.reason.hate": "Ненависть",
  "admin.reports.reason.violence": "Насилие или угрозы",
  "admin.reports.reason.spam": "Спам",
  "admin.reports.reason.other": "Другое",
  "admin.reports.err.generic": "Не получилось.",
  "admin.reports.title": "Очередь модерации",
  "admin.reports.showResolved": "Показывать закрытые",
  "admin.reports.intro": "Игроки отмечают фрагменты мастера, сообщения и других игроков за столом. Жалобы приходят только на этот сервер: центральной модерации за приложением нет.",
  "admin.reports.emptyAll": "Жалоб пока нет.",
  "admin.reports.emptyOpen": "Ничего не ждёт. Открытые жалобы появятся здесь.",
  "admin.reports.who.dm": "Фрагмент мастера",
  "admin.reports.who.player": "Игрок {name}",
  "admin.reports.who.deleted": "Игрок (учётная запись удалена)",
  "admin.reports.in": "в кампании",
  "admin.reports.reportedBy": ", пожаловался {name}, {date}",
  "admin.reports.reporterSays": "Автор жалобы пишет:",
  "admin.reports.resolve": "Отметить как закрытую",
  "admin.reports.reopen": "Открыть снова",
};
