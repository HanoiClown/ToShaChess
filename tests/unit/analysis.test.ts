import { it, expect } from "vitest";
import {
  classify,
  localAdvice,
  themeFor,
  scoreText,
} from "../../src/analysis/evaluate";
import { parseGames } from "../../src/chess/game";
it("grades black losses with the correct sign and avoids exaggerating lost positions", () => {
  expect(
    classify({ cp: 70, mate: null }, { cp: 830, mate: null }, "b", false, 20),
  ).toBe("blunder");
  expect(
    classify(
      { cp: -1000, mate: null },
      { cp: -1300, mate: null },
      "w",
      false,
      20,
    ),
  ).toBe("good");
  expect(
    classify({ cp: 0, mate: null }, { cp: 0, mate: null }, "w", true, 1),
  ).toBe("good");
  expect(
    classify({ cp: 0, mate: null }, { cp: -99999, mate: -1 }, "w", false, 20),
  ).toBe("blunder");
  expect(scoreText({ cp: 0, mate: 0 })).toBe("M0");
});
it("produces offline explanations in both languages grounded in the played position", () => {
  const [game] = parseGames(
    "1. e4 g6 2. d3 h5 3. Nh3 d5 4. Ng5 f6 5. Ne6 Bxe6 *",
    "hanoi",
  );
  const a = {
    ply: 9,
    before: { score: { cp: -10, mate: null }, pv: ["g5f3"], depth: 18 },
    after: { score: { cp: -703, mate: null }, pv: ["c8e6", "e4d5"], depth: 18 },
    best: "g5f3",
    quality: "blunder" as const,
    loss: 693,
    provisional: false,
  };
  expect(localAdvice(game, a, "ru")).toContain("Bxe6");
  expect(localAdvice(game, a, "en")).toContain("Nf3");
  expect(themeFor(game, a)).toBe("hanging");
});
