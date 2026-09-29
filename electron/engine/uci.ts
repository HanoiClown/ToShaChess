import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { Chess } from "chess.js";
import type { Color, EngineLine, Position } from "../../src/shared/contracts";
import type { EngineState } from "../../src/shared/engine-providers";
import { boardAt, playUci } from "../../src/chess/game";

export type UciEngineConfig = {
  executable: string;
  args?: string[];
  cwd?: string;
  options?: Record<string, string | number | boolean | null>;
  displayName?: string;
  startupTimeoutMs?: number;
  requestTimeoutMs?: number;
};
export function cancelledError() {
  const error = new Error("Cancelled");
  error.name = "AbortError";
  return error;
}
export function validateEnginePosition(position: Position) {
  if (
    !position ||
    typeof position.initialFen !== "string" ||
    position.initialFen.length > 256 ||
    /[\r\n\0]/.test(position.initialFen) ||
    !Array.isArray(position.moves) ||
    position.moves.length > 4000 ||
    position.moves.some(
      (m) => typeof m !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m),
    )
  ) {
    throw Error("Invalid engine position or history");
  }
  return boardAt(position);
}
export function parseInfo(line: string, color: Color): EngineLine | null {
  if (/\b(lowerbound|upperbound)\b/.test(line)) return null;
  const match = line.match(/\bscore (cp|mate) (-?\d+)/),
    pv = line.match(/\bpv (.+)$/),
    depth = line.match(/\bdepth (\d+)/);
  if (!match || !pv || !depth) return null;
  const sign = color === "w" ? 1 : -1,
    value = Number(match[2]) * sign;
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(Number(depth[1])))
    return null;
  return {
    score: {
      cp:
        match[1] === "cp"
          ? value
          : value === 0
            ? -sign * 100000
            : Math.sign(value) * (100000 - Math.abs(value)),
      mate: match[1] === "mate" ? value : null,
    },
    pv: pv[1].trim().split(/\s+/),
    depth: Number(depth[1]),
  };
}

/** Pass a path for legacy Stockfish defaults, a config for other UCI engines. */
export class UciEngine {
  private process: ChildProcessWithoutNullStreams | null = null;
  private events = new EventEmitter();
  private ready: Promise<void> | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private state: EngineState = "idle";
  private error: string | undefined;
  private supported = new Set<string>();
  private reportedName: string | undefined;
  private config: UciEngineConfig;
  constructor(pathOrConfig: string | UciEngineConfig) {
    this.config =
      typeof pathOrConfig === "string"
        ? {
            executable: pathOrConfig,
            displayName: "Stockfish",
            options: { Threads: 2, Hash: 128 },
          }
        : {
            ...pathOrConfig,
            args: [...(pathOrConfig.args ?? [])],
            options: { ...pathOrConfig.options },
          };
    if (
      !this.config.executable ||
      this.config.executable.includes("\0") ||
      this.config.args?.some(
        (arg) => typeof arg !== "string" || arg.includes("\0"),
      )
    )
      throw Error("Invalid engine executable or arguments");
    for (const [key, value] of Object.entries(this.config.options ?? {})) {
      if (
        !key.trim() ||
        /[\r\n\0]/.test(key) ||
        key.length > 256 ||
        /[\r\n\0]/.test(String(value)) ||
        String(value).length > 4096 ||
        (typeof value === "number" && !Number.isFinite(value))
      )
        throw Error("Invalid UCI option");
    }
  }
  status(): { state: EngineState; error?: string } {
    return { state: this.state, ...(this.error ? { error: this.error } : {}) };
  }
  /** Exact bounded `id name` from the UCI handshake, for result provenance. */
  versionLabel() {
    return this.reportedName;
  }
  private name() {
    return this.config.displayName ?? "UCI engine";
  }
  private reset(error: Error, state: EngineState = "error") {
    const child = this.process;
    this.process = null;
    this.ready = null;
    this.state = state;
    this.error = state === "error" ? error.message : undefined;
    this.events.emit("failure", error);
    child?.kill();
  }
  private send(line: string) {
    if (!this.process || this.process.stdin.destroyed)
      throw Error(`${this.name()} unavailable`);
    this.process.stdin.write(line + "\n");
  }
  private waitFor(test: (line: string) => boolean, timeout: number) {
    return new Promise<string>((resolve, reject) => {
      const done = (error: Error | null, line = "") => {
        clearTimeout(timer);
        this.events.off("line", onLine);
        this.events.off("failure", onError);
        error ? reject(error) : resolve(line);
      };
      const onLine = (line: string) => {
        if (test(line)) done(null, line);
      };
      const onError = (error: Error) => done(error);
      const timer = setTimeout(
        () => done(Error(`${this.name()} timeout`)),
        timeout,
      );
      this.events.on("line", onLine);
      this.events.on("failure", onError);
    });
  }
  private async ensure() {
    if (this.disposed) throw Error(`${this.name()} closed`);
    if (this.ready) return this.ready;
    this.state = "starting";
    this.error = undefined;
    this.supported.clear();
    this.reportedName = undefined;
    this.ready = (async () => {
      const child = spawn(this.config.executable, this.config.args ?? [], {
        cwd: this.config.cwd,
        windowsHide: true,
        stdio: "pipe",
        shell: false,
      });
      this.process = child;
      let buffer = "";
      const failure = (error: Error) => {
        if (this.process === child) this.reset(error);
      };
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        if (this.process !== child) return;
        buffer += chunk;
        if (buffer.length > 1_000_000) {
          failure(Error(`${this.name()} output limit exceeded`));
          return;
        }
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (line.startsWith("id name "))
            this.reportedName = line.slice(8, 168);
          const option = line.match(/^option name (.+?) type /);
          if (option) this.supported.add(option[1].toLowerCase());
          this.events.emit("line", line);
        }
      });
      child.stderr.resume();
      child.stdin.on("error", failure);
      child.stdout.on("error", failure);
      child.on("error", failure);
      child.on("exit", (code, signal) =>
        failure(
          Error(`${this.name()} exited (${code ?? signal ?? "unknown"})`),
        ),
      );
      const timeout = this.config.startupTimeoutMs ?? 15000;
      const uci = this.waitFor((line) => line === "uciok", timeout);
      this.send("uci");
      await uci;
      for (const [key, value] of Object.entries(this.config.options ?? {}))
        this.send(
          `setoption name ${key}${value === null ? "" : " value " + value}`,
        );
      // Book moves have no searched score. This adapter is used for analysis.
      if (this.supported.has("ownbook"))
        this.send("setoption name OwnBook value false");
      if (this.supported.has("uci_analysemode"))
        this.send("setoption name UCI_AnalyseMode value true");
      const ready = this.waitFor((line) => line === "readyok", timeout);
      this.send("isready");
      await ready;
      this.state = "ready";
    })();
    try {
      await this.ready;
    } catch (error) {
      if (this.process)
        this.reset(error instanceof Error ? error : Error(String(error)));
      this.ready = null;
      throw error;
    }
  }
  analyze(
    position: Position,
    timeMs = 300,
    multiPv = 1,
    signal?: AbortSignal,
  ): Promise<EngineLine[]> {
    // Capture before queueing; callers may change a mutable move list while waiting.
    let board: Chess;
    let snapshot: Position;
    try {
      board = validateEnginePosition(position);
      snapshot = {
        initialFen: position.initialFen,
        moves: [...position.moves],
      };
      if (!Number.isFinite(timeMs) || !Number.isFinite(multiPv))
        throw Error("Invalid search limits");
    } catch (error) {
      return Promise.reject(error);
    }
    const run = async () => {
      if (this.disposed) throw Error(`${this.name()} closed`);
      if (signal?.aborted) throw cancelledError();
      if (board.isCheckmate())
        return [
          {
            score: { cp: board.turn() === "w" ? -100000 : 100000, mate: 0 },
            pv: [],
            depth: 0,
          },
        ];
      if (board.isStalemate() || board.isInsufficientMaterial())
        return [{ score: { cp: 0, mate: null }, pv: [], depth: 0 }];
      const abort = () => this.reset(cancelledError(), "idle");
      signal?.addEventListener("abort", abort, { once: true });
      const lines = new Map<number, EngineLine>();
      const onLine = (line: string) => {
        const info = parseInfo(line, board.turn());
        const index = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
        if (info && index > 0 && index <= 8) lines.set(index, info);
      };
      try {
        await this.ensure();
        if (signal?.aborted) throw cancelledError();
        this.state = "busy";
        if (this.supported.has("multipv"))
          this.send(
            `setoption name MultiPV value ${Math.max(1, Math.min(8, Math.floor(multiPv)))}`,
          );
        this.send(
          `position fen ${snapshot.initialFen}${snapshot.moves.length ? " moves " + snapshot.moves.join(" ") : ""}`,
        );
        this.events.on("line", onLine);
        const done = this.waitFor(
          (line) => line.startsWith("bestmove "),
          this.config.requestTimeoutMs ?? Math.max(15000, timeMs + 3000),
        );
        this.send(
          `go movetime ${Math.max(50, Math.min(3000, Math.floor(timeMs)))}`,
        );
        await done;
        if (signal?.aborted) throw cancelledError();
        const result = [...lines.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, value]) => value);
        if (!result.length)
          throw Error(`${this.name()} returned no evaluation`);
        for (const line of result) {
          if (line.pv.length > 1024)
            throw Error(`${this.name()} returned an oversized variation`);
          const chess = new Chess(board.fen());
          for (const move of line.pv) {
            if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))
              throw Error(`${this.name()} returned an invalid move`);
            playUci(chess, move);
          }
        }
        this.state = "ready";
        return result;
      } catch (error) {
        if (this.process)
          this.reset(
            error instanceof Error ? error : Error(String(error)),
            signal?.aborted ? "idle" : "error",
          );
        if (signal?.aborted) throw cancelledError();
        throw error;
      } finally {
        this.events.off("line", onLine);
        signal?.removeEventListener("abort", abort);
      }
    };
    const result = this.chain.then(run);
    this.chain = result.catch(() => {});
    return result;
  }
  dispose() {
    this.disposed = true;
    this.reset(Error(`${this.name()} closed`), "closed");
  }
}
