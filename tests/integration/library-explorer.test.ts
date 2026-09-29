import { afterEach, beforeAll, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { Chess } from "chess.js";
import { OfflineOpeningExplorer } from "../../electron/library-explorer";
let worker: string;
const cleanups: (() => void | Promise<void>)[] = [];
beforeAll(async () => {
  const output = resolve(
    ".superpowers/sdd/community-training/explorer-test-worker.cjs",
  );
  await build({
    entryPoints: ["electron/library-explorer-worker.ts"],
    platform: "node",
    format: "cjs",
    bundle: true,
    outfile: output,
  });
  worker = output;
});
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
function make() {
  const dir = mkdtempSync(join(tmpdir(), "ToSha explorer test "));
  cleanups.push(async () => {
    if (!resolve(dir).startsWith(resolve(tmpdir()) + sep))
      throw Error("Invalid cleanup path");
    await rm(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  });
  const source = join(dir, "library");
  mkdirSync(source);
  const db = new DatabaseSync(join(source, "games.sqlite"));
  db.exec(
    "CREATE TABLE games(id INTEGER PRIMARY KEY,result TEXT,date TEXT,white_elo INTEGER,black_elo INTEGER,source_file TEXT,byte_offset INTEGER,byte_length INTEGER)",
  );
  let pgn = "";
  for (const [i, [moves, result, rating]] of [
    [["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"], "1-0", 800],
    [["Nf3", "Nc6", "e4", "e5", "Bc4", "Nf6"], "0-1", 1400],
    [["e4", "c5", "Nf3", "Nc6"], "1/2-1/2", 1400],
  ].entries()) {
    const board = new Chess();
    for (const move of moves as string[]) board.move(move);
    board.setHeader("Result", String(result));
    const text = board.pgn() + "\n\n";
    db.prepare("INSERT INTO games VALUES(?,?,?,?,?,?,?,?)").run(
      i + 1,
      result as string,
      "2026.09.01",
      rating as number,
      rating as number,
      "games.pgn",
      Buffer.byteLength(pgn),
      Buffer.byteLength(text),
    );
    pgn += text;
  }
  const text = "invalid PGN";
  db.prepare("INSERT INTO games VALUES(?,?,?,?,?,?,?,?)").run(
    4,
    "1-0",
    "2026.09.02",
    1200,
    1200,
    "games.pgn",
    Buffer.byteLength(pgn),
    Buffer.byteLength(text),
  );
  pgn += text;
  writeFileSync(join(source, "games.pgn"), pgn);
  db.close();
  const explorer = new OfflineOpeningExplorer({
    libraryDir: source,
    indexPath: join(dir, "index.sqlite"),
    workerPath: worker,
  });
  cleanups.push(() => explorer.dispose());
  return { explorer, source };
}
it("builds a resumable local position index without duplicate counting and with genuine rating filters", async () => {
  const { explorer } = make();
  expect(explorer.status().state).toBe("missing");
  let status = await explorer.build({ maxGames: 2, maxPly: 8 });
  expect(status.indexedGames).toBe(2);
  status = await explorer.build({ maxGames: 4, maxPly: 8 });
  expect(status.indexedGames).toBe(3);
  expect(status.skippedGames).toBe(1);
  const start = { initialFen: new Chess().fen(), moves: [] };
  const result = explorer.query(start);
  expect(result.games).toBe(3);
  expect(result.moves.find((move) => move.uci === "e2e4")).toMatchObject({
    games: 2,
    whiteWins: 1,
    draws: 1,
    blackWins: 0,
  });
  expect(explorer.query(start, { ratingBand: "under1000" }).games).toBe(1);
  const transposition = explorer.query({
    ...start,
    moves: ["e2e4", "e7e5", "g1f3", "b8c6"],
  });
  expect(transposition.moves[0]).toMatchObject({
    uci: "f1c4",
    games: 2,
    whiteWins: 1,
    blackWins: 1,
  });
  await explorer.build({ maxGames: 4, maxPly: 8 });
  expect(explorer.query(start).games).toBe(3);
});
it("cancels background indexing and preserves a usable resumable index", async () => {
  const { explorer } = make();
  const task = explorer.build({ maxGames: 4, maxPly: 8 });
  explorer.cancel();
  expect((await task).state).toBe("cancelled");
  expect((await explorer.build({ maxGames: 4, maxPly: 8 })).indexedGames).toBe(
    3,
  );
});
it("does not present a stale index as current when the installed archive changes", async () => {
  const { explorer, source } = make();
  await explorer.build({ maxGames: 4, maxPly: 8 });
  const db = new DatabaseSync(join(source, "games.sqlite"));
  db.exec("CREATE TABLE changed_archive(marker TEXT)");
  db.close();
  const result = explorer.query({ initialFen: new Chess().fen(), moves: [] });
  expect(result.games).toBe(0);
  expect(result.status).toMatchObject({
    state: "error",
    error: "opening_library_changed_rebuild",
  });
  await expect(explorer.build({ maxGames: 4, maxPly: 8 })).rejects.toThrow(
    "opening_library_changed_rebuild",
  );
  await explorer.build({ maxGames: 4, maxPly: 8, rebuild: true });
  expect(
    explorer.query({ initialFen: new Chess().fen(), moves: [] }).games,
  ).toBe(3);
});
