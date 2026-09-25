import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { seedLibrary } from "../helpers/library-fixture";
test("empty public install creates users, plays offline pack and records earned progress", async () => {
  const data = mkdtempSync(join(tmpdir(), "tosha-onboarding-")),
    packs = join(data, "packs");
  seedLibrary(packs);
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(
      (x): x is [string, string] => typeof x[1] === "string",
    ),
  );
  env.CHESS_HOME_DATA = data;
  env.TOSHACHESS_LIBRARY = packs;
  delete env.ELECTRON_RUN_AS_NODE;
  let app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await expect(page.locator(".profile-choice")).toHaveCount(0);
    await expect(page.getByLabel("Никнейм", { exact: true })).toBeVisible();
    const capture = async (name: string) => {
      if (process.env.TOSHA_CAPTURE) {
        mkdirSync(".impeccable/review/v13", { recursive: true });
        await page.screenshot({
          path: resolve(`.impeccable/review/v13/${name}.png`),
        });
      }
    };
    await capture("01-create-profile");
    await page.getByLabel("Имя", { exact: true }).fill("Алекс");
    await page.getByLabel("Никнейм", { exact: true }).fill("AlexChess");
    await page
      .getByLabel("Уровень игры", { exact: true })
      .selectOption("beginner");
    await page
      .getByLabel("Мой рейтинг · необязательно", { exact: true })
      .fill("483");
    await page
      .getByRole("button", { name: "Создать профиль и начать", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Твой следующий ход" }),
    ).toBeVisible();
    const owner = (await page.evaluate(() => window.chessApp.snapshot()))
      .activeProfile!;
    await page
      .getByRole("button", { name: "Большая база", exact: true })
      .click();
    await expect(page.locator(".database-summary")).toContainText("Задачи: 1");
    await page
      .locator(".database-filters select")
      .first()
      .selectOption("first");
    await page.getByRole("button", { name: "Найти", exact: true }).click();
    await expect(page.locator(".library-row")).toHaveCount(1);
    await page.getByPlaceholder("00sHx").fill("TST01");
    await expect(
      page.locator(".database-filters select").first(),
    ).toBeDisabled();
    await expect(
      page.locator(".database-filters select").nth(1),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Найти", exact: true }).click();
    await expect(page.locator(".library-row")).toHaveCount(1);
    await capture("04-puzzle-search");
    await page.locator(".library-row").click();
    await page
      .getByRole("button", { name: "В избранное", exact: true })
      .click();
    await page.locator('[data-square="g6"]').last().click();
    await page.locator('[data-square="g7"]').last().click();
    await expect(
      page.getByText("Задача решена целиком!", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Сегодня", exact: true }).click();
    await expect(page.locator(".growth-panel")).toContainText("10 XP");
    await page.locator(".growth-details summary").click();
    await page.locator(".growth-panel").scrollIntoViewIfNeeded();
    await capture("02-earned-progress");
    await page.getByRole("button", { name: "Задачи", exact: true }).click();
    await page.getByRole("button", { name: /Избранное/ }).click();
    await expect(page.locator(".library-row")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Большая база", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Архив партий", exact: true })
      .click();
    await page.getByLabel("Ник начинается с").fill("Ex");
    await page.getByRole("button", { name: "Найти", exact: true }).click();
    await page.locator(".database-game-row").click();
    await capture("05-game-replay");
    await page
      .getByRole("button", { name: "Следующий ход", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Сохранить для разбора", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.snapshot())).database.games
            .length,
      )
      .toBe(1);
    await page
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Создать профиль", exact: true })
      .click();
    await page.getByLabel("Имя", { exact: true }).fill("Сэм");
    await page.getByLabel("Никнейм", { exact: true }).fill("AlexChess");
    await page
      .getByRole("button", { name: "Создать профиль и начать", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("уже используется");
    await page.getByLabel("Никнейм", { exact: true }).fill("SamChess");
    await page
      .getByRole("button", { name: "Создать профиль и начать", exact: true })
      .click();
    await expect(page.locator(".growth-panel")).toContainText("0 XP");
    const s = await page.evaluate(() => window.chessApp.snapshot());
    expect(s.database.profiles).toHaveLength(2);
    expect(s.database.progress[s.activeProfile!].attempts).toEqual([]);
    expect(s.database.progress[owner].favorites).toEqual(["lichess_TST01"]);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(1100, 760),
    );
    await page.locator(".growth-panel").scrollIntoViewIfNeeded();
    await capture("03-progress-small-en");
    await app.close();
    app = await electron.launch({ args: ["."], env });
    const reopened = await app.firstWindow();
    await expect(reopened.locator(".profile-choice")).toHaveCount(2);
    expect(
      (await reopened.evaluate(() => window.chessApp.snapshot())).database
        .progress[owner].attempts,
    ).toHaveLength(1);
  } finally {
    await app.close();
  }
});
