import { DatabaseSync } from "node:sqlite";
import {
  existsSync,
  readdirSync,
  statSync,
  openSync,
  readSync,
  closeSync,
  realpathSync,
} from "node:fs";
import { join, resolve, sep, relative, isAbsolute } from "node:path";
import { z } from "zod";
import { Chess } from "chess.js";
import type { Puzzle } from "../src/content/puzzles";
import type {
  LibraryFilter,
  LibraryStatus,
  GameFilter,
  LibraryGame,
} from "../src/shared/library";
const puzzleFilter = z.object({
  theme: z
    .string()
    .regex(/^[a-zA-Z0-9]+$/)
    .max(50)
    .optional(),
  minRating: z.number().int().min(0).max(4000).default(0),
  maxRating: z.number().int().min(0).max(4000).default(4000),
  after: z
    .object({
      rating: z.number().int(),
      id: z
        .string()
        .regex(/^lichess_[a-zA-Z0-9_-]+$/)
        .max(100),
    })
    .optional(),
  id: z
    .string()
    .regex(/^(lichess_)?[a-zA-Z0-9]+$/)
    .max(100)
    .optional(),
});
const gameFilter = z.object({
  player: z
    .string()
    .trim()
    .max(40)
    .regex(/^[\p{L}\p{N}_ -]*$/u)
    .default(""),
  eco: z
    .string()
    .regex(/^[A-E][0-9]{0,2}$/)
    .optional(),
  minRating: z.number().int().min(0).max(3000).default(0),
  after: z.number().int().min(0).default(0),
});
type Row = Record<string, unknown>;
export class OfflineLibrary {
  private connections = new Map<string, DatabaseSync>();
  private counts = new Map<string, number>();
  private gameIndexes: Set<string> | null = null;
  constructor(readonly dir: string) {}
  private db(name: string) {
    if (this.connections.has(name)) return this.connections.get(name)!;
    const path = join(this.dir, `${name}.sqlite`);
    if (!existsSync(path)) return null;
    const db = new DatabaseSync(path, { readOnly: true });
    db.exec(
      "PRAGMA query_only=ON; PRAGMA cache_size=-16000; PRAGMA busy_timeout=2000;",
    );
    this.connections.set(name, db);
    return db;
  }
  private count(db: DatabaseSync, table: "puzzles" | "games") {
    if (this.counts.has(table)) return this.counts.get(table)!;
    let count: number | undefined;
    if (
      db
        .prepare(
          "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='metadata'",
        )
        .get()
    ) {
      const value = db
        .prepare("SELECT value FROM metadata WHERE key='count'")
        .get()?.value;
      if (value !== undefined && /^\d+$/.test(String(value))) {
        const candidate = Number(value);
        if (Number.isSafeInteger(candidate)) count = candidate;
      }
    }
    // Older packs and small fixtures may predate the metadata table.
    count ??= Number(db.prepare(`SELECT count(*) n FROM ${table}`).get()!.n);
    this.counts.set(table, count);
    return count;
  }
  private payloadPath(source: unknown) {
    if (typeof source !== "string" || !source) throw Error("invalid_game");
    const inside = (base: string, target: string) => {
      const within = relative(base, target);
      return (
        !!within &&
        within !== ".." &&
        !within.startsWith(".." + sep) &&
        !isAbsolute(within)
      );
    };
    const path = resolve(this.dir, source);
    if (!inside(resolve(this.dir), path)) throw Error("invalid_game");
    const realPath = realpathSync(path);
    if (
      !inside(realpathSync(this.dir), realPath) ||
      !statSync(realPath).isFile()
    )
      throw Error("invalid_game");
    return realPath;
  }
  status(): LibraryStatus {
    const p = this.db("puzzles"),
      g = this.db("games");
    let games = false;
    let issue: LibraryStatus["issue"];
    if (g) {
      // All published games share one PGN. Read a row instead of requiring
      // metadata.source_file so existing packs work too.
      const first = g
        .prepare("SELECT source_file FROM games ORDER BY id LIMIT 1")
        .get();
      if (first) {
        try {
          games = statSync(this.payloadPath(first.source_file)).size > 0;
          if (!games) issue = "game_payload_unavailable";
        } catch {
          issue = "game_payload_unavailable";
        }
      }
    }
    let bytes = 0;
    if (existsSync(this.dir))
      for (const f of readdirSync(this.dir)) {
        const s = statSync(join(this.dir, f));
        if (s.isFile() && !f.endsWith(".part")) bytes += s.size;
      }
    return {
      puzzles: !!p,
      games,
      puzzleCount: p ? this.count(p, "puzzles") : 0,
      gameCount: g && games ? this.count(g, "games") : 0,
      bytes,
      path: this.dir,
      source: "Lichess · CC0",
      ...(issue ? { issue } : {}),
    };
  }
  private mapPuzzle(row: Row): Puzzle {
    const line = String(row.moves).split(" ").filter(Boolean),
      tags = String(row.themes).split(" ");
    const priority = [
      "mateIn1",
      "mateIn2",
      "mateIn3",
      "fork",
      "pin",
      "skewer",
      "defensiveMove",
      "pawnEndgame",
      "rookEndgame",
    ];
    return {
      id: String(row.id),
      fen: String(row.fen),
      best: line[0],
      line,
      rating: Number(row.rating),
      theme: priority.find((t) => tags.includes(t)) ?? tags[0],
      themes: tags,
      source: "Lichess",
      score: { cp: 0, mate: null },
      depth: 0,
      difficulty: "practice",
      url: String(row.game_url),
    };
  }
  puzzles(input: LibraryFilter) {
    const f = puzzleFilter.parse(input),
      db = this.db("puzzles");
    if (!db) return { items: [], more: false };
    if (f.id) {
      const p = this.getPuzzle(
        f.id.startsWith("lichess_") ? f.id : `lichess_${f.id}`,
      );
      return { items: p ? [p] : [], more: false };
    }
    const params: (string | number)[] = [];
    const alias = f.theme ? "t" : "p",
      id = f.theme ? "puzzle_id" : "id";
    const conditions = [`${alias}.rating BETWEEN ? AND ?`];
    params.push(f.minRating, f.maxRating);
    if (f.theme) {
      conditions.push("t.theme=?");
      params.push(f.theme);
    }
    if (f.after) {
      conditions.push(
        `(${alias}.rating > ? OR (${alias}.rating = ? AND ${alias}.${id} > ?))`,
      );
      params.push(f.after.rating, f.after.rating, f.after.id);
    }
    const sql = f.theme
      ? `SELECT p.* FROM puzzle_themes t JOIN puzzles p ON p.id=t.puzzle_id WHERE ${conditions.join(" AND ")} ORDER BY t.rating,t.puzzle_id LIMIT 25`
      : `SELECT p.* FROM puzzles p WHERE ${conditions.join(" AND ")} ORDER BY p.rating,p.id LIMIT 25`;
    const rows = db.prepare(sql).all(...params);
    return {
      items: rows.slice(0, 24).map((r) => this.mapPuzzle(r)),
      more: rows.length > 24,
    };
  }
  getPuzzle(id: string): Puzzle | undefined {
    if (!/^lichess_[a-zA-Z0-9_-]{1,90}$/.test(id)) return;
    const row = this.db("puzzles")
      ?.prepare("SELECT * FROM puzzles WHERE id=?")
      .get(id);
    if (!row) return;
    const p = this.mapPuzzle(row),
      board = new Chess(p.fen);
    if (!p.line.length) throw Error("library_invalid_position");
    for (const u of p.line)
      board.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return p;
  }
  getPuzzles(ids: string[]) {
    if (
      !Array.isArray(ids) ||
      ids.length > 200 ||
      ids.some((id) => typeof id !== "string")
    )
      throw Error("invalid_position");
    return ids.map((id) => this.getPuzzle(id)).filter((p): p is Puzzle => !!p);
  }
  games(input: GameFilter) {
    const f = gameFilter.parse(input),
      db = this.db("games");
    if (!db) return { items: [] as LibraryGame[], more: false };
    const columns =
      "id,white,black,white_elo,black_elo,result,date,eco,opening";
    const where = ["id>?"],
      params: (string | number)[] = [f.after];
    if (f.eco) {
      // ECO codes are uppercase ASCII; this range uses the pack's BINARY index.
      const upper =
        f.eco.slice(0, -1) +
        String.fromCharCode(f.eco.charCodeAt(f.eco.length - 1) + 1);
      where.push("eco>=? AND eco<?");
      params.push(f.eco, upper);
    }
    if (f.minRating) {
      where.push("white_elo>=? AND black_elo>=?");
      params.push(f.minRating, f.minRating);
    }
    const name = f.player.replaceAll("_", "\\_") + "%";
    const playerWhere = f.player
      ? " AND (white LIKE ? ESCAPE '\\' OR black LIKE ? ESCAPE '\\')"
      : "";
    const playerParams = f.player ? [name, name] : [];
    const filtered = !!(f.player || f.eco || f.minRating);
    // A broad filter normally finds a page almost immediately in ID order.
    // Bound that probe so a sparse/no-result filter never scans all game headers.
    const probeEnd = Math.min(Number.MAX_SAFE_INTEGER, f.after + 10000);
    const rows = db
      .prepare(
        `SELECT ${columns} FROM games NOT INDEXED WHERE ${where.join(" AND ")}${playerWhere}${filtered ? " AND id<=?" : ""} ORDER BY id LIMIT 25`,
      )
      .all(...params, ...playerParams, ...(filtered ? [probeEnd] : []));
    if (filtered && rows.length < 25) {
      this.gameIndexes ??= new Set(
        db
          .prepare(
            "SELECT name FROM sqlite_schema WHERE type='index' AND tbl_name='games'",
          )
          .all()
          .map((row) => String(row.name)),
      );
      const hint = (index: string) =>
        this.gameIndexes!.has(index) ? `INDEXED BY ${index}` : "";
      const tailParams = [probeEnd, ...params.slice(1)];
      const remaining = 25 - rows.length;
      if (f.player) {
        // Separate indexed prefixes avoid SQLite preferring one full row-ID scan
        // for a white/black OR. Each branch keeps only its first remaining IDs.
        const branch = (side: "white" | "black") =>
          `SELECT id FROM games ${hint(`games_${side}_id`)} WHERE ${where.join(" AND ")} AND ${side} LIKE ? ESCAPE '\\' ORDER BY id LIMIT ${remaining}`;
        rows.push(
          ...db
            .prepare(
              `SELECT ${columns} FROM games WHERE id IN (SELECT id FROM (${branch("white")}) UNION SELECT id FROM (${branch("black")})) ORDER BY id LIMIT ${remaining}`,
            )
            .all(...tailParams, name, ...tailParams, name),
        );
      } else {
        const index = f.eco ? "games_eco_id" : "games_white_elo_id";
        rows.push(
          ...db
            .prepare(
              `SELECT ${columns} FROM games ${hint(index)} WHERE ${where.join(" AND ")} ORDER BY id LIMIT ${remaining}`,
            )
            .all(...tailParams),
        );
      }
    }
    return {
      items: rows.slice(0, 24) as LibraryGame[],
      more: rows.length > 24,
    };
  }
  gamePgn(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw Error("invalid_game");
    const row = this.db("games")
      ?.prepare(
        "SELECT source_file,byte_offset,byte_length FROM games WHERE id=?",
      )
      .get(id);
    if (!row) throw Error("game_not_found");
    const length = Number(row.byte_length),
      offset = Number(row.byte_offset);
    if (
      !Number.isSafeInteger(length) ||
      length < 1 ||
      length > 2000000 ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    )
      throw Error("invalid_game");
    const fd = openSync(this.payloadPath(row.source_file), "r"),
      data = Buffer.alloc(length);
    try {
      if (readSync(fd, data, 0, length, offset) !== length)
        throw Error("library_incomplete");
    } finally {
      closeSync(fd);
    }
    return data.toString("utf8");
  }
  close() {
    for (const db of this.connections.values()) db.close();
    this.connections.clear();
    this.counts.clear();
    this.gameIndexes = null;
  }
}
