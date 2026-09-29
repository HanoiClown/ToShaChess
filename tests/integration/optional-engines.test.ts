import { it, expect } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { Chess } from "chess.js";
import {
  OptionalEngineService,
  SyzygyService,
} from "../../electron/engine/optional";
const position = { initialFen: new Chess().fen(), moves: [] };
it("runs an explicitly chosen UCI engine and handles disabling without implicit fallback", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ToSha optional test "));
  const service = new OptionalEngineService();
  try {
    await expect(
      service.analyze(position, { timeMs: 50, multiPv: 1 }),
    ).rejects.toThrow(/configured/i);
    service.configure({
      id: "custom",
      name: "Chosen fixture",
      executable: process.execPath,
      args: [
        resolve("tests/fixtures/engine-provider.mjs"),
        "uci",
        join(dir, "log.jsonl"),
      ],
    });
    const reply = await service.analyze(position, { timeMs: 50, multiPv: 1 });
    expect(reply.provider.name).toBe("Chosen fixture");
    expect(reply.provider.id).toBe("custom");
    service.configure(null);
    await expect(
      service.analyze(position, { timeMs: 50, multiPv: 1 }),
    ).rejects.toThrow(/configured/i);
  } finally {
    service.dispose();
    if (!resolve(dir).startsWith(resolve(tmpdir()) + sep))
      throw Error("Invalid cleanup path");
    await rm(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  }
});
it("requires a specific existing network for Lc0 and detects missing custom binaries", () => {
  const service = new OptionalEngineService();
  expect(() =>
    service.configure({ id: "lc0", name: "Lc0", executable: process.execPath }),
  ).toThrow(/network/i);
  expect(() =>
    service.configure({
      id: "custom",
      name: "Missing",
      executable: "missing-engine.exe",
    }),
  ).toThrow(/executable/i);
  service.dispose();
});
it("distinguishes unsupported table positions from missing runtime and tables", async () => {
  const service = new SyzygyService({
    python: "missing-python.exe",
    script: "missing-script.py",
    tableDir: "missing-tables",
  });
  const normal = await service.probe(position);
  expect(normal.status).toBe("unsupported");
  expect(normal.reason).toBe("too_many_pieces");
  const ending = await service.probe({
    initialFen: "8/8/8/8/8/2K5/3R4/7k w - - 0 1",
    moves: [],
  });
  expect(ending.status).toBe("missing");
  expect(ending.wdl).toBeNull();
});
const python = resolve("engine-packs/maia-cpu/python/python.exe");
it.skipIf(
  !existsSync(python) ||
    !existsSync(resolve("engine-packs/syzygy-3-5/KRvK.rtbw")),
)(
  "probes verified real Syzygy tables from both perspectives and respects the fifty-move clock",
  async () => {
    const service = new SyzygyService({
      python,
      script: resolve("scripts/tablebase-bridge.py"),
      tableDir: resolve("engine-packs/syzygy-3-5"),
    });
    try {
      const fen = "8/8/8/8/8/2K5/3R4/7k";
      const won = await service.probe({
        initialFen: `${fen} w - - 0 1`,
        moves: [],
      });
      expect(won).toMatchObject({
        status: "available",
        wdl: 2,
        source: "syzygy",
        perspective: "side-to-move",
      });
      expect(won.dtz).toBeGreaterThan(0);
      expect(won.moves).toHaveLength(
        new Chess(`${fen} w - - 0 1`).moves().length,
      );
      expect(
        (await service.probe({ initialFen: `${fen} b - - 0 1`, moves: [] }))
          .wdl,
      ).toBe(-2);
      expect(
        (await service.probe({ initialFen: `${fen} w - - 99 51`, moves: [] }))
          .wdl,
      ).toBe(1);
      expect(
        (await service.probe({ initialFen: `${fen} w - - 100 51`, moves: [] }))
          .wdl,
      ).toBe(0);
    } finally {
      service.dispose();
    }
  },
);
it.skipIf(!existsSync(python))(
  "treats terminal rules exactly and reports missing Syzygy files without invented evaluation",
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "ToSha tables test "));
    const service = new SyzygyService({
      python,
      script: resolve("scripts/tablebase-bridge.py"),
      tableDir: dir,
    });
    try {
      const missing = await service.probe({
        initialFen: "8/8/8/8/8/2K5/3R4/7k w - - 0 1",
        moves: [],
      });
      expect(missing.status).toBe("missing");
      const mate = await service.probe({
        initialFen: "7k/6Q1/5K2/8/8/8/8/8 b - - 0 1",
        moves: [],
      });
      expect(mate.wdl).toBe(-2);
      expect(mate.source).toBe("rules");
      const draw = await service.probe({
        initialFen: "8/8/8/8/8/2K5/3R4/7k w - - 100 51",
        moves: [],
      });
      expect(draw.wdl).toBe(0);
      expect(draw.reason).toBe("fifty_move_claim");
    } finally {
      service.dispose();
      if (!resolve(dir).startsWith(resolve(tmpdir()) + sep))
        throw Error("Invalid cleanup path");
      await rm(dir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 50,
      });
    }
  },
);
