import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { Chess } from "chess.js";
import type { Color, EngineLine, Position } from "../../src/shared/contracts";
import { boardAt, playUci } from "../../src/chess/game";
export function parseInfo(line: string, color: Color): EngineLine | null {
  if (/\b(lowerbound|upperbound)\b/.test(line)) return null;
  const match = line.match(/\bscore (cp|mate) (-?\d+)/),
    pv = line.match(/\bpv (.+)$/),
    depth = line.match(/\bdepth (\d+)/);
  if (!match || !pv || !depth) return null;
  const sign = color === "w" ? 1 : -1,
    value = Number(match[2]) * sign;
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
export class UciEngine {
  private process: ChildProcessWithoutNullStreams | null = null;
  private events = new EventEmitter();
  private ready: Promise<void> | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private disposed = false;
  constructor(private path: string) {}
  private send(line: string) {
    if (!this.process) throw Error("Engine unavailable");
    this.process.stdin.write(line + "\n");
  }
  private waitFor(test: (line: string) => boolean, timeout = 15000) {
    return new Promise<string>((resolve, reject) => {
      const done = (e: Error | null, line = "") => {
        clearTimeout(timer);
        this.events.off("line", onLine);
        this.events.off("failure", onError);
        e ? reject(e) : resolve(line);
      };
      const onLine = (line: string) => {
        if (test(line)) done(null, line);
      };
      const onError = (e: Error) => done(e);
      const timer = setTimeout(() => done(Error("Stockfish timeout")), timeout);
      this.events.on("line", onLine);
      this.events.on("failure", onError);
    });
  }
  private async ensure() {
    if (this.disposed) throw Error("Engine closed");
    if (this.ready) return this.ready;
    this.ready = (async () => {
      this.process = spawn(this.path, [], { windowsHide: true, stdio: "pipe" });
      let buffer = "";
      this.process.stdout.setEncoding("utf8");
      this.process.stdout.on("data", (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const l of lines) this.events.emit("line", l.trim());
      });
      const failure = (e: Error) => {
        this.events.emit("failure", e);
        this.ready = null;
      };
      this.process.on("error", failure);
      this.process.on("exit", () => {
        if (!this.disposed) failure(Error("Stockfish exited"));
      });
      const uci = this.waitFor((l) => l === "uciok");
      this.send("uci");
      await uci;
      this.send("setoption name Threads value 2");
      this.send("setoption name Hash value 128");
      const ready = this.waitFor((l) => l === "readyok");
      this.send("isready");
      await ready;
    })();
    try {
      await this.ready;
    } catch (e) {
      this.process?.kill();
      this.process = null;
      this.ready = null;
      throw e;
    }
  }
  analyze(
    position: Position,
    timeMs = 300,
    multiPv = 1,
    signal?: AbortSignal,
  ): Promise<EngineLine[]> {
    const run = async () => {
      if (signal?.aborted) throw Error("Cancelled");
      await this.ensure();
      if (signal?.aborted) throw Error("Cancelled");
      const board = boardAt(position);
      if (board.isCheckmate()) {
        const sign = board.turn() === "w" ? -1 : 1;
        return [{ score: { cp: sign * 100000, mate: 0 }, pv: [], depth: 0 }];
      }
      if (board.isStalemate() || board.isInsufficientMaterial())
        return [{ score: { cp: 0, mate: null }, pv: [], depth: 0 }];
      this.send(
        `setoption name MultiPV value ${Math.max(1, Math.min(8, multiPv))}`,
      );
      this.send(
        `position fen ${position.initialFen}${position.moves.length ? " moves " + position.moves.join(" ") : ""}`,
      );
      const lines = new Map<number, EngineLine>();
      const onLine = (line: string) => {
        const info = parseInfo(line, board.turn());
        if (info)
          lines.set(Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1), info);
      };
      this.events.on("line", onLine);
      const abort = () => {
        if (this.process) this.send("stop");
      };
      signal?.addEventListener("abort", abort, { once: true });
      try {
        const done = this.waitFor(
          (l) => l.startsWith("bestmove "),
          Math.max(15000, timeMs + 3000),
        );
        this.send(`go movetime ${Math.max(50, Math.min(3000, timeMs))}`);
        await done;
        if (signal?.aborted) throw Error("Cancelled");
        const result = [...lines.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, x]) => x);
        if (!result.length) throw Error("Stockfish returned no evaluation");
        for (const r of result) {
          const c = new Chess(board.fen());
          for (const u of r.pv) playUci(c, u);
        }
        return result;
      } catch (e) {
        if (!signal?.aborted) {
          this.process?.kill();
          this.process = null;
          this.ready = null;
        }
        throw e;
      } finally {
        this.events.off("line", onLine);
        signal?.removeEventListener("abort", abort);
      }
    };
    const p = this.chain.then(run);
    this.chain = p.catch(() => {});
    return p;
  }
  dispose() {
    this.disposed = true;
    this.process?.kill();
    this.process = null;
    this.ready = null;
    this.events.emit("failure", Error("Engine closed"));
  }
}
