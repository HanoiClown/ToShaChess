import { navigateSection } from "../helpers/navigation";
import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Chess } from "chess.js";
import { seedProfiles } from "../helpers/profile-fixtures";
import { createStudy, addStudyMove } from "../../src/study/tree";

const runtimeRoot = resolve("engine-packs");
const libraryRoot = process.env.TOSHACHESS_LIBRARY ?? resolve("library-packs");
const startFen = new Chess().fen();
const queenFen = "7k/8/5KQ1/8/8/8/8/8 w - - 0 1";
const lc0 = join(runtimeRoot, "lc0-cpu/lc0.exe");
const network = join(runtimeRoot, "lc0-cpu/791556.pb.gz");

async function launch(
  options: {
    installed?: boolean;
    library?: boolean;
    fen?: string;
    moves?: string[];
  } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), "tosha-advanced-ui-"));
  seedProfiles(directory);
  let study = createStudy({
    profileId: "hanoi",
    title: "Advanced tools regression",
    initialFen: options.fen ?? startFen,
  });
  for (const move of options.moves ?? [])
    study = addStudyMove(study, study.selectedNodeId, move, "personal");
  writeFileSync(
    join(directory, "studies.json"),
    JSON.stringify({ version: 1, studies: [study] }),
  );
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: directory,
    TOSHACHESS_ENGINES: options.installed
      ? runtimeRoot
      : join(directory, "empty-engine-packs"),
    TOSHACHESS_LIBRARY: options.library
      ? libraryRoot
      : join(directory, "empty-library"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ["."], env });
  // Test both renderer and main-process traffic. No package download is allowed.
  await app.evaluate(({ session }) => {
    const state = globalThis as typeof globalThis & {
      __advancedNetworkAttempts: string[];
    };
    state.__advancedNetworkAttempts = [];
    globalThis.fetch = async (input) => {
      state.__advancedNetworkAttempts.push(String(input));
      throw Error("Network disabled in offline advanced-tools test");
    };
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["http://*/*", "https://*/*"] },
      (details, callback) => {
        state.__advancedNetworkAttempts.push(details.url);
        callback({ cancel: true });
      },
    );
  });
  const page = await app.firstWindow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".profile-choice").first().click();
  return { app, page };
}

async function offline(app: ElectronApplication) {
  expect(
    await app.evaluate(
      () =>
        (
          globalThis as typeof globalThis & {
            __advancedNetworkAttempts: string[];
          }
        ).__advancedNetworkAttempts,
    ),
  ).toEqual([]);
}

async function openAdvanced(
  page: Page,
  surface: "settings" | "position",
  purpose: "search" | "explorer" | "tablebase" = "search",
) {
  // The study loads asynchronously after navigation. Wait for the requested
  // surface instead of treating a not-yet-mounted toolbox as Settings.
  if (surface === "position") {
    const toolbox = page.locator(".position-toolbox");
    await expect(toolbox).toBeVisible();
    if (!(await toolbox.evaluate((e) => (e as HTMLDetailsElement).open)))
      await toolbox.locator(":scope > summary").click();
    await toolbox
      .locator(".position-toolbox-body > label select")
      .selectOption(purpose);
    const panel = toolbox.locator(".advanced-tools");
    await expect(panel).toBeVisible();
    return panel;
  }
  const extensions = page.locator(".settings-extensions");
  await expect(extensions).toBeVisible();
  if (!(await extensions.evaluate((e) => (e as HTMLDetailsElement).open)))
    await extensions.locator(":scope > summary").click();
  const panel = page.locator(".advanced-tools");
  await expect(panel).toBeVisible();
  if (
    !(await panel.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await panel.locator(":scope > summary").click();
  for (const section of await panel.locator(".advanced-section").all()) {
    if (!(await section.evaluate((e) => (e as HTMLDetailsElement).open)))
      await section.locator(":scope > summary").click();
  }
  return panel;
}

async function captureSettings(page: Page) {
  if (!process.env.TOSHA_CAPTURE) return;
  mkdirSync(".impeccable/review/community", { recursive: true });
  for (const [theme, label] of [
    ["green", "Зелёная"],
    ["purple", "Тёмно-фиолетовая"],
    ["blue", "Тёмно-синяя"],
    ["red", "Тёмно-красная"],
  ]) {
    await page.getByRole("button", { name: "RU", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await (await openAdvanced(page, "settings")).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `.impeccable/review/community/advanced-${theme}-ru-1440.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.setViewportSize({ width: 720, height: 960 });
    await expect(page.locator(".advanced-tools > summary")).toContainText(
      "Configure optional tools",
    );
    await page.locator(".advanced-tools").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.impeccable/review/community/advanced-${theme}-en-720.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "RU", exact: true }).click();
}

test("empty optional packages stay missing, offer explicit installation, and never fabricate Maia probabilities", async () => {
  test.setTimeout(90000);
  const { app, page } = await launch();
  try {
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    const panel = await openAdvanced(page, "settings");
    await expect(panel.locator(".advanced-pack")).toHaveCount(2);
    for (const name of ["Syzygy", "Lc0"]) {
      const row = panel.locator(".advanced-pack").filter({ hasText: name });
      await expect(row).toContainText("Не установлен");
      await expect(
        row.getByRole("button", { name: "Установить", exact: true }),
      ).toBeEnabled();
    }
    await expect(panel).toContainText("Дополнительный движок не выбран.");
    await expect(panel.locator("progress")).toHaveCount(0);
    await expect(panel.locator(".advanced-result")).toHaveCount(0);
    await captureSettings(page);
    await navigateSection(page, "Исследования");
    await page.locator(".position-toolbox > summary").click();
    const comparison = page.locator(".comparison-panel");
    await expect(comparison).toContainText("Установи Maia");
    await expect(
      comparison.getByRole("button", { name: "Сравнить", exact: true }),
    ).toBeDisabled();
    await expect(comparison.locator("table")).toHaveCount(0);
    expect(await comparison.innerText()).not.toMatch(/\d+(?:[.,]\d+)?%/);
    const studyPanel = await openAdvanced(page, "position");
    await expect(studyPanel).toContainText("Подключи дополнительный движок");
    await expect(
      studyPanel.getByRole("button", {
        name: "Открыть настройки инструментов",
        exact: true,
      }),
    ).toBeVisible();
    await offline(app);
  } finally {
    await app.close();
  }
});

test("real local Syzygy shows WDL and DTZ, then recognises the played queen mate", async () => {
  test.skip(
    !existsSync(join(runtimeRoot, "maia-cpu/python/python.exe")) ||
      !existsSync(join(runtimeRoot, "syzygy-3-5/KQvK.rtbw")) ||
      !existsSync(join(runtimeRoot, "syzygy-3-5/KQvK.rtbz")),
    "Optional portable Python and Syzygy tables are not installed",
  );
  const { app, page } = await launch({ installed: true, fen: queenFen });
  try {
    await navigateSection(page, "Исследования");
    const panel = await openAdvanced(page, "position", "tablebase");
    await panel
      .getByRole("button", { name: "Проверить окончание", exact: true })
      .click();
    const result = panel.locator(".advanced-result");
    await expect(result).toContainText("за сторону, которая ходит");
    await expect(result).toContainText("Выигрыш");
    await expect(result).toContainText("DTZ 1");
    await expect(result).toContainText(
      "Это не показатель расстояния до мата (DTM)",
    );
    await result.getByRole("button", { name: "Qg7#", exact: true }).click();
    await expect(page.getByRole("treeitem", { selected: true })).toContainText(
      "Qg7#",
    );
    await expect(panel.locator(".advanced-result")).toHaveCount(0);
    await panel
      .getByRole("button", { name: "Проверить окончание", exact: true })
      .click();
    await expect(result).toContainText("На доске мат.");
    await expect(result).toContainText("Поражение");
    await expect(result.locator("tbody tr")).toHaveCount(0);
    await offline(app);
  } finally {
    await app.close();
  }
});

test("installed opening index displays actual local sample counts through the position UI", async () => {
  const indexFile = join(runtimeRoot, "opening-index.sqlite");
  test.skip(
    !existsSync(indexFile) || !existsSync(join(libraryRoot, "games.sqlite")),
    "Optional opening index/source archive missing; set TOSHACHESS_LIBRARY to its source directory",
  );
  const db = new DatabaseSync(indexFile, { readOnly: true });
  let expected = 0;
  try {
    expected = Number(
      db
        .prepare(
          "SELECT SUM(white_wins+draws+black_wins) AS games FROM positions WHERE fen=?",
        )
        .get(startFen.split(" ").slice(0, 4).join(" "))?.games ?? 0,
    );
  } finally {
    db.close();
  }
  test.skip(!expected, "Installed index contains no starting-position sample");
  const { app, page } = await launch({ installed: true, library: true });
  try {
    await navigateSection(page, "Исследования");
    const panel = await openAdvanced(page, "position", "explorer");
    await panel
      .getByRole("button", { name: "Ходы в местной базе", exact: true })
      .click();
    const result = panel.locator(".advanced-result");
    await expect(result).toContainText("Дебютная статистика");
    await expect(result.locator("caption")).toBeVisible();
    expect(
      (await result.locator("caption").innerText()).replace(/\D/g, ""),
    ).toBe(String(expected));
    expect(await result.locator("tbody tr").count()).toBeGreaterThan(1);
    await expect(result).toContainText("Это не прогноз Maia");
    await expect(result).toContainText("Installed Lichess archive");
    await expect(result.locator("tbody")).toContainText("e4");
    await panel
      .getByRole("combobox", {
        name: "Средний рейтинг обоих игроков",
        exact: true,
      })
      .selectOption("under1000");
    await panel
      .getByRole("button", { name: "Ходы в местной базе", exact: true })
      .click();
    await expect(result.locator("caption")).toBeVisible();
    const filtered = Number(
      (await result.locator("caption").innerText()).replace(/\D/g, ""),
    );
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThanOrEqual(expected);
    await offline(app);
  } finally {
    await app.close();
  }
});

test("native-selected Lc0 and network produce real CPU analysis through Electron IPC", async () => {
  test.skip(
    !existsSync(lc0) || !existsSync(network),
    "Optional Lc0 CPU runtime/network missing",
  );
  test.setTimeout(90000);
  const moves = ["e2e4", "e7e5", "g1f3"];
  // An empty managed-pack path forces the native executable picker; actual files stay read-only.
  const { app, page } = await launch({ moves });
  try {
    await app.evaluate(
      ({ dialog }, files) => {
        let next = 0;
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [files[next++] ?? ""],
        });
      },
      [lc0, network],
    );
    await page.getByRole("button", { name: "Настройки", exact: true }).click();
    let panel = await openAdvanced(page, "settings");
    await panel
      .getByRole("button", { name: "Выбрать Lc0", exact: true })
      .click();
    await panel
      .getByLabel("Название", { exact: true })
      .fill("Lc0 UI regression");
    await panel
      .getByRole("button", { name: "Выбрать сеть Lc0", exact: true })
      .click();
    await expect(panel).toContainText("791556.pb.gz");
    await panel
      .getByRole("button", { name: "Сохранить движок", exact: true })
      .click();
    await expect(panel.getByRole("status")).toContainText("Движок выбран");
    expect(
      await page.evaluate(() => window.chessApp.advanced.engineConfig()),
    ).toMatchObject({
      id: "lc0",
      executable: lc0,
      networkPath: network,
      backend: "cpu",
    });
    await navigateSection(page, "Исследования");
    panel = await openAdvanced(page, "position");
    await panel
      .getByRole("button", { name: "Lc0 UI regression", exact: true })
      .click();
    const result = panel.locator(".advanced-result");
    await expect(result.locator("h4")).toContainText("0.32.1", {
      timeout: 30000,
    });
    await expect(result).toContainText("791556.pb.gz");
    await expect(result).toContainText("Оценка за белых");
    await expect(result.locator(".advanced-lines li").first()).toBeVisible();
    const pv = await result
      .locator(".advanced-lines li")
      .first()
      .locator("span")
      .innerText();
    const board = new Chess(startFen);
    for (const move of moves)
      board.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
    for (const move of pv.trim().split(/\s+/))
      expect(() => board.move(move)).not.toThrow();
    expect(await result.innerText()).not.toMatch(/\d+(?:[.,]\d+)?%/);
    await offline(app);
  } finally {
    await app.close();
  }
});
