import { it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Chess } from "chess.js";
import { OptionalEngineService } from "../../electron/engine/optional";
const start = {
  initialFen: new Chess().fen(),
  moves: ["e2e4", "e7e5", "g1f3"],
};
const lc0 = resolve("engine-packs/lc0-cpu/lc0.exe");
const network = resolve("engine-packs/lc0-cpu/791556.pb.gz");
const arasan = resolve("engine-packs/arasan-local/arasanx-64.exe");
it.skipIf(!existsSync(lc0) || !existsSync(network))(
  "runs the official Lc0 CPU backend with explicitly selected bundled weights",
  async () => {
    const service = new OptionalEngineService();
    try {
      service.configure({
        id: "lc0",
        name: "Lc0 0.32.1 CPU",
        executable: lc0,
        networkPath: network,
        backend: "cpu",
        options: { Threads: 2, NNCacheSize: 10000 },
      });
      const result = await service.analyze(start, { timeMs: 1000, multiPv: 2 });
      expect(result.provider.id).toBe("lc0");
      expect(result.provider.network).toBe(network);
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.lines[0].pv.length).toBeGreaterThan(0);
      expect(Number.isFinite(result.lines[0].score.cp)).toBe(true);
      for (const line of result.lines) {
        const board = new Chess(start.initialFen);
        for (const move of [...start.moves, ...line.pv])
          expect(() =>
            board.move({
              from: move.slice(0, 2),
              to: move.slice(2, 4),
              promotion: move[4],
            }),
          ).not.toThrow();
      }
    } finally {
      service.dispose();
    }
  },
  90000,
);
it.skipIf(!existsSync(arasan))(
  "runs Arasan 26.0 through the same user-selected generic UCI service",
  async () => {
    const service = new OptionalEngineService();
    try {
      service.configure({
        id: "custom",
        name: "Arasan 26.0",
        executable: arasan,
        options: { Threads: 2, Hash: 64 },
      });
      const result = await service.analyze(start, { timeMs: 200, multiPv: 2 });
      expect(result.provider.name).toBe("Arasan 26.0");
      expect(result.lines.length).toBeGreaterThan(0);
      for (const line of result.lines) {
        const board = new Chess(start.initialFen);
        for (const move of [...start.moves, ...line.pv])
          expect(() =>
            board.move({
              from: move.slice(0, 2),
              to: move.slice(2, 4),
              promotion: move[4],
            }),
          ).not.toThrow();
      }
    } finally {
      service.dispose();
    }
  },
  90000,
);
