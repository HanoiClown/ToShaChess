import { it, expect } from "vitest";
import { resolve } from "node:path";
import { Chess } from "chess.js";
import { UciEngine, parseInfo } from "../../electron/engine/uci";
it("parses scores and rejects bounds as exact evaluations", () => {
  expect(parseInfo("info depth 12 score cp -37 pv e7e5", "b")?.score.cp).toBe(
    37,
  );
  expect(parseInfo("info depth 20 score mate 3 pv h5f7", "w")?.score.mate).toBe(
    3,
  );
  expect(parseInfo("info depth 20 score cp 32 lowerbound pv e2e4", "w")).toBe(
    null,
  );
});
it("runs the supplied engine and returns legal PV, cancellation does not contaminate next search", async () => {
  const e = new UciEngine(
    resolve("stockfish/stockfish-windows-x86-64-universal.exe"),
  );
  try {
    const c = new Chess();
    const lines = await e.analyze({ initialFen: c.fen(), moves: [] }, 150, 2);
    expect(lines.length).toBeGreaterThan(0);
    for (const u of lines[0].pv)
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    const abort = new AbortController();
    const pending = e.analyze(
      { initialFen: new Chess().fen(), moves: [] },
      2000,
      1,
      abort.signal,
    );
    setTimeout(() => abort.abort(), 50);
    await expect(pending).rejects.toThrow();
    const m = new Chess();
    for (const u of ["f3", "e5", "g4"]) m.move(u);
    const mate = await e.analyze({ initialFen: m.fen(), moves: [] }, 200, 1);
    expect(mate[0].pv[0]).toBe("d8h4");
    expect(mate[0].score.mate).toBe(-1);
  } finally {
    e.dispose();
  }
});
