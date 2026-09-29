import { _electron as electron, expect } from "@playwright/test";
import { existsSync, mkdtempSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative, sep } from "node:path";
import { seedLibrary } from "../tests/helpers/library-fixture.ts";
import { tsImport } from "tsx/esm/api";
const { createStudy, addStudyMove, selectStudyNode } = await tsImport(
  "../src/study/tree.ts",
  import.meta.url,
);
const { cardFromStudy } = await tsImport(
  "../src/training/cards.ts",
  import.meta.url,
);
const exe = resolve(process.argv[2] ?? "release/win-unpacked/ToShaChess.exe");
if (!existsSync(exe)) throw Error("Package the app first");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.CHESS_HOME_DATA;
delete env.TOSHACHESS_LIBRARY;
delete env.TOSHACHESS_ENGINES;
const temp = mkdtempSync(join(tmpdir(), "Chess Home перенос ")),
  folder = join(temp, "Chess Home");
cpSync(dirname(exe), folder, {
  recursive: true,
  // Never copy a user's potentially huge external pack into this smoke run.
  filter: (source) =>
    !["library-packs", "engine-packs", "data"].includes(
      relative(dirname(exe), source).split(sep)[0],
    ),
});
const libraryFolder = join(folder, "library-packs");
const sourcePacks = process.argv[3] ? resolve(process.argv[3]) : null;
if (sourcePacks) {
  for (const entry of ["maia-cpu", "maia-cpu.json"])
    cpSync(join(sourcePacks, entry), join(folder, "engine-packs", entry), {
      recursive: true,
      filter: (source) =>
        !["maia3-23m.pt", "maia3-79m.pt", "__pycache__"].includes(
          source.split(/[\\/]/).at(-1),
        ),
    });
}
const launch = async () => {
  const instance = await electron.launch({
    executablePath: join(folder, "ToShaChess.exe"),
    args: [],
    env,
  });
  await instance.evaluate(({ session }) => {
    globalThis.__offlineRequests = 0;
    globalThis.fetch = async () => {
      globalThis.__offlineRequests++;
      throw Error("Offline smoke test");
    };
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["http://*/*", "https://*/*"] },
      (_details, callback) => {
        globalThis.__offlineRequests++;
        callback({ cancel: true });
      },
    );
  });
  return instance;
};
let app = await launch();
try {
  expect(
    await app.evaluate(
      ({ app }) => app.isPackaged && app.getAppPath().endsWith(".asar"),
    ),
  ).toBe(true);
  const page = await app.firstWindow();
  const absent = await page.evaluate(() => window.chessApp.libraryStatus());
  expect(absent).toMatchObject({
    puzzles: false,
    games: false,
    puzzleCount: 0,
    gameCount: 0,
  });
  expect(absent.issue).toBeUndefined();
  expect(resolve(absent.path)).toBe(resolve(libraryFolder));
} finally {
  await app.close();
}
seedLibrary(libraryFolder);
app = await launch();
let primaryId, secondaryId, studyId, cardId;
try {
  const page = await app.firstWindow();
  const library = await page.evaluate(async () => ({
    status: await window.chessApp.libraryStatus(),
    puzzles: await window.chessApp.libraryPuzzles({
      theme: "mateIn1",
      minRating: 700,
      maxRating: 900,
    }),
    lookup: await window.chessApp.libraryLookup(["lichess_TST01"]),
    games: await window.chessApp.libraryGames({
      player: "Example",
      eco: "A00",
    }),
    pgn: await window.chessApp.libraryGamePgn(1),
  }));
  expect(library.status).toMatchObject({
    puzzles: true,
    games: true,
    puzzleCount: 1,
    gameCount: 1,
  });
  expect(library.status.issue).toBeUndefined();
  expect(library.puzzles.items).toHaveLength(1);
  expect(library.puzzles.items[0]).toMatchObject({
    id: "lichess_TST01",
    line: ["g6g7"],
  });
  expect(library.lookup.map((puzzle) => puzzle.id)).toEqual(["lichess_TST01"]);
  expect(library.games.items).toHaveLength(1);
  expect(library.games.items[0]).toMatchObject({
    id: 1,
    white: "Example",
    black: "Opponent",
  });
  expect(library.pgn).toContain("1. f3 e5 2. g4 Qh4# 0-1");
  await expect(
    page.getByRole("heading", { name: "Твоя игра начинается здесь" }),
  ).toBeVisible();
  await expect(page.locator(".profile-choice")).toHaveCount(0);
  const initial = await page.evaluate(() => window.chessApp.snapshot());
  expect(initial.database.profiles).toHaveLength(0);
  expect(initial.activeProfile).toBeNull();
  expect(Object.keys(initial.database.progress)).toHaveLength(0);
  expect(initial.database.games).toHaveLength(0);
  expect(
    JSON.parse(readFileSync(join(initial.dataPath, "chess-home.json"), "utf8"))
      .profiles,
  ).toHaveLength(0);
  ({ primaryId, secondaryId } = await page.evaluate(async () => {
    const first = await window.chessApp.createProfile({
      name: "Portable First",
      nickname: "portable_first",
      skillLevel: "beginner",
      locale: "ru",
    });
    const second = await window.chessApp.createProfile({
      name: "Portable Second",
      nickname: "portable_second",
      skillLevel: "new",
      locale: "ru",
    });
    await window.chessApp.selectProfile(first.activeProfile);
    return {
      primaryId: first.activeProfile,
      secondaryId: second.activeProfile,
    };
  }));
  expect(primaryId).toBeTruthy();
  expect(secondaryId).toBeTruthy();
  expect(primaryId).not.toBe(secondaryId);
  let study = createStudy({ profileId: primaryId, title: "Portable branches" });
  study = addStudyMove(study, study.rootId, "e2e4");
  study = addStudyMove(study, study.rootId, "d2d4");
  study = selectStudyNode(study, study.rootId);
  const card = cardFromStudy(study);
  studyId = study.id;
  cardId = card.id;
  await page.evaluate(
    async ({ study, card }) => {
      await window.chessApp.saveStudy(study);
      await window.chessApp.saveTrainingCard(card);
    },
    { study, card },
  );
  if (sourcePacks) {
    const prediction = await page.evaluate(async () =>
      window.chessApp.predictHuman({
        requestId: "portable-maia",
        position: {
          initialFen:
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          moves: [],
        },
        pack: "maia-cpu",
        selfElo: 1100,
        opponentElo: 1100,
      }),
    );
    expect(prediction.candidates.length).toBe(20);
    expect(
      prediction.candidates.reduce((n, m) => n + m.probability, 0),
    ).toBeCloseTo(1, 5);
  }
  await expect(
    page.getByRole("heading", { name: "Твой следующий ход" }),
  ).toBeVisible();
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
    const imported = await window.chessApp.importPgn("1. f3 e5 2. g4 Qh4# 0-1");
    const s = await window.chessApp.snapshot();
    const g = s.database.games.find(
      (g) => g.moves.join(" ") === "f2f3 e7e5 g2g4 d8h4",
    );
    await window.chessApp.analyze(g.id);
    return { imported, id: g.id, path: s.dataPath };
  });
  expect(result.imported).toEqual({ added: 1, skipped: 0 });

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
          .progress[primaryId].vision.length,
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Сменить профиль", exact: true })
    .click();
  await expect(page.locator(".profile-choice")).toHaveCount(2);
  await page
    .locator(".profile-choice")
    .filter({ hasText: "@portable_second" })
    .click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.chessApp.snapshot())).activeProfile,
    )
    .toBe(secondaryId);
  const switched = await page.evaluate(() => window.chessApp.snapshot());
  expect(await page.evaluate(() => window.chessApp.listStudies())).toEqual([]);
  expect(
    await page.evaluate(() => window.chessApp.listTrainingCards()),
  ).toEqual([]);
  expect(switched.database.profiles).toHaveLength(2);
  expect(switched.database.progress[secondaryId].vision).toHaveLength(0);
  expect(
    switched.database.games.filter((game) => game.profileId === secondaryId),
  ).toHaveLength(0);
  await page.evaluate(async (id) => {
    await window.chessApp.completeLesson("board");
    const s = await window.chessApp.snapshot();
    await window.chessApp.updateProfile({
      ...s.database.profiles.find((p) => p.id === id),
      locale: "en",
    });
  }, secondaryId);
  const backupPath = join(temp, "profile-backup.json");
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [path],
    });
  }, backupPath);
  expect(await page.evaluate(() => window.chessApp.exportBackup())).toBe(true);
  const backup = JSON.parse(readFileSync(backupPath, "utf8"));
  expect(backup.version).toBe(2);
  expect(backup.studies).toHaveLength(1);
  expect(backup.training).toHaveLength(1);
  expect(backup).not.toHaveProperty("apiKey");
  await page.evaluate(async (id) => {
    await window.chessApp.selectProfile(id);
    for (const s of await window.chessApp.listStudies())
      await window.chessApp.deleteStudy(s.id);
    for (const c of await window.chessApp.listTrainingCards())
      await window.chessApp.deleteTrainingCard(c.id);
    await window.chessApp.importBackup();
  }, primaryId);
  expect(await app.evaluate(() => globalThis.__offlineRequests)).toBe(0);
} finally {
  await app.close();
}
app = await launch();
try {
  const page = await app.firstWindow();
  await page.waitForSelector(".profile-choice");
  const s = await page.evaluate(() => window.chessApp.snapshot());
  await page.evaluate((id) => window.chessApp.selectProfile(id), primaryId);
  expect(
    (await page.evaluate(() => window.chessApp.listStudies())).map((s) => s.id),
  ).toEqual([studyId]);
  expect(
    (await page.evaluate(() => window.chessApp.listTrainingCards())).map(
      (c) => c.id,
    ),
  ).toEqual([cardId]);
  expect(s.database.profiles).toHaveLength(2);
  expect(s.database.profiles.map((profile) => profile.id).sort()).toEqual(
    [primaryId, secondaryId].sort(),
  );
  if (
    s.database.games.length !== 2 ||
    !s.database.progress[secondaryId].completed.includes("board") ||
    s.database.profiles.find((profile) => profile.id === secondaryId)
      ?.locale !== "en"
  )
    throw Error("Restart lost data");
  if (s.database.games.some((g) => g.profileId !== primaryId))
    throw Error("Mixed profiles");
  if (
    s.database.progress[primaryId].vision.length !== 1 ||
    s.database.progress[primaryId].visionSettings.coordinates ||
    s.database.progress[secondaryId].vision.length !== 0
  )
    throw Error("Vision results or settings lost or mixed between profiles");
  if (s.database.games.find((g) => g.moves.length === 4)?.analysis.length !== 4)
    throw Error("Analysis not saved");
  console.log(
    JSON.stringify({
      passed: true,
      packagedExe: exe,
      portableTestFolder: folder,
      initialProfiles: 0,
      createdProfiles: 2,
      games: 2,
      stockfish: "bundled executable, bot and 4-ply analysis verified",
      sqliteWorker:
        "ASAR startup, absent pack, fixture puzzle query and PGN read verified",
      restart: "both profiles preserved",
      data: "beside exe",
      apiCalls: 0,
      studyAndTraining:
        "branches and review card restored from v2 backup, survived restart, isolated by profile",
      maia: sourcePacks
        ? "relocated CPU runtime and model, no system Python or network"
        : "not installed",
    }),
  );
} finally {
  await app.close();
}
