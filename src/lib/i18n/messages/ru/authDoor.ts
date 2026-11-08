// Русский: входная дверь (экран входа) и принудительная смена пароля.
// Ключи те же, что в en/authDoor.ts; формы .few и .many нужны только русскому.
import type { enAuthDoor } from "../en/authDoor.ts";

export const ruAuthDoor: Partial<Record<keyof typeof enAuthDoor, string>> & Record<string, string> = {
  "door.forced.title": "Задайте новый пароль",
  "door.forced.body": "Администратор сбросил ваш пароль. Введите выданный вам временный пароль и выберите новый.",
  "door.forced.submit": "Задать новый пароль",
  "door.w.high-fantasy": "Высокое фэнтези",
  "door.w.dark-fantasy": "Тёмное фэнтези",
  "door.w.horror": "Хоррор",
  "door.w.mystery": "Детектив",
  "door.w.steampunk": "Стимпанк",
  "door.w.cyberpunk": "Киберпанк",
  "door.w.post-apocalyptic": "Постапокалипсис",
  "door.behind": "Сегодня за дверью",
  "door.sevenKinds": "Один из семи видов мира, в которые может играть ваш стол.",
  "door.tagline": "Соберите отряд. Стол ведёт ИИ-мастер; кубики честны, а история принадлежит вам.",
  "door.howto": "Как играть",
  "door.licenses": "Лицензии",
  "door.privacy": "Конфиденциальность",
  "door.terms": "Условия",
};
