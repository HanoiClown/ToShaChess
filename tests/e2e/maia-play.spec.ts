import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
test("portable Maia plays through the UI and normal mode completes with local accuracy", async () => {
  test.skip(
    !existsSync(resolve("engine-packs/maia-cpu.json")),
    "Optional Maia runtime is not installed",
  );
  test.setTimeout(120000);
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-maia-game-")),
    TOSHACHESS_ENGINES: resolve("engine-packs"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page
      .getByRole("button", { name: "Играть", exact: true })
      .first()
      .click();
    await page
      .getByRole("combobox", { name: "Соперник", exact: true })
      .selectOption("maia");
    await page
      .getByRole("combobox", { name: "Режим", exact: true })
      .selectOption("normal");
    await page
      .getByRole("button", { name: "Начать партию", exact: true })
      .click();
    for (const sq of ["e2", "e4"])
      await page.locator(`[data-square="${sq}"]:visible`).click();
    await expect
      .poll(
        async () => {
          const s = await page.evaluate(() => window.chessApp.snapshot());
          return s.database.games[0]?.moves.length;
        },
        { timeout: 30000 },
      )
      .toBe(2);
    await expect(
      page.locator(".player-bar").filter({ hasText: "Maia-3" }),
    ).toContainText("1100");
    await expect(
      page.getByRole("button", { name: "Подсказка", exact: true }),
    ).toHaveCount(0);
    const s = await page.evaluate(() => window.chessApp.snapshot());
    expect(s.database.games[0].maia).toMatchObject({
      pack: "maia-cpu",
      selfElo: 1100,
    });
    expect(s.database.usage).toHaveLength(0);
    await page.getByRole("button", { name: "Сдаться", exact: true }).click();
    await page
      .getByRole("button", { name: "Да, сдаться", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Разбор партии", exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () => {
          const x = await page.evaluate(() => window.chessApp.snapshot());
          return x.database.games[0].analysis.length;
        },
        { timeout: 30000 },
      )
      .toBe(2);
    await page
      .getByRole("button", { name: "Исследовать позицию", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Мои исследования", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Сыграть отсюда", exact: true })
      .click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    expect(await page.evaluate(() => window.chessApp.getFullscreen())).toBe(
      true,
    );
    if (process.env.TOSHA_CAPTURE) {
      mkdirSync(".impeccable/review/community", { recursive: true });
      await page.screenshot({
        path: ".impeccable/review/community/maia-study.png",
        fullPage: true,
      });
    }
  } finally {
    await app.close();
  }
});
