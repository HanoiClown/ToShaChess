import { test, expect } from "vitest";
import { chooseQuip } from "../../src/bots/quips";
test("regular dialogue waits for both cooldowns, while end can speak immediately", () => {
  const input = {
    botId: "spark",
    event: "check" as const,
    locale: "ru" as const,
    ply: 5,
    now: 20000,
    lastPly: 3,
    lastAt: 0,
  };
  expect(chooseQuip(input)).toBeNull();
  expect(chooseQuip({ ...input, ply: 6, lastAt: 10000 })).toBeNull();
  expect(chooseQuip({ ...input, ply: 6 })).toBeTruthy();
  expect(chooseQuip({ ...input, event: "end", locale: "en" })).toBeTruthy();
});
