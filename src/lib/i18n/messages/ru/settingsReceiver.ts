// Русский: настройка приёмника игрока в подключённых агентах.
// Ключи те же, что в en/settingsReceiver.ts; формы .few и .many нужны только русскому.
import type { enSettingsReceiver } from "../en/settingsReceiver.ts";

export const ruSettingsReceiver: Partial<Record<keyof typeof enSettingsReceiver, string>> & Record<string, string> = {
  "settings.recv.noChar": "Чтобы будить этого агента в его ход, сначала сыграйте за персонажа за этим столом, а затем подключите агента заново.",
  "settings.recv.fallback": "Проверьте адрес и порт.",
  "settings.recv.err.check": "Не удалось проверить этот адрес.",
  "settings.recv.err.net": "Не удалось связаться с сервером.",
  "settings.recv.title": "Будить агента персонажа {name} в его ход (Codex)",
  "settings.recv.intro": "Небольшой приёмник на компьютере агента запускает ход Codex, когда столу нужен {name}. Для него нужны этот репозиторий, Node 22.18 или новее, Codex и HTTPS-адрес, до которого достаёт этот сервер, например Tailscale Funnel.",
  "settings.recv.nohttps": "Эта страница открыта по адресу {url}, это не HTTPS, а приёмник общается с ODM только по HTTPS. Откройте «Настройки» через HTTPS-адрес сервера и подключите агента заново, чтобы в файле приёмника был указан этот адрес.",
  "settings.recv.noallow": "Этот сервер пока не разрешил ни одного адреса приёмника. Администратор добавляет ваш в разделе «Панель администратора > Агенты игроков»{poll}.",
  "settings.recv.noallow.poll": ", либо воспользуйтесь ссылкой для опроса ниже",
  "settings.recv.addr": "HTTPS-адрес приёмника",
  "settings.recv.port": "Локальный порт",
  "settings.recv.multi": "Сажаете за стол больше одного агента с одного компьютера? Дайте каждому свой локальный порт (8787, 8788, 8789) и свой HTTPS-порт (Funnel принимает 443, 8443 и 10000).",
  "settings.recv.checking": "Проверяем, может ли этот сервер до него достучаться…",
  "settings.recv.ok": "Этот сервер может отправлять запросы на {origin}.",
  "settings.recv.na.head": "Этот сервер пока не отправляет запросы на {origin}.",
  "settings.recv.na.link": "Разрешите его в разделе «Панель администратора > Агенты игроков»",
  "settings.recv.na.ask": "Попросите администратора разрешить его в разделе «Панель администратора > Агенты игроков»",
  "settings.recv.na.tail": ", затем выполните настройку ниже.",
  "settings.recv.download": "Скачать {file}",
  "settings.recv.keep": "Храните его в своей закрытой папке вне репозитория. Ниже замените PATH на эту папку.",
  "settings.recv.step.setup": "В репозитории ODM на этом компьютере один раз выполните настройку. Она запросит токен, показанный выше.",
  "settings.recv.step.setup.label": "команда настройки",
  "settings.recv.step.listen": "Запустите приёмник и не останавливайте его.",
  "settings.recv.step.listen.label": "команда приёмника",
  "settings.recv.step.tunnel": "Один раз опубликуйте его по указанному вами адресу.",
  "settings.recv.step.tunnel.label": "команда Tailscale Funnel",
  "settings.recv.step.own": "Направьте свой HTTPS-туннель на http://127.0.0.1:{port}, чтобы указанный вами адрес вёл к нему.",
};
