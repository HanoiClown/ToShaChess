import { expect, test } from "vitest";
import { buildRefutation } from "../../src/library/puzzle-feedback";
import { START } from "../../src/chess/game";
test("refutation caps the line and refuses an illegal tail", () => {
  const base = { score: { cp: 0, mate: null }, depth: 14 };
  expect(
    buildRefutation(START, {
      ...base,
      pv: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
    }),
  ).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
  expect(buildRefutation(START, { ...base, pv: ["e2e4", "e2e5"] })).toEqual([
    "e2e4",
  ]);
});
