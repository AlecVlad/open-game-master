# Контрольная точка — 2026-11-11

Репозиторий: `AlecVlad/open-game-master`  
Рабочая ветка: `i18n-ru-agent2`  
Файл состояния: [STATUS.md](./STATUS.md)

## Последняя подтверждённая контрольная точка до этого файла

HEAD ветки перед созданием этой контрольной точки: `5e7d731df8c00a925ca3e9dc3a699af5184e303b`  
Последний коммит: `Localize storyboard title placeholder and compile summary`.

## Подтверждённо локализованные участки

В `STATUS.md` уже описаны следующие завершённые подучастки:

- Вспомогательные действия консоли ведущего: `HeldAsks.tsx`, `DmQueuedAction.tsx`, `DmEnemyHpCard.tsx`, `DmDelegationPanel.tsx`.
- Таблицы ведущего и поиск по бестиарию: `DmTablesPanel.tsx`, `RefPicker.tsx`, `TableRows.tsx`, `StatblockFinder.tsx`, общие элементы выбора/сортировки/ошибок.
- Калькулятор столкновений: `DmWorkbenchPanel.tsx`, `encounter-workbench.ts`, API `dm/workbench/route.ts`. Язык интерфейса передаётся в расчётный модуль; числовая модель не менялась.

Также в STATUS.md есть более ранние локализованные участки: оболочка консоли, каталог действий, НИП и отношения, заметки/лор/звук, верхняя панель, рынок, калькулятор вероятностей, голосовые панели, фракции, календарь и другие компоненты. Полный список и оговорки находятся в STATUS.md.

## Текущая работа после контрольной точки — Storyboard

После фиксации предыдущей контрольной точки работа продолжена в той же ветке.

### Что сделано

- Подключены EN/RU сообщения для семи типов сюжетных карточек и их подсказок.
- Локализованы метки маршрутов, связи с персонажами/картами/столкновениями/местами, происхождение карточек и структурные рекомендации.
- Переведены карточки доски, состояния отсутствующих связей, общая мастерская и её описание.
- Оба режима отображения Storyboard используют один локализованный компонент сводки импорта. Английские `summary.lines` и `arcRefusal` из `board-compile.ts` не показываются напрямую.
- Сводка, счётчики связей, маршрутов и создаваемых записей используют plural-aware сообщения: 15 групп с EN `one/other` и RU `one/few/many/other`.
- Переведены API-ошибки пустого названия, превышения длины карточки и отсутствующей карточки в POST/PATCH/DELETE.
- Добавлены тесты в `scripts/test-i18n.mjs` для сообщений Storyboard, форм множественного числа и локализации API-ошибок.
- В `STATUS.md` добавлен отдельный отчёт по Storyboard с границами сделанного и оставшимися проверками.

### Изменённые файлы

- `src/app/campaigns/[campaignId]/DmStoryboardPanel.tsx`
- `src/app/workshop/storyboard/BeatEditor.tsx`
- `src/app/workshop/storyboard/BeatBoard.tsx`
- `src/app/workshop/storyboard/BoardAsides.tsx`
- `src/app/workshop/storyboard/storyboard-i18n.ts`
- `src/lib/workshop/storyboard-api-i18n.ts` (новый helper)
- `src/app/api/campaigns/[campaignId]/dm/storyboard/route.ts`
- `src/app/api/campaigns/[campaignId]/dm/storyboard/[beatId]/route.ts`
- `src/lib/i18n/messages/en/campaignPanels.ts`
- `src/lib/i18n/messages/ru/campaignPanels.ts`
- `scripts/test-i18n.mjs`
- `docs/i18n-ru-agent2/STATUS.md`

### Проверка и ограничения

- [x] Статически сверены обращения `t()` и `tp()`, наличие используемых ключей EN/RU, plural-формы и параметры-плейсхолдеры.
- [x] Проверено регулярное выражение для ошибок превышения длины: варианты с цитатой и без неё распознаются.
- [ ] Не запускались: `node scripts/test-i18n.mjs`, `node scripts/test-workshop-board.mjs`, TypeScript, lint, production build и браузерный smoke test.
- [ ] GitHub Actions для ветки не создал запусков; зелёного CI-подтверждения нет.
- [ ] `src/lib/workshop/import-board.ts` содержит отдельные англоязычные предупреждения и заметки сценария импорта. Это отдельный экран Workshop, не покрытый текущей локализацией Storyboard.
- [ ] Общие сетевые/серверные ошибки и динамические данные мастерской, приходящие из других API, могут остаться на языке источника.

**Статус:** основная локализация интерфейса Storyboard подключена, но подучасток не закрывать до фактического запуска тестов, TypeScript/lint/build и браузерной проверки. Не создавать `BLOCK-01-SESSION-DONE`.

## Следующий порядок работы

1. Запустить `node scripts/test-i18n.mjs` и исправить обнаруженные ошибки.
2. Запустить `node scripts/test-workshop-board.mjs`, затем TypeScript, lint и production build.
3. Проверить Storyboard в браузере в обоих режимах и при разных количествах связей/записей.
4. Отдельно локализовать импортные предупреждения из `src/lib/workshop/import-board.ts` в рамках блока Workshop либо перенести их в соответствующий участок плана.
5. После проверок обновить `STATUS.md`. Не создавать флаг завершения блока 1: другие панели игровой сессии ещё остались.

