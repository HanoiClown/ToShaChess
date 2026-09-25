import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

test("native full screen works before login, via F11/Escape, and preserves the game", async () => {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-fullscreen-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA!);
  const app = await electron.launch({
    executablePath: process.env.TOSHA_FULLSCREEN_EXE,
    args: process.env.TOSHA_FULLSCREEN_EXE ? [] : ["."],
    env,
  });
  try {
    const page = await app.firstWindow();
    const fullscreen = () =>
      app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isFullScreen(),
      );
    const bounds = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].getBounds(),
    );
    await page
      .getByRole("button", { name: "Полноэкранный режим", exact: true })
      .click();
    await expect.poll(fullscreen).toBe(true);
    await expect(page.locator("html")).toHaveAttribute(
      "data-fullscreen",
      "true",
    );
    await page.locator(".profile-choice").first().click();
    await expect(
      page.getByRole("button", {
        name: "Выйти из полноэкранного режима",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Играть", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Начать партию", exact: true })
      .click();
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="e4"]').click();
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.snapshot())).database
            .games[0]?.moves[0],
      )
      .toBe("e2e4");
    const id = (await page.evaluate(() => window.chessApp.snapshot())).database
      .games[0].id;
    // Native accelerators run before Chromium; CDP keyboard events bypass them.
    await app.evaluate(({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents;
      contents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
      contents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    });
    await expect.poll(fullscreen).toBe(false);
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].getBounds(),
        ),
      )
      .toEqual(bounds);
    await app.evaluate(({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents;
      contents.sendInputEvent({ type: "keyDown", keyCode: "F11" });
      contents.sendInputEvent({ type: "keyUp", keyCode: "F11" });
    });
    await expect.poll(fullscreen).toBe(true);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Exit full screen", exact: true }),
    ).toBeVisible();
    expect(
      (await page.evaluate(() => window.chessApp.snapshot())).database.games[0]
        .id,
    ).toBe(id);
    for (const size of [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 760, height: 620 },
    ]) {
      await page.setViewportSize(size);
      const board = await page.locator(".chessboard:visible").boundingBox();
      expect(board).not.toBeNull();
      expect(Math.abs(board!.width - board!.height)).toBeLessThan(2);
      expect(board!.x + board!.width).toBeLessThanOrEqual(size.width);
      expect(board!.y + board!.height).toBeLessThanOrEqual(size.height);
      expect(
        await page
          .locator(".workspace")
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: "Exit full screen", exact: true }),
      ).toBeVisible();
      if (process.env.TOSHA_CAPTURE) {
        mkdirSync(".impeccable/review/v132", { recursive: true });
        await page.screenshot({
          path: `.impeccable/review/v132/fullscreen-${size.width}.png`,
        });
      }
    }
    await page
      .getByRole("button", { name: "Exit full screen", exact: true })
      .click();
    await expect.poll(fullscreen).toBe(false);
  } finally {
    await app.close();
  }
});
