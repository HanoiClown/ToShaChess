import { profileDatabase } from "../helpers/profile-fixtures";
import { describe, it, expect } from "vitest";
import { mergeBackup, validateDatabase } from "../../electron/storage/schema";
describe("separate portable profiles", () => {
  it("keeps explicit legacy test profiles separate", () => {
    const d = profileDatabase();
    expect(d.profiles.map((p) => p.id)).toEqual(["hanoi", "sister"]);
    expect(d.profiles[1].level).toBe("new");
    expect(d.progress.hanoi).not.toBe(d.progress.sister);
    expect(d.games).toEqual([]);
  });
  it("rejects orphan games and malformed profiles before importing", () => {
    const d = profileDatabase();
    d.profiles[0].id = "../secret";
    expect(() => validateDatabase(d)).toThrow();
  });
  it("merges backups without duplicating expenses or resetting progress", () => {
    const d = profileDatabase();
    d.progress.hanoi.completed = ["board"];
    d.usage = [{ id: "r1", month: "2026-09", reserved: 25000, actual: null }];
    const older = profileDatabase();
    older.usage = [
      { id: "r1", month: "2026-09", reserved: 10000, actual: null },
    ];
    const merged = mergeBackup(d, older);
    expect(merged.progress.hanoi.completed).toEqual(["board"]);
    expect(merged.usage).toHaveLength(1);
    expect(merged.usage[0].reserved).toBe(25000);
  });
  it("keeps the schedule from the most recent attempt when restoring an older backup", () => {
    const d = profileDatabase();
    const r = {
      id: "p1",
      fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
      best: "g6g7",
      theme: "mate",
      due: "2026-10-02T00:00:00Z",
      interval: 7,
    };
    d.progress.hanoi.reviews = [r];
    const old = structuredClone(d);
    old.progress.hanoi.reviews[0].interval = 1;
    d.progress.hanoi.attempts = [
      {
        id: "a1",
        profileId: "hanoi",
        itemId: "p1",
        theme: "mate",
        correct: true,
        at: "2026-09-25T00:00:00Z",
        seconds: 20,
      },
    ];
    expect(mergeBackup(d, old).progress.hanoi.reviews[0].interval).toBe(7);
  });
  it("rejects corrupt exercise positions before changing a database", () => {
    const bad = profileDatabase();
    bad.progress.sister.reviews = [
      {
        id: "bad",
        fen: "invalid",
        best: "a1a2",
        theme: "mate",
        due: "2026-10-02T00:00:00Z",
        interval: 1,
      },
    ];
    expect(() => validateDatabase(bad)).toThrow();
  });
  it("restores display names, language and preferences on a fresh PC", () => {
    const copy = profileDatabase();
    copy.profiles[1].name = "Anna";
    copy.profiles[1].locale = "en";
    copy.settings.engineMs = 1500;
    const restored = mergeBackup(profileDatabase(), copy);
    expect(restored.profiles[1].name).toBe("Anna");
    expect(restored.profiles[1].locale).toBe("en");
    expect(restored.settings.engineMs).toBe(1500);
  });
});
