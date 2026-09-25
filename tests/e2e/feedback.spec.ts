import {
  test,
  expect,
  _electron as electron,
  type Page,
} from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

const puzzles = JSON.parse(
  readFileSync("src/content/library-puzzles.json", "utf8"),
) as {
  id: string;
  line: string[];
}[];
const puzzle = puzzles.find(
  (p) => p.line.length === 3 && p.line.every((u) => u.length === 4),
)!;

async function launch(directory?: string) {
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  env.CHESS_HOME_DATA =
    directory ?? mkdtempSync(join(tmpdir(), "tosha-feedback-"));
  delete env.ELECTRON_RUN_AS_NODE;
  if (!directory) seedProfiles(env.CHESS_HOME_DATA);
  return electron.launch({ args: ["."], env });
}

async function observeFeedback(page: Page) {
  await page.evaluate(() => {
    const observed = { sounds: 0, moves: [] as string[] };
    (window as any).__feedback = observed;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      observed.sounds++;
      return start.apply(this, args);
    };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const square = this.closest("[data-square]")?.getAttribute("data-square");
      if (square) observed.moves.push(square);
      return animate.apply(this, args);
    };
  });
}
async function openPuzzle(page: Page) {
  await page.getByRole("button", { name: "Задачи", exact: true }).click();
  await page.getByPlaceholder("Найти задачу по ID").fill(puzzle.id);
  await page.locator(".library-row").click();
}
async function move(page: Page, uci: string) {
  await expect(page.locator(".chessboard:visible")).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  await page.locator(`.chessboard:visible [data-square="${uci.slice(0, 2)}"]`).click();
  await page.locator(`.chessboard:visible [data-square="${uci.slice(2, 4)}"]`).click();
}

test("puzzle hint reveals only the piece; player and opponent moves animate and sound separately", async () => {
  const app = await launch();
  try {
    const page = await app.firstWindow();
    await observeFeedback(page);
    await page.locator(".profile-choice").first().click();
    await openPuzzle(page);
    expect(await page.evaluate(() => (window as any).__feedback.sounds)).toBe(
      0,
    );
    await page
      .getByRole("button", { name: "Показать намёк", exact: true })
      .click();
    await expect(page.locator(".board-arrows")).toHaveCount(0);
    await expect(page.locator(".move-dot, .capture-ring")).toHaveCount(0);
    await expect(
      page.locator(`.chessboard:visible [data-square="${puzzle.line[0].slice(0, 2)}"]`),
    ).toHaveAttribute("data-hint", "true");
    await move(page, puzzle.line[0]);
    await expect(page.locator(".chessboard:visible")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    const feedback = await page.evaluate(() => (window as any).__feedback);
    expect(feedback.sounds).toBeGreaterThanOrEqual(2);
    expect(feedback.moves).toContain(puzzle.line[0].slice(2, 4));
    expect(feedback.moves).toContain(puzzle.line[1].slice(2, 4));
    await expect(page.locator('[data-hint="true"]')).toHaveCount(0);
    await move(page, puzzle.line[2]);
    await expect(
      page.getByText("Задача решена целиком!", { exact: true }),
    ).toBeVisible();
    const state = await page.evaluate(() => window.chessApp.snapshot());
    expect(
      state.database.progress.hanoi.attempts.filter(
        (a) => a.itemId === puzzle.id && a.correct,
      ),
    ).toHaveLength(1);

    // Navigating away cancels the pending reply and completion sound.
    await page
      .getByRole("button", { name: "Повторить позицию", exact: true })
      .click();
    await move(page, puzzle.line[0]);
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    const sounds = await page.evaluate(() => (window as any).__feedback.sounds);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as any).__feedback.sounds)).toBe(
      sounds,
    );
  } finally {
    await app.close();
  }
});

test("reduced motion keeps puzzle feedback usable without piece travel", async () => {
  const app = await launch();
  try {
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await observeFeedback(page);
    await page.locator(".profile-choice").first().click();
    await openPuzzle(page);
    await move(page, puzzle.line[0]);
    await expect(page.locator(".chessboard:visible")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    const feedback = await page.evaluate(() => (window as any).__feedback);
    expect(feedback.moves).toHaveLength(0);
    expect(feedback.sounds).toBeGreaterThanOrEqual(2);
  } finally {
    await app.close();
  }
});

test("volume zero and mute silence training, volume persists across restart", async () => {
  let app = await launch();
  try {
    let page = await app.firstWindow();
    await observeFeedback(page);
    await page.locator(".profile-choice").first().click();
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    const slider = page.getByRole("slider", { name: "Громкость", exact: true });
    await expect(slider).toHaveValue("65");
    await slider.focus();
    await slider.press("Home");
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.snapshot())).database
            .settings.volume,
      )
      .toBe(0);
    await expect(
      page.getByRole("button", { name: "Проверить звук", exact: true }),
    ).toBeDisabled();
    await openPuzzle(page);
    await move(page, puzzle.line[0]);
    await expect(page.locator(".chessboard:visible")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(await page.evaluate(() => (window as any).__feedback.sounds)).toBe(
      0,
    );
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    await slider.focus();
    await slider.press("End");
    await slider.press("ArrowLeft");
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.snapshot())).database
            .settings.volume,
      )
      .toBe(99);
    await page
      .getByRole("button", { name: "Проверить звук", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__feedback.sounds))
      .toBeGreaterThan(0);
    await page
      .getByRole("checkbox", { name: "Звуки игры", exact: true })
      .uncheck();
    await slider.focus();
    await slider.press("Home");
    await slider.press("ArrowRight");
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.chessApp.snapshot())).database
            .settings,
      )
      .toMatchObject({ volume: 1, sound: false });
    const sounds = await page.evaluate(() => (window as any).__feedback.sounds);
    await openPuzzle(page);
    await move(page, puzzle.line[0]);
    await expect(page.locator(".chessboard:visible")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(await page.evaluate(() => (window as any).__feedback.sounds)).toBe(
      sounds,
    );
    const directory = (await page.evaluate(() => window.chessApp.snapshot()))
      .dataPath;
    await app.close();
    app = await launch(directory);
    page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    await expect(
      page.getByRole("slider", { name: "Громкость", exact: true }),
    ).toHaveValue("1");
    await expect(
      page.getByRole("checkbox", { name: "Звуки игры", exact: true }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(
      page.getByRole("slider", { name: "Volume", exact: true }),
    ).toHaveValue("1");
  } finally {
    await app.close();
  }
});
