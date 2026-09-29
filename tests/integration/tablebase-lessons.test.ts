import { it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Chess } from "chess.js";
import { tablebaseLessons } from "../../src/content/tablebase-lessons";
import { SyzygyService } from "../../electron/engine/optional";
it("uses legal original lesson positions and legal mating sample lines", () => {
  for (const lesson of tablebaseLessons) {
    const board = new Chess(lesson.initialFen);
    for (const uci of lesson.sampleLine)
      board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
    if (lesson.sampleLine.length) expect(board.isCheckmate()).toBe(true);
  }
});
it.skipIf(
  !existsSync(resolve("engine-packs/syzygy-3-5/KPvK.rtbw")) ||
    !existsSync(resolve("engine-packs/maia-cpu/python/python.exe")),
)(
  "confirms all lesson outcomes with real local Syzygy tables including the opposition counterexample",
  async () => {
    const service = new SyzygyService({
      python: resolve("engine-packs/maia-cpu/python/python.exe"),
      script: resolve("scripts/tablebase-bridge.py"),
      tableDir: resolve("engine-packs/syzygy-3-5"),
    });
    try {
      for (const lesson of tablebaseLessons) {
        expect(
          (await service.probe({ initialFen: lesson.initialFen, moves: [] }))
            .wdl,
        ).toBe(lesson.expectedWdl);
        if (lesson.alternative)
          expect(
            (
              await service.probe({
                initialFen: lesson.alternative.initialFen,
                moves: [],
              })
            ).wdl,
          ).toBe(lesson.alternative.expectedWdl);
      }
    } finally {
      service.dispose();
    }
  },
);
