import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
const placement = "r2q4/k1p5/1pN3p1/5b2/8/1P4P1/KP2QR1P/2R5";
const fen = `${placement} b - - 0 1`;
async function launch() {
  const env = {
    ...process.env,
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-photo-")),
  } as Record<string, string>;
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const executablePath = process.env.TOSHA_PHOTO_EXE;
  const app = await electron.launch({
    executablePath,
    args: executablePath ? [] : ["."],
    env,
  });
  const page = await app.firstWindow();
  await page.locator(".profile-choice").first().click();
  await page.getByRole("button", { name: "Конструктор", exact: true }).click();
  return { app, page };
}
test("offline real image recognition, corrections, last move and study exploration", async () => {
  const { app, page: p } = await launch();
  try {
    await p.getByLabel("FEN", { exact: true }).fill(fen);
    await p.getByRole("button", { name: "Импорт FEN", exact: true }).click();
    const png = await p.locator(".setup-board").screenshot();
    await p
      .getByRole("button", { name: "Начальная позиция", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Импорт по фото", exact: true })
      .click();
    // Block all network access; model/runtime must already be in the bundle.
    await p.context().setOffline(true);
    const remote: string[] = [];
    p.on("request", (r) => {
      if (/^https?:/.test(r.url())) remote.push(r.url());
    });
    await p.getByLabel("Файл с доской").setInputFiles({
      name: "diagram.png",
      mimeType: "image/png",
      buffer: png,
    });
    await p
      .getByRole("button", { name: "Распознать доску", exact: true })
      .click();
    await expect(p.locator(".photo-result .setup-board img")).toHaveCount(16, {
      timeout: 30000,
    });
    await expect(p.locator('.photo-result [data-square="c6"]')).toHaveAttribute(
      "aria-label",
      "c6 wn",
    );
    await expect(p.locator('.photo-result [data-square="a7"]')).toHaveAttribute(
      "aria-label",
      "a7 bk",
    );
    // Correct an accidental edit before importing; the source never changes.
    await p
      .getByLabel("Исправление: выбери фигуру и нажми поле")
      .selectOption("erase");
    await p.locator('.photo-result [data-square="c6"]').click();
    await p
      .getByLabel("Исправление: выбери фигуру и нажми поле")
      .selectOption("wn");
    await p.locator('.photo-result [data-square="c6"]').click();
    mkdirSync(".impeccable/review/photo", { recursive: true });
    await p
      .locator(".photo-import-panel")
      .screenshot({ path: ".impeccable/review/photo/import.png" });
    await p
      .getByRole("button", { name: "Перенести в конструктор", exact: true })
      .click();
    await p.getByRole("button", { name: "Экспорт FEN", exact: true }).click();
    await expect(p.getByLabel("FEN", { exact: true })).toHaveValue(fen);
    await p.locator(".editor-last-move summary").click();
    await p.getByLabel("Откуда", { exact: true }).fill("d4");
    await p.getByLabel("Куда", { exact: true }).fill("c6");
    await p
      .getByRole("button", { name: "Сравнить до и после", exact: true })
      .click();
    await expect(p.locator(".editor-last-move .coach-card")).toContainText(
      "Nc6+",
      { timeout: 30000 },
    );
    console.log(
      "Reconstructed move:",
      await p.locator(".editor-last-move .coach-card").innerText(),
    );
    await p.getByRole("button", { name: "До хода", exact: true }).click();
    await expect(
      p.locator('.board-column [data-square="d4"] img'),
    ).toBeVisible();
    await p.getByRole("button", { name: "После хода", exact: true }).click();
    await expect(
      p.locator('.board-column [data-square="c6"] img'),
    ).toBeVisible();
    await p
      .getByRole("button", { name: "Разобрать варианты", exact: true })
      .click();
    await expect(p.locator(".variation-tree")).toContainText("Nc6+");
    expect(remote).toEqual([]);
  } finally {
    await app.close();
  }
});
test("image paste, theme persistence, profile privacy and play from the reconstructed position", async () => {
  const { app, page: p } = await launch();
  try {
    await p.getByLabel("FEN", { exact: true }).fill(fen);
    await p.getByRole("button", { name: "Импорт FEN", exact: true }).click();
    const png = await p.locator(".setup-board").screenshot();
    await p
      .getByRole("button", { name: "Импорт по фото", exact: true })
      .click();
    await p.evaluate((base64) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const clipboardData = new DataTransfer();
      clipboardData.items.add(
        new File([bytes], "pasted.png", { type: "image/png" }),
      );
      window.dispatchEvent(new ClipboardEvent("paste", { clipboardData }));
    }, png.toString("base64"));
    await expect(p.locator(".photo-preview img")).toBeVisible();
    await p
      .getByRole("button", { name: "Распознать доску", exact: true })
      .click();
    await expect(p.locator(".photo-result .setup-board img")).toHaveCount(16);
    await p
      .getByLabel("Исправление: выбери фигуру и нажми поле")
      .selectOption("wr");
    await p.locator('.photo-result [data-square="c6"]').click();
    await p.getByLabel("Снизу на фото").selectOption("b");
    await expect(p.locator('.photo-result [data-square="f3"]')).toHaveAttribute(
      "aria-label",
      "f3 wr",
    );
    await p.getByLabel("Снизу на фото").selectOption("w");
    await p
      .getByLabel("Исправление: выбери фигуру и нажми поле")
      .selectOption("wn");
    await p.locator('.photo-result [data-square="c6"]').click();
    for (const theme of ["green", "purple", "blue", "red"] as const) {
      await p.evaluate(async (theme) => {
        const s = await window.chessApp.snapshot();
        await window.chessApp.updateProfile({
          ...s.database.profiles.find((x) => x.id === s.activeProfile)!,
          theme,
        });
      }, theme);
      await expect(p.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(
        p.getByRole("button", { name: "Перенести в конструктор", exact: true }),
      ).toBeEnabled();
      mkdirSync(".impeccable/review/photo", { recursive: true });
      await p.locator(".workspace").evaluate((e) => e.scrollTo(0, 0));
      await p.screenshot({ path: `.impeccable/review/photo/${theme}.png` });
    }
    await p
      .getByRole("button", { name: "Перенести в конструктор", exact: true })
      .click();
    await p.locator(".editor-last-move summary").click();
    await p.getByLabel("Откуда", { exact: true }).fill("d4");
    await p.getByLabel("Куда", { exact: true }).fill("c6");
    // A mistaken turn choice in a photo must not block the independently
    // validated position reconstructed from the moved piece.
    await p.getByLabel("Чей ход").selectOption("w");
    await p
      .getByRole("button", { name: "Сравнить до и после", exact: true })
      .click();
    await p.getByRole("button", { name: "До хода", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "Анализировать позицию", exact: true }),
    ).toBeEnabled();
    await p.getByRole("button", { name: "Играть отсюда", exact: true }).click();
    const state = await p.evaluate(() => window.chessApp.snapshot());
    expect(state.database.games[0].initialFen).toContain("3N4");
    expect(state.database.games[0].initialFen).not.toContain("1pN3p1");
    await p
      .getByRole("button", { name: "Сменить профиль", exact: true })
      .click();
    await p.locator(".profile-choice").nth(1).click();
    await p.getByRole("button", { name: "Конструктор", exact: true }).click();
    await p
      .getByRole("button", { name: "Импорт по фото", exact: true })
      .click();
    await expect(p.locator(".photo-preview img")).toHaveCount(0);
    await expect(p.locator(".board-column .setup-board img")).toHaveCount(32);
  } finally {
    await app.close();
  }
});
test("flipped screenshot, manual crop, wrong-file recovery and narrow English layout", async () => {
  const { app, page: p } = await launch();
  try {
    await p.getByLabel("FEN", { exact: true }).fill(fen);
    await p.getByRole("button", { name: "Импорт FEN", exact: true }).click();
    await p.getByRole("button", { name: "Перевернуть", exact: true }).click();
    const png = await p.locator(".setup-board").screenshot();
    await p
      .getByRole("button", { name: "Импорт по фото", exact: true })
      .click();
    const file = p.getByLabel("Файл с доской");
    await file.setInputFiles({
      name: "bad.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a picture"),
    });
    await expect(p.getByRole("alert")).toContainText("PNG");
    await file.setInputFiles({
      name: "flipped.png",
      mimeType: "image/png",
      buffer: png,
    });
    await p.locator(".photo-crop-fields summary").click();
    await p.getByLabel("Справа", { exact: true }).fill("2");
    await p
      .getByRole("button", { name: "Распознать доску", exact: true })
      .click();
    await expect(p.getByRole("alert")).toContainText("128");
    await p.getByLabel("Справа", { exact: true }).fill("100");
    await p
      .getByRole("button", { name: "Распознать доску", exact: true })
      .click();
    await expect(p.locator(".photo-result .setup-board img")).toHaveCount(16, {
      timeout: 30000,
    });
    await expect(p.getByLabel("Снизу на фото")).toHaveValue("b");
    await p
      .getByRole("button", { name: "Перенести в конструктор", exact: true })
      .click();
    await expect(p.getByLabel("FEN", { exact: true })).toHaveValue(fen);
    await p.getByRole("button", { name: "EN", exact: true }).click();
    await p
      .getByRole("button", { name: "Import from image", exact: true })
      .click();
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.setFullScreen(false);
      w.setSize(820, 720);
    });
    await expect(
      p.getByRole("button", { name: "Use in position editor", exact: true }),
    ).toBeVisible();
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    mkdirSync(".impeccable/review/photo", { recursive: true });
    await p.screenshot({
      path: ".impeccable/review/photo/narrow-en.png",
      fullPage: true,
    });
  } finally {
    await app.close();
  }
});
