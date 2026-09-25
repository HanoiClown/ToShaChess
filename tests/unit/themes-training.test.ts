import { describe, it, expect } from "vitest";
import {
  freshDatabase,
  validateDatabase,
  mergeBackup,
} from "../../electron/storage/schema";
import { dailyPuzzles } from "../../src/library/daily";
import { puzzles } from "../../src/content/puzzles";
describe("themes and training", () => {
  it("migrates old profiles and isolates favorites", () => {
    const old = freshDatabase();
    const migrated = validateDatabase(old);
    expect(migrated.profiles[0].theme).toBe("green");
    expect(migrated.progress.hanoi.favorites).toEqual([]);
    migrated.profiles[0].theme = "purple";
    migrated.progress.hanoi.favorites = ["lichess_test"];
    const merged = mergeBackup(freshDatabase(), migrated);
    expect(merged.profiles[0].theme).toBe("purple");
    expect(merged.progress.hanoi.favorites).toEqual(["lichess_test"]);
    expect(merged.progress.sister.favorites).toEqual([]);
    expect(() =>
      validateDatabase({
        ...merged,
        profiles: [{ ...merged.profiles[0], theme: "invalid" }],
      }),
    ).toThrow();
  });
  it("daily selection stays stable, changes by date and respects beginner difficulty", () => {
    const a = dailyPuzzles(puzzles, "2026-09-25", "new");
    expect(a).toHaveLength(5);
    expect(new Set(a.map((p) => p.id)).size).toBe(5);
    expect(a.every((p) => p.rating! < 1000)).toBe(true);
    expect(dailyPuzzles(puzzles, "2026-09-25", "new")).toEqual(a);
    expect(dailyPuzzles(puzzles, "2026-09-26", "new")).not.toEqual(a);
  });
});
