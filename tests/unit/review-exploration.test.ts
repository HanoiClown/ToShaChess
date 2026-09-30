import { describe, expect, it } from "vitest";
import { boardAt, parseGames, START } from "../../src/chess/game";
import { reviewPosition } from "../../src/analysis/review-position";
import {
  createExploration,
  explorationPosition,
  moveExploration,
  seekExploration,
  continueExploration,
} from "../../src/analysis/review-exploration";

describe("review exploration", () => {
  it("plays both sides from the displayed position without changing its source", () => {
    const base = { initialFen: START, moves: ["e2e4"] };
    const first = moveExploration(createExploration(base), "c7c5");
    const second = moveExploration(first, "g1f3");
    expect(explorationPosition(second).moves).toEqual(["e2e4", "c7c5", "g1f3"]);
    expect(boardAt(explorationPosition(second)).turn()).toBe("b");
    expect(base.moves).toEqual(["e2e4"]);
    expect(first.moves).toEqual(["c7c5"]);
  });

  it("navigates local history and replaces only the future when branching", () => {
    const root = createExploration({ initialFen: START, moves: [] });
    const line = moveExploration(moveExploration(root, "e2e4"), "e7e5");
    const back = seekExploration(line, 1);
    expect(explorationPosition(back).moves).toEqual(["e2e4"]);
    expect(explorationPosition(seekExploration(back, 2)).moves).toEqual([
      "e2e4",
      "e7e5",
    ]);
    const branch = moveExploration(back, "c7c5");
    expect(branch.moves).toEqual(["e2e4", "c7c5"]);
    expect(explorationPosition(seekExploration(branch, -10)).moves).toEqual([]);
    expect(seekExploration(branch, 99).cursor).toBe(2);
    expect(line.moves).toEqual(["e2e4", "e7e5"]);
  });

  it("rejects illegal moves without changing history and requires promotion choice", () => {
    const root = createExploration({ initialFen: START, moves: [] });
    expect(() => moveExploration(root, "e7e5")).toThrow();
    expect(() => moveExploration(root, "e2e5")).toThrow();
    expect(root.moves).toEqual([]);
    const promotion = createExploration({
      initialFen: "7k/P7/8/8/8/8/8/7K w - - 0 1",
      moves: [],
    });
    expect(() => moveExploration(promotion, "a7a8")).toThrow();
    const knight = moveExploration(promotion, "a7a8n");
    expect(boardAt(explorationPosition(knight)).get("a8")).toMatchObject({
      type: "n",
      color: "w",
    });
  });

  it("starts from the displayed best-line position and preserves game analysis", () => {
    const [game] = parseGames(
      "1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7# 1-0",
      "owner",
    );
    const line = {
      score: { cp: 0, mate: null },
      pv: ["g7g6", "h5f3"],
      depth: 16,
    };
    game.analysis = [
      {
        ply: 6,
        before: line,
        after: line,
        best: "g7g6",
        quality: "blunder",
        loss: 400,
        provisional: false,
      },
    ];
    const saved = JSON.stringify(game);
    const scratch = moveExploration(
      createExploration(reviewPosition(game, 6, 1)),
      "h5f3",
    );
    expect(explorationPosition(scratch).moves.slice(-2)).toEqual([
      "g7g6",
      "h5f3",
    ]);
    expect(JSON.stringify(game)).toBe(saved);
  });

  it("loads a playable engine continuation and retains future moves after selecting one", () => {
    const root = createExploration({ initialFen: START, moves: ["e2e4"] });
    const scratch = continueExploration(root, ["c7c5", "g1f3", "d7d6"], 1);
    expect(explorationPosition(scratch).moves).toEqual(["e2e4", "c7c5"]);
    expect(scratch.moves).toEqual(["c7c5", "g1f3", "d7d6"]);
    expect(explorationPosition(seekExploration(scratch, 3)).moves).toEqual([
      "e2e4",
      "c7c5",
      "g1f3",
      "d7d6",
    ]);
  });

  it("rejects a malformed continuation atomically", () => {
    const root = createExploration({ initialFen: START, moves: [] });
    expect(() => continueExploration(root, ["e2e4", "e2e5"], 1)).toThrow();
    expect(root.moves).toEqual([]);
    expect(root.cursor).toBe(0);
  });
});
