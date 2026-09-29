import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

test("course exploration saves personal branches, annotations and mainline without changing the lesson", async () => {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-study-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Обучение", exact: true }).click();
    await page
      .getByRole("button", { name: "Открыть курсы", exact: true })
      .click();
    await page.getByRole("button", { name: /Королевский гамбит/i }).click();
    await page
      .getByRole("button", { name: "Исследовать", exact: true })
      .click();
    await expect(page.locator(".study-layout")).toBeVisible();
    const board = page.locator(".study-layout .board-frame");
    const originalY = (await board.boundingBox())!.y;
    await page.locator('[data-square="d2"]:visible').click();
    await page.locator('[data-square="d4"]:visible').click();
    await expect(page.getByRole("treeitem", { selected: true })).toContainText(
      "d4",
    );
    await page
      .getByLabel("Личная заметка", { exact: true })
      .fill("Мой вариант {проверить центр} — длинная заметка. ".repeat(10));
    await page.getByRole("button", { name: "Закладка", exact: true }).click();
    expect(Math.abs((await board.boundingBox())!.y - originalY)).toBeLessThan(
      1,
    );
    await page
      .getByRole("button", { name: "Сделать основной", exact: true })
      .click();
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.listStudies())).length,
      )
      .toBe(1);
    const saved = (await page.evaluate(() => window.chessApp.listStudies()))[0];
    expect(saved.nodes[saved.nodes[saved.rootId].mainChildId!].uci).toBe(
      "d2d4",
    );
    expect(saved.nodes[saved.selectedNodeId].comment).toContain(
      "{проверить центр}",
    );
    expect(saved.nodes[saved.selectedNodeId].bookmarked).toBe(true);
    await page
      .getByRole("button", { name: "Вернуться к уроку", exact: true })
      .click();
    await expect(page.locator(".course-ply")).toContainText("0 /");
    await page
      .getByRole("button", { name: "Исследовать", exact: true })
      .click();
    await expect(
      page.getByLabel("Личная заметка", { exact: true }),
    ).toHaveValue(/\{проверить центр\}/);
    await page.getByRole("treeitem", { selected: true }).focus();
    await page.keyboard.press("Home");
    await expect(page.getByRole("treeitem", { selected: true })).toContainText(
      "Начало",
    );
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("treeitem", { selected: true })).toContainText(
      "d4",
    );
    mkdirSync(".impeccable/review/community-study", { recursive: true });
    for (const theme of ["green", "purple", "blue", "red"] as const) {
      await page.evaluate(async (theme) => {
        const s = await window.chessApp.snapshot();
        await window.chessApp.updateProfile({
          ...s.database.profiles.find((p) => p.id === s.activeProfile)!,
          theme,
        });
      }, theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.screenshot({
        path: `.impeccable/review/community-study/${theme}.png`,
      });
    }
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.setViewportSize({ width: 780, height: 620 });
    await expect(
      page.getByLabel("Personal note", { exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator(".workspace")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({
      path: ".impeccable/review/community-study/small-en.png",
    });
    const other = await page.evaluate(async () => {
      const s = await window.chessApp.snapshot();
      const other = s.database.profiles.find((p) => p.id !== s.activeProfile)!;
      await window.chessApp.selectProfile(other.id);
      return window.chessApp.listStudies();
    });
    expect(other).toEqual([]);
  } finally {
    await app.close();
  }
});
