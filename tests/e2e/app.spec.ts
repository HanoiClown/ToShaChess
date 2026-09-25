import { seedProfiles } from "../helpers/profile-fixtures";
import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("profile selection, language switching, legal moves and separated progress", async () => {
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(
      (x): x is [string, string] => typeof x[1] === "string",
    ),
  );
  env.CHESS_HOME_DATA = mkdtempSync(join(tmpdir(), "chess-e2e-"));
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await expect(page.locator(".profile-choice").first()).toBeVisible();
    await page.locator(".profile-choice").first().click();
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Your next move/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Play", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "Start game", exact: true }).click();
    await page.locator('[data-square="e2"]').last().click();
    await page.locator('[data-square="e4"]').last().click();
    await expect(page.getByText("e4", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Switch profile", exact: true })
      .click();
    await page.locator(".profile-choice").nth(1).click();
    await page
      .getByRole("button", { name: "Обучение", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: /Знакомство с доской/ }).click();
    await page.locator('[data-square="e2"]').last().click();
    await page.locator('[data-square="e4"]').last().click();
    await page
      .getByRole("button", { name: "Завершить урок", exact: true })
      .click();
    const state = await page.evaluate(() => window.chessApp.snapshot());
    expect(state.database.progress.sister.completed).toContain("board");
    expect(state.database.progress.hanoi.completed).not.toContain("board");
    expect(
      state.database.games.filter((g) => g.profileId === "sister"),
    ).toHaveLength(0);
  } finally {
    await app.close();
  }
});
