import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

async function launch() {
  const env = {
    ...process.env,
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-panels-")),
  } as Record<string, string>;
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1280, height: 760 });
  await page.locator(".profile-choice").first().click();
  return { app, page };
}

test("study analysis remains reachable by wheel and keyboard, with tools beside the board", async () => {
  const { app, page } = await launch();
  try {
    await page
      .getByRole("button", { name: "Исследования", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Новое исследование", exact: true })
      .click();
    const panel = page.locator(".study-panel");
    expect(await panel.evaluate((e) => getComputedStyle(e).overflowY)).toMatch(
      /auto|scroll/,
    );
    await panel
      .getByRole("button", { name: "Проверить Stockfish", exact: true })
      .click();
    await expect(panel.locator(".study-engine-line").first()).toBeVisible({
      timeout: 30000,
    });
    const resultBox = (await panel
      .locator(".study-engine-line")
      .first()
      .boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    expect(resultBox.y).toBeGreaterThanOrEqual(panelBox.y);
    expect(resultBox.y + resultBox.height).toBeLessThanOrEqual(
      panelBox.y + panelBox.height,
    );
    await expect(panel.locator(".comparison-panel")).toHaveCount(1);
    await expect(panel.locator(".advanced-tools")).toHaveCount(1);
    await panel.evaluate((e) => {
      e.scrollTop = 0;
    });
    const box = (await panel.boundingBox())!;
    await page.mouse.move(box.x + box.width - 30, box.y + 70);
    await page.mouse.wheel(0, 500);
    await expect
      .poll(() => panel.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(50);
    await panel.focus();
    await page.keyboard.press("Control+End");
    await panel.locator(".study-pgn summary").click();
    await panel
      .getByRole("button", { name: "Получить PGN", exact: true })
      .click();
    await expect(panel.getByLabel("PGN", { exact: true })).not.toBeEmpty();
    await page.setViewportSize({ width: 780, height: 620 });
    await page.getByRole("button", { name: "EN", exact: true }).click();
    expect(await panel.evaluate((e) => getComputedStyle(e).maxHeight)).toBe(
      "none",
    );
    await panel
      .getByRole("button", { name: "Generate PGN", exact: true })
      .click();
    expect(
      await page
        .locator(".workspace")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.locator(".sound-settings").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect
      .poll(() => page.locator(".workspace").evaluate((e) => e.scrollTop))
      .toBe(0);
  } finally {
    await app.close();
  }
});

test("sound and dialogue checkboxes keep their labels and keyboard behavior in every theme", async () => {
  const { app, page } = await launch();
  try {
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    for (const theme of ["green", "purple", "blue", "red"] as const) {
      await page.evaluate(async (theme) => {
        const state = await window.chessApp.snapshot();
        await window.chessApp.updateProfile({
          ...state.database.profiles[0],
          theme,
        });
      }, theme);
      const dialogue = page.getByRole("checkbox", {
        name: "Реплики соперников",
        exact: true,
      });
      await dialogue.scrollIntoViewIfNeeded();
      const geometry = await dialogue.evaluate((e) => ({
        width: e.getBoundingClientRect().width,
        direction: getComputedStyle(e.closest("label")!).flexDirection,
      }));
      expect(geometry.width).toBeLessThanOrEqual(24);
      expect(geometry.direction).toBe("row");
      const wasChecked = await dialogue.isChecked();
      await dialogue.focus();
      await page.keyboard.press("Space");
      await expect
        .poll(
          async () =>
            (await page.evaluate(() => window.chessApp.snapshot())).database
              .settings.botQuips,
        )
        .toBe(!wasChecked);
    }
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.setViewportSize({ width: 780, height: 620 });
    await expect(
      page.getByRole("checkbox", { name: "Opponent dialogue", exact: true }),
    ).toBeChecked();
    await page
      .getByRole("checkbox", { name: "Game sounds", exact: true })
      .uncheck();
    await expect(
      page.getByRole("button", { name: "Preview sound", exact: true }),
    ).toBeDisabled();
  } finally {
    await app.close();
  }
});
