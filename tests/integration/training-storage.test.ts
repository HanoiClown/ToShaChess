import { test, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TrainingStore } from "../../electron/storage/training";
import { createTrainingCard } from "../../src/training/cards";
import { START } from "../../src/chess/game";
test("training persists schedules, ignores renderer counters, rejects mixed owners and merges idempotently", () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-training-")),
    store = new TrainingStore(dir);
  const card = createTrainingCard({
    profileId: "a",
    title: { ru: "Ход", en: "Move" },
    reason: { ru: "Повтор", en: "Review" },
    position: { initialFen: START, moves: [] },
    acceptedMoves: ["e2e4"],
    source: { kind: "study", id: "study" },
  });
  store.save("a", { ...card, successes: 999, intervalDays: 60 });
  expect(store.list("a")[0].successes).toBe(0);
  const reviewed = store.review("a", {
    cardId: card.id,
    attemptId: "first",
    outcome: "remembered",
  });
  expect(reviewed.successes).toBe(1);
  expect(
    store.review("a", {
      cardId: card.id,
      attemptId: "first",
      outcome: "remembered",
    }).successes,
  ).toBe(1);
  store.save("a", { ...card, successes: 88, intervalDays: 60 });
  expect(store.list("a")[0].successes).toBe(1);
  expect(() => store.delete("b", card.id)).toThrow();
  expect(new TrainingStore(dir).list("b")).toEqual([]);
  const restored = new TrainingStore(dir);
  const backup = restored.export();
  restored.replace(restored.prepareMerge(backup, ["a"]));
  expect(restored.list("a")[0].successes).toBe(1);
  expect(() => restored.prepareMerge(backup, ["b"])).toThrow();
});
