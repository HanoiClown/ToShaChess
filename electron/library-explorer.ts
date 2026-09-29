import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { Chess } from "chess.js";
import { positionId } from "../src/chess/game";
import { validateEnginePosition } from "./engine/uci";
import type { Position } from "../src/shared/contracts";
import type {
  ExplorerBuildOptions,
  ExplorerRatingBand,
  ExplorerResult,
  ExplorerStatus,
} from "../src/shared/optional-tools";

export const EMPTY_EXPLORER: ExplorerStatus = {
  state: "missing",
  processedGames: 0,
  indexedGames: 0,
  skippedGames: 0,
  availableGames: 0,
  maxPly: 24,
  source: "Installed Lichess archive · CC0",
  firstDate: null,
  lastDate: null,
};
export function openingPositionKey(chess: Chess) {
  return chess.fen().split(" ").slice(0, 4).join(" ");
}
export function readExplorerStatus(path: string): ExplorerStatus {
  if (!existsSync(path)) return { ...EMPTY_EXPLORER };
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const value = db
      .prepare("SELECT value FROM metadata WHERE key='state'")
      .get()?.value;
    if (!value) return { ...EMPTY_EXPLORER };
    const status = JSON.parse(String(value));
    return { ...EMPTY_EXPLORER, ...status };
  } finally {
    db.close();
  }
}
export class OfflineOpeningExplorer {
  private worker: Worker | null = null;
  private current: ExplorerStatus | null = null;
  private closed = false;
  constructor(
    private config: {
      libraryDir: string;
      indexPath: string;
      workerPath: string;
    },
    private notify: () => void = () => {},
  ) {}
  status(): ExplorerStatus {
    if (this.current) return { ...this.current };
    try {
      return readExplorerStatus(this.config.indexPath);
    } catch {
      return {
        ...EMPTY_EXPLORER,
        state: "error",
        error: "opening_index_unavailable",
      };
    }
  }
  build(options: ExplorerBuildOptions = {}): Promise<ExplorerStatus> {
    if (this.closed) return Promise.reject(Error("Opening explorer closed"));
    if (this.worker)
      return Promise.reject(Error("Opening index already building"));
    const maxGames = options.maxGames ?? 50000,
      maxPly = options.maxPly ?? 24;
    if (
      !Number.isInteger(maxGames) ||
      maxGames < 1 ||
      maxGames > 10000000 ||
      !Number.isInteger(maxPly) ||
      maxPly < 1 ||
      maxPly > 40
    )
      return Promise.reject(Error("Invalid opening index limits"));
    mkdirSync(dirname(this.config.indexPath), { recursive: true });
    this.current = { ...this.status(), state: "building", error: undefined };
    this.notify();
    return new Promise((accept, reject) => {
      const worker = new Worker(this.config.workerPath, {
        workerData: {
          ...this.config,
          options: { maxGames, maxPly, rebuild: options.rebuild === true },
        },
      });
      this.worker = worker;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (this.worker === worker) this.worker = null;
        if (error)
          this.current = {
            ...this.status(),
            state: "error",
            error: error.message,
          };
        this.notify();
        error ? reject(error) : accept(this.status());
      };
      worker.on("message", (message) => {
        if (this.worker !== worker || !message || typeof message !== "object")
          return;
        if (message.status) {
          this.current = message.status as ExplorerStatus;
          this.notify();
        }
        if (message.error) finish(Error(String(message.error)));
        else if (message.done) finish();
      });
      worker.on("error", (error) =>
        finish(error instanceof Error ? error : Error(String(error))),
      );
      worker.on("exit", (code) => {
        if (!settled) finish(Error(`Opening index worker exited (${code})`));
      });
    });
  }
  cancel() {
    this.worker?.postMessage({ cancel: true });
  }
  query(
    position: Position,
    options: { ratingBand?: ExplorerRatingBand } = {},
  ): ExplorerResult {
    const board = validateEnginePosition(position);
    const band = options.ratingBand ?? "all";
    if (
      ![
        "all",
        "under1000",
        "1000-1599",
        "1600-2199",
        "2200plus",
        "unknown",
      ].includes(band)
    )
      throw Error("Invalid rating band");
    const status = this.status();
    const result: ExplorerResult = {
      positionKey: positionId(position),
      status,
      ratingBand: band,
      games: 0,
      moves: [],
    };
    if (!existsSync(this.config.indexPath) || status.processedGames === 0)
      return result;
    const db = new DatabaseSync(this.config.indexPath, { readOnly: true });
    try {
      db.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=1000;");
      if (
        String(
          db.prepare("SELECT value FROM metadata WHERE key='fingerprint'").get()
            ?.value ?? "",
        ) !== libraryFingerprint(this.config.libraryDir)
      ) {
        return {
          ...result,
          status: {
            ...status,
            state: "error",
            error: "opening_library_changed_rebuild",
          },
        };
      }
      const rows = db
        .prepare(
          `SELECT uci, SUM(white_wins) whiteWins, SUM(draws) draws, SUM(black_wins) blackWins FROM positions WHERE fen=? ${band === "all" ? "" : "AND rating_band=?"} GROUP BY uci ORDER BY SUM(white_wins+draws+black_wins) DESC, uci`,
        )
        .all(
          ...(band === "all"
            ? [openingPositionKey(board)]
            : [openingPositionKey(board), band]),
        );
      for (const row of rows) {
        const uci = String(row.uci);
        const chess = new Chess(board.fen());
        const move = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        });
        const whiteWins = Number(row.whiteWins),
          draws = Number(row.draws),
          blackWins = Number(row.blackWins);
        const games = whiteWins + draws + blackWins;
        result.moves.push({
          uci,
          san: move.san,
          games,
          whiteWins,
          draws,
          blackWins,
        });
        result.games += games;
      }
      return result;
    } finally {
      db.close();
    }
  }
  dispose() {
    this.closed = true;
    this.worker?.terminate();
    this.worker = null;
  }
}

export function libraryFingerprint(libraryDir: string) {
  const path = resolve(libraryDir, "games.sqlite"),
    info = statSync(path);
  return `${info.size}:${info.mtimeMs}`;
}
