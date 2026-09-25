import { it, expect, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppService } from "../../electron/service";
import { Store } from "../../electron/storage/store";
import { parseGames } from "../../src/chess/game";
it("replaces aborted analysis without an old completion removing the new job", async () => {
  const service = new AppService(
    new Store(mkdtempSync(join(tmpdir(), "chess-job-"))),
    "unused",
    () => {},
  );
  service.selectProfile("hanoi");
  const [g] = parseGames("1. e4 e5 *", "hanoi");
  service.saveGame(g);
  const complete: (() => void)[] = [];
  vi.spyOn(service as any, "runAnalysis").mockImplementation(
    () => new Promise<void>((resolve) => complete.push(resolve)),
  );
  service.analyze(g.id);
  const old = service.jobs.get(g.id)!;
  old.abort();
  service.analyze(g.id);
  const next = service.jobs.get(g.id)!;
  expect(next).not.toBe(old);
  expect(next.signal.aborted).toBe(false);
  complete[0]();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(service.jobs.get(g.id)).toBe(next);
  complete[1]();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(service.jobs.has(g.id)).toBe(false);
  service.dispose();
});
it("profile switching rejects stale saves and archive import only belongs to Hanoi", () => {
  const service = new AppService(
    new Store(mkdtempSync(join(tmpdir(), "chess-service-"))),
    "unused",
    () => {},
  );
  service.selectProfile("hanoi");
  const [g] = parseGames("1. e4 e5 *", "hanoi");
  service.saveGame(g);
  service.selectProfile("sister");
  expect(() => service.saveGame(g)).toThrow();
  expect(service.visibleGames()).toHaveLength(0);
  service.selectProfile("hanoi");
  expect(service.visibleGames()).toHaveLength(1);
  service.dispose();
});
it("undo and divergent play invalidate analysis, explanations and old exercises", () => {
  const store = new Store(mkdtempSync(join(tmpdir(), "chess-undo-"))),
    service = new AppService(store, "unused", () => {});
  service.selectProfile("hanoi");
  const [g] = parseGames("1. e4 e5 2. Nf3 Nc6 *", "hanoi");
  g.mode = "training";
  const line = { score: { cp: 0, mate: null }, pv: ["e2e4"], depth: 16 };
  g.analysis = [
    {
      ply: 4,
      before: line,
      after: { ...line, pv: [] },
      best: "b8c6",
      quality: "best",
      loss: 0,
      provisional: false,
    },
  ];
  g.explanations = { ru: { "4": "Old variation" } };
  service.saveGame(g);
  store.update((d) =>
    d.progress.hanoi.reviews.push({
      id: "old",
      gameId: g.id,
      ply: 4,
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
      best: "b8c6",
      theme: "tactics",
      interval: 1,
      due: new Date().toISOString(),
    }),
  );
  service.saveGame({
    ...g,
    moves: g.moves.slice(0, 2),
    analysis: [],
    explanations: {},
  });
  expect(service.getGame(g.id).analysis).toEqual([]);
  expect(service.getGame(g.id).explanations).toEqual({});
  expect(store.data.progress.hanoi.reviews).toEqual([]);
  expect(new Store(store.dir).recovered).toBe(false);
  service.dispose();
});
