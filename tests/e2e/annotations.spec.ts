import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedProfiles } from "../helpers/profile-fixtures";
test("right drag marks a line and left click clears it without a move", async () => {
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    ),
    CHESS_HOME_DATA: mkdtempSync(join(tmpdir(), "tosha-marks-")),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  seedProfiles(env.CHESS_HOME_DATA);
  const app = await electron.launch({
    executablePath: process.env.TOSHA_ANNOTATIONS_EXE,
    args: process.env.TOSHA_ANNOTATIONS_EXE ? [] : ["."],
    env,
  });
  try {
    const p = await app.firstWindow();
    await p.locator(".profile-choice").first().click();
    await p
      .getByRole("button", { name: "Играть", exact: true })
      .first()
      .click();
    const board = p.locator(".chessboard:visible");
    const r = (await board.boundingBox())!;
    await p.mouse.move(r.x + (r.width * 4.5) / 8, r.y + (r.height * 6.5) / 8);
    await p.mouse.down({ button: "right" });
    await p.mouse.move(r.x + (r.width * 4.5) / 8, r.y + (r.height * 4.5) / 8);
    await p.mouse.up({ button: "right" });
    await expect(board.locator(".user-annotations line")).toHaveCount(1);
    await p.mouse.click(r.x + r.width / 16, r.y + (r.height * 15) / 16);
    await expect(board.locator(".user-annotations")).toHaveCount(0);
    async function rightDrag(from: string, to: string) {
      const a = (await board.locator(`[data-square="${from}"]`).boundingBox())!;
      const b = (await board.locator(`[data-square="${to}"]`).boundingBox())!;
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await p.mouse.down({ button: "right" });
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await p.mouse.up({ button: "right" });
    }
    for (const [from, to] of [
      ["a1", "b2"],
      ["a1", "a4"],
      ["c1", "c3"],
      ["g1", "g3"],
    ]) {
      await rightDrag(from, to);
      await expect(board.locator(".user-annotations")).toHaveCount(0);
    }
    await rightDrag("g1", "f3");
    await expect(board.locator(".user-annotations polyline")).toHaveAttribute(
      "points",
      "81.25,93.75 81.25,68.75 68.75,68.75",
    );
    await board.screenshot({ path: "test-results/legal-knight-arrow.png" });
    await rightDrag("g1", "f3");
    await expect(board.locator(".user-annotations")).toHaveCount(0);
    const cell = board.locator('[data-square="e4"]');
    await p.mouse.click(r.x + (r.width * 4.5) / 8, r.y + (r.height * 4.5) / 8, {
      button: "right",
    });
    await expect(board.locator(".user-annotations circle")).toHaveCount(1);
    await p.mouse.click(r.x + (r.width * 4.5) / 8, r.y + (r.height * 4.5) / 8, {
      button: "right",
    });
    await expect(board.locator(".user-annotations")).toHaveCount(0);
    await p.mouse.click(r.x + (r.width * 4.5) / 8, r.y + (r.height * 4.5) / 8, {
      button: "right",
    });
    await app.evaluate(({ BrowserWindow }) => {
      const wc = BrowserWindow.getAllWindows()[0].webContents;
      wc.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
      wc.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
    });
    await expect(board.locator(".user-annotations")).toHaveCount(0);
    await p.setViewportSize({ width: 900, height: 680 });
    await p
      .getByRole("button", { name: "Перевернуть доску", exact: true })
      .click();
    const from = (await board.locator('[data-square="e2"]').boundingBox())!;
    const to = (await board.locator('[data-square="e4"]').boundingBox())!;
    await p.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await p.mouse.down({ button: "right" });
    await p.mouse.move(to.x + to.width / 2, to.y + to.height / 2);
    await p.mouse.up({ button: "right" });
    await expect(board.locator(".user-annotations line")).toHaveCount(1);
    const line = board.locator(".user-annotations line");
    expect(Number(await line.getAttribute("y1"))).toBeLessThan(
      Number(await line.getAttribute("y2")),
    );
    await p
      .getByRole("button", { name: "Перевернуть доску", exact: true })
      .click();
    await expect(board.locator(".user-annotations")).toHaveCount(0);
  } finally {
    await app.close();
  }
});
