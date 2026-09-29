import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
import { courses } from "../../src/content/courses";
test("courses play a continuous line and move to the next chapter without awarding practice", async () => {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-course-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    await p
      .getByRole("button", { name: "Обучение", exact: true })
      .first()
      .click();
    await p
      .getByRole("button", { name: "Дебюты и гамбиты", exact: true })
      .click();
    await p.getByRole("button", { name: /Открыть курсы/ }).click();
    await p
      .locator(".course-row")
      .filter({ hasText: courses.find((c) => c.id === "caro")!.title.ru })
      .click();
    await expect(p.locator(".course-chapters")).toBeVisible();
    await p.getByRole("button", { name: "Автопоказ", exact: true }).click();
    await expect(p.locator(".course-ply")).not.toHaveText(
      `0 / ${courses.find((c) => c.id === "caro")!.chapters[0].line.length}`,
    );
    await p.getByRole("button", { name: "Пауза", exact: true }).click();
    await p
      .getByRole("button", { name: "Следующий урок", exact: true })
      .click();
    await expect(
      p.getByRole("heading", {
        name: courses.find((c) => c.id === "caro")!.chapters[1].title.ru,
        exact: true,
      }),
    ).toBeVisible();
    const state = await p.evaluate(() => window.chessApp.snapshot());
    expect(
      state.database.progress.hanoi.completed.filter((x) =>
        x.endsWith("_practice"),
      ),
    ).toEqual([]);
    await p
      .locator(".course-chapters")
      .getByRole("button", { name: "Практика", exact: true })
      .click();
    const line = courses.find((c) => c.id === "caro")!.chapters[1].line;
    for (let index = 1; index < line.length; index += 2) {
      await expect(p.locator(".course-ply")).toHaveText(
        `${index} / ${line.length}`,
      );
      const move = line[index];
      await p.locator(`[data-square="${move.slice(0, 2)}"]:visible`).click();
      await p.locator(`[data-square="${move.slice(2, 4)}"]:visible`).click();
    }
    await expect
      .poll(
        async () =>
          (await p.evaluate(() => window.chessApp.snapshot())).database.progress
            .hanoi.completed,
      )
      .toContain("course_caro_main_practice");
    await p
      .getByRole("button", { name: "Следующий урок", exact: true })
      .click();
    await expect(p.locator(".course-ply")).toHaveText(
      `0 / ${courses.find((c) => c.id === "caro")!.chapters[2].line.length}`,
    );
  } finally {
    await app.close();
  }
});
