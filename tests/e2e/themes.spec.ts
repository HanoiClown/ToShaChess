import { seedProfiles } from "../helpers/profile-fixtures";
import { test, expect, _electron as electron } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  openSync,
  ftruncateSync,
  closeSync,
  unlinkSync,
} from "node:fs";
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
  seedProfiles(env.CHESS_HOME_DATA);
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

test("archive import preflights oversized PGNs before reads or profile changes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-archive-limit-"));
  const folder = join(dir, "archive");
  mkdirSync(folder);
  writeFileSync(join(folder, "a-valid.pgn"), "1. e4 e5 *");
  const oversized = join(folder, "z-oversized.pgn");
  const fd = openSync(oversized, "w");
  try {
    ftruncateSync(fd, 10_000_001);
  } finally {
    closeSync(fd);
  }
  mkdirSync(join(folder, "zz-directory.pgn"));
  const env: Record<string, string> = Object.fromEntries(
    Object.entries({ ...process.env, CHESS_HOME_DATA: dir }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(dir);
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    const before = (await page.evaluate(() => window.chessApp.snapshot()))
      .database;
    await app.evaluate(({ dialog }, folder) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [folder],
      });
      const fs = process.getBuiltinModule("node:fs") as any;
      const originalRead = fs.readFileSync;
      const probe = {
        reads: 0,
        restore: () => {
          fs.readFileSync = originalRead;
        },
      };
      (globalThis as any).__archiveReadProbe = probe;
      fs.readFileSync = (...args: any[]) => {
        if (String(args[0]).startsWith(folder)) probe.reads++;
        return originalRead(...args);
      };
    }, folder);
    const rejection = await page.evaluate(async () => {
      try {
        await window.chessApp.importArchive();
        return "unexpected_success";
      } catch (error) {
        return String(error);
      }
    });
    expect(rejection).toContain("archive_pgn_too_large");
    expect(
      await app.evaluate(() => (globalThis as any).__archiveReadProbe.reads),
    ).toBe(0);
    expect(
      (await page.evaluate(() => window.chessApp.snapshot())).database,
    ).toEqual(before);
    await app.evaluate(() => (globalThis as any).__archiveReadProbe.restore());
    unlinkSync(oversized);
    expect(await page.evaluate(() => window.chessApp.importArchive())).toEqual({
      added: 1,
      skipped: 0,
    });
    const after = (await page.evaluate(() => window.chessApp.snapshot()))
      .database;
    expect(after.games).toHaveLength(1);
    expect(after.games[0].profileId).toBe("hanoi");
    expect(after.progress).toEqual(before.progress);
  } finally {
    await app.close();
  }
});
