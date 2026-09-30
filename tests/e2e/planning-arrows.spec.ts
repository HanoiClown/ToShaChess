import {
  test,
  expect,
  _electron as electron,
  type Locator,
  type Page,
} from "@playwright/test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
import { navigateSection } from "../helpers/navigation";

async function launchArrowStudy() {
  const directory = mkdtempSync(join(tmpdir(), "tosha-arrow-plans-"));
  seedProfiles(directory);
  const env = { ...process.env, CHESS_HOME_DATA: directory } as Record<
    string,
    string
  >;
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ["."], env });
  const page = await app.firstWindow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".profile-choice").first().click();
  await page.setViewportSize({ width: 1366, height: 900 });
  await navigateSection(page, "Обучение");
  await page
    .getByRole("button", { name: "Открыть курсы", exact: true })
    .click();
  await page.getByRole("button", { name: /Королевский гамбит/i }).click();
  await page.getByRole("button", { name: "Исследовать", exact: true }).click();
  const board = page.locator(".study-layout .chessboard");
  await expect(board).toBeVisible();
  return { app, page, board };
}

async function dragPlan(page: Page, board: Locator, from: string, to: string) {
  const source = (await board
    .locator(`[data-square="${from}"]`)
    .boundingBox())!;
  const target = (await board.locator(`[data-square="${to}"]`).boundingBox())!;
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  await page.mouse.up({ button: "right" });
}

async function expectPlanColor(
  mark: Locator,
  color: "w" | "b",
  side: "own" | "opponent",
) {
  const expected = side === "own" ? "rgb(239, 154, 50)" : "rgb(230, 80, 84)";
  await expect(mark).toHaveAttribute("data-color", color);
  await expect(mark).toHaveClass(new RegExp(`\\bannotation-${side}\\b`));
  await expect(mark).toHaveCSS("stroke", expected);
  const markerFill = await mark.evaluate((element) => {
    const markerId =
      getComputedStyle(element).markerEnd.match(/#([^\)"']+)/)?.[1];
    const path =
      markerId &&
      element.ownerDocument.getElementById(markerId)?.querySelector("path");
    return path ? getComputedStyle(path).fill : null;
  });
  expect(markerFill).toBe(expected);
}

test("planning colors and arrowheads follow the study orientation", async () => {
  const { app, page, board } = await launchArrowStudy();
  try {
    const marks = board.locator(".user-annotations");
    await dragPlan(page, board, "e2", "e4");
    await dragPlan(page, board, "e7", "e5");
    await expect(marks.locator("line")).toHaveCount(2);
    // Assert the rendered color before the new metadata, proving a visual regression.
    await expect(marks.locator("line").nth(1)).toHaveCSS(
      "stroke",
      "rgb(230, 80, 84)",
    );
    await expectPlanColor(
      marks.locator('[data-from="e2"][data-to="e4"]'),
      "w",
      "own",
    );
    await expectPlanColor(
      marks.locator('[data-from="e7"][data-to="e5"]'),
      "b",
      "opponent",
    );
    mkdirSync(".impeccable/review/planning-arrows", { recursive: true });
    await board.screenshot({
      path: ".impeccable/review/planning-arrows/white-bottom.png",
    });

    await page
      .getByRole("button", { name: "Перевернуть доску", exact: true })
      .click();
    await expect(marks).toHaveCount(0);
    await dragPlan(page, board, "e2", "e4");
    await dragPlan(page, board, "e7", "e5");
    await expectPlanColor(
      marks.locator('[data-from="e2"][data-to="e4"]'),
      "w",
      "opponent",
    );
    await expectPlanColor(
      marks.locator('[data-from="e7"][data-to="e5"]'),
      "b",
      "own",
    );
    await board.screenshot({
      path: ".impeccable/review/planning-arrows/black-bottom.png",
    });
    await expect(page.getByRole("treeitem", { selected: true })).toContainText(
      "Начало",
    );
  } finally {
    await app.close();
  }
});

test("virtual endpoints chain each piece and removing a parent removes only its descendants", async () => {
  const { app, page, board } = await launchArrowStudy();
  try {
    const marks = board.locator(".user-annotations");
    const arrow = (from: string, to: string) =>
      marks.locator(`[data-from="${from}"][data-to="${to}"]`);
    const pieces = () =>
      board.locator(".square img").evaluateAll((images) =>
        images
          .map((image) => ({
            square: image.parentElement?.getAttribute("data-square"),
            piece: image.getAttribute("src"),
          }))
          .sort((a, b) => (a.square ?? "").localeCompare(b.square ?? "")),
      );
    const initialPieces = await pieces();

    await dragPlan(page, board, "e2", "e4");
    await dragPlan(page, board, "e4", "e5");
    await expect(marks.locator("line")).toHaveCount(2);
    await expectPlanColor(arrow("e4", "e5"), "w", "own");
    await dragPlan(page, board, "e4", "e6");
    await dragPlan(page, board, "e5", "e4");
    await expect(marks.locator("line")).toHaveCount(2);
    await dragPlan(page, board, "g8", "f6");
    await dragPlan(page, board, "e2", "e4");
    await expect(marks.locator("line")).toHaveCount(0);
    await expectPlanColor(arrow("g8", "f6"), "b", "opponent");
    await dragPlan(page, board, "e4", "e5");
    await expect(marks.locator("line")).toHaveCount(0);
    await dragPlan(page, board, "g8", "f6");
    await expect(marks).toHaveCount(0);

    await dragPlan(page, board, "e7", "e5");
    await dragPlan(page, board, "e5", "e4");
    await expect(marks.locator("line")).toHaveCount(2);
    await expectPlanColor(arrow("e5", "e4"), "b", "opponent");
    await dragPlan(page, board, "e5", "e3");
    await dragPlan(page, board, "e4", "e5");
    await expect(marks.locator("line")).toHaveCount(2);
    await dragPlan(page, board, "g1", "f3");
    await dragPlan(page, board, "e7", "e5");
    await expect(marks.locator("line")).toHaveCount(0);
    await expectPlanColor(arrow("g1", "f3"), "w", "own");
    await dragPlan(page, board, "f3", "e5");
    await expect(marks.locator("polyline")).toHaveCount(2);
    await expect(arrow("f3", "e5")).toHaveAttribute(
      "points",
      "68.75,68.75 68.75,43.75 56.25,43.75",
    );
    await expectPlanColor(arrow("f3", "e5"), "w", "own");
    await dragPlan(page, board, "f3", "f5");
    await expect(marks.locator("polyline")).toHaveCount(2);

    // A virtual bishop on the captured queen's square stays a white bishop.
    await dragPlan(page, board, "c1", "g5");
    await dragPlan(page, board, "g5", "d8");
    await dragPlan(page, board, "d8", "e7");
    await expectPlanColor(arrow("d8", "e7"), "w", "own");
    await expect(marks.locator("line")).toHaveCount(3);
    await dragPlan(page, board, "c1", "g5");
    await expect(marks.locator("line")).toHaveCount(0);
    await expect(marks.locator("polyline")).toHaveCount(2);
    await dragPlan(page, board, "g1", "f3");
    await expect(marks).toHaveCount(0);
    expect(await pieces()).toEqual(initialPieces);
    await expect(page.getByRole("treeitem", { selected: true })).toContainText(
      "Начало",
    );
  } finally {
    await app.close();
  }
});

test("planning arrows anticipate both sides while played moves remain legal", async () => {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-planning-arrows-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({ args: ["."], env });
  try {
    const page = await app.firstWindow();
    await page.locator(".profile-choice").first().click();
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Обучение", exact: true }).click();
    await page
      .getByRole("button", { name: "Открыть курсы", exact: true })
      .click();
    await page.getByRole("button", { name: /Королевский гамбит/i }).click();
    await page
      .getByRole("button", { name: "Исследовать", exact: true })
      .click();

    const board = page.locator(".study-layout .chessboard"),
      annotations = board.locator(".user-annotations"),
      selected = page.getByRole("treeitem", { selected: true });
    await expect(board).toBeVisible();
    await expect(selected).toContainText("Начало");
    const pieces = () =>
      board.locator(".square img").evaluateAll((images) =>
        images
          .map((image) => ({
            square: image.parentElement?.getAttribute("data-square"),
            piece: image.getAttribute("src"),
          }))
          .sort((a, b) => (a.square ?? "").localeCompare(b.square ?? "")),
      );
    const initialPieces = await pieces();
    async function rightDrag(from: string, to: string) {
      const a = (await board.locator(`[data-square="${from}"]`).boundingBox())!,
        b = (await board.locator(`[data-square="${to}"]`).boundingBox())!;
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.up({ button: "right" });
    }
    async function play(from: string, to: string) {
      await board.locator(`[data-square="${from}"]`).click();
      await board.locator(`[data-square="${to}"]`).click();
    }

    // Plan d3 and then Bg5 while d2 is still occupied, plus Black's reply.
    await rightDrag("d2", "d3");
    await rightDrag("c1", "g5");
    await rightDrag("e7", "e5");
    await rightDrag("g8", "f6");
    await expect(annotations.locator("line")).toHaveCount(3);
    await expect(annotations.locator("polyline")).toHaveAttribute(
      "points",
      "81.25,6.25 81.25,31.25 68.75,31.25",
    );
    expect(await pieces()).toEqual(initialPieces);
    await expect(selected).toContainText("Начало");
    await board.screenshot({ path: "test-results/planning-arrows.png" });
    await page
      .getByRole("button", { name: "Перевернуть доску", exact: true })
      .click();
    await expect(annotations).toHaveCount(0);
    await rightDrag("g8", "f6");
    await expect(annotations.locator("polyline")).toHaveAttribute(
      "points",
      "18.75,93.75 18.75,68.75 31.25,68.75",
    );
    await rightDrag("g8", "f6");
    await rightDrag("g1", "f3");
    await expect(annotations.locator("polyline")).toHaveAttribute(
      "points",
      "18.75,6.25 18.75,31.25 31.25,31.25",
    );
    await rightDrag("g1", "f3");
    await expect(annotations).toHaveCount(0);
    for (const [from, to] of [
      ["a1", "b2"],
      ["c1", "c3"],
      ["g1", "g3"],
      ["e7", "e8"],
      ["e4", "e5"],
    ]) {
      await rightDrag(from, to);
      await expect(annotations).toHaveCount(0);
    }
    await rightDrag("e4", "e4");
    await expect(annotations.locator("circle")).toHaveCount(1);
    await rightDrag("e4", "e4");
    await expect(annotations).toHaveCount(0);

    // The same gestures with the left button still require real legal moves.
    await play("c1", "g5");
    await play("g8", "f6");
    expect(await pieces()).toEqual(initialPieces);
    await expect(selected).toContainText("Начало");
    await play("d2", "d3");
    await expect(selected).toContainText("d3");
    await expect(board.locator('[data-square="d3"] img')).toHaveAttribute(
      "src",
      "./pieces/wP.svg",
    );
    await rightDrag("g1", "f3");
    await expect(annotations.locator("polyline")).toHaveCount(1);
    await play("g1", "f3");
    await expect(annotations).toHaveCount(0);
    await expect(selected).toContainText("d3");
    await expect(board.locator('[data-square="g1"] img')).toHaveCount(1);
    await play("d7", "d6");
    await expect(selected).toContainText("d6");
    await play("c1", "g5");
    await expect(selected).toContainText("Bg5");
    await expect(board.locator('[data-square="g5"] img')).toHaveAttribute(
      "src",
      "./pieces/wB.svg",
    );
  } finally {
    await app.close();
  }
});
