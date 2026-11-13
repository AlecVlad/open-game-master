// Русский: главный экран: диалог быстрого старта и полка мастерской.
// Ключи те же, что в en/homeBench.ts; формы .few и .many нужны только русскому.
import type { enHomeBench } from "../en/homeBench.ts";

export const ruHomeBench: Partial<Record<keyof typeof enHomeBench, string>> & Record<string, string> = {
  "home.starter.err": "Не удалось запустить приключение.",
  "home.starter.error.invalidRequest": "Не удалось прочитать запрос на быстрый старт.",
  "home.starter.error.noStoryteller": "На сервере не настроен рассказчик. Настройте его, прежде чем запускать приключение.",
  "home.starter.title": "Быстрый старт",
  "home.starter.fallbackTitle": "Приключение на один вечер",
  "home.starter.loading": "Загружаю приключение...",
  "home.starter.heroes": "Готовые герои, выбираются в лобби",
  "home.starter.note": "Уровень 1, три сцены, одна встреча. Рассказывает ИИ; при желании вы направляете игру в настройках лобби. Друзья заходят по коду комнаты, который показывает лобби.",
  "home.starter.solo": "Играть одному",
  "home.starter.host": "Провести для друзей",
  "home.bench.aria": "Мастерская",
  "home.bench.eyebrow": "Мастерская",
  "home.bench.lede": "Создавайте карты, НПС, монстров, историю и правила ещё до того, как появится стол.",
  "home.bench.open": "Открыть мастерскую",
  "home.bench.menuOpen": "Открыть",
  "home.bench.menuDup": "Дублировать",
  "home.bench.party": "Группа из {size} на уровне {level}",
  "home.bench.dupTip": "Скопировать эту мастерскую со всем содержимым",
  "home.bench.dupAria": "Дублировать «{title}»",
  "home.bench.empty": "На верстаке пока пусто. Мастерская принадлежит только вам, и ничто из неё не попадёт за стол, пока вы сами это не перенесёте.",
};
