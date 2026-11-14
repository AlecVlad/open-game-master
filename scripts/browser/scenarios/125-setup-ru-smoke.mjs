import { check, eventually } from "../lib.mjs";

const scenario = {
  name: "setup-ru-smoke",
  onlyWhenNamed: true,
  viewports: ["desktop"],
  async run(t) {
    const { page } = t;
    await t.open("/setup");

    const language = page.locator("html");
    await eventually(async () => (await language.getAttribute("lang")) === "en", {
      timeoutMs: 15_000,
      label: "setup starts in English under the default test locale",
    });

    const russian = page.getByRole("button", { name: "Русский", exact: true });
    check(await russian.isVisible(), "the setup page shows a Russian language switch");

    await t.tap(russian);
    await eventually(async () => (await language.getAttribute("lang")) === "ru", {
      timeoutMs: 15_000,
      label: "the language switch changes the document language to Russian",
    });

    await eventually(async () => (await page.locator("body").innerText()).includes("Подготовим игровой стол"), {
      timeoutMs: 15_000,
      label: "the wizard title is translated into Russian",
    });

    const ruText = await page.locator("body").innerText();
    check(ruText.includes("Название сервера"), "the welcome form is in Russian");
    check(ruText.includes("Что мы настроим"), "the welcome checklist is in Russian");
    check(!ruText.includes("What we will set up"), "the English welcome checklist is absent");
    check(!/setup\\.[a-zA-Z0-9_.]+/.test(ruText), "no raw setup translation keys are visible");

    await t.tap(page.getByRole("button", { name: "English", exact: true }));
    await eventually(async () => (await language.getAttribute("lang")) === "en", {
      timeoutMs: 15_000,
      label: "the language switch can return setup to English",
    });
    const enText = await page.locator("body").innerText();
    check(enText.includes("What we will set up"), "the English welcome checklist returns");

    await t.tap(page.getByRole("button", { name: "Русский", exact: true }));
    await eventually(async () => (await language.getAttribute("lang")) === "ru", {
      timeoutMs: 15_000,
      label: "Russian can be selected again",
    });

    await t.tap(page.getByRole("button", { name: "Начать", exact: true }));
    await eventually(async () => (await page.locator("body").innerText()).includes("Кто будет вести повествование?"), {
      timeoutMs: 15_000,
      label: "the storyteller step is translated",
    });
    await t.tap(page.getByRole("radio", { name: /Человек за игровым столом/ }));
    await t.tap(page.getByRole("button", { name: "Продолжить", exact: true }));

    await eventually(async () => (await page.locator("body").innerText()).includes("Нужны ли игровому столу изображения?"), {
      timeoutMs: 15_000,
      label: "the pictures step is translated",
    });
    await t.tap(page.locator("[data-wizard-secondary]"));

    await eventually(async () => (await page.locator("body").innerText()).includes("Должен ли ведущий говорить вслух?"), {
      timeoutMs: 15_000,
      label: "the voice step is translated",
    });
    await t.tap(page.locator("[data-wizard-secondary]"));

    await eventually(async () => (await page.locator("body").innerText()).includes("Как игроки будут подключаться?"), {
      timeoutMs: 15_000,
      label: "the players step is translated",
    });
    await t.tap(page.locator("[data-wizard-secondary]"));

    await eventually(async () => (await page.locator("body").innerText()).includes("Подключить своего ИИ-агента?"), {
      timeoutMs: 15_000,
      label: "the agent step is translated",
    });
    await t.tap(page.getByRole("button", { name: "Пока пропустить", exact: true }));

    await eventually(async () => (await page.locator("body").innerText()).includes("Сервер готов"), {
      timeoutMs: 15_000,
      label: "the ready step is translated",
    });
    const finalText = await page.locator("body").innerText();
    check(finalText.includes("Что сервер умеет сейчас"), "the ready summary heading is in Russian");
    check(!/setup\\.[a-zA-Z0-9_.]+/.test(finalText), "no raw setup translation keys appear in the wizard");
    check(!finalText.includes("What this server can do now"), "the English ready heading is absent");
  },
};

export default scenario;
