import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
test("themes, favorites, daily five and PGN-folder import persist per profile", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-themes-"));
  const env: Record<string, string> = Object.fromEntries(
    Object.entries({ ...process.env, CHESS_HOME_DATA: dir }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  delete env.ELECTRON_RUN_AS_NODE;
  let app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    const backgrounds = new Set<string>();
    for (const [id, label] of [
      ["green", "Зелёная"],
      ["purple", "Тёмно-фиолетовая"],
      ["blue", "Тёмно-синяя"],
      ["red", "Тёмно-красная"],
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", id);
      backgrounds.add(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).backgroundColor,
        ),
      );
      if (process.env.TOSHA_CAPTURE) {
        mkdirSync(".impeccable/review/themes", { recursive: true });
        await page.screenshot({
          path: resolve(`.impeccable/review/themes/${id}.png`),
        });
      }
    }
    expect(backgrounds.size).toBe(4);
    await page.getByRole("button", { name: "Задачи", exact: true }).click();
    await page.getByRole("button", { name: /Пять задач дня/ }).click();
    await expect(page.locator(".library-row")).toHaveCount(5);
    await page.locator(".library-row").first().click();
    await page
      .getByRole("button", { name: "В избранное", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Убрать из избранного", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    if (process.env.TOSHA_CAPTURE)
      await page.screenshot({
        path: resolve(".impeccable/review/themes/red-puzzle.png"),
      });
    await page
      .getByRole("button", { name: "К библиотеке", exact: true })
      .click();
    await page.getByRole("button", { name: /Избранное/ }).click();
    await expect(page.locator(".library-row")).toHaveCount(1);
    const favorite = (await page.evaluate(() => window.chessApp.snapshot()))
      .database.progress.hanoi.favorites[0];
    await page
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await page.locator(".profile-choice").nth(1).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "green");
    await page.getByRole("button", { name: "Задачи", exact: true }).click();
    await page.getByRole("button", { name: /Избранное/ }).click();
    await expect(page.locator(".library-row")).toHaveCount(0);
    expect(
      await page.evaluate(async (id) => {
        try {
          await window.chessApp.favorite("hanoi", id, false);
          return false;
        } catch {
          return true;
        }
      }, favorite),
    ).toBe(true);
    const folder = join(dir, "pgn");
    mkdirSync(folder);
    writeFileSync(
      join(folder, "example.pgn"),
      '[White "Player"]\n[Black "Other"]\n\n1. f3 e5 2. g4 Qh4# 0-1',
    );
    await app.evaluate(({ dialog }, folder) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [folder],
      });
    }, folder);
    expect(await page.evaluate(() => window.chessApp.importArchive())).toEqual({
      added: 1,
      skipped: 0,
    });
    expect(
      (await page.evaluate(() => window.chessApp.snapshot())).database.games[0]
        .profileId,
    ).toBe("sister");
    if (process.env.TOSHA_CAPTURE) {
      await page
        .getByRole("button", { name: "Настройки", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Тёмно-синяя", exact: true })
        .click();
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setSize(1100, 760),
      );
      await page.getByRole("button", { name: "Puzzles", exact: true }).click();
      await page.getByRole("button", { name: /Daily five/ }).click();
      await page.screenshot({
        path: resolve(".impeccable/review/themes/blue-daily-small.png"),
      });
    }
    await app.close();
    app = await electron.launch({ args: ["."], env });
    const again = await app.firstWindow();
    await again.locator(".profile-choice").first().click();
    await expect(again.locator("html")).toHaveAttribute("data-theme", "red");
    const snapshot = await again.evaluate(() => window.chessApp.snapshot());
    expect(snapshot.database.progress.hanoi.favorites).toEqual([favorite]);
    expect(snapshot.database.progress.sister.favorites).toEqual([]);
  } finally {
    await app.close();
  }
});
