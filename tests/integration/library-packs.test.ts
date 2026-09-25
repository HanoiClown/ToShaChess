import { it, expect, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, writeFileSync, symlinkSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OfflineLibrary } from "../../electron/library";
it("queries optional packs, validates input and reads bounded PGN slices", () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-pack-")),
    lib = new OfflineLibrary(dir);
  expect(lib.status().puzzles).toBe(false);
  const db = new DatabaseSync(join(dir, "puzzles.sqlite"));
  db.exec(
    "CREATE TABLE puzzles(id TEXT PRIMARY KEY,fen TEXT,moves TEXT,rating INTEGER,themes TEXT,game_url TEXT,popularity INTEGER,plays INTEGER,opening_tags TEXT); CREATE TABLE puzzle_themes(theme TEXT,puzzle_id TEXT,rating INTEGER);",
  );
  db.prepare("INSERT INTO puzzles VALUES(?,?,?,?,?,?,?,?,?)").run(
    "lichess_test",
    "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    "g6g7",
    800,
    "mate mateIn1",
    "https://lichess.org/test",
    100,
    1000,
    "",
  );
  db.prepare("INSERT INTO puzzle_themes VALUES(?,?,?)").run(
    "mateIn1",
    "lichess_test",
    800,
  );
  db.close();
  expect(
    lib.puzzles({ theme: "mateIn1", minRating: 500, maxRating: 999 }).items[0]
      .line,
  ).toEqual(["g6g7"]);
  expect(lib.getPuzzle("lichess_test")?.fen).toContain("7k");
  expect(() => lib.puzzles({ minRating: -1 })).toThrow();
  expect(() => lib.puzzles({ theme: "mate';DROP TABLE puzzles;--" })).toThrow();
  const pgn = '[White "One"]\n[Black "Two"]\n\n1. e4 e5 *';
  writeFileSync(join(dir, "sample.pgn"), pgn);
  const games = new DatabaseSync(join(dir, "games.sqlite"));
  games.exec(
    "CREATE TABLE games(id INTEGER PRIMARY KEY,site TEXT,white TEXT,black TEXT,result TEXT,date TEXT,white_elo INTEGER,black_elo INTEGER,eco TEXT,opening TEXT,time_control TEXT,byte_offset INTEGER,byte_length INTEGER,source_file TEXT)",
  );
  games
    .prepare("INSERT INTO games VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(
      1,
      "https://lichess.org/test",
      "One",
      "Two",
      "*",
      "2020.01.01",
      1500,
      1600,
      "C20",
      "King pawn",
      "300+0",
      0,
      Buffer.byteLength(pgn),
      "sample.pgn",
    );
  expect(lib.games({ player: "On" }).items).toHaveLength(1);
  expect(lib.status()).toMatchObject({ puzzleCount: 1, gameCount: 1 });
  expect(lib.gamePgn(1)).toBe(pgn);
  games.prepare("UPDATE games SET source_file=?").run("../private.pgn");
  expect(() => lib.gamePgn(1)).toThrow();
  games.close();
  lib.close();
});

function indexedGames() {
  const dir = mkdtempSync(join(tmpdir(), "tosha-indexed-pack-"));
  writeFileSync(join(dir, "sample.pgn"), "*");
  const db = new DatabaseSync(join(dir, "games.sqlite"));
  db.exec(`
    CREATE TABLE games(id INTEGER PRIMARY KEY,white TEXT,black TEXT,white_elo INTEGER,black_elo INTEGER,result TEXT,date TEXT,eco TEXT,opening TEXT,source_file TEXT,byte_offset INTEGER,byte_length INTEGER);
    CREATE INDEX games_eco_id ON games(eco,id);
    CREATE INDEX games_white_id ON games(white COLLATE NOCASE,id);
    CREATE INDEX games_black_id ON games(black COLLATE NOCASE,id);
    CREATE INDEX games_white_elo_id ON games(white_elo,id);
    CREATE INDEX games_black_elo_id ON games(black_elo,id);
  `);
  const insert = db.prepare(
    "INSERT INTO games VALUES(?,?,?,?,?,'*','2016.12.01',?,'Opening','sample.pgn',0,1)",
  );
  insert.run(1, "Mixed_Player", "Opponent", 2600, 2600, "C50");
  insert.run(2, "MixedXPlayer", "Opponent", 2600, 2600, "C50");
  // Matches beyond the bounded row-ID probe exercise the indexed continuation.
  for (let id = 10001; id <= 10030; id++)
    insert.run(
      id,
      id % 2 ? "MIXED_Player" : "Opponent",
      id % 2 ? "Opponent" : "mixed_player",
      2600,
      2600,
      "C50",
    );
  insert.run(10031, "mixed_player", "mixed_player", 2600, 2600, "C50");
  insert.run(10032, "mixed_player", "Opponent", 2600, 1200, "C50");
  insert.run(10033, "mixed_player", "Opponent", 2600, 2600, "C51");
  return { dir, db, lib: new OfflineLibrary(dir) };
}

it("uses published metadata counts without scanning the game or puzzle indexes", () => {
  const { db, lib } = indexedGames();
  db.exec(
    "CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT); INSERT INTO metadata VALUES('count','35')",
  );
  const prepare = vi.spyOn(DatabaseSync.prototype, "prepare");
  try {
    expect(lib.status().gameCount).toBe(35);
    expect(prepare.mock.calls.some(([sql]) => /count\(\*\)/i.test(sql))).toBe(
      false,
    );
  } finally {
    prepare.mockRestore();
    lib.close();
    db.close();
  }
});

it("pages indexed player, ECO and rating intersections in ID order without duplicates", () => {
  const { db, lib } = indexedGames();
  try {
    const first = lib.games({ player: "mixed_", eco: "C50", minRating: 2500 });
    expect(first.items.map((game) => game.id)).toEqual([
      1,
      ...Array.from({ length: 23 }, (_, i) => 10001 + i),
    ]);
    expect(first.more).toBe(true);
    const second = lib.games({
      player: "mixed_",
      eco: "C50",
      minRating: 2500,
      after: first.items.at(-1)!.id,
    });
    expect(second.items.map((game) => game.id)).toEqual([
      10024, 10025, 10026, 10027, 10028, 10029, 10030, 10031,
    ]);
    expect(second.more).toBe(false);
    expect(
      lib.games({ eco: "C5", after: 10030 }).items.map((game) => game.id),
    ).toEqual([10031, 10032, 10033]);
    expect(
      lib
        .games({ eco: "C50", minRating: 2500, after: 10030 })
        .items.map((game) => game.id),
    ).toEqual([10031]);
    expect(
      lib.games({ minRating: 2500, after: 10030 }).items.map((game) => game.id),
    ).toEqual([10031, 10033]);
    expect(lib.games({ player: "missing" }).items).toEqual([]);
  } finally {
    lib.close();
    db.close();
  }
});

it("uses search indexes after a bounded probe for sparse filters", () => {
  const { db, lib } = indexedGames();
  const originalPrepare = DatabaseSync.prototype.prepare;
  const queries: { sql: string; args: (string | number | null)[] }[] = [];
  const prepare = vi
    .spyOn(DatabaseSync.prototype, "prepare")
    .mockImplementation(function (this: DatabaseSync, sql: string) {
      const statement = originalPrepare.call(this, sql);
      if (/^SELECT /i.test(sql)) {
        const all = statement.all.bind(statement);
        statement.all = (...args: any[]) => {
          queries.push({ sql, args });
          return all(...args);
        };
      }
      return statement;
    });
  try {
    for (const filter of [
      { player: "missing" },
      { eco: "E99" },
      { minRating: 3000 },
    ])
      lib.games(filter);
  } finally {
    prepare.mockRestore();
  }
  try {
    const plans = queries.flatMap(({ sql, args }) =>
      db
        .prepare("EXPLAIN QUERY PLAN " + sql)
        .all(...args)
        .map((row) => String(row.detail)),
    );
    for (const index of [
      "games_white_id",
      "games_black_id",
      "games_eco_id",
      "games_white_elo_id",
    ])
      expect(
        plans.some(
          (plan) => plan.startsWith("SEARCH ") && plan.includes(index),
        ),
      ).toBe(true);
  } finally {
    lib.close();
    db.close();
  }
});

it("pages a short player prefix within an exact ECO without sorting the full name ranges", () => {
  const { db, lib } = indexedGames();
  const originalPrepare = DatabaseSync.prototype.prepare;
  const queries: { sql: string; args: (string | number | null)[] }[] = [];
  const prepare = vi
    .spyOn(DatabaseSync.prototype, "prepare")
    .mockImplementation(function (this: DatabaseSync, sql: string) {
      const statement = originalPrepare.call(this, sql);
      if (/^SELECT /i.test(sql) && sql.includes("LIMIT")) {
        const all = statement.all.bind(statement);
        statement.all = (...args: any[]) => {
          queries.push({ sql, args });
          return all(...args);
        };
      }
      return statement;
    });
  try {
    const first = lib.games({ player: "m", eco: "C50", minRating: 2500 });
    expect(first.items.map((game) => game.id)).toEqual([
      1,
      2,
      ...Array.from({ length: 22 }, (_, i) => 10001 + i),
    ]);
    expect(first.more).toBe(true);
    const second = lib.games({
      player: "m",
      eco: "C50",
      minRating: 2500,
      after: first.items.at(-1)!.id,
    });
    expect(second.items.map((game) => game.id)).toEqual(
      Array.from({ length: 9 }, (_, i) => 10023 + i),
    );
    expect(second.more).toBe(false);
  } finally {
    prepare.mockRestore();
  }
  try {
    const plans = queries.flatMap(({ sql, args }) =>
      db
        .prepare("EXPLAIN QUERY PLAN " + sql)
        .all(...args)
        .map((row) => String(row.detail)),
    );
    expect(
      plans.some(
        (plan) =>
          plan.startsWith("SEARCH ") &&
          plan.includes("games_eco_id") &&
          plan.includes("eco=?") &&
          /(?:id|rowid)>\?/.test(plan),
      ),
    ).toBe(true);
    expect(plans.some((plan) => plan.includes("TEMP B-TREE FOR ORDER BY"))).toBe(
      false,
    );
  } finally {
    lib.close();
    db.close();
  }
});

it("rejects PGN paths escaping through a directory junction or symlink", () => {
  const { dir, db, lib } = indexedGames();
  const outside = mkdtempSync(join(tmpdir(), "tosha-outside-pack-"));
  writeFileSync(join(outside, "private.pgn"), "secret");
  symlinkSync(
    outside,
    join(dir, "linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  db.prepare(
    "UPDATE games SET source_file='linked/private.pgn',byte_length=6 WHERE id=1",
  ).run();
  try {
    expect(() => lib.gamePgn(1)).toThrow("invalid_game");
    expect(lib.status()).toMatchObject({
      games: false,
      gameCount: 0,
      issue: "game_payload_unavailable",
    });
  } finally {
    lib.close();
    db.close();
  }
});

it("reports a missing PGN payload without hiding an otherwise readable library status", () => {
  const { dir, db, lib } = indexedGames();
  try {
    expect(lib.status()).toMatchObject({ games: true, gameCount: 35 });
    unlinkSync(join(dir, "sample.pgn"));
    expect(lib.status()).toMatchObject({
      games: false,
      gameCount: 0,
      issue: "game_payload_unavailable",
    });
    writeFileSync(join(dir, "sample.pgn"), "*");
    expect(lib.status()).toMatchObject({ games: true, gameCount: 35 });
    expect(lib.status().issue).toBeUndefined();
  } finally {
    lib.close();
    db.close();
  }
});
