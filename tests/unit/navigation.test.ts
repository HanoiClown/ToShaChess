import { describe, expect, it } from "vitest";
import { activeLocalRoute, navigationGroup } from "../../src/ui/navigation";
import type { Route } from "../../src/ui/context";

describe("navigation selected by the screen route", () => {
  it.each<[Route, string | null, Route | null]>([
    ["today", "today", null],
    ["play", "play", null],
    ["learn", "learn", "learn"],
    ["openings", "learn", "learn"],
    ["endgames", "learn", "learn"],
    ["puzzles", "learn", "puzzles"],
    ["vision", "learn", "vision"],
    ["training", "learn", "training"],
    ["history", "analysis", "history"],
    ["review", "analysis", "review"],
    ["studies", "analysis", "studies"],
    ["editor", "analysis", "editor"],
    ["database", "analysis", "database"],
    ["settings", null, null],
  ])(
    "%s selects its parent and local destination after any direct launch",
    (route, group, local) => {
      expect(navigationGroup(route)).toBe(group);
      expect(activeLocalRoute(route)).toBe(local);
    },
  );
});
