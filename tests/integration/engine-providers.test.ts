import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, basename, sep } from "node:path";
import { Chess } from "chess.js";
import { UciEngine } from "../../electron/engine/uci";
import { MaiaProvider, sampleHumanMove } from "../../electron/engine/maia";
import { UciSearchProvider } from "../../electron/engine/providers";
import { EngineScheduler } from "../../electron/engine/scheduler";
import type {
  EngineRequestContext,
  HumanPrediction,
} from "../../src/shared/engine-providers";

const fixture = resolve("tests/fixtures/engine-provider.mjs");
const position = { initialFen: new Chess().fen(), moves: [] as string[] };
const settings = { selfElo: 1100, opponentElo: 1300 };
const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const clean of cleanups.splice(0).reverse()) await clean();
});
function config(kind: "uci" | "maia", behavior = "normal", delay = 0) {
  const dir = mkdtempSync(join(tmpdir(), "ToSha engine test "));
  cleanups.push(async () => {
    if (
      !resolve(dir).startsWith(resolve(tmpdir()) + sep) ||
      !basename(dir).startsWith("ToSha engine test ")
    )
      throw Error("Unexpected test cleanup path");
    await rm(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  });
  return {
    executable: process.execPath,
    args: [
      fixture,
      kind,
      join(dir, "log.jsonl"),
      behavior,
      String(delay),
      join(dir, "once"),
    ],
    cwd: dir,
    displayName: "Test engine",
    startupTimeoutMs: 2000,
    requestTimeoutMs: 2000,
  };
}
function entries(value: ReturnType<typeof config>) {
  return readFileSync(value.args[2], "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}
function keep<T extends { dispose(): void }>(value: T): T {
  cleanups.push(() => value.dispose());
  return value;
}

describe("generic UCI provider", () => {
  it("disables an advertised opening book so analysis includes a searched evaluation", async () => {
    const c = config("uci", "book");
    const engine = keep(new UciEngine(c));
    expect(
      (await engine.analyze(position, 50, 1))[0].pv.length,
    ).toBeGreaterThan(0);
    expect(
      entries(c).some(
        (entry) => entry.line === "setoption name OwnBook value false",
      ),
    ).toBe(true);
  });
  it("launches executable with literal args/cwd and explicit engine-specific options, preserving history", async () => {
    const c = config("uci");
    const engine = keep(
      new UciEngine({ ...c, options: { Label: "one & two; $value" } }),
    );
    const lines = await engine.analyze({ ...position, moves: ["e2e4"] }, 80, 2);
    expect(lines[0].score.cp).toBe(-24);
    const log = entries(c);
    expect(log[0].cwd).toBe(c.cwd);
    const commands = log.filter((e) => e.event === "input").map((e) => e.line);
    expect(commands).toContain("setoption name Label value one & two; $value");
    expect(commands.some((s) => /Threads|Hash/.test(s))).toBe(false);
    expect(commands).toContain(
      `position fen ${position.initialFen} moves e2e4`,
    );
    expect(commands).toContain("setoption name MultiPV value 2");
  });
  it("rejects protocol command injection before launching an engine", async () => {
    expect(
      () => new UciEngine({ ...config("uci"), options: { Label: "x\nquit" } }),
    ).toThrow();
    const engine = keep(new UciEngine(config("uci")));
    await expect(
      engine.analyze({ ...position, moves: ["e2e4\nquit"] }),
    ).rejects.toThrow();
  });
  it("rejects illegal engine PVs and permits a retry after a process failure", async () => {
    const bad = keep(new UciEngine(config("uci", "illegal")));
    await expect(bad.analyze(position, 50)).rejects.toThrow();
    const retry = keep(new UciEngine(config("uci", "crash-once")));
    await expect(retry.analyze(position, 50)).rejects.toThrow();
    expect((await retry.analyze(position, 50))[0].pv.length).toBeGreaterThan(0);
  });
  it("cancels cold startup promptly and later restarts cleanly", async () => {
    const engine = keep(new UciEngine(config("uci", "normal", 700)));
    const abort = new AbortController();
    const pending = engine.analyze(position, 50, 1, abort.signal);
    setTimeout(() => abort.abort(), 40);
    await expect(pending).rejects.toThrow(/cancel/i);
    expect((await engine.analyze(position, 50))[0].pv.length).toBeGreaterThan(
      0,
    );
  });
  it("times out a silent search and returns explicit provider metadata for successful search", async () => {
    const silent = keep(
      new UciEngine({ ...config("uci", "silent"), requestTimeoutMs: 100 }),
    );
    await expect(silent.analyze(position, 50)).rejects.toThrow(/timeout/i);
    const provider = keep(
      new UciSearchProvider(
        { id: "custom:test", name: "Independent test", version: "1" },
        config("uci"),
      ),
    );
    const result = await provider.analyze(position, { timeMs: 50, multiPv: 1 });
    expect(result.kind).toBe("search-analysis");
    expect(result.provider.id).toBe("custom:test");
    expect(result.provider.version).toBe("Fixture");
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe("Maia JSONL provider", () => {
  it("preserves full history and ratings, reports genuine policy separately from search analysis", async () => {
    const c = config("maia", "stale");
    const maia = keep(new MaiaProvider({ ...c, modelId: "maia3-5m" }));
    const query = { ...position, moves: ["e2e4", "e7e5", "g1f3"] };
    const prediction = await maia.predict(query, settings);
    expect(prediction.kind).toBe("human-prediction");
    expect(prediction).not.toHaveProperty("lines");
    expect(prediction).not.toHaveProperty("score");
    expect(
      prediction.candidates.reduce((sum, c) => sum + c.probability, 0),
    ).toBeCloseTo(1);
    const requests = entries(c)
      .filter((e) => e.event === "input")
      .map((e) => JSON.parse(e.line));
    expect(requests[0]).toMatchObject({
      op: "predict",
      position: query,
      selfElo: 1100,
      opponentElo: 1300,
    });
    expect(maia.status().state).toBe("ready");
    await maia.predict(position, settings);
    expect(entries(c).filter((e) => e.event === "spawn")).toHaveLength(1);
  });
  it.each(["illegal", "duplicate", "invalid-mass", "missing-move"])(
    "rejects %s policy rather than silently relabelling it",
    async (behavior) => {
      const maia = keep(
        new MaiaProvider({ ...config("maia", behavior), modelId: "maia3-5m" }),
      );
      await expect(maia.predict(position, settings)).rejects.toThrow();
      expect(maia.status().state).toBe("error");
    },
  );
  it("returns legal castling, en-passant and all promotion choices", async () => {
    const maia = keep(
      new MaiaProvider({ ...config("maia"), modelId: "maia3-5m" }),
    );
    const cases = [
      {
        initialFen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
        moves: [],
        expected: ["e1g1", "e1c1"],
      },
      {
        initialFen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
        moves: [],
        expected: ["e5d6"],
      },
      {
        initialFen: "4k3/P7/8/8/8/8/8/4K3 w - - 0 1",
        moves: [],
        expected: ["a7a8q", "a7a8n", "a7a8r", "a7a8b"],
      },
    ];
    for (const value of cases) {
      const reply = await maia.predict(value, settings);
      expect(reply.candidates.map((c) => c.uci)).toEqual(
        expect.arrayContaining(value.expected),
      );
    }
  });
  it("handles terminal positions without inventing a move or loading runtime", async () => {
    const maia = keep(
      new MaiaProvider({
        ...config("maia"),
        executable: "missing-runtime.exe",
        modelId: "maia3-5m",
      }),
    );
    const reply = await maia.predict(
      { initialFen: "7k/6Q1/5K2/8/8/8/8/8 b - - 0 1", moves: [] },
      settings,
    );
    expect(reply.candidates).toEqual([]);
    expect(() => sampleHumanMove(reply)).toThrow(/move/i);
  });
  it("rejects invalid ratings and invalid position history before startup", async () => {
    const maia = keep(
      new MaiaProvider({
        ...config("maia"),
        executable: "missing-runtime.exe",
        modelId: "maia3-5m",
      }),
    );
    await expect(
      maia.predict(position, { selfElo: 483, opponentElo: 1200 }),
    ).rejects.toThrow(/rating|elo/i);
    await expect(
      maia.predict({ ...position, moves: ["e2e5"] }, settings),
    ).rejects.toThrow();
  });
  it("cancels startup, discards stale work and can retry after a crash", async () => {
    const maia = keep(
      new MaiaProvider({
        ...config("maia", "normal", 700),
        modelId: "maia3-5m",
      }),
    );
    const abort = new AbortController();
    const pending = maia.predict(position, settings, abort.signal);
    setTimeout(() => abort.abort(), 40);
    await expect(pending).rejects.toThrow(/cancel/i);
    expect((await maia.predict(position, settings)).candidates.length).toBe(20);
    const retry = keep(
      new MaiaProvider({
        ...config("maia", "crash-once"),
        modelId: "maia3-5m",
      }),
    );
    await expect(retry.predict(position, settings)).rejects.toThrow();
    expect((await retry.predict(position, settings)).candidates.length).toBe(
      20,
    );
  });
  it("times out silent inference and closes a running request on dispose", async () => {
    const maia = keep(
      new MaiaProvider({
        ...config("maia", "silent"),
        requestTimeoutMs: 100,
        modelId: "maia3-5m",
      }),
    );
    await expect(maia.predict(position, settings)).rejects.toThrow(/timeout/i);
    const slow = keep(
      new MaiaProvider({ ...config("maia", "slow"), modelId: "maia3-5m" }),
    );
    const pending = slow.predict(position, settings);
    setTimeout(() => slow.dispose(), 150);
    await expect(pending).rejects.toThrow(/closed/i);
  });
  it("sampling leaves raw policy intact and supports deterministic seeds", () => {
    const prediction = {
      candidates: [
        { uci: "e2e4", probability: 0.7 },
        { uci: "d2d4", probability: 0.3 },
      ],
      positionKey: "abc",
    } as HumanPrediction;
    const before = JSON.stringify(prediction);
    expect(sampleHumanMove(prediction, { temperature: 0 })).toBe("e2e4");
    expect(sampleHumanMove(prediction, { random: () => 0.9 })).toBe("d2d4");
    expect(sampleHumanMove(prediction, { seed: "game-7" })).toBe(
      sampleHumanMove(prediction, { seed: "game-7" }),
    );
    expect(JSON.stringify(prediction)).toBe(before);
  });
  it("cancels active inference without leaking its reply into the following position", async () => {
    const c = config("maia", "slow");
    const maia = keep(new MaiaProvider({ ...c, modelId: "maia3-5m" }));
    await maia.predict(position, settings);
    const abort = new AbortController();
    const pending = maia
      .predict(position, settings, abort.signal)
      .catch((error) => error);
    const deadline = Date.now() + 2000;
    while (maia.status().state !== "busy" && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 5));
    expect(maia.status().state).toBe("busy");
    abort.abort();
    expect((await pending).name).toBe("AbortError");
    const next = await maia.predict({ ...position, moves: ["e2e4"] }, settings);
    expect(
      next.candidates.every((candidate) => !candidate.uci.startsWith("e2")),
    ).toBe(true);
    expect(entries(c).filter((entry) => entry.event === "spawn")).toHaveLength(
      2,
    );
  });
  it("rejects a runtime model/version mismatch before allowing inference", async () => {
    const maia = keep(
      new MaiaProvider({ ...config("maia"), modelId: "maia3-23m" }),
    );
    await expect(maia.predict(position, settings)).rejects.toThrow(
      /different model/i,
    );
    const version = keep(
      new MaiaProvider({
        ...config("maia"),
        modelId: "maia3-5m",
        modelVersion: "different-build",
      }),
    );
    await expect(version.predict(position, settings)).rejects.toThrow(
      /version mismatch/i,
    );
  });
});

describe("per-provider request scheduler", () => {
  const context = (
    requestId: string,
    providerId = "maia",
    sessionId = "board",
  ): EngineRequestContext => ({
    requestId,
    providerId,
    profileId: "alice",
    sessionId,
    positionKey: requestId,
  });
  it("cancels superseded work only within its provider and session, even when task ignores abort", async () => {
    const scheduler = keep(new EngineScheduler());
    let finish!: (value: string) => void;
    const old = scheduler.run(
      context("old"),
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const other = scheduler.run(
      context("sf", "stockfish"),
      async () => "search",
    );
    const latest = scheduler.run(context("new"), async () => "human");
    await expect(old).rejects.toThrow(/cancel|supersed/i);
    finish("stale");
    await expect(other).resolves.toBe("search");
    await expect(latest).resolves.toBe("human");
  });
  it("keeps other profiles/sessions live and cancels a selected group", async () => {
    const scheduler = keep(new EngineScheduler());
    const a = scheduler.run(context("a"), () => new Promise(() => {}));
    const b = scheduler.run(
      { ...context("b"), profileId: "bob" },
      async () => 7,
    );
    const c = scheduler.run(context("c", "maia", "review"), async () => 9);
    scheduler.cancelGroup({ profileId: "alice", sessionId: "board" });
    await expect(a).rejects.toThrow(/cancel/i);
    await expect(b).resolves.toBe(7);
    await expect(c).resolves.toBe(9);
  });
  it("rejects incomplete contexts and preserves even falsy task rejection reasons", async () => {
    const scheduler = keep(new EngineScheduler());
    await expect(
      scheduler.run(
        { requestId: "incomplete" } as EngineRequestContext,
        async () => 1,
      ),
    ).rejects.toThrow(/context/i);
    let resolved = false;
    await scheduler
      .run(context("reject"), async () => {
        throw undefined;
      })
      .then(
        () => {
          resolved = true;
        },
        (error) => expect(error).toBeUndefined(),
      );
    expect(resolved).toBe(false);
  });
});
