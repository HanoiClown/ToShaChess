import { parentPort, workerData } from "node:worker_threads";
import { DatabaseSync } from "node:sqlite";
import { Chess } from "chess.js";
import { join } from "node:path";
import { OfflineLibrary } from "./library";
import {
  EMPTY_EXPLORER,
  libraryFingerprint,
  openingPositionKey,
} from "./library-explorer";
import type { ExplorerStatus } from "../src/shared/optional-tools";

let cancelled = false;
parentPort!.on("message", (message) => {
  if (message?.cancel) cancelled = true;
});
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function band(white: number, black: number) {
  if (!(white > 0 && black > 0)) return "unknown";
  const rating = (white + black) / 2;
  return rating < 1000
    ? "under1000"
    : rating < 1600
      ? "1000-1599"
      : rating < 2200
        ? "1600-2199"
        : "2200plus";
}
async function run() {
  const { libraryDir, indexPath, options } = workerData;
  const source = new DatabaseSync(join(libraryDir, "games.sqlite"), {
    readOnly: true,
  });
  const db = new DatabaseSync(indexPath);
  const library = new OfflineLibrary(libraryDir);
  let state: ExplorerStatus = {
    ...EMPTY_EXPLORER,
    state: "building",
    maxPly: options.maxPly,
  };
  let transaction = false;
  try {
    db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA cache_size=-32000; PRAGMA busy_timeout=2000; PRAGMA max_page_count=262144;",
    );
    db.exec(
      "CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS positions(fen TEXT NOT NULL,uci TEXT NOT NULL,rating_band TEXT NOT NULL,white_wins INTEGER NOT NULL,draws INTEGER NOT NULL,black_wins INTEGER NOT NULL,PRIMARY KEY(fen,uci,rating_band)) WITHOUT ROWID;",
    );
    const get = (key: string) =>
      db.prepare("SELECT value FROM metadata WHERE key=?").get(key)?.value;
    const put = db.prepare(
      "INSERT INTO metadata VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    );
    const fingerprint = libraryFingerprint(libraryDir);
    if (options.rebuild)
      db.exec("DELETE FROM positions; DELETE FROM metadata;");
    if (get("fingerprint") && String(get("fingerprint")) !== fingerprint)
      throw Error("opening_library_changed_rebuild");
    const stored = get("state");
    if (stored) {
      state = {
        ...state,
        ...JSON.parse(String(stored)),
        state: "building",
        error: undefined,
      };
      if (state.maxPly !== options.maxPly)
        throw Error("opening_depth_changed_rebuild");
    }
    const countMetadata = source
      .prepare(
        "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='metadata'",
      )
      .get();
    const count = countMetadata
      ? Number(
          source.prepare("SELECT value FROM metadata WHERE key='count'").get()
            ?.value,
        )
      : 0;
    state.availableGames =
      Number.isSafeInteger(count) && count > 0
        ? count
        : Number(source.prepare("SELECT COUNT(*) n FROM games").get()!.n);
    let lastId = Number(get("last_id") ?? 0);
    const upsert = db.prepare(
      "INSERT INTO positions VALUES(?,?,?,?,?,?) ON CONFLICT(fen,uci,rating_band) DO UPDATE SET white_wins=white_wins+excluded.white_wins,draws=draws+excluded.draws,black_wins=black_wins+excluded.black_wins",
    );
    const save = () => {
      put.run("fingerprint", fingerprint);
      put.run("last_id", String(lastId));
      put.run("state", JSON.stringify(state));
    };
    save();
    parentPort!.postMessage({ status: state });
    await tick();
    while (!cancelled && state.processedGames < options.maxGames) {
      const rows = source
        .prepare(
          "SELECT id,result,date,white_elo,black_elo FROM games WHERE id>? ORDER BY id LIMIT ?",
        )
        .all(lastId, Math.min(50, options.maxGames - state.processedGames));
      if (!rows.length) break;
      db.exec("BEGIN IMMEDIATE");
      transaction = true;
      for (const row of rows) {
        if (cancelled) break;
        let positions: { fen: string; uci: string }[] | null = null;
        try {
          if (!["1-0", "0-1", "1/2-1/2"].includes(String(row.result)))
            throw Error("Unfinished game");
          const text = library.gamePgn(Number(row.id));
          if (text.length > 200000) throw Error("Oversized PGN");
          const chess = new Chess();
          chess.loadPgn(text);
          const moves = chess.history({ verbose: true });
          if (!moves.length || moves.length > 4000)
            throw Error("Invalid game length");
          // Check the game completely before mutating any aggregate rows.
          positions = moves
            .slice(0, options.maxPly)
            .map((move) => ({
              fen: openingPositionKey(new Chess(move.before)),
              uci: move.from + move.to + (move.promotion ?? ""),
            }));
        } catch {
          state.skippedGames++;
        }
        // Database failures abort the batch rather than leave a partially counted game.
        if (positions) {
          const ratingBand = band(Number(row.white_elo), Number(row.black_elo));
          const seen = new Set<string>();
          for (const position of positions) {
            if (seen.has(position.fen)) continue;
            seen.add(position.fen);
            upsert.run(
              position.fen,
              position.uci,
              ratingBand,
              row.result === "1-0" ? 1 : 0,
              row.result === "1/2-1/2" ? 1 : 0,
              row.result === "0-1" ? 1 : 0,
            );
          }
          state.indexedGames++;
          const date = String(row.date);
          if (/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
            if (!state.firstDate || date < state.firstDate)
              state.firstDate = date;
            if (!state.lastDate || date > state.lastDate) state.lastDate = date;
          }
        }
        lastId = Number(row.id);
        state.processedGames++;
        if (state.processedGames % 10 === 0) await tick();
      }
      save();
      db.exec("COMMIT");
      transaction = false;
      parentPort!.postMessage({ status: state });
      await tick();
    }
    state.state = cancelled ? "cancelled" : "ready";
    save();
    parentPort!.postMessage({ status: state, done: true });
  } catch (error) {
    if (transaction) {
      try {
        db.exec("ROLLBACK");
      } catch {}
    }
    parentPort!.postMessage({
      error: String((error as Error).message).slice(0, 300),
    });
  } finally {
    library.close();
    source.close();
    db.close();
    parentPort!.close();
  }
}
void run().catch((error) => {
  parentPort!.postMessage({ error: String(error.message).slice(0, 300) });
  parentPort!.close();
});
