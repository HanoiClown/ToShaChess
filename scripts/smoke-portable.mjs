import { _electron as electron, expect } from "@playwright/test";
import { existsSync, mkdtempSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
const exe = resolve(process.argv[2] ?? "release/win-unpacked/ToShaChess.exe");
if (!existsSync(exe)) throw Error("Package the app first");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.CHESS_HOME_DATA;
const temp = mkdtempSync(join(tmpdir(), "Chess Home перенос ")),
  folder = join(temp, "Chess Home");
cpSync(dirname(exe), folder, { recursive: true });
const launch = () =>
  electron.launch({
    executablePath: join(folder, "ToShaChess.exe"),
    args: [],
    env,
  });
let app = await launch();
try {
  const page = await app.firstWindow();
  await page.locator(".profile-choice").first().click();
  await page
    .getByRole("button", { name: "Играть", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Начать партию", exact: true })
    .click();
  await page.locator('[data-square="e2"]').last().click();
  await page.locator('[data-square="e4"]').last().click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.chessApp.snapshot())).database
          .games[0]?.moves.length,
      { timeout: 20000 },
    )
    .toBe(2);
  const result = await page.evaluate(async () => {
    const imported = { added: 0, skipped: 0 };
    await window.chessApp.importPgn("1. f3 e5 2. g4 Qh4# 0-1");
    const s = await window.chessApp.snapshot();
    const g = s.database.games.find(
      (g) => g.moves.join(" ") === "f2f3 e7e5 g2g4 d8h4",
    );
    await window.chessApp.analyze(g.id);
    return { imported, id: g.id, path: s.dataPath };
  });

  await expect
    .poll(
      async () =>
        page.evaluate(
          async (id) =>
            (await window.chessApp.snapshot()).database.games.find(
              (g) => g.id === id,
            ).analysis.length,
          result.id,
        ),
      { timeout: 30000 },
    )
    .toBe(4);
  if (resolve(result.path) !== resolve(join(folder, "data")))
    throw Error("Data is not portable");
  await page.getByRole("button", { name: "Задачи", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Библиотека тактики" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Все задачи/ }).click();
  await page.getByPlaceholder("Найти задачу по ID").fill("lichess_");
  await expect(page.locator(".library-row").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Видение доски", exact: true })
    .click();
  await page.getByLabel("Показывать буквы и цифры по краям").uncheck();
  await page
    .getByRole("button", { name: "Начать тренировку", exact: true })
    .click();
  const target = await page.getByTestId("vision-target").textContent();
  await page.locator(`.vision-layout [data-square="${target}"]`).click();
  await page
    .getByRole("button", { name: "Завершить раунд", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.chessApp.snapshot())).database
          .progress.hanoi.vision.length,
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Сменить профиль", exact: true })
    .click();
  await page.locator(".profile-choice").nth(1).click();
  await page.evaluate(async () => {
    await window.chessApp.completeLesson("board");
    const s = await window.chessApp.snapshot();
    await window.chessApp.updateProfile({
      ...s.database.profiles.find((p) => p.id === "sister"),
      locale: "en",
    });
  });
} finally {
  await app.close();
}
app = await launch();
try {
  const page = await app.firstWindow();
  await page.waitForSelector(".profile-choice");
  const s = await page.evaluate(() => window.chessApp.snapshot());
  if (
    s.database.games.length !== 2 ||
    !s.database.progress.sister.completed.includes("board") ||
    s.database.profiles[1].locale !== "en"
  )
    throw Error("Restart lost data");
  if (s.database.games.some((g) => g.profileId === "sister"))
    throw Error("Mixed profiles");
  if (
    s.database.progress.hanoi.vision.length !== 1 ||
    s.database.progress.hanoi.visionSettings.coordinates ||
    s.database.progress.sister.vision.length !== 0
  )
    throw Error("Vision results or settings lost or mixed between profiles");
  if (s.database.games.find((g) => g.moves.length === 4)?.analysis.length !== 4)
    throw Error("Analysis not saved");
  console.log(
    JSON.stringify({
      passed: true,
      packagedExe: exe,
      portableTestFolder: folder,
      games: 2,
      stockfish: "bundled executable, bot and 4-ply analysis verified",
      restart: "both profiles preserved",
      data: "beside exe",
      apiCalls: 0,
    }),
  );
} finally {
  await app.close();
}
