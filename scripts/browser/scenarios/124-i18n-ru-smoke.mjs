// Explicit Russian smoke check for the campaign creator's dynamically selected DM-mode labels.
import { check, eventually } from "../lib.mjs";

const scenario = {
  name: "i18n-ru-smoke",
  onlyWhenNamed: true,
  viewports: ["desktop"],
  async run(t) {
    const { page, root } = t;
    const language = await page.evaluate(() => navigator.language);
    check(/^ru(?:-|$)/i.test(language), `the browser locale is Russian (${language})`);

    await t.open("/");
    const tile = page
      .locator(`${root}[data-tour="tile-new-campaign"], [data-tour="tile-new-campaign"]`)
      .locator("visible=true")
      .first();
    await eventually(() => tile.count(), {
      timeoutMs: 30_000,
      label: "the New campaign tile",
    });
    await t.tap(tile);

    const dialog = page
      .getByRole("dialog")
      .filter({ has: page.locator(".cc-shell, .wizard-continue") })
      .first();
    await eventually(() => dialog.locator("button.wizard-continue").count(), {
      timeoutMs: 30_000,
      label: "the campaign creator",
    });

    const visibleText = await dialog.innerText();
    check(
      !visibleText.includes("createCampaign."),
      "the Russian campaign creator contains no raw translation keys",
    );
    check(visibleText.includes("Вести игру самому"), "the human DM-mode label is translated");
    check(
      visibleText.includes("Вы самостоятельно ведёте игру без ИИ-рассказчика."),
      "the human DM-mode hint is translated",
    );
  },
};

export default scenario;
