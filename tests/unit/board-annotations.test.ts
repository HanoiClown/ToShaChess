import { expect, test } from "vitest";
import { toggleMark, squareAt } from "../../src/ui/board-annotations";
test("repeating a mark removes only that mark", () => {
  const arrow = { from: "e2", to: "e4" } as const,
    cell = { from: "e2", to: "e2" } as const;
  expect(toggleMark(toggleMark([], arrow), arrow)).toEqual([]);
  expect(toggleMark([arrow, cell], arrow)).toEqual([cell]);
});
test("pointer geometry follows orientation and rejects outside release", () => {
  expect(squareAt(1, 1, 80, "w")).toBe("a8");
  expect(squareAt(1, 1, 80, "b")).toBe("h1");
  expect(squareAt(79, 79, 80, "w")).toBe("h1");
  expect(squareAt(-1, 5, 80, "w")).toBeNull();
  expect(squareAt(80, 5, 80, "w")).toBeNull();
});

import { Chess } from "chess.js";
import { legalArrow, arrowPoints } from "../../src/ui/board-annotations";
test("arrows obey legal chess moves, blockers, turn and check", () => {
  const start = new Chess();
  expect(legalArrow(start, "g1", "f3")).toBe(true);
  for (const [from, to] of [
    ["g1", "g3"],
    ["a1", "b2"],
    ["a1", "a3"],
    ["c1", "c3"],
    ["e4", "e5"],
    ["g8", "f6"],
  ] as const)
    expect(legalArrow(start, from, to)).toBe(false);
  const open = new Chess("4k3/8/8/8/8/8/8/R1B1K3 w - - 0 1");
  expect(legalArrow(open, "a1", "a6")).toBe(true);
  expect(legalArrow(open, "a1", "b2")).toBe(false);
  expect(legalArrow(open, "c1", "f4")).toBe(true);
  expect(legalArrow(open, "c1", "c4")).toBe(false);
  const pinned = new Chess("k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1");
  expect(legalArrow(pinned, "e2", "d2")).toBe(false);
  expect(
    legalArrow(new Chess("4k3/P7/8/8/8/8/8/4K3 w - - 0 1"), "a7", "a8"),
  ).toBe(true);
});
test("knight arrows have an orthogonal elbow in either orientation", () => {
  expect(arrowPoints("g1", "f3", "w", true)).toBe(
    "81.25,93.75 81.25,68.75 68.75,68.75",
  );
  expect(arrowPoints("g1", "e2", "w", true)).toBe(
    "81.25,93.75 56.25,93.75 56.25,81.25",
  );
  expect(arrowPoints("g1", "f3", "b", true)).toBe(
    "18.75,6.25 18.75,31.25 31.25,31.25",
  );
  expect(arrowPoints("a1", "a6", "w", false)).toBe("6.25,93.75 6.25,31.25");
});
