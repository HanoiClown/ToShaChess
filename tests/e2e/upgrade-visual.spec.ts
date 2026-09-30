import { navigateSection } from "../helpers/navigation";
import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
test("capture new surfaces in the retained four themes and both window sizes", async () => {
  test.skip(!process.env.TOSHA_CAPTURE, "Opt-in visual evidence");
  test.setTimeout(90000);
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-visual-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    await p.emulateMedia({ reducedMotion: "reduce" });
    mkdirSync(".impeccable/review/upgrade", { recursive: true });
    for (const [index, theme] of (
      ["green", "purple", "blue", "red"] as const
    ).entries()) {
      await p.evaluate(async (theme) => {
        const s = await window.chessApp.snapshot();
        await window.chessApp.updateProfile({
          ...s.database.profiles.find((x) => x.id === s.activeProfile)!,
          theme,
        });
      }, theme);
      await expect(p.locator("html")).toHaveAttribute("data-theme", theme);
      await p.setViewportSize({ width: 1366, height: 900 });
      await p
        .getByRole("button", { name: "Играть", exact: true })
        .first()
        .click();
      await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
      await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
      await p.screenshot({
        path: `.impeccable/review/upgrade/${theme}-bots.png`,
      });
    }
    await navigateSection(p, "Конструктор");
    await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
    await p.screenshot({ path: ".impeccable/review/upgrade/red-editor.png" });
    await p.setViewportSize({ width: 780, height: 620 });
    await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
    await p.screenshot({
      path: ".impeccable/review/upgrade/red-editor-small.png",
    });
    await p.setViewportSize({ width: 1366, height: 900 });
    await p.getByRole("button", { name: "Обучение", exact: true }).click();
    await p.getByRole("button", { name: "Открыть курсы", exact: true }).click();
    await p.getByRole("button", { name: /Гамбит Эванса/ }).click();
    await p.getByRole("button", { name: "Вперёд", exact: true }).click();
    await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
    await p.screenshot({ path: ".impeccable/review/upgrade/red-course.png" });
    await p.evaluate(async () => {
      await window.chessApp.importPgn("1. f3 e5 2. g4 Qh4# 0-1");
      const s = await window.chessApp.snapshot();
      await window.chessApp.analyze(s.database.games[0].id);
    });
    await expect
      .poll(
        async () =>
          await p.evaluate(
            async () =>
              (await window.chessApp.snapshot()).database.games[0].analysis
                .length,
          ),
      )
      .toBe(4);
    await navigateSection(p, "Разбор");
    await p.getByRole("button", { name: "В конец", exact: true }).click();
    await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
    await p.screenshot({ path: ".impeccable/review/upgrade/red-review.png" });
    await p.getByRole("button", { name: "EN", exact: true }).click();
    await p.setViewportSize({ width: 780, height: 620 });
    await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
    await p.screenshot({
      path: ".impeccable/review/upgrade/red-review-small-en.png",
    });
    expect(
      await p
        .locator(".workspace")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
  } finally {
    await app.close();
  }
});
