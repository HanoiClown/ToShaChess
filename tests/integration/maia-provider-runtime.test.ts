import { it, expect } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { Chess } from "chess.js";
import { MaiaProvider, sampleHumanMove } from "../../electron/engine/maia";
import { positionId } from "../../src/chess/game";
const executable = resolve("engine-packs/maia-cpu/python/python.exe");
const pack = resolve("engine-packs/maia-cpu");
const config = {
  executable,
  args: [resolve("scripts/maia-bridge.py"), "--pack", pack],
  modelId: "maia3-5m",
  startupTimeoutMs: 90000,
  requestTimeoutMs: 15000,
};
const settings = { selfElo: 1000, opponentElo: 1000 };

it.skipIf(!existsSync(executable))(
  "validates the installed offline Maia through the production provider with full history and special moves",
  async () => {
    const provider = new MaiaProvider(config);
    try {
      const cases = [
        { initialFen: new Chess().fen(), moves: ["e2e4", "e7e5", "g1f3"] },
        { initialFen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", moves: [] },
        { initialFen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1", moves: [] },
        { initialFen: "4k3/P7/8/8/8/8/8/4K3 w - - 0 1", moves: [] },
      ];
      for (const position of cases) {
        const result = await provider.predict(position, settings);
        expect(result.kind).toBe("human-prediction");
        expect(result.positionKey).toBe(positionId(position));
        expect(result.provider.version).toMatch(/^[a-f\d]{40}$/);
        expect(
          result.candidates.reduce(
            (sum, candidate) => sum + candidate.probability,
            0,
          ),
        ).toBeCloseTo(1, 5);
        const sampled = sampleHumanMove(result);
        expect(
          result.candidates.some((candidate) => candidate.uci === sampled),
        ).toBe(true);
      }
      expect(provider.status().state).toBe("ready");
    } finally {
      provider.dispose();
    }
  },
  120000,
);

it.skipIf(!existsSync(executable))(
  "rejects corrupt Maia weights before inference, without substituting another engine",
  async () => {
    const corruptPack = mkdtempSync(join(tmpdir(), "ToSha corrupt Maia "));
    mkdirSync(join(corruptPack, "models"));
    writeFileSync(
      join(corruptPack, "models", "maia3-5m.pt"),
      "not a valid checkpoint",
    );
    const provider = new MaiaProvider({
      ...config,
      args: [resolve("scripts/maia-bridge.py"), "--pack", corruptPack],
    });
    try {
      await expect(
        provider.predict(
          { initialFen: new Chess().fen(), moves: [] },
          settings,
        ),
      ).rejects.toThrow("maia_model_corrupt");
      expect(provider.status().state).toBe("error");
    } finally {
      provider.dispose();
      if (!resolve(corruptPack).startsWith(resolve(tmpdir()) + sep))
        throw Error("Invalid cleanup path");
      await rm(corruptPack, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 50,
      });
    }
  },
  90000,
);
