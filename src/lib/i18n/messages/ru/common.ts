// Русский: общие слова и страница настроек. Ключи те же, что в en/common.ts.
// Словарь терминов: docs/i18n.md.
import type { enCommon } from "../en/common.ts";

export const ruCommon: Partial<Record<keyof typeof enCommon, string>> = {
  "lang.label": "Язык",
  "lang.hint": "Язык меню, кнопок и сообщений. Хранится на этом устройстве. Язык, на котором рассказывается история, настраивается отдельно в каждой кампании.",
  "appearance.heading": "Внешний вид",
  "appearance.intro": "Хранится на этом устройстве. Игровое поле и его холсты рисуются в своём размере при любом масштабе.",
  "appearance.theme": "Тема",
  "appearance.theme.auto": "Как в системе",
  "appearance.theme.dark": "Тайная ночь",
  "appearance.theme.light": "Пергаментный день",
  "appearance.scale": "Масштаб интерфейса",
  "appearance.reset": "Сбросить",
  "common.action.save": "Сохранить",
};
