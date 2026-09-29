import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { draftFromFen, validateDraft } from "../../src/editor/position-draft";
import {
  draftFromScan,
  restoreBeforeMove,
} from "../../src/editor/photo-position";

const screenshot = "r2q4/k1p5/1pN3p1/5b2/8/1P4P1/KP2QR1P/2R5";
describe("positions imported from pictures", () => {
  it("does not invent castling rights or move history", () => {
    const d = draftFromScan("r3k2r/8/8/8/8/8/8/R3K2R", false, "b");
    expect(d.castling).toBe("");
    expect(d.ep).toBe("-");
    expect(d.turn).toBe("b");
    expect(validateDraft(d).ok).toBe(true);
  });
  it("rotates placement separately from board viewing orientation", () => {
    const d = draftFromScan("4K3/8/8/8/8/8/8/3k4", true, "w");
    expect(d.pieces.e8).toEqual({ type: "k", color: "b" });
    expect(d.pieces.d1).toEqual({ type: "k", color: "w" });
  });
  it("reconstructs the illustrated Nd4-c6 and preserves the original draft", () => {
    const after = draftFromFen(`${screenshot} b - - 0 1`);
    const before = restoreBeforeMove(after, "d4", "c6", null);
    const game = new Chess(before);
    expect(game.move({ from: "d4", to: "c6" }).san).toBe("Nc6+");
    expect(game.fen().split(" ")[0]).toBe(screenshot);
    expect(after.pieces.c6?.type).toBe("n");
  });
  it("restores a captured opponent piece only when explicitly specified", () => {
    const after = draftFromFen("7k/8/8/8/4R3/8/8/K7 b - - 0 2");
    const before = restoreBeforeMove(after, "e2", "e4", "q");
    const game = new Chess(before);
    expect(game.get("e4")).toEqual({ type: "q", color: "b" });
    expect(game.move({ from: "e2", to: "e4" }).san).toBe("Rxe4");
  });
  it("rejects impossible geometry, occupied source, and missing destination", () => {
    const after = draftFromFen(`${screenshot} b - - 0 1`);
    expect(() => restoreBeforeMove(after, "c4", "c6", null)).toThrow();
    expect(() => restoreBeforeMove(after, "b3", "c6", null)).toThrow();
    expect(() => restoreBeforeMove(after, "d4", "e4", null)).toThrow();
  });
  it("rejects a reconstruction that exposes the mover's king", () => {
    const d = draftFromFen("r6k/8/8/8/8/8/1R6/K7 b - - 0 1");
    expect(() => restoreBeforeMove(d, "a2", "b2", null)).toThrow();
  });
});
