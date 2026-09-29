import { existsSync, statSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { spawn } from "node:child_process";
import { positionId } from "../../src/chess/game";
import type { Position } from "../../src/shared/contracts";
import type {
  OptionalEngineConfig,
  TablebaseResult,
  TablebaseMove,
} from "../../src/shared/optional-tools";
import type {
  SearchLimits,
  ProviderStatus,
} from "../../src/shared/engine-providers";
import { UciSearchProvider } from "./providers";
import { Lc0Provider } from "./lc0";
import { cancelledError, validateEnginePosition } from "./uci";

const fileExists = (path: string) => {
  try {
    return isAbsolute(path) && statSync(path).isFile();
  } catch {
    return false;
  }
};
export class OptionalEngineService {
  private provider: UciSearchProvider | null = null;
  private selected: OptionalEngineConfig | null = null;
  configure(config: OptionalEngineConfig | null) {
    if (!config) {
      this.provider?.dispose();
      this.provider = null;
      this.selected = null;
      return;
    }
    if (
      !["lc0", "custom"].includes(config.id) ||
      typeof config.name !== "string" ||
      !config.name.trim() ||
      config.name.length > 80 ||
      !fileExists(config.executable)
    )
      throw Error("Invalid optional engine executable or name");
    if (
      config.args &&
      (!Array.isArray(config.args) ||
        config.args.length > 32 ||
        config.args.some(
          (arg) =>
            typeof arg !== "string" || arg.length > 2048 || arg.includes("\0"),
        ))
    )
      throw Error("Invalid engine arguments");
    const options = { ...config.options };
    if (config.id === "lc0") {
      if (!config.networkPath || !fileExists(config.networkPath))
        throw Error("Choose an existing Lc0 network");
      if (config.backend && !["cpu", "cuda"].includes(config.backend))
        throw Error("Invalid Lc0 backend");
      options.WeightsFile = config.networkPath;
      options.Backend = config.backend === "cuda" ? "cuda-auto" : "blas";
    }
    const base = {
      executable: config.executable,
      args: config.args,
      cwd: dirname(config.executable),
      options,
      displayName: config.name,
      startupTimeoutMs: 90000,
      requestTimeoutMs: 15000,
    };
    const identity = {
      id: config.id,
      name: config.name,
      ...(config.networkPath ? { network: config.networkPath } : {}),
    };
    const next =
      config.id === "lc0"
        ? new Lc0Provider(base, identity)
        : new UciSearchProvider(identity, base);
    this.provider?.dispose();
    this.provider = next;
    this.selected = {
      ...config,
      args: config.args ? [...config.args] : undefined,
      options: { ...config.options },
    };
  }
  config() {
    return this.selected
      ? {
          ...this.selected,
          args: this.selected.args ? [...this.selected.args] : undefined,
          options: { ...this.selected.options },
        }
      : null;
  }
  status(): ProviderStatus {
    return this.provider?.status() ?? { providerId: "optional", state: "idle" };
  }
  analyze(position: Position, limits: SearchLimits, signal?: AbortSignal) {
    if (!this.provider)
      return Promise.reject(Error("No optional engine configured"));
    return this.provider.analyze(position, limits, signal);
  }
  dispose() {
    this.configure(null);
  }
}

export class SyzygyService {
  private processes = new Set<ReturnType<typeof spawn>>();
  private closed = false;
  constructor(
    private config: {
      python: string;
      script: string;
      tableDir: string;
      timeoutMs?: number;
    },
  ) {}
  async probe(
    position: Position,
    signal?: AbortSignal,
  ): Promise<TablebaseResult> {
    if (this.closed) throw Error("Tablebase service closed");
    if (signal?.aborted) throw cancelledError();
    const board = validateEnginePosition(position);
    const snapshot = {
      initialFen: position.initialFen,
      moves: [...position.moves],
    };
    const base: TablebaseResult = {
      kind: "tablebase",
      status: "unsupported",
      source: "syzygy",
      perspective: "side-to-move",
      positionKey: positionId(snapshot),
      halfmoveClock: Number(board.fen().split(" ")[4]),
      wdl: null,
      dtz: null,
      dtzRounded: true,
      moves: [],
    };
    if (board.isCheckmate())
      return {
        ...base,
        status: "available",
        source: "rules",
        wdl: -2,
        dtz: 0,
        dtzRounded: false,
        reason: "checkmate",
      };
    if (
      board.isStalemate() ||
      board.isInsufficientMaterial() ||
      board.isThreefoldRepetition() ||
      base.halfmoveClock >= 100
    )
      return {
        ...base,
        status: "available",
        source: "rules",
        wdl: 0,
        dtz: 0,
        dtzRounded: false,
        reason: base.halfmoveClock >= 100 ? "fifty_move_claim" : "draw",
      };
    if (board.board().flat().filter(Boolean).length > 5)
      return { ...base, reason: "too_many_pieces" };
    if (board.fen().split(" ")[2] !== "-")
      return { ...base, reason: "castling_rights" };
    if (!fileExists(this.config.python) || !fileExists(this.config.script))
      return { ...base, status: "missing", reason: "runtime_missing" };
    if (!existsSync(this.config.tableDir))
      return { ...base, status: "missing", reason: "tables_missing" };
    const reply: unknown = await new Promise((accept, reject) => {
      const child = spawn(
        this.config.python,
        [this.config.script, "--tables", this.config.tableDir],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"], shell: false },
      );
      this.processes.add(child);
      let text = "",
        settled = false;
      const finish = (error?: Error, value?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        this.processes.delete(child);
        if (error) {
          child.kill();
          reject(error);
        } else accept(value);
      };
      const abort = () => finish(cancelledError());
      const timer = setTimeout(
        () => finish(Error("Tablebase timeout")),
        this.config.timeoutMs ?? 15000,
      );
      signal?.addEventListener("abort", abort, { once: true });
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        text += chunk;
        if (text.length > 100000) finish(Error("Invalid tablebase output"));
      });
      child.stderr.resume();
      child.on("error", (error) => finish(error));
      child.stdin.on("error", (error) => finish(error));
      child.on("close", (code) => {
        if (this.closed) return finish(Error("Tablebase service closed"));
        if (signal?.aborted) return finish(cancelledError());
        if (code !== 0) return finish(Error("Tablebase process failed"));
        try {
          finish(undefined, JSON.parse(text));
        } catch {
          finish(Error("Invalid tablebase response"));
        }
      });
      child.stdin.end(JSON.stringify(snapshot) + "\n");
    });
    if (!reply || typeof reply !== "object")
      throw Error("Invalid tablebase response");
    const value = reply as Partial<TablebaseResult>;
    if (value.status === "missing")
      return { ...base, status: "missing", reason: "missing_table" };
    if (
      value.status !== "available" ||
      ![-2, -1, 0, 1, 2].includes(value.wdl as number) ||
      !Number.isSafeInteger(value.dtz) ||
      !Array.isArray(value.moves)
    )
      throw Error("Invalid tablebase evaluation");
    const legal = new Set(
      board
        .moves({ verbose: true })
        .map((move) => move.from + move.to + (move.promotion ?? "")),
    );
    const moves: TablebaseMove[] = [];
    for (const move of value.moves) {
      if (
        !move ||
        !legal.delete(move.uci) ||
        ![-2, -1, 0, 1, 2].includes(move.wdl) ||
        !Number.isSafeInteger(move.dtz)
      )
        throw Error("Invalid tablebase move");
      moves.push({ uci: move.uci, wdl: move.wdl, dtz: move.dtz });
    }
    if (legal.size) throw Error("Incomplete tablebase move list");
    return {
      ...base,
      status: "available",
      wdl: value.wdl!,
      dtz: value.dtz!,
      moves,
      canClaimFiftyMoves: value.canClaimFiftyMoves === true,
    };
  }
  dispose() {
    this.closed = true;
    for (const process of this.processes) process.kill();
    this.processes.clear();
  }
}
