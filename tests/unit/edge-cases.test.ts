import { it, expect } from "vitest";
import { Chess } from "chess.js";
import { terminalResult, timeoutResult } from "../../src/chess/game";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../electron/storage/store";
import { AppService } from "../../electron/service";
it("automatically draws on fivefold but leaves threefold as a claim", () => {
  const c = new Chess();
  for (let i = 0; i < 2; i++)
    for (const m of ["Nf3", "Nf6", "Ng1", "Ng8"]) c.move(m);
  expect(terminalResult(c)).toBe("*");
  for (let i = 0; i < 2; i++)
    for (const m of ["Nf3", "Nf6", "Ng1", "Ng8"]) c.move(m);
  expect(terminalResult(c)).toBe("1/2-1/2");
});
it("a lone king cannot win on time", () => {
  const c = new Chess("7k/8/8/8/8/8/8/R6K w - - 0 1");
  expect(timeoutResult(c, "w")).toBe("1/2-1/2");
});
it("stale exercise attempts cannot enter the newly selected profile; failed tasks become due", () => {
  const s = new AppService(
    new Store(mkdtempSync(join(tmpdir(), "chess-edge-"))),
    "unused",
    () => {},
  );
  s.selectProfile("hanoi");
  const a = {
    id: "test",
    profileId: "hanoi",
    itemId: "starter-0-0",
    theme: "mate",
    correct: false,
    at: "2026-09-25T12:00:00.000Z",
    seconds: 10,
  };
  s.attempt(a);
  expect(s.store.data.progress.hanoi.reviews[0].due).toBe(
    "2026-09-26T12:00:00.000Z",
  );
  s.selectProfile("sister");
  expect(() => s.attempt({ ...a, id: "late" })).toThrow();
  expect(s.store.data.progress.sister.attempts).toHaveLength(0);
  s.dispose();
});
