import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  boardTransition,
  travelOffset,
} from "../../src/chess/board-transition";

function transition(fen: string | undefined, move: string) {
  const chess = new Chess(fen);
  const before = chess.fen();
  chess.move(move);
  return { before, after: chess.fen() };
}

describe("adjacent board transitions", () => {
  it("recognizes a legal move and a replay step backwards", () => {
    const { before, after } = transition(undefined, "e4");
    expect(boardTransition(before, after)).toEqual({
      direction: "forward",
      pieces: [{ from: "e2", to: "e4" }],
      sound: "move",
    });
    expect(boardTransition(after, before)).toEqual({
      direction: "backward",
      pieces: [{ from: "e4", to: "e2" }],
      sound: "move",
    });
  });

  it.each([
    ["w", "O-O", "e1", "g1", "h1", "f1"],
    ["w", "O-O-O", "e1", "c1", "a1", "d1"],
    ["b", "O-O", "e8", "g8", "h8", "f8"],
    ["b", "O-O-O", "e8", "c8", "a8", "d8"],
  ])(
    "moves both pieces for %s %s and undo",
    (color, san, from, to, rookFrom, rookTo) => {
      const { before, after } = transition(
        `r3k2r/8/8/8/8/8/8/R3K2R ${color} KQkq - 0 1`,
        san,
      );
      expect(boardTransition(before, after)?.pieces).toEqual([
        { from, to },
        { from: rookFrom, to: rookTo },
      ]);
      expect(boardTransition(after, before)?.pieces).toEqual([
        { from: to, to: from },
        { from: rookTo, to: rookFrom },
      ]);
    },
  );

  it("recognizes captures and en passant without moving the captured piece", () => {
    const chess = new Chess();
    for (const san of ["e4", "d5"]) chess.move(san);
    const capture = transition(chess.fen(), "exd5");
    expect(boardTransition(capture.before, capture.after)?.sound).toBe(
      "capture",
    );
    for (const [fen, san, from, to] of [
      ["7k/8/8/3pP3/8/8/8/K7 w - d6 0 2", "exd6", "e5", "d6"],
      ["7k/8/8/8/3Pp3/8/8/K7 b - d3 0 2", "exd3", "e4", "d3"],
    ]) {
      const { before, after } = transition(fen, san);
      expect(boardTransition(before, after)).toMatchObject({
        pieces: [{ from, to }],
        sound: "capture",
      });
      expect(boardTransition(after, before)?.pieces).toEqual([
        { from: to, to: from },
      ]);
    }
  });

  it.each(["a8=Q+", "a8=N", "a8=R+", "a8=B"])(
    "recognizes promotion and undo: %s",
    (san) => {
      const { before, after } = transition("7k/P7/8/8/8/8/8/7K w - - 0 1", san);
      expect(boardTransition(before, after)?.pieces).toEqual([
        { from: "a7", to: "a8" },
      ]);
      expect(boardTransition(after, before)?.pieces).toEqual([
        { from: "a8", to: "a7" },
      ]);
    },
  );

  it("prioritizes check feedback for a checking move", () => {
    const { before, after } = transition(
      "7k/8/8/8/8/8/8/KR6 w - - 0 1",
      "Rh1+",
    );
    expect(boardTransition(before, after)?.sound).toBe("check");
    expect(boardTransition(after, before)?.sound).toBe("move");
  });

  it("does not treat a reset, multi-ply jump or metadata change as a move", () => {
    const chess = new Chess();
    const initial = chess.fen();
    chess.move("e4");
    chess.move("e5");
    expect(boardTransition(initial, chess.fen())).toBeNull();
    expect(boardTransition(chess.fen(), initial)).toBeNull();
    expect(boardTransition(initial, initial)).toBeNull();
    expect(boardTransition(initial, initial.replace("0 1", "8 20"))).toBeNull();
    expect(boardTransition(initial, "not a FEN")).toBeNull();
  });
});

it("maps travel to the displayed orientation", () => {
  expect(travelOffset("b1", "c3", "w")).toEqual({ x: -1, y: 2 });
  expect(travelOffset("b1", "c3", "b")).toEqual({ x: 1, y: -2 });
  expect(travelOffset("g8", "e8", "w")).toEqual({ x: 2, y: 0 });
});
