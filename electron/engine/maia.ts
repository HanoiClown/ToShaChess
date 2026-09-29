import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { Chess } from "chess.js";
import type { Position } from "../../src/shared/contracts";
import type {
  EngineIdentity,
  EngineState,
  HumanCandidate,
  HumanPrediction,
  HumanProvider,
  HumanSettings,
} from "../../src/shared/engine-providers";
import { hash, positionId } from "../../src/chess/game";
import { cancelledError, validateEnginePosition } from "./uci";

export type MaiaConfig = {
  executable: string;
  args?: string[];
  cwd?: string;
  modelId: string;
  modelVersion?: string;
  network?: string;
  providerId?: string;
  startupTimeoutMs?: number;
  requestTimeoutMs?: number;
};
type Message = {
  type?: unknown;
  id?: unknown;
  modelId?: unknown;
  version?: unknown;
  candidates?: unknown;
  message?: unknown;
};

export function validateHumanPolicy(
  value: unknown,
  board: Chess,
): HumanCandidate[] {
  const legal = new Set(
    board
      .moves({ verbose: true })
      .map((move) => move.from + move.to + (move.promotion ?? "")),
  );
  if (!Array.isArray(value) || value.length !== legal.size)
    throw Error("Maia returned an incomplete move policy");
  let total = 0;
  const seen = new Set<string>();
  const candidates = value.map((raw: unknown) => {
    if (!raw || typeof raw !== "object")
      throw Error("Maia returned an invalid candidate");
    const { uci, probability } = raw as Record<string, unknown>;
    if (typeof uci !== "string" || !legal.has(uci) || seen.has(uci))
      throw Error("Maia returned an illegal or duplicate move");
    if (
      typeof probability !== "number" ||
      !Number.isFinite(probability) ||
      probability < 0 ||
      probability > 1
    )
      throw Error("Maia returned an invalid probability");
    seen.add(uci);
    total += probability;
    return { uci, probability };
  });
  if (legal.size && Math.abs(total - 1) > 0.0001)
    throw Error("Maia policy probabilities do not sum to one");
  // Preserve the model probabilities. Never normalize a truncated or malformed reply.
  return candidates.sort(
    (a, b) => b.probability - a.probability || a.uci.localeCompare(b.uci),
  );
}

/** Local JSONL worker; original model probabilities are isolated from EngineLine/Analysis. */
export class MaiaProvider implements HumanProvider {
  readonly identity: EngineIdentity;
  private config: MaiaConfig;
  private process: ChildProcessWithoutNullStreams | null = null;
  private events = new EventEmitter();
  private ready: Promise<void> | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private state: EngineState = "idle";
  private error: string | undefined;
  private disposed = false;
  constructor(config: MaiaConfig) {
    if (
      !config.executable ||
      config.executable.includes("\0") ||
      config.args?.some(
        (arg) => typeof arg !== "string" || arg.includes("\0"),
      ) ||
      !config.modelId
    )
      throw Error("Invalid Maia runtime configuration");
    this.config = { ...config, args: [...(config.args ?? [])] };
    this.identity = {
      id: config.providerId ?? "maia",
      name: `Maia (${config.modelId})`,
      version: config.modelVersion,
      network: config.network ?? config.modelId,
    };
  }
  status() {
    return {
      providerId: this.identity.id,
      state: this.state,
      ...(this.error ? { error: this.error } : {}),
    };
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
  private waitFor(predicate: (value: Message) => boolean, timeout: number) {
    return new Promise<Message>((resolve, reject) => {
      const done = (error: Error | null, value?: Message) => {
        clearTimeout(timer);
        this.events.off("message", onMessage);
        this.events.off("failure", onFailure);
        error ? reject(error) : resolve(value!);
      };
      const onFailure = (error: Error) => done(error);
      const onMessage = (value: Message) => {
        // A startup error is not tied to a request. Query errors must match its id.
        if (value.type === "error" && (value.id == null || predicate(value))) {
          done(
            Error(
              typeof value.message === "string"
                ? value.message.slice(0, 500)
                : "Maia runtime error",
            ),
          );
        } else if (predicate(value)) done(null, value);
      };
      const timer = setTimeout(() => done(Error("Maia timeout")), timeout);
      this.events.on("message", onMessage);
      this.events.on("failure", onFailure);
    });
  }
  private async ensure() {
    if (this.disposed) throw Error("Maia closed");
    if (this.ready) return this.ready;
    this.state = "starting";
    this.error = undefined;
    this.ready = (async () => {
      const child = spawn(this.config.executable, this.config.args ?? [], {
        cwd: this.config.cwd,
        windowsHide: true,
        stdio: "pipe",
        shell: false,
        env: {
          ...process.env,
          HF_HUB_OFFLINE: "1",
          HF_HUB_DISABLE_TELEMETRY: "1",
        },
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
          failure(Error("Maia output limit exceeded"));
          return;
        }
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const value: unknown = JSON.parse(line);
            if (!value || typeof value !== "object" || Array.isArray(value))
              throw Error("Invalid JSONL object");
            this.events.emit("message", value);
          } catch {
            failure(Error("Maia returned invalid JSONL"));
            return;
          }
        }
      });
      child.stderr.resume();
      child.stdin.on("error", failure);
      child.stdout.on("error", failure);
      child.on("error", failure);
      child.on("exit", (code, signal) =>
        failure(Error(`Maia exited (${code ?? signal ?? "unknown"})`)),
      );
      const ready = await this.waitFor(
        (value) => value.type === "ready",
        this.config.startupTimeoutMs ?? 90000,
      );
      if (ready.modelId !== this.config.modelId)
        throw Error("Maia loaded a different model than requested");
      if (
        this.config.modelVersion &&
        ready.version !== this.config.modelVersion
      )
        throw Error("Maia runtime version mismatch");
      if (typeof ready.version === "string")
        this.identity.version = ready.version.slice(0, 128);
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
  predict(
    position: Position,
    settings: HumanSettings,
    signal?: AbortSignal,
  ): Promise<HumanPrediction> {
    let board: Chess;
    let snapshot: Position;
    let ratings: HumanSettings;
    try {
      board = validateEnginePosition(position);
      snapshot = {
        initialFen: position.initialFen,
        moves: [...position.moves],
      };
      ratings = {
        selfElo: settings.selfElo,
        opponentElo: settings.opponentElo,
      };
      if (
        Object.values(ratings).some(
          (value) => !Number.isInteger(value) || value < 600 || value > 2600,
        )
      )
        throw Error(
          "Maia Elo rating must be between 600 and 2600 (Lichess scale)",
        );
    } catch (error) {
      return Promise.reject(error);
    }
    const result = (candidates: HumanCandidate[]): HumanPrediction => ({
      kind: "human-prediction",
      provider: { ...this.identity },
      positionKey: positionId(snapshot),
      ...ratings,
      candidates,
    });
    const run = async () => {
      if (this.disposed) throw Error("Maia closed");
      if (signal?.aborted) throw cancelledError();
      if (board.isGameOver()) return result([]);
      const abort = () => this.reset(cancelledError(), "idle");
      signal?.addEventListener("abort", abort, { once: true });
      try {
        await this.ensure();
        if (signal?.aborted) throw cancelledError();
        this.state = "busy";
        const id = randomUUID();
        const response = this.waitFor(
          (value) => value.id === id,
          this.config.requestTimeoutMs ?? 15000,
        );
        this.process!.stdin.write(
          JSON.stringify({
            id,
            op: "predict",
            position: snapshot,
            ...ratings,
          }) + "\n",
        );
        const reply = await response;
        if (signal?.aborted) throw cancelledError();
        if (reply.type !== "prediction")
          throw Error("Maia returned an unexpected response");
        const candidates = validateHumanPolicy(reply.candidates, board);
        this.state = "ready";
        return result(candidates);
      } catch (error) {
        if (this.process)
          this.reset(
            error instanceof Error ? error : Error(String(error)),
            signal?.aborted ? "idle" : "error",
          );
        if (signal?.aborted) throw cancelledError();
        throw error;
      } finally {
        signal?.removeEventListener("abort", abort);
      }
    };
    const prediction = this.chain.then(run);
    this.chain = prediction.catch(() => {});
    return prediction;
  }
  dispose() {
    this.disposed = true;
    this.reset(Error("Maia closed"), "closed");
  }
}

/** Sampling changes playing behaviour, never the displayed raw policy or claimed rating. */
export function sampleHumanMove(
  prediction: HumanPrediction,
  options: {
    temperature?: number;
    random?: () => number;
    seed?: string | number;
  } = {},
): string {
  const candidates = prediction.candidates;
  if (!candidates.length) throw Error("No move available");
  const temperature = options.temperature ?? 1;
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 5)
    throw Error("Invalid sampling temperature");
  const max = Math.max(...candidates.map((candidate) => candidate.probability));
  if (!(max > 0)) throw Error("Invalid move policy");
  if (temperature === 0)
    return candidates.find((candidate) => candidate.probability === max)!.uci;
  // Log-space weights avoid underflow for sharp temperatures; original probabilities stay intact.
  const weights = candidates.map((candidate) =>
    candidate.probability > 0
      ? Math.exp(
          (Math.log(candidate.probability) - Math.log(max)) / temperature,
        )
      : 0,
  );
  const seedValue =
    options.seed === undefined
      ? undefined
      : Number(
          BigInt(
            "0x" + hash(String(options.seed) + "|" + prediction.positionKey),
          ) & 0xffffffffn,
        ) / 0x100000000;
  const random = options.random
    ? options.random()
    : (seedValue ?? Math.random());
  if (!Number.isFinite(random) || random < 0 || random >= 1)
    throw Error("Invalid random sample");
  let remaining = random * weights.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i];
    if (remaining < 0) return candidates[i].uci;
  }
  for (let i = weights.length - 1; i >= 0; i--)
    if (weights[i] > 0) return candidates[i].uci;
  throw Error("Invalid move policy");
}
