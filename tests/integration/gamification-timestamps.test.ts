import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { profileStore } from "../helpers/profile-fixtures";
import { AppService } from "../../electron/service";
import { UciEngine } from "../../electron/engine/uci";
import { Store } from "../../electron/storage/store";
import { boardAt, newGame } from "../../src/chess/game";
import { deriveGamification } from "../../src/library/gamification";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("persists a server completion date across re-analysis, stale saves and restarts", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 24, 12));
  vi.spyOn(UciEngine.prototype, "analyze").mockImplementation(
    async (position) => {
      const move = boardAt(position).moves({ verbose: true })[0];
      return [
        {
          score: { cp: 0, mate: null },
          depth: 16,
          pv: move ? [move.from + move.to + (move.promotion ?? "")] : [],
        },
      ];
    },
  );
  const service = new AppService(
    profileStore(mkdtempSync(join(tmpdir(), "chess-completed-"))),
    "unused",
    () => {},
  );
  try {
    service.selectProfile("hanoi");
    const game = newGame("hanoi", "Player", "w", "normal", 0, 0, 0);
    service.saveGame({ ...game, completedAt: "2000-01-01T00:00:00.000Z" });
    expect(service.getGame(game.id).completedAt).toBeUndefined();

    vi.setSystemTime(new Date(2026, 8, 25, 12));
    const completedAt = new Date().toISOString();
    service.saveGame({
      ...game,
      moves: ["e2e4", "e7e5"],
      result: "0-1",
      updatedAt: completedAt,
      completedAt: "2000-01-01T00:00:00.000Z",
    });
    expect(service.getGame(game.id).completedAt).toBe(completedAt);

    vi.setSystemTime(new Date(2026, 8, 26, 12));
    service.analyze(game.id);
    await vi.waitFor(() => expect(service.jobs.has(game.id)).toBe(false));
    const analyzed = service.getGame(game.id);
    expect(analyzed.analysis).toHaveLength(2);
    expect(analyzed.updatedAt.slice(0, 10)).toBe(
      new Date().toISOString().slice(0, 10),
    );
    expect(analyzed.completedAt).toBe(completedAt);
    service.saveGame({ ...analyzed, completedAt: new Date().toISOString() });
    expect(service.getGame(game.id).completedAt).toBe(completedAt);
    const restored = new Store(service.store.dir);
    expect(restored.data.games[0].completedAt).toBe(completedAt);
    expect(deriveGamification(restored.data, "hanoi")).toMatchObject({
      xp: 30,
      streak: 1,
      todayQualified: false,
    });
  } finally {
    service.dispose();
  }
});

it("leaves imported games unstamped and retains the stable fallback for legacy finished saves", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 25, 12));
  const service = new AppService(
    profileStore(mkdtempSync(join(tmpdir(), "chess-legacy-completed-"))),
    "unused",
    () => {},
  );
  try {
    service.selectProfile("hanoi");
    const game = {
      ...newGame("hanoi", "Player", "w", "normal", 0, 0, 0),
      moves: ["e2e4", "e7e5"],
      result: "0-1" as const,
    };
    service.store.update((database) => database.games.push(game));
    vi.setSystemTime(new Date(2026, 8, 27, 12));
    service.saveGame({ ...game, updatedAt: new Date().toISOString() });
    expect(service.getGame(game.id).completedAt).toBe(game.createdAt);
    service.saveGame({
      ...game,
      id: "imported",
      mode: "import",
      completedAt: new Date().toISOString(),
    });
    expect(service.getGame("imported").completedAt).toBeUndefined();
  } finally {
    service.dispose();
  }
});
