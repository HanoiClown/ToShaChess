import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
async function launch() {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-upgrade-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  return electron.launch({ args: ["."], env });
}
test("bot catalogue starts a legal game with the chosen personality", async () => {
  const app = await launch();
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    await p
      .getByRole("button", { name: "Играть", exact: true })
      .first()
      .click();
    await expect(p.locator(".bot-choice")).toHaveCount(12);
    await p.getByRole("button", { name: /Лис.*600/ }).click();
    await p.getByRole("button", { name: "Начать партию", exact: true }).click();
    await p.locator('[data-square="e2"]:visible').click();
    await p.locator('[data-square="e4"]:visible').click();
    await expect
      .poll(async () => {
        const s = await p.evaluate(() => window.chessApp.snapshot());
        return s.database.games[0]?.moves.length;
      })
      .toBe(2);
    const s = await p.evaluate(() => window.chessApp.snapshot());
    expect(s.database.games[0].botId).toBe("fox");
    expect(s.database.games[0].botRating).toBe(600);
    await expect(p.locator(".material-panel")).toContainText("Фигуры");
    if (process.env.TOSHA_CAPTURE) {
      mkdirSync(".impeccable/review/upgrade", { recursive: true });
      await p
        .locator(".material-panel")
        .screenshot({ path: ".impeccable/review/upgrade/material-panel.png" });
    }
  } finally {
    await app.close();
  }
});
test("editor keeps invalid FEN from replacing setup and plays from a valid position", async () => {
  const app = await launch();
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    await p.getByRole("button", { name: "Конструктор", exact: true }).click();
    await p
      .getByRole("button", { name: "Очистить доску", exact: true })
      .click();
    await expect(
      p.getByRole("button", { name: "Анализировать позицию", exact: true }),
    ).toBeDisabled();
    const fen = "7k/8/8/8/8/8/4R3/4K3 w - - 0 1";
    await p.getByLabel("FEN", { exact: true }).fill(fen);
    await p.getByRole("button", { name: "Импорт FEN", exact: true }).click();
    await expect(p.locator(".setup-board img")).toHaveCount(3);
    await p
      .getByRole("button", { name: "Сегодня", exact: true })
      .first()
      .click();
    await p.getByRole("button", { name: "Конструктор", exact: true }).click();
    await expect(p.locator(".setup-board img")).toHaveCount(3);
    await p.getByLabel("FEN", { exact: true }).fill("broken");
    await p.getByRole("button", { name: "Импорт FEN", exact: true }).click();
    await expect(p.locator(".setup-board img")).toHaveCount(3);
    await expect(p.getByText(/Некорректный FEN/)).toBeVisible();
    await p
      .getByRole("button", { name: "Анализировать позицию", exact: true })
      .click();
    await expect(p.locator(".coach-card").first()).toBeVisible();
    await p.getByRole("button", { name: "Играть отсюда", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "Продолжить партию", exact: true }),
    ).toBeVisible();
    const s = await p.evaluate(() => window.chessApp.snapshot());
    expect(s.database.games[0].initialFen).toBe(fen);
    // A second profile's own saved game must win over the previous editor launch target.
    await p
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await p.locator(".profile-choice").nth(1).click();
    const otherId = await p.evaluate(async () => {
      await window.chessApp.importPgn("1. d4 d5 *");
      const state = await window.chessApp.snapshot(),
        game = state.database.games.find(
          (g) => g.profileId === state.activeProfile,
        )!;
      game.mode = "training";
      await window.chessApp.saveGame(game);
      return game.id;
    });
    await p
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await p.locator(".profile-choice").first().click();
    await p.getByRole("button", { name: "Конструктор", exact: true }).click();
    await p.getByRole("button", { name: "Играть отсюда", exact: true }).click();
    await p
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await p.locator(".profile-choice").nth(1).click();
    await p
      .getByRole("button", { name: "Играть", exact: true })
      .first()
      .click();
    await expect(
      p.getByRole("button", { name: "Продолжить партию", exact: true }),
    ).toBeVisible();
    await expect(p.locator('[data-square="d4"]:visible img')).toHaveCount(1);
    expect(
      (await p.evaluate(() => window.chessApp.snapshot())).database.games.find(
        (g) => g.id === otherId,
      )?.moves,
    ).toEqual(["d2d4", "d7d5"]);
  } finally {
    await app.close();
  }
});
