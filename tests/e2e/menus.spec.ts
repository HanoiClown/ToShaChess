import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

test("native menus follow all themes, fit small windows and support keyboard dismissal", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-menus-"));
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
    await page.locator(".profile-choice").first().click();
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    expect(
      await page.evaluate(() => CSS.supports("appearance", "base-select")),
    ).toBe(true);
    const surfaces = new Set<string>();
    const select = page.locator(".settings-section select").first();
    for (const [theme, label] of [
      ["green", "Зелёная"],
      ["purple", "Тёмно-фиолетовая"],
      ["blue", "Тёмно-синяя"],
      ["red", "Тёмно-красная"],
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await select.click();
      await expect(select).toHaveJSProperty("value", "beginner");
      expect(await select.evaluate((el) => el.matches(":open"))).toBe(true);
      await expect
        .poll(() =>
          select.evaluate(
            (el) => getComputedStyle(el, "::picker(select)").opacity,
          ),
        )
        .toBe("1");
      surfaces.add(
        await select.evaluate(
          (el) => getComputedStyle(el, "::picker(select)").backgroundColor,
        ),
      );
      if (process.env.TOSHA_CAPTURE) {
        mkdirSync("test-results/menu-captures", { recursive: true });
        await page.screenshot({
          path: `test-results/menu-captures/${theme}.png`,
        });
      }
      await page.keyboard.press("Escape");
      expect(await select.evaluate((el) => el.matches(":open"))).toBe(false);
      await expect(select).toBeFocused();
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await select.click();
      await expect
        .poll(() =>
          select.evaluate(
            (el) => getComputedStyle(el, "::picker(select)").opacity,
          ),
        )
        .toBe("1");
      expect(await select.locator("option").first().textContent()).toContain(
        "From zero",
      );
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "RU", exact: true }).click();
    }
    expect(surfaces.size).toBe(4);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setSize(760, 640),
    );
    await select.click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(select).toHaveValue("intermediate");
    await select.click();
    const fits = await select.locator("option").evaluateAll((options) =>
      options.every((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= 0 && r.right <= window.innerWidth;
      }),
    );
    expect(fits).toBe(true);
    await expect
      .poll(() =>
        select.evaluate(
          (el) => getComputedStyle(el, "::picker(select)").opacity,
        ),
      )
      .toBe("1");
    if (process.env.TOSHA_CAPTURE)
      await page.screenshot({ path: "test-results/menu-captures/small.png" });
    await page.keyboard.press("Escape");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await select.evaluate(
        (el) => getComputedStyle(el, "::picker(select)").transitionDuration,
      ),
    ).toMatch(/^0s/);
  } finally {
    await app.close();
  }
});
