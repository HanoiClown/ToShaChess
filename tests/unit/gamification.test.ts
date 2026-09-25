import { afterEach, describe, expect, it } from "vitest";
import { emptyProgress } from "../../electron/storage/schema";
import { puzzles } from "../../src/content/puzzles";
import { lessons } from "../../src/content/lessons";
import { openings } from "../../src/library/openings";
import { newGame } from "../../src/chess/game";
import { deriveGamification } from "../../src/library/gamification";
import type {
  Attempt,
  GameRecord,
  VisionResult,
} from "../../src/shared/contracts";

const now = () => new Date(2026, 8, 25, 18);
const freshDatabase = () => ({
  progress: { hanoi: emptyProgress(), sister: emptyProgress() },
  games: [] as GameRecord[],
});
const at = (daysAgo = 0) => new Date(2026, 8, 25 - daysAgo, 12).toISOString();
const attempt = (id: string, daysAgo = 0, itemId = puzzles[0].id): Attempt => ({
  id,
  profileId: "hanoi",
  itemId,
  theme: "mate",
  correct: true,
  at: at(daysAgo),
  seconds: 20,
});
const vision = (id: string, daysAgo = 0): VisionResult => ({
  id,
  profileId: "hanoi",
  at: at(daysAgo),
  duration: 60,
  orientation: "w",
  coordinates: true,
  seconds: 60,
  correct: 15,
  wrong: 1,
});
const game = (id: string, daysAgo = 0): GameRecord => ({
  ...newGame("hanoi", "Player", "w", "normal", 0, 0, 0),
  id,
  createdAt: at(daysAgo),
  updatedAt: at(daysAgo),
  moves: ["f2f3", "e7e5", "g2g4", "d8h4"],
  result: "0-1",
});
const initialTZ = process.env.TZ;
afterEach(() => {
  if (initialTZ === undefined) delete process.env.TZ;
  else process.env.TZ = initialTZ;
});

describe("earned chess progress", () => {
  it("starts empty and gives separate profiles independent results", () => {
    const db = freshDatabase();
    db.progress.hanoi.attempts.push(attempt("one"));
    const active = deriveGamification(db, "hanoi", now());
    expect(active.xp).toBe(10);
    expect(active.streak).toBe(1);
    const other = deriveGamification(db, "sister", now());
    expect(other.xp).toBe(0);
    expect(other.streak).toBe(0);
    expect(other.level).toBe(1);
    expect(other.achievements.every((item) => !item.earned)).toBe(true);
    expect(deriveGamification(db, "missing", now()).xp).toBe(0);
  });

  it("continues yesterday's streak, includes today, and resets after a gap", () => {
    const db = freshDatabase();
    db.progress.hanoi.attempts = [
      attempt("yesterday", 1),
      attempt("before", 2),
    ];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      streak: 2,
      bestStreak: 2,
      todayQualified: false,
    });
    db.progress.hanoi.attempts.push(attempt("today"));
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      streak: 3,
      bestStreak: 3,
      todayQualified: true,
    });
    db.progress.hanoi.attempts = [attempt("old", 2), attempt("older", 3)];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      streak: 0,
      bestStreak: 2,
    });
  });

  it.each([
    [2026, 2, 9], // Spring: a 23-hour calendar day.
    [2026, 10, 2], // Autumn: a 25-hour calendar day.
  ])(
    "counts consecutive local calendar dates through DST (%i-%i-%i)",
    (year, month, day) => {
      process.env.TZ = "America/New_York";
      expect(
        new Date(year, month, day - 1, 12).valueOf() -
          new Date(year, month, day - 2, 12).valueOf(),
      ).toBe((month === 2 ? 23 : 25) * 60 * 60 * 1000);
      const db = freshDatabase();
      db.progress.hanoi.attempts = [0, 1, 2].map((offset) => ({
        ...attempt(`dst-${offset}`),
        at: new Date(year, month, day - offset, 12).toISOString(),
      }));
      const result = deriveGamification(
        db,
        "hanoi",
        new Date(year, month, day, 18),
      );
      expect(result.streak).toBe(3);
      expect(result.week.filter((day) => day.qualified)).toHaveLength(3);
    },
  );

  it("requires five active minutes and awards no XP for elapsed time", () => {
    const db = freshDatabase();
    db.progress.hanoi.activity = Array.from({ length: 5 }, (_, i) => ({
      id: `minute-${i}`,
      at: at(),
      section: "learn",
      seconds: i === 4 ? 59 : 60,
    }));
    expect(deriveGamification(db, "hanoi", now()).streak).toBe(0);
    db.progress.hanoi.activity[4].seconds = 60;
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      streak: 1,
      xp: 0,
      today: { activeSeconds: 300 },
    });
    db.progress.hanoi.activity.push(...db.progress.hanoi.activity);
    expect(deriveGamification(db, "hanoi", now()).today.activeSeconds).toBe(
      300,
    );
  });

  it("awards XP once per known puzzle, lesson and opening, without inventing completion dates", () => {
    const db = freshDatabase();
    db.progress.hanoi.attempts = [
      attempt("one"),
      attempt("repeat"),
      attempt("one"),
    ];
    db.progress.hanoi.completed = [
      lessons[0].id,
      lessons[0].id,
      openings[0].id,
      "not-real",
    ];
    const result = deriveGamification(db, "hanoi", now());
    expect(result.xp).toBe(55);
    expect(result.today.solvedPuzzles).toBe(1);
    db.progress.hanoi.attempts = [];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 45,
      streak: 0,
    });
  });

  it("counts unique finished in-app games, excluding imports, unfinished and empty games", () => {
    const db = freshDatabase();
    db.games = [
      game("one"),
      game("copy"),
      game("one"),
      { ...game("import"), mode: "import" },
      { ...game("pending"), result: "*" },
      { ...game("empty"), moves: [] },
    ];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 30,
      streak: 1,
      totals: { games: 1 },
    });
    db.games = [{ ...game("import"), mode: "import" }];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 0,
      streak: 0,
    });
  });

  it("keeps a completed game's streak day stable when later analysis updates its metadata", () => {
    const db = freshDatabase();
    db.games = [
      { ...game("finished", 2), completedAt: at(1), updatedAt: at() },
    ];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 30,
      streak: 1,
      todayQualified: false,
    });
    // Legacy saves use their stable creation date, never the mutable update date.
    db.games = [{ ...game("legacy", 2), updatedAt: at() }];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 30,
      streak: 0,
      todayQualified: false,
    });
    db.games = [{ ...game("future"), completedAt: at(-1) }];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 0,
      streak: 0,
    });
  });

  it("recognizes useful vision practice with a one-time award, not repeated-session farming", () => {
    const db = freshDatabase();
    db.progress.hanoi.vision = [vision("one"), vision("repeat"), vision("one")];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 25,
      streak: 1,
      today: { visionSessions: 2 },
    });
    db.progress.hanoi.vision = [
      { ...vision("empty"), correct: 0 },
      { ...vision("brief"), seconds: 3 },
      { ...vision("guessing"), wrong: 100 },
    ];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 0,
      streak: 0,
    });
  });

  it("rejects future, invalid and foreign dated records and malformed amounts", () => {
    const db = freshDatabase();
    db.progress.hanoi.attempts = [
      { ...attempt("future"), at: at(-1) },
      { ...attempt("invalid"), at: "not-a-date" },
      { ...attempt("foreign"), profileId: "sister" },
      { ...attempt("unknown"), itemId: "invented" },
      { ...attempt("wrong"), correct: false },
    ];
    db.progress.hanoi.vision = [
      { ...vision("future"), at: at(-1) },
      { ...vision("foreign"), profileId: "sister" },
      { ...vision("bad"), correct: Infinity },
    ];
    db.progress.hanoi.activity = [
      { id: "huge", at: at(), section: "learn", seconds: Infinity },
      { id: "negative", at: at(), section: "learn", seconds: -100 },
      { id: "future", at: at(-1), section: "learn", seconds: 60 },
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `settings-${i}`,
        at: at(),
        section: "settings",
        seconds: 60,
      })),
    ];
    db.games = [
      { ...game("future"), completedAt: at(-1) },
      { ...game("foreign"), profileId: "sister" },
    ];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 0,
      streak: 0,
    });
  });

  it("keeps XP level progress bounded and derives achievements without mutating saves", () => {
    const db = freshDatabase();
    db.progress.hanoi = emptyProgress();
    db.progress.hanoi.attempts = puzzles
      .slice(0, 10)
      .map((p, i) => attempt(`p-${i}`, 0, p.id));
    const before = JSON.stringify(db);
    const result = deriveGamification(db, "hanoi", now());
    expect(result).toMatchObject({
      xp: 100,
      level: 2,
      levelXp: 0,
      levelTarget: 200,
    });
    expect(result.achievements.find((a) => a.id === "puzzles-10")?.earned).toBe(
      true,
    );
    expect(JSON.stringify(db)).toBe(before);
  });

  it("keeps completed full-catalogue Lichess puzzles outside the bundled selection", () => {
    const db = freshDatabase();
    db.progress.hanoi.attempts = [attempt("catalogue", 0, "lichess_A1b2C")];
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      xp: 10,
      streak: 1,
      totals: { puzzles: 1 },
    });
  });

  it("recognizes every locally authored puzzle without requiring the full library in the reward module", () => {
    const db = freshDatabase();
    const authored = puzzles.filter(
      (puzzle) => !puzzle.id.startsWith("lichess_"),
    );
    db.progress.hanoi.attempts = authored.map((puzzle, index) =>
      attempt(`local-${index}`, 0, puzzle.id),
    );
    expect(deriveGamification(db, "hanoi", now()).totals.puzzles).toBe(
      authored.length,
    );
    expect(deriveGamification(db, "hanoi", now()).xp).toBe(
      authored.length * 10,
    );
  });

  it("counts active study in the game database toward practice days", () => {
    const db = freshDatabase();
    db.progress.hanoi.activity = Array.from({ length: 5 }, (_, index) => ({
      id: `database-${index}`,
      at: at(),
      section: "database",
      seconds: 60,
    }));
    expect(deriveGamification(db, "hanoi", now())).toMatchObject({
      streak: 1,
      xp: 0,
      today: { activeSeconds: 300 },
    });
  });
});
