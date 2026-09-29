import { it, expect } from "vitest";
import { gameSchema } from "../../electron/storage/schema";
import { newGame } from "../../src/chess/game";
it("rejects an imported practice offset beyond the saved history", () => {
  const game = newGame("test", "Test", "w", "training", 0, 0, 1);
  game.moves = ["e2e4", "e7e5"];
  expect(() => gameSchema.parse({ ...game, startPly: 100 })).toThrow();
  expect(gameSchema.parse({ ...game, startPly: 2 }).startPly).toBe(2);
});
