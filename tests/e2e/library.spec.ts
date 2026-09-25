import { seedProfiles } from "../helpers/profile-fixtures";
import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const data = JSON.parse(
  readFileSync("src/content/library-puzzles.json", "utf8"),
) as { id: string; line: string[] }[];
test("library filters, complete multi-move puzzle and coordinate results stay profile-specific", async () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (x): x is [string, string] => typeof x[1] === "string",
    ),
  );
  env.CHESS_HOME_DATA = mkdtempSync(join(tmpdir(), "chess-library-"));
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page.getByRole("button", { name: "Задачи", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Библиотека тактики" }),
    ).toBeVisible();
    const puzzle = data.find(
      (p) => p.line.length === 3 && !p.line.some((m) => m.length === 5),
    )!;
    await page.getByPlaceholder("Найти задачу по ID").fill(puzzle.id);
    await expect(page.locator(".library-row")).toHaveCount(1);
    await page.locator(".library-row").click();
    for (const u of [puzzle.line[0], puzzle.line[2]]) {
      await expect(page.locator(".chessboard:visible")).toHaveAttribute(
        "aria-disabled",
        "false",
      );
      await page
        .locator(`[data-square="${u.slice(0, 2)}"]`)
        .last()
        .click();
      await page
        .locator(`[data-square="${u.slice(2, 4)}"]`)
        .last()
        .click();
    }
    await expect(
      page.getByText("Задача решена целиком!", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() => window.chessApp.snapshot())
          ).database.progress.hanoi.attempts.filter(
            (a) => a.itemId === puzzle.id && a.correct,
          ).length,
      )
      .toBe(1);
    await page
      .getByRole("button", { name: "Видение доски", exact: true })
      .click();
    await page.getByLabel("Показывать буквы и цифры по краям").uncheck();
    await expect(page.locator(".vision-layout .rank-label")).toHaveCount(0);
    await page.getByLabel("Сторона доски").selectOption("b");
    await page
      .getByRole("button", { name: "Начать тренировку", exact: true })
      .click();
    const target = await page.getByTestId("vision-target").textContent();
    await page.locator(`.vision-layout [data-square="${target}"]`).click();
    await page
      .getByRole("button", { name: "Завершить раунд", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.snapshot())).database
            .progress.hanoi.vision.length,
      )
      .toBe(1);
    const s = await page.evaluate(() => window.chessApp.snapshot());
    expect(s.database.progress.hanoi.vision[0].correct).toBe(1);
    expect(s.database.progress.hanoi.visionSettings.coordinates).toBe(false);
    await page.clock.install();
    await page
      .locator(".vision-layout")
      .getByLabel(/^Режим/)
      .selectOption("30");
    await page
      .getByRole("button", { name: "Ещё один раунд", exact: true })
      .click();
    await page.clock.fastForward(31000);
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.snapshot())).database
            .progress.hanoi.vision.length,
      )
      .toBe(2);
    await expect(
      page.getByRole("button", { name: "Ещё один раунд", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await page.locator(".profile-choice").nth(1).click();
    await page
      .getByRole("button", { name: "Видение доски", exact: true })
      .click();
    await expect(
      page.getByLabel("Показывать буквы и цифры по краям"),
    ).toBeChecked();
    expect(
      (await page.evaluate(() => window.chessApp.snapshot())).database.progress
        .sister.vision,
    ).toHaveLength(0);
  } finally {
    await app.close();
  }
});
test("opening atlas filters gambits and saves a completed short line", async () => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (x): x is [string, string] => typeof x[1] === "string",
    ),
  );
  env.CHESS_HOME_DATA = mkdtempSync(join(tmpdir(), "chess-openings-"));
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page.getByRole("button", { name: "Обучение", exact: true }).click();
    await page
      .getByRole("button", { name: "Открыть атлас", exact: true })
      .click();
    await page.getByLabel("Только гамбиты").check();
    await page
      .getByPlaceholder("Название, ECO или ходы: e4 e5…")
      .fill("Danish Gambit");
    await expect(page.locator(".library-row").first()).toContainText(
      "Датский гамбит",
    );
    await page.locator(".library-row").first().click();
    await page
      .getByRole("button", { name: "Тренировать по памяти", exact: true })
      .click();
    for (const u of ["e2e4", "d2d4", "c2c3"]) {
      await expect(page.locator(".chessboard:visible")).toHaveAttribute(
        "aria-disabled",
        "false",
      );
      await page
        .locator(`[data-square="${u.slice(0, 2)}"]`)
        .last()
        .click();
      await page
        .locator(`[data-square="${u.slice(2, 4)}"]`)
        .last()
        .click();
    }
    await expect(
      page.getByText("Вариант пройден и сохранён в твоём профиле.", {
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await app.close();
  }
});
