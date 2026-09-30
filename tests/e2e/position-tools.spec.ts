import { navigateSection } from "../helpers/navigation";
import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

test("position tools explain their purpose and keep setup out of the analysis board", async () => {
  const directory = mkdtempSync(join(tmpdir(), "tosha-tool-purpose-"));
  seedProfiles(directory);
  const env = {
    ...process.env,
    CHESS_HOME_DATA: directory,
    TOSHACHESS_ENGINES: join(directory, "empty-packs"),
  } as Record<string, string>;
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await navigateSection(page, "Исследования");
    await page
      .getByRole("button", { name: "Новое исследование", exact: true })
      .click();
    const tools = page.locator(".position-toolbox");
    await expect(tools).toHaveCount(1);
    await tools.locator(":scope > summary").click();
    const purpose = tools.getByRole("combobox", {
      name: "Что хочешь узнать?",
      exact: true,
    });
    await expect(purpose).toHaveValue("human");
    await expect(
      tools.getByRole("combobox", { name: "Модель", exact: true }),
    ).not.toBeVisible();
    await expect(tools).toContainText("Установи Maia");
    await purpose.selectOption("tablebase");
    await expect(tools).toContainText("3–5 фигурами");
    await expect(
      tools.getByRole("button", { name: "Проверить окончание", exact: true }),
    ).toBeDisabled();
    await purpose.selectOption("search");
    await expect(tools).toContainText("Подключи дополнительный движок");
    await expect(
      tools.getByRole("button", { name: "Выбрать Lc0", exact: true }),
    ).toHaveCount(0);
    await tools
      .getByRole("button", {
        name: "Открыть настройки инструментов",
        exact: true,
      })
      .click();
    await expect(page.locator(".settings-layout")).toBeVisible();
    await expect(page.locator(".settings-extensions > summary")).toBeFocused();
    await expect(page.locator(".settings-extensions")).toHaveJSProperty(
      "open",
      true,
    );
  } finally {
    await app.close();
  }
});
