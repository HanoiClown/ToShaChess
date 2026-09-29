import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
import { createTrainingCard } from "../../src/training/cards";
import { START } from "../../src/chess/game";
test("personal practice retains spaced reviews and handbrain enforces piece type", async () => {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-drill-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    const owner = await p.evaluate(
      async () => (await window.chessApp.snapshot()).activeProfile!,
    );
    const card = createTrainingCard({
      profileId: owner,
      title: { ru: "Проверка центра", en: "Centre practice" },
      reason: {
        ru: "Вспомни ход e4, занимающий центр.",
        en: "Recall e4, occupying the centre.",
      },
      position: { initialFen: START, moves: [] },
      acceptedMoves: ["e2e4"],
      source: { kind: "study", id: "test" },
    });
    await p.evaluate((card) => window.chessApp.saveTrainingCard(card), card);
    await p
      .getByRole("button", { name: "Практика", exact: true })
      .first()
      .click();
    await p.getByRole("button", { name: /Проверка центра/ }).click();
    await p.locator('[data-square="e2"]:visible').click();
    await p.locator('[data-square="e4"]:visible').click();
    await expect
      .poll(
        async () =>
          (await p.evaluate(() => window.chessApp.listTrainingCards()))[0]
            .successes,
      )
      .toBe(1);
    await p.getByRole("button", { name: "Начать заново", exact: true }).click();
    await p.locator('[data-square="e2"]:visible').click();
    await p.locator('[data-square="e4"]:visible').click();
    expect(
      (await p.evaluate(() => window.chessApp.listTrainingCards()))[0]
        .successes,
    ).toBe(1);
    await p
      .getByLabel("Режим занятия", { exact: true })
      .selectOption("handbrain");
    const prompt = p.locator(".training-layout .review-controls > span");
    await expect(prompt).toHaveText(/Ходи (пешкой|конём)/);
    const pawn = (await prompt.textContent())!.includes("пешкой");
    const wrong = pawn ? ["g1", "f3"] : ["e2", "e4"],
      correct = pawn ? ["e2", "e4"] : ["g1", "f3"];
    for (const sq of wrong)
      await p.locator(`[data-square="${sq}"]:visible`).click();
    await expect(p.getByRole("status")).toContainText(
      "Выбери фигуру того типа",
    );
    for (const sq of correct)
      await p.locator(`[data-square="${sq}"]:visible`).click();
    await expect(prompt).toHaveText(/Ходи /);
    await expect(p.getByRole("status")).not.toContainText("Не удалось");
    const cardAfter = (
      await p.evaluate(() => window.chessApp.listTrainingCards())
    )[0];
    expect(cardAfter.successes).toBe(1);
    expect(cardAfter.intervalDays).toBe(1);
  } finally {
    await app.close();
  }
});
