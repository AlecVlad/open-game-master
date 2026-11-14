// Русский: диалог обрезки аватара.
// Ключи те же, что в en/avatarCrop.ts; формы .few и .many нужны только русскому.
import type { enAvatarCrop } from "../en/avatarCrop.ts";

export const ruAvatarCrop: Partial<Record<keyof typeof enAvatarCrop, string>> & Record<string, string> = {
  "avatar.err.type": "Поддерживаются только изображения PNG, JPEG и WebP.",
  "avatar.err.size": "Изображение больше 8 МБ.",
  "avatar.err.upload": "Не удалось загрузить.",
  "avatar.err.process": "Не удалось обработать изображение.",
  "avatar.close": "Закрыть",
  "avatar.framing": "Кадрирование портрета",
  "avatar.hint": "Перетащите картинку или выберите её и двигайте стрелками. Ползунок меняет масштаб.",
  "avatar.zoom": "Масштаб",
  "avatar.fit": "По центру и по размеру",
  "avatar.choose": "Выбрать изображение",
  "avatar.other": "Другое изображение",
  "avatar.cancel": "Отмена",
  "avatar.save": "Сохранить",
};
