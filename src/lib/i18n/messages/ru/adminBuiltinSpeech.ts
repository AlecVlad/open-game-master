// Русский: карточка встроенного распознавания речи в разделе «Речь» админ-панели.
// Ключи те же, что в en/adminBuiltinSpeech.ts; формы .few и .many нужны только русскому.
import type { enAdminBuiltinSpeech } from "../en/adminBuiltinSpeech.ts";

export const ruAdminBuiltinSpeech: Partial<Record<keyof typeof enAdminBuiltinSpeech, string>> & Record<string, string> = {
  "admin.builtinSpeech.active.whisper": "службу Whisper",
  "admin.builtinSpeech.active.builtin": "встроенный движок",
  "admin.builtinSpeech.active.openai": "OpenAI по ключу этого сервера",
  "admin.builtinSpeech.active.none": "пока ничего, поэтому кнопки микрофона скрыты (приложение для Android использует собственный распознаватель телефона)",
  "admin.builtinSpeech.err.read": "Не удалось прочитать состояние движка речи.",
  "admin.builtinSpeech.err.network": "Не удалось связаться с сервером.",
  "admin.builtinSpeech.title": "Встроенное распознавание речи",
  "admin.builtinSpeech.intro": "Запускает Whisper внутри этого сервера на процессоре, поэтому диктовка и «нажми и говори» работают без отдельной службы речи. Один раз скачивает {mb} МБ. Служба Whisper, если она отвечает, по-прежнему в приоритете.",
  "admin.builtinSpeech.installed": "Установлено",
  "admin.builtinSpeech.installing": "Установка",
  "admin.builtinSpeech.retry": "Повторить",
  "admin.builtinSpeech.install": "Установить",
  "admin.builtinSpeech.downloading": "Загрузка {model}: {percent}%",
  "admin.builtinSpeech.starting": "Начинаю загрузку {model}...",
  "admin.builtinSpeech.failed": "Установка не удалась: {error}",
  "admin.builtinSpeech.using": "Диктовка использует ",
  "admin.builtinSpeech.note.whisper": "Служба Whisper отвечает, но для неё не выбрана модель и она не перечисляет ровно одну, поэтому диктовка её пропускает. Выберите модель в поле «Модель Whisper».",
  "admin.builtinSpeech.note.openai": "Ключ OpenAI сохранён, но модель распознавания не выбрана, поэтому ничего не слышно, пока вы не выберете её в блоке «Распознавание OpenAI» в Админ-панели > Речь.",
};
