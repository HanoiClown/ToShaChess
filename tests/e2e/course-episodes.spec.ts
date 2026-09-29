import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { courses } from "../../src/content/courses";
import { seedProfiles } from "../helpers/profile-fixtures";

test("every authored episode is reachable with its own explanation and defence", async () => {
  test.setTimeout(120000);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (e): e is [string, string] => typeof e[1] === "string",
    ),
  );
  env.CHESS_HOME_DATA = mkdtempSync(join(tmpdir(), "tosha-episodes-"));
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.evaluate(async () => {
      const s = await window.chessApp.snapshot();
      await window.chessApp.updateProfile({
        ...s.database.profiles.find((x) => x.id === s.activeProfile)!,
        learning: { minutes: 30, goal: "openings", explanation: "detailed" },
      });
    });
    await p.getByRole("button", { name: "Обучение", exact: true }).click();
    await p.getByRole("button", { name: "Открыть курсы", exact: true }).click();
    let visited = 0;
    for (const course of courses) {
      await p
        .locator(".course-row")
        .filter({ hasText: course.title.ru })
        .click();
      await expect(p.locator(".explanation-detail")).toBeVisible();
      await p
        .getByRole("navigation", { name: "Главы курса" })
        .getByRole("button")
        .nth(3)
        .click();
      await expect(
        p.getByLabel("Эпизод", { exact: true }).locator("option"),
      ).toHaveCount(course.episodes!.length);
      for (const [index, episode] of course.episodes!.entries()) {
        await p
          .getByLabel("Эпизод", { exact: true })
          .selectOption(String(index));
        await expect(p.locator(".coach-bubble p")).toHaveText(
          episode.notes.ru[0],
        );
        await p.getByRole("button", { name: "Вперёд", exact: true }).click();
        await expect(p.locator(".coach-bubble p")).toHaveText(
          episode.notes.ru[1],
        );
        await p.getByLabel("Ветка", { exact: true }).selectOption("1");
        await p.getByRole("button", { name: "Вперёд", exact: true }).click();
        await expect(p.locator(".coach-bubble p")).toHaveText(
          episode.defenceNotes.ru[1],
        );
        visited++;
      }
      await p.getByRole("button", { name: "К курсам", exact: true }).click();
    }
    expect(visited).toBe(48);
    const snapshot = await p.evaluate(() => window.chessApp.snapshot());
    expect(
      snapshot.database.progress.hanoi.completed.filter((x) =>
        x.endsWith("_practice"),
      ),
    ).toEqual([]);
  } finally {
    await app.close();
  }
});
