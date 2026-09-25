import { it, expect } from "vitest";
import {
  freshDatabase,
  validateDatabase,
  mergeBackup,
} from "../../electron/storage/schema";
import { newRound, clickTarget, nextTarget } from "../../src/library/vision";
it("stops accepting clicks at deadline, counts mistakes and avoids immediate target repeats", () => {
  let round = newRound(30, 1000, () => 0);
  expect(round.target).toBe("a1");
  expect(nextTarget("a1", () => 0)).not.toBe("a1");
  round = clickTarget(round, "b2", 1500, () => 0);
  expect(round.wrong).toBe(1);
  expect(round.target).toBe("a1");
  round = clickTarget(round, "a1", 2000, () => 0);
  expect(round.correct).toBe(1);
  expect(round.target).not.toBe("a1");
  const ended = clickTarget(round, round.target, 31000, () => 0);
  expect(ended.finished).toBe(true);
  expect(ended.correct).toBe(1);
  expect(clickTarget(newRound(0, 0), "h8", 10000000).finished).toBe(false);
});
it("migrates old saves and merges vision history without mixing profiles", () => {
  const old: any = freshDatabase();
  delete old.progress.hanoi.vision;
  delete old.progress.hanoi.visionSettings;
  const d = validateDatabase(old);
  expect(d.progress.hanoi.vision).toEqual([]);
  expect(d.progress.hanoi.visionSettings.coordinates).toBe(true);
  d.progress.hanoi.vision.push({
    id: "v1",
    profileId: "hanoi",
    at: new Date().toISOString(),
    seconds: 30,
    correct: 12,
    wrong: 2,
    orientation: "b",
    coordinates: false,
    duration: 30,
  });
  const merged = mergeBackup(d, d);
  expect(merged.progress.hanoi.vision).toHaveLength(1);
  expect(merged.progress.sister.vision).toHaveLength(0);
  d.progress.sister.vision = d.progress.hanoi.vision;
  expect(() => validateDatabase(d)).toThrow();
});
