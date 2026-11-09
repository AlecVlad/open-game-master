// Русский: раздел «Генерация изображений» админ-панели.
// Ключи те же, что в en/adminImages.ts; формы .few и .many нужны только русскому.
import type { enAdminImages } from "../en/adminImages.ts";

export const ruAdminImages: Partial<Record<keyof typeof enAdminImages, string>> & Record<string, string> = {
  "admin.images.noModel": "Модель не выбрана, поэтому ничего не рисуется, пока вы её не выберете.",
  "admin.images.err.comfy": "Не удалось проверить ComfyUI. Проверьте адрес сервера.",
  "admin.images.model": "Модель изображений",
  "admin.images.refresh": "Обновить",
  "admin.images.title.comfyui": "ComfyUI",
  "admin.images.title.flux": "Воркер FLUX",
  "admin.images.title.openai": "API изображений, совместимый с OpenAI",
  "admin.images.comfy.url": "Адрес сервера",
  "admin.images.flux.url": "Адрес воркера",
  "admin.images.flux.extra": "Воркер загружает собственную модель FLUX.",
  "admin.images.openai.base": "Базовый адрес сервера",
  "admin.images.openai.base.hint": "Сам OpenAI или любой сервер с /v1/images/generations в стиле OpenAI. Пусто = api.openai.com.",
  "admin.images.openai.model": "Модель",
  "admin.images.openai.model.hint": "Модели изображений, которые перечисляет сервер.",
  "admin.images.openai.key": "Ключ API",
  "admin.images.openai.key.env": "Ключ также задан переменной окружения; если заполнить это поле, он имеет приоритет.",
  "admin.images.openai.key.billed": "Оплачивает владелец ключа. Используется, только если бэкенд кампании — этот API.",
  "admin.images.heading": "Генерация изображений",
  "admin.images.default.label": "Бэкенд по умолчанию",
  "admin.images.default.hint.phone": "Для новых кампаний. API, совместимый с OpenAI, рисует на другой машине с ключом ниже, и GPU здесь не нужен.",
  "admin.images.default.hint": "Для новых кампаний; кампания может выбрать любой бэкенд, настроенный ниже. ComfyUI и воркеры FLUX работают на этой машине; API, совместимый с OpenAI, рисует там, куда указывает его адрес.",
  "admin.images.opt.auto": "Авто ({value})",
  "admin.images.opt.comfyLocal": "ComfyUI (локально)",
  "admin.images.opt.mflux": "Воркер FLUX: mflux (Apple Silicon)",
  "admin.images.opt.sdnq": "Воркер FLUX: sdnq (CUDA/ROCm)",
  "admin.images.opt.harness": "Собственные картинки программы-агента",
  "admin.images.harness.note": "Картинки приходят от программы-агента, настроенной в разделе «Агент»; собственного адреса и ключа у неё нет.",
  "admin.images.others": "Другие бэкенды, которые может выбрать кампания:",
};
