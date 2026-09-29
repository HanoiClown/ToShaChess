import { test, expect, _electron as electron } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  rmdirSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

test("leaving a personal study immediately flushes its last edit before switching profiles", async () => {
  const directory = mkdtempSync(join(tmpdir(), "tosha-autosave-"));
  seedProfiles(directory);
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: directory,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page
      .getByRole("button", { name: "Исследования", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Новое исследование", exact: true })
      .click();
    for (const square of ["e2", "e4"])
      await page.locator(`[data-square="${square}"]:visible`).click();
    await page
      .getByLabel("Личная заметка", { exact: true })
      .fill("Последнее изменение перед выходом");
    await page
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await page.locator(".profile-choice").last().click();
    expect(await page.evaluate(() => window.chessApp.listStudies())).toEqual(
      [],
    );
    await page
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await page.locator(".profile-choice").first().click();
    await page
      .getByRole("button", { name: "Исследования", exact: true })
      .click();
    await expect(
      page.getByLabel("Личная заметка", { exact: true }),
    ).toHaveValue("Последнее изменение перед выходом");
    const saved = (await page.evaluate(() => window.chessApp.listStudies()))[0];
    expect(saved.nodes[saved.selectedNodeId].uci).toBe("e2e4");
    // A real filesystem write failure must keep the unsaved study reachable.
    const blockedFile = join(directory, "studies.json.tmp");
    mkdirSync(blockedFile);
    await page
      .getByLabel("Личная заметка", { exact: true })
      .fill("Сохранить после временного сбоя");
    await page.getByRole("button", { name: "Сегодня", exact: true }).click();
    await expect(
      page.locator('.main-content > p[role="status"]'),
    ).toContainText("Не удалось сохранить");
    await expect(
      page.getByLabel("Личная заметка", { exact: true }),
    ).toHaveValue("Сохранить после временного сбоя");
    // A native close request uses the same path as the window's close control.
    // It must also stay open when the pending note cannot be written.
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].close(),
    );
    await expect(
      page.getByLabel("Личная заметка", { exact: true }),
    ).toHaveValue("Сохранить после временного сбоя");
    expect(page.isClosed()).toBe(false);
    rmdirSync(blockedFile);
    await page.getByRole("button", { name: "Сегодня", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Твой следующий ход", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Исследования", exact: true })
      .click();
    await expect(
      page.getByLabel("Личная заметка", { exact: true }),
    ).toHaveValue("Сохранить после временного сбоя");
    await page
      .getByLabel("Личная заметка", { exact: true })
      .fill("Последний текст перед закрытием окна");
    const closed = page.waitForEvent("close");
    // Renderer window.close() bypasses BrowserWindow's native close event.
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].close(),
    );
    await closed;
    await expect
      .poll(
        () =>
          JSON.parse(readFileSync(join(directory, "studies.json"), "utf8"))
            .studies[0].nodes[saved.selectedNodeId].comment,
      )
      .toBe("Последний текст перед закрытием окна");
  } finally {
    const blockedFile = join(directory, "studies.json.tmp");
    if (existsSync(blockedFile)) rmdirSync(blockedFile);
    await app.close();
  }
});
