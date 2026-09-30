import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";

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
