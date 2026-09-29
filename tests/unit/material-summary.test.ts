import { expect, test } from "vitest";
import { materialSummary } from "../../src/analysis/material-summary";
import { START } from "../../src/chess/game";
test("captures come from history, including en passant", () => {
  const m = materialSummary({
    initialFen: START,
    moves: ["e2e4", "d7d5", "e4d5"],
  });
  expect(m.balance).toBe(1);
  expect(m.captured.w).toEqual(["p"]);
  expect(m.remaining.b.p).toBe(7);
  const ep = materialSummary({
    initialFen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
    moves: ["e5d6"],
  });
  expect(ep.captured.w).toEqual(["p"]);
  expect(ep.balance).toBe(1);
});
test("custom position and promotion do not invent earlier captures", () => {
  const m = materialSummary({
    initialFen: "7k/P7/8/8/8/8/8/4K3 w - - 0 1",
    moves: ["a7a8q"],
  });
  expect(m.remaining.w.q).toBe(1);
  expect(m.remaining.w.p).toBe(0);
  expect(m.balance).toBe(9);
  expect(m.captured).toEqual({ w: [], b: [] });
});
