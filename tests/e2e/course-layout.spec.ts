import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
import { courses } from "../../src/content/courses";

test("course controls stay above the board across short and long explanations; badges fit their circles", async () => {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-layout-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const exe = process.env.TOSHA_LAYOUT_EXE;
  const app = await electron.launch({
    executablePath: exe,
    args: exe ? [] : ["."],
    env,
  });
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    await p.setViewportSize({ width: 1366, height: 900 });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.getByRole("button", { name: "Обучение", exact: true }).click();
    await p.getByRole("button", { name: "Открыть курсы", exact: true }).click();
    await p.getByRole("button", { name: /Гамбит Эванса/ }).click();
    await p
      .getByRole("button", { name: "Следующий урок", exact: true })
      .click();
    const controls = p.locator(".course-layout .review-controls"),
      board = p.locator(".course-layout .board-frame");
    const startControls = (await controls.boundingBox())!,
      startBoard = (await board.boundingBox())!;
    expect(startControls.y + startControls.height).toBeLessThanOrEqual(
      startBoard.y,
    );
    for (
      let i = 0;
      i < courses.find((c) => c.id === "evans")!.chapters[1].line.length;
      i++
    ) {
      await p.getByRole("button", { name: "Вперёд", exact: true }).click();
      expect(
        Math.abs((await controls.boundingBox())!.y - startControls.y),
      ).toBeLessThan(1);
      expect(
        Math.abs((await board.boundingBox())!.y - startBoard.y),
      ).toBeLessThan(1);
    }
    await expect(p.locator(".course-chapters .coach-card")).toBeVisible();
    expect(
      await p
        .locator(".course-chapters")
        .evaluate((e) => parseFloat(getComputedStyle(e).paddingLeft)),
    ).toBeGreaterThanOrEqual(16);
    mkdirSync(".impeccable/review/layout-fix", { recursive: true });
    for (const theme of ["green", "purple", "blue", "red"] as const) {
      await p.evaluate(async (theme) => {
        const s = await window.chessApp.snapshot();
        await window.chessApp.updateProfile({
          ...s.database.profiles.find((x) => x.id === s.activeProfile)!,
          theme,
        });
      }, theme);
      await expect(p.locator("html")).toHaveAttribute("data-theme", theme);
      await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
      await p.screenshot({
        path: `.impeccable/review/layout-fix/${theme}-course.png`,
      });
    }
    await p.setViewportSize({ width: 780, height: 620 });
    await p.getByRole("button", { name: "EN", exact: true }).click();
    await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
    await p.screenshot({
      path: ".impeccable/review/layout-fix/small-course.png",
    });
    expect(
      await p
        .locator(".workspace")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    await p.evaluate(async () => {
      await window.chessApp.importPgn("1. f3 e5 2. g4 Qh4# 0-1");
      const s = await window.chessApp.snapshot();
      await window.chessApp.analyze(s.database.games[0].id);
    });
    await expect
      .poll(
        async () =>
          (await p.evaluate(() => window.chessApp.snapshot())).database.games[0]
            .analysis.length,
      )
      .toBe(4);
    await p
      .getByRole("button", { name: "Review", exact: true })
      .first()
      .click();
    await p.getByRole("button", { name: "Last position", exact: true }).click();
    const mark = p.locator(".move-quality-mark");
    await expect(mark.locator("svg")).toBeVisible();
    // All glyph widths must fit the same responsive circle, including double symbols.
    for (const symbol of ["✓", "?!", "★", "??", "!!"]) {
      await mark.locator("text").evaluate((e, symbol) => {
        e.textContent = symbol;
      }, symbol);
      const box = await mark.locator("text").evaluate((e) => {
        const { x, y, width, height } = (e as SVGGraphicsElement).getBBox();
        return { x, y, width, height };
      });
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(24);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(24);
      await mark.screenshot({
        path: `.impeccable/review/layout-fix/badge-${["✓", "?!", "★", "??", "!!"].indexOf(symbol)}.png`,
      });
    }
  } finally {
    await app.close();
  }
});
