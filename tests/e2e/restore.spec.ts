import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("restoring a newer timed game unmounts the stale live board", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chess-restore-")),
    env = Object.fromEntries(
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
    await page
      .getByRole("button", { name: "Играть", exact: true })
      .first()
      .click();
    await page.locator(".game-setup select").nth(2).selectOption("10");
    await page
      .getByRole("button", { name: "Начать партию", exact: true })
      .click();
    const db = (await page.evaluate(() => window.chessApp.snapshot())).database;
    db.games[0].moves = ["f2f3", "e7e5", "g2g4", "d8h4"];
    db.games[0].result = "0-1";
    db.games[0].updatedAt = new Date(Date.now() + 1000).toISOString();
    db.profiles[1].name = "Anna";
    db.profiles[1].locale = "en";
    const path = join(dir, "newer.json");
    writeFileSync(path, JSON.stringify(db));
    await app.evaluate(({ dialog }, path) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [path],
      });
    }, path);
    await page.evaluate(() => window.chessApp.importBackup());
    await expect(
      page.getByRole("heading", { name: "Кто сегодня играет?" }),
    ).toBeVisible();
    await page.waitForTimeout(3400);
    const restored = await page.evaluate(() => window.chessApp.snapshot());
    expect(restored.database.games[0].moves).toHaveLength(4);
    expect(restored.database.games[0].result).toBe("0-1");
    expect(restored.database.profiles[1].name).toBe("Anna");
  } finally {
    await app.close();
  }
});
