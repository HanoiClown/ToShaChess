import { test, expect } from "vitest";
import { bots } from "../../src/bots/catalog";
import { selectBotMove } from "../../electron/engine/bot-policy";
import { START, boardAt, playUci } from "../../src/chess/game";
import { freshDatabase, validateDatabase } from "../../electron/storage/schema";
test("catalogue offers distinct styles at shared difficulty and safe defaults", () => {
  expect(bots).toHaveLength(12);
  expect(bots.filter((b) => b.rating === 600)).toHaveLength(3);
  expect(new Set(bots.map((b) => b.id)).size).toBe(12);
  const db = freshDatabase();
  delete db.settings.botQuips;
  expect(validateDatabase(db).settings.botQuips).toBe(true);
});
test("style changes candidate choice without selecting illegal moves", () => {
  const position = { initialFen: START, moves: [] };
  const lines = ["a2a3", "e2e4", "g1f3"].map((u) => ({
    score: { cp: 0, mate: null },
    pv: [u],
    depth: 12,
  }));
  const attack = selectBotMove(
    position,
    lines,
    bots.find((b) => b.id === "spark")!,
    () => 0.99,
  );
  const solid = selectBotMove(
    position,
    lines,
    bots.find((b) => b.id === "quiet")!,
    () => 0.99,
  );
  expect(attack.pv[0]).not.toBe(solid.pv[0]);
  for (const b of bots)
    expect(() =>
      playUci(
        boardAt(position),
        selectBotMove(position, lines, b, () => 0.25).pv[0],
      ),
    ).not.toThrow();
});
