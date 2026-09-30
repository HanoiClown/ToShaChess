import {
  test,
  expect,
  _electron as electron,
  type Page,
} from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
import { navigateSection } from "../helpers/navigation";

async function openReview(pgn = "1. e4 e5 2. Nf3 Nc6 1/2-1/2") {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "chess-inline-review-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA!);
  const app = await electron.launch({ args: ["."], env });
  const page = await app.firstWindow();
  await page.locator(".profile-choice").first().click();
  await page.evaluate((text) => window.chessApp.importPgn(text), pgn);
  await navigateSection(page, "Разбор");
  await expect(
    page.getByRole("heading", { name: "Разбор партии", exact: true }),
  ).toBeVisible();
  return { app, page };
}

async function move(page: Page, from: string, to: string) {
  const board = page.locator(".review-layout .chessboard");
  await board.locator(`[data-square="${from}"]`).click();
  await board.locator(`[data-square="${to}"]`).click();
}

test("review board explores both sides, branches and saves the displayed scratch position", async () => {
  const { app, page } = await openReview();
  try {
    const original = await page.evaluate(async () =>
      JSON.stringify((await window.chessApp.snapshot()).database.games[0]),
    );
    await move(page, "c7", "c4");
    await expect(
      page.locator('.review-layout [data-square="c7"]'),
    ).toHaveAttribute("aria-label", /чёрные пешка/);
    await page.locator(".review-panel").evaluate((panel) => {
      panel.scrollTop = panel.scrollHeight;
    });
    await move(page, "c7", "c5");
    await expect(
      page.getByRole("button", { name: "Проверить позицию", exact: true }),
    ).toBeInViewport();
    await expect(page.getByText("Твой вариант", { exact: true })).toBeVisible();
    await move(page, "g1", "f3");
    await expect(
      page.locator('.review-layout [data-square="f3"]'),
    ).toHaveAttribute("aria-label", /белые конь/);
    await page
      .getByRole("button", { name: "Назад в варианте", exact: true })
      .click();
    await expect(
      page.locator('.review-layout [data-square="g1"]'),
    ).toHaveAttribute("aria-label", /белые конь/);
    await page
      .getByRole("button", { name: "Вперёд в варианте", exact: true })
      .click();
    await expect(
      page.locator('.review-layout [data-square="f3"]'),
    ).toHaveAttribute("aria-label", /белые конь/);
    await page
      .getByRole("button", { name: "Назад в варианте", exact: true })
      .click();
    await move(page, "d2", "d4");
    await expect(
      page.getByRole("button", { name: "Вперёд в варианте", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(async () =>
        JSON.stringify((await window.chessApp.snapshot()).database.games[0]),
      ),
    ).toBe(original);
    await page
      .getByRole("button", { name: "Исследовать позицию", exact: true })
      .click();
    const saved = await page.evaluate(
      async () => (await window.chessApp.listStudies())[0],
    );
    expect(
      Object.values(saved.nodes)
        .map((node) => node.uci)
        .filter(Boolean),
    ).toEqual(["e2e4", "c7c5", "d2d4"]);
  } finally {
    await app.close();
  }
});

test("Stockfish checks the current scratch position and its continuation plays on the same board", async () => {
  const { app, page } = await openReview();
  try {
    await move(page, "c7", "c5");
    await page
      .getByRole("button", { name: "Проверить позицию", exact: true })
      .click();
    const lines = page.locator(".review-exploration-lines");
    await expect(lines).toBeVisible({ timeout: 20000 });
    await expect(lines.locator(".review-engine-score").first()).not.toHaveText(
      "—",
    );
    await lines.locator("button").first().click();
    await expect(page.locator(".review-scratch-controls")).toContainText("2 /");
    await expect(lines).toHaveCount(0);
    await page
      .getByRole("button", { name: "Вперёд в варианте", exact: true })
      .click();
    await expect(page.locator(".review-scratch-controls")).toContainText("3 /");
    await page
      .getByRole("button", { name: "Сбросить вариант", exact: true })
      .click();
    await expect(
      page.locator('.review-layout [data-square="c7"]'),
    ).toHaveAttribute("aria-label", /чёрные пешка/);
    await expect(page.locator(".review-scratch-controls")).toContainText(
      "0 / 0",
    );
    await page
      .getByRole("button", { name: "Вернуться к партии", exact: true })
      .click();
    await expect(page.locator(".review-scratch-controls")).toHaveCount(0);
    await move(page, "c7", "c5");
    await page
      .getByRole("button", { name: "Проверить позицию", exact: true })
      .click();
    await move(page, "g1", "f3");
    await expect(
      page.getByRole("button", { name: "Проверить позицию", exact: true }),
    ).toBeEnabled();
    await expect(lines).toHaveCount(0);
    await page
      .locator(".review-layout .move-list")
      .getByRole("button")
      .first()
      .click();
    await expect(page.locator(".review-scratch-controls")).toHaveCount(0);
    await expect(lines).toHaveCount(0);
  } finally {
    await app.close();
  }
});

test("review exploration supports an explicit underpromotion", async () => {
  const { app, page } = await openReview(
    '[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n*',
  );
  try {
    await move(page, "a7", "a8");
    await page
      .getByRole("dialog", { name: "Превращение пешки" })
      .getByRole("button", { name: "конь", exact: true })
      .click();
    await expect(
      page.locator('.review-layout [data-square="a8"]'),
    ).toHaveAttribute("aria-label", /белые конь/);
    await expect(page.getByText("Твой вариант", { exact: true })).toBeVisible();
  } finally {
    await app.close();
  }
});

test("an ongoing normal game keeps review exploration locked", async () => {
  const { app, page } = await openReview("1. e4 *");
  try {
    await page.evaluate(async () => {
      const game = (await window.chessApp.snapshot()).database.games[0];
      await window.chessApp.saveGame({ ...game, mode: "normal", result: "*" });
    });
    await expect(
      page.getByText("В обычной партии подсказки доступны после завершения."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Проверить позицию", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".review-layout .chessboard")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Исследовать позицию", exact: true }),
    ).toBeDisabled();
  } finally {
    await app.close();
  }
});

test("background analysis preserves a game-position variation and selecting the best line clears it", async () => {
  const { app, page } = await openReview();
  try {
    await move(page, "c7", "c5");
    const id = await page.evaluate(async () => {
      const game = (await window.chessApp.snapshot()).database.games[0];
      await window.chessApp.analyze(game.id);
      return game.id;
    });
    await expect
      .poll(
        async () =>
          page.evaluate(
            async (gameId) =>
              (await window.chessApp.snapshot()).database.games.find(
                (game) => game.id === gameId,
              )?.analysis.length,
            id,
          ),
        { timeout: 20000 },
      )
      .toBe(4);
    await expect(page.locator(".review-layout .move-quality-mark")).toHaveCount(
      0,
    );
    await expect(page.locator(".review-scratch-controls")).toBeVisible();
    await expect(
      page.locator('.review-layout [data-square="c5"]'),
    ).toHaveAttribute("aria-label", /чёрные пешка/);
    await page
      .getByRole("button", { name: "Показать лучший вариант", exact: true })
      .click();
    await expect(page.locator(".review-scratch-controls")).toHaveCount(0);
    await expect(
      page.locator('.review-layout [data-square="e2"]'),
    ).toHaveAttribute("aria-label", /белые пешка/);
    await page
      .getByRole("button", { name: "Вперёд в лучшем варианте", exact: true })
      .click();
    const continuation = await page.evaluate(
      async () =>
        (await window.chessApp.snapshot()).database.games[0].analysis.find(
          (entry) => entry.ply === 1,
        )!.before.pv,
    );
    await move(page, continuation[1].slice(0, 2), continuation[1].slice(2, 4));
    await expect(page.locator(".review-scratch-controls")).toBeVisible();
    await page
      .getByRole("button", { name: "Показать лучший вариант", exact: true })
      .click();
    await expect(page.locator(".review-scratch-controls")).toHaveCount(0);
    await expect(
      page.locator('.review-layout [data-square="e2"]'),
    ).toHaveAttribute("aria-label", /белые пешка/);
    await page
      .getByRole("button", { name: "Вернуться к партии", exact: true })
      .click();
    await expect(page.locator(".review-layout .move-quality-mark")).toHaveCount(
      1,
    );
  } finally {
    await app.close();
  }
});
