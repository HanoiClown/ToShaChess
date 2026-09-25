import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("real offline analysis, navigation and a portable backup preserve both profiles", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chess-review-")),
    env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter(
        (x): x is [string, string] => typeof x[1] === "string",
      ),
    );
  env.CHESS_HOME_DATA = dir;
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    const id = await page.evaluate(async () => {
      await window.chessApp.importPgn("1. f3 e5 2. g4 Qh4# 0-1");
      const s = await window.chessApp.snapshot();
      const game = s.database.games[0];
      await window.chessApp.analyze(game.id);
      return game.id;
    });
    await expect
      .poll(
        async () =>
          page.evaluate(
            async (id) =>
              (await window.chessApp.snapshot()).database.games.find(
                (g) => g.id === id,
              )?.analysis.length,
            id,
          ),
        { timeout: 20000 },
      )
      .toBe(4);
    await page
      .getByRole("button", { name: "Разбор", exact: true })
      .first()
      .click();
    await expect(
      page.getByText("Ходы и объяснения", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "В конец", exact: true }).click();
    await expect(page.locator(".coach-text")).toContainText("Qh4#");
    const backup = join(dir, "backup.json");
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
    }, backup);
    await page.evaluate(() => window.chessApp.exportBackup());
    const parsed = JSON.parse(readFileSync(backup, "utf8"));
    expect(parsed.profiles).toHaveLength(2);
    expect(parsed.games[0].analysis).toHaveLength(4);
    expect(parsed).not.toHaveProperty("apiKey");
    expect(parsed.progress.sister.attempts).toHaveLength(0);
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [path],
      });
    }, backup);
    await page.evaluate(() => window.chessApp.importBackup());
    const s = await page.evaluate(() => window.chessApp.snapshot());
    expect(s.database.games).toHaveLength(1);
  } finally {
    await app.close();
  }
});
