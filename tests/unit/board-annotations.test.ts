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
import {
  legalArrow,
  planningArrow,
  arrowPoints,
  togglePlanningMark,
  type BoardMark,
} from "../../src/ui/board-annotations";
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

test("planning arrows allow either color without changing whose turn it is", () => {
  const board = new Chess(),
    before = board.fen();
  expect(planningArrow(board, "g1", "f3")).toBe(true);
  expect(planningArrow(board, "g8", "f6")).toBe(true);
  expect(planningArrow(board, "e7", "e5")).toBe(true);
  expect(board.fen()).toBe(before);
  expect(board.history()).toEqual([]);
  board.move("e4");
  expect(planningArrow(board, "g1", "f3")).toBe(true);
  expect(planningArrow(board, "g8", "f6")).toBe(true);
  expect(board.turn()).toBe("b");
});

test("planning arrows ignore blockers, occupied targets and check", () => {
  const board = new Chess();
  for (const [from, to] of [
    ["c1", "g5"],
    ["a1", "a4"],
    ["d1", "h5"],
    ["c1", "d2"],
    ["g1", "e2"],
  ] as const)
    expect(planningArrow(board, from, to), `${from}-${to}`).toBe(true);
  const pinned = new Chess("k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1");
  expect(planningArrow(pinned, "e2", "d2")).toBe(true);
  const checked = new Chess("k3r3/8/8/8/8/8/8/3QK3 w - - 0 1");
  expect(planningArrow(checked, "d1", "c2")).toBe(true);
});

test("planning arrows reject impossible shapes and empty sources", () => {
  const board = new Chess();
  for (const [from, to] of [
    ["a1", "b2"],
    ["c1", "c3"],
    ["g1", "g3"],
    ["g1", "f4"],
    ["d1", "e3"],
    ["e1", "e3"],
    ["e1", "g1"],
    ["e4", "e5"],
    ["g1", "g1"],
  ] as const)
    expect(planningArrow(board, from, to), `${from}-${to}`).toBe(false);
  expect(planningArrow(board, "e1", "d2")).toBe(true);
  expect(planningArrow(board, "e8", "d7")).toBe(true);
});

test("planning pawn arrows follow each color's direction and starting rank", () => {
  const board = new Chess();
  for (const [from, to] of [
    ["d2", "d3"],
    ["d2", "d4"],
    ["d2", "c3"],
    ["d2", "e3"],
    ["d7", "d6"],
    ["d7", "d5"],
    ["d7", "c6"],
    ["d7", "e6"],
  ] as const)
    expect(planningArrow(board, from, to), `${from}-${to}`).toBe(true);
  for (const [from, to] of [
    ["d2", "d1"],
    ["d2", "e2"],
    ["d2", "e4"],
    ["d2", "d5"],
    ["d7", "d8"],
    ["d7", "e7"],
    ["d7", "e5"],
    ["d7", "d4"],
  ] as const)
    expect(planningArrow(board, from, to), `${from}-${to}`).toBe(false);
  board.move("d4");
  board.move("d5");
  expect(planningArrow(board, "d4", "d5")).toBe(true);
  expect(planningArrow(board, "d5", "d4")).toBe(true);
  expect(planningArrow(board, "d4", "d6")).toBe(false);
  expect(planningArrow(board, "d5", "d3")).toBe(false);
});

test("chained pawn and knight plans retain the piece and never change the board", () => {
  const board = new Chess(),
    before = board.fen();
  let marks: BoardMark[] = [];
  for (const [from, to] of [
    ["e2", "e4"],
    ["e4", "e5"],
    ["e5", "d6"],
    ["d7", "d5"],
    ["d5", "d4"],
    ["g8", "f6"],
    ["f6", "e4"],
  ] as const)
    marks = togglePlanningMark(board, marks, { from, to });
  expect(marks).toEqual([
    { from: "e2", to: "e4", piece: { type: "p", color: "w" } },
    { from: "e4", to: "e5", piece: { type: "p", color: "w" }, parent: "e2e4" },
    { from: "e5", to: "d6", piece: { type: "p", color: "w" }, parent: "e4e5" },
    { from: "d7", to: "d5", piece: { type: "p", color: "b" } },
    { from: "d5", to: "d4", piece: { type: "p", color: "b" }, parent: "d7d5" },
    { from: "g8", to: "f6", piece: { type: "n", color: "b" } },
    { from: "f6", to: "e4", piece: { type: "n", color: "b" }, parent: "g8f6" },
  ]);
  expect(board.fen()).toBe(before);
  expect(board.history()).toEqual([]);
});

test("removing a plan removes its descendants but preserves alternatives and circles", () => {
  const board = new Chess();
  let marks: BoardMark[] = [];
  for (const [from, to] of [
    ["g1", "f3"],
    ["f3", "g5"],
    ["g5", "e6"],
    ["f3", "e5"],
    ["g1", "h3"],
    ["b1", "c3"],
    ["f3", "f3"],
  ] as const)
    marks = togglePlanningMark(board, marks, { from, to });
  const before = JSON.stringify(marks);
  const branchRemoved = togglePlanningMark(board, marks, {
    from: "f3",
    to: "g5",
  });
  expect(branchRemoved.map(({ from, to }) => from + to)).toEqual([
    "g1f3",
    "f3e5",
    "g1h3",
    "b1c3",
    "f3f3",
  ]);
  const rootRemoved = togglePlanningMark(board, branchRemoved, {
    from: "g1",
    to: "f3",
  });
  expect(rootRemoved.map(({ from, to }) => from + to)).toEqual([
    "g1h3",
    "b1c3",
    "f3f3",
  ]);
  expect(JSON.stringify(marks)).toBe(before);
  expect(
    togglePlanningMark(board, rootRemoved, { from: "f3", to: "f3" }).map(
      ({ from, to }) => from + to,
    ),
  ).toEqual(["g1h3", "b1c3"]);
});

test("a virtual source still rejects impossible shapes and pawn double steps away from home", () => {
  const board = new Chess();
  let marks: BoardMark[] = [];
  for (const [from, to] of [
    ["e2", "e4"],
    ["d7", "d5"],
    ["g1", "f3"],
    ["c1", "g5"],
    ["a1", "a4"],
    ["h4", "h4"],
  ] as const)
    marks = togglePlanningMark(board, marks, { from, to });
  for (const [from, to] of [
    ["e4", "e6"],
    ["e4", "e3"],
    ["d5", "d3"],
    ["d5", "d6"],
    ["f3", "f5"],
    ["g5", "g6"],
    ["a4", "b5"],
    ["h4", "h5"],
    ["c4", "c5"],
  ] as const)
    expect(
      togglePlanningMark(board, marks, { from, to }),
      `${from}-${to}`,
    ).toEqual(marks);
});

test("an incoming capture plan takes precedence over the board occupant", () => {
  const board = new Chess();
  const capture = togglePlanningMark(board, [], { from: "c1", to: "h6" });
  const continuation = togglePlanningMark(board, capture, {
    from: "h6",
    to: "g7",
  });
  const afterCapture = togglePlanningMark(board, continuation, {
    from: "g7",
    to: "h8",
  });
  expect(afterCapture.at(-1)).toEqual({
    from: "g7",
    to: "h8",
    piece: { type: "b", color: "w" },
    parent: "h6g7",
  });
  expect(
    togglePlanningMark(board, afterCapture, { from: "g7", to: "g6" }),
  ).toEqual(afterCapture);
  expect(board.get("g7")).toEqual({ type: "p", color: "b" });
});

test("the newest incoming arrow determines an ambiguous endpoint and circles do not replace it", () => {
  const board = new Chess();
  let marks: BoardMark[] = [];
  for (const [from, to] of [
    ["e2", "e4"],
    ["g8", "f6"],
    ["f6", "e4"],
    ["e4", "e4"],
  ] as const)
    marks = togglePlanningMark(board, marks, { from, to });
  expect(togglePlanningMark(board, marks, { from: "e4", to: "e5" })).toEqual(
    marks,
  );
  const knight = togglePlanningMark(board, marks, { from: "e4", to: "c5" });
  expect(knight.at(-1)).toEqual({
    from: "e4",
    to: "c5",
    piece: { type: "n", color: "b" },
    parent: "f6e4",
  });
  const removed = togglePlanningMark(board, knight, { from: "f6", to: "e4" });
  expect(removed.map(({ from, to }) => from + to)).toEqual([
    "e2e4",
    "g8f6",
    "e4e4",
  ]);
  expect(
    togglePlanningMark(board, removed, { from: "e4", to: "e5" }).at(-1),
  ).toEqual({
    from: "e4",
    to: "e5",
    piece: { type: "p", color: "w" },
    parent: "e2e4",
  });
});

test("existing arrows can be removed even when a newer incoming plan changes their geometry", () => {
  const board = new Chess();
  let marks: BoardMark[] = [];
  for (const [from, to] of [
    ["e2", "e4"],
    ["e4", "e5"],
    ["e5", "e6"],
    ["g8", "f6"],
    ["f6", "e4"],
  ] as const)
    marks = togglePlanningMark(board, marks, { from, to });
  expect(
    togglePlanningMark(board, marks, { from: "e4", to: "e5" }).map(
      ({ from, to }) => from + to,
    ),
  ).toEqual(["e2e4", "g8f6", "f6e4"]);
});
