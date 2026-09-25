import { it, expect } from "vitest";
import { parseGames } from "../../src/chess/game";
import { coachContext, parseGrounded } from "../../electron/coach/grounding";
it("rejects answers for another position and invented move evidence", () => {
  const [g] = parseGames("1. e4 e5 *", "hanoi");
  const line = {
    score: { cp: 0, mate: null },
    pv: ["e2e4", "e7e5"],
    depth: 16,
  };
  const a = {
    ply: 1,
    before: line,
    after: { ...line, pv: ["e7e5"] },
    best: "e2e4",
    quality: "best" as const,
    loss: 0,
    provisional: false,
  };
  const context = coachContext(g, a, "en");
  const answer = {
    positionId: context.positionId,
    ply: 1,
    text: "Develop and contest the centre.",
    evidence: [{ anchor: "before", moves: ["e2e4"] }],
  };
  expect(
    parseGrounded(JSON.stringify({ moves: [answer] }), [context])[0].text,
  ).toContain("centre");
  expect(() =>
    parseGrounded(
      JSON.stringify({ moves: [{ ...answer, positionId: "different" }] }),
      [context],
    ),
  ).toThrow();
  expect(() =>
    parseGrounded(
      JSON.stringify({
        moves: [
          { ...answer, evidence: [{ anchor: "before", moves: ["e2e5"] }] },
        ],
      }),
      [context],
    ),
  ).toThrow();
  expect(() =>
    parseGrounded(
      JSON.stringify({ moves: [{ ...answer, text: "Play Qh5 to win." }] }),
      [context],
    ),
  ).toThrow();
});
