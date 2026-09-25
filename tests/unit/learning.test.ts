import { it, expect } from "vitest";
import { emptyProgress } from "../../electron/storage/schema";
import { recordAttempt, buildPlan } from "../../src/learning";
it("repeats failed exercises and adapts two profiles independently", () => {
  const a = emptyProgress(),
    b = emptyProgress();
  a.reviews = [
    {
      id: "p1",
      fen: "8/8/8/8/8/8/6k1/K7 w - - 0 1",
      best: "a1a2",
      theme: "tactics",
      due: "2026-09-20T00:00:00.000Z",
      interval: 1,
    },
  ];
  recordAttempt(a, {
    id: "a1",
    profileId: "hanoi",
    itemId: "p1",
    theme: "tactics",
    correct: false,
    at: "2026-09-25T12:00:00.000Z",
    seconds: 20,
  });
  expect(a.reviews[0].interval).toBe(1);
  expect(a.reviews[0].due).toBe("2026-09-26T12:00:00.000Z");
  expect(b.attempts).toHaveLength(0);
  expect(buildPlan(a, "beginner").reduce((n, x) => n + x.minutes, 0)).toBe(60);
  expect(buildPlan(b, "new")[0].section).toBe("learn");
});
it("prioritizes due personal mistakes without requiring API or past puzzle attempts", () => {
  const p = emptyProgress();
  p.reviews = [
    {
      id: "g_4",
      fen: "",
      best: "",
      theme: "king",
      due: "2026-01-01T00:00:00Z",
      interval: 1,
    },
  ];
  expect(
    buildPlan(p, "beginner").find((x) => x.section === "puzzles")?.theme,
  ).toBe("king");
});
