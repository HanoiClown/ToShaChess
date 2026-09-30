import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

test("four primary sections keep every local destination reachable and selected", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-navigation-"));
  seedProfiles(dir);
  const env: Record<string, string> = Object.fromEntries(
    Object.entries({ ...process.env, CHESS_HOME_DATA: dir }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".profile-choice").first().click();
    const primary = page.locator(".sidebar > nav");
    await expect(primary.getByRole("button")).toHaveCount(4);
    await expect(primary.getByRole("button")).toHaveText([
      "Сегодня",
      "Играть",
      "Обучение",
      "Анализ",
    ]);
    const local = page.getByRole("navigation", { name: "Разделы обучения" });
    await primary
      .getByRole("button", { name: "Обучение", exact: true })
      .click();
    await expect(local.getByRole("button")).toHaveCount(4);
    for (const [label, heading] of [
      ["Уроки", "Понимай, а не заучивай"],
      ["Задачи", "Библиотека тактики"],
      ["Видение доски", "Видение доски"],
      ["Практика", "Личная практика"],
    ]) {
      await local.getByRole("button", { name: label, exact: true }).click();
      await expect(
        local.getByRole("button", { name: label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        primary.getByRole("button", { name: "Обучение", exact: true }),
      ).toHaveAttribute("aria-current", label === "Уроки" ? "page" : "true");
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
    }
    await primary.getByRole("button", { name: "Анализ", exact: true }).click();
    const analysis = page.getByRole("navigation", { name: "Разделы анализа" });
    await expect(
      analysis.getByRole("button", { name: "Мои партии", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    for (const [label, heading] of [
      ["Мои партии", "Твоя шахматная история"],
      ["Разбор", "Каждая ошибка может стать уроком"],
      ["Исследования", "Мои исследования"],
      ["Конструктор", "Конструктор позиции"],
      ["База партий", "Большая офлайн-база"],
    ]) {
      await analysis.getByRole("button", { name: label, exact: true }).click();
      await expect(
        analysis.getByRole("button", { name: label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
    }

    // A screen-to-screen link also selects the right parent and local section.
    await page
      .getByRole("button", { name: "К основным задачам", exact: true })
      .click();
    await expect(
      local.getByRole("button", { name: "Задачи", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await local.getByRole("button", { name: "Уроки", exact: true }).click();
    await page
      .getByRole("button", { name: "Открыть курсы", exact: true })
      .click();
    await expect(
      local.getByRole("button", { name: "Уроки", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      primary.getByRole("button", { name: "Обучение", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    await local.getByRole("button", { name: "Уроки", exact: true }).click();
    await page.getByRole("button", { name: "Эндшпиль", exact: true }).click();
    await page
      .getByRole("button", { name: "Тренировать окончания", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Мастерская эндшпиля", exact: true }),
    ).toBeVisible();
    await expect(
      local.getByRole("button", { name: "Уроки", exact: true }),
    ).toHaveAttribute("aria-current", "true");

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(primary.getByRole("button")).toHaveText([
      "Today",
      "Play",
      "Learn",
      "Analysis",
    ]);
    await primary
      .getByRole("button", { name: "Analysis", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    const englishAnalysis = page.getByRole("navigation", {
      name: "Analysis sections",
    });
    await expect(
      englishAnalysis.getByRole("button", { name: "My games", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Settings", exact: true }),
    ).toBeFocused();

    const accents = new Set<string>();
    for (const theme of ["green", "purple", "blue", "red"] as const) {
      await page.evaluate(async (theme) => {
        const state = await window.chessApp.snapshot();
        await window.chessApp.updateProfile({
          ...state.database.profiles.find((p) => p.id === state.activeProfile)!,
          theme,
        });
      }, theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      accents.add(
        await englishAnalysis
          .locator('[aria-current="page"]')
          .evaluate((el) => getComputedStyle(el).color),
      );
      if (process.env.TOSHA_CAPTURE) {
        mkdirSync(".impeccable/review/navigation-v154", { recursive: true });
        await page.screenshot({
          path: `.impeccable/review/navigation-v154/${theme}.png`,
        });
      }
    }
    expect(accents.size).toBe(4);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setFullScreen(false),
    );
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isFullScreen(),
        ),
      )
      .toBe(false);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(760, 640),
    );
    await expect
      .poll(() => page.evaluate(() => window.innerWidth))
      .toBeLessThanOrEqual(760);
    for (const label of [
      "My games",
      "Review",
      "Studies",
      "Position editor",
      "Game database",
    ]) {
      await englishAnalysis
        .getByRole("button", { name: label, exact: true })
        .click();
      expect(
        await englishAnalysis.evaluate(
          (el) => el.scrollWidth <= el.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await page
          .locator(".workspace")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
    }
    if (process.env.TOSHA_CAPTURE)
      await page.screenshot({
        path: ".impeccable/review/navigation-v154/small.png",
      });
    await page
      .getByRole("button", { name: "Switch profile", exact: true })
      .click();
    await page.locator(".profile-choice").nth(1).click();
    await expect(
      primary.getByRole("button", { name: "Сегодня", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".section-navigation")).toHaveCount(0);
  } finally {
    await app.close();
  }
});
