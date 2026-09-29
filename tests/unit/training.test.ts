import { expect, test } from "vitest";
import {
  createTrainingCard,
  reviewTrainingCard,
  dueTrainingCards,
  cardFromStudy,
  cardsFromMistakes,
} from "../../src/training/cards";
import {
  handBrainPiece,
  allowedHandMove,
  sampleHumanMove,
} from "../../src/training/drills";
import { START, parseGames } from "../../src/chess/game";
import { createStudy, addStudyMove } from "../../src/study/tree";
const now = "2026-09-29T18:00:00.000Z";
function card() {
  return createTrainingCard(
    {
      profileId: "a",
      title: { ru: "Центр", en: "Centre" },
      reason: { ru: "Повторить ход", en: "Recall this move" },
      position: { initialFen: START, moves: [] },
      acceptedMoves: ["e2e4"],
      source: { kind: "study", id: "s" },
    },
    now,
  );
}
test("spaced review uses server time, deduplicates attempts and keeps owners separate", () => {
  const c = card(),
    a = {
      id: "try1",
      cardId: c.id,
      profileId: "a",
      outcome: "remembered" as const,
      at: "1900-01-01T00:00:00.000Z",
    };
  const next = reviewTrainingCard(c, a, now);
  expect(next.dueAt).toBe("2026-09-30T18:00:00.000Z");
  expect(next.successes).toBe(1);
  expect(reviewTrainingCard(next, a, "2026-10-01T18:00:00.000Z")).toEqual(next);
  const third = reviewTrainingCard(
    next,
    { ...a, id: "try2" },
    "2026-09-30T18:00:00.000Z",
  );
  expect(third.intervalDays).toBe(3);
  const failed = reviewTrainingCard(
    third,
    { ...a, id: "try3", outcome: "again" },
    "2026-10-03T18:00:00.000Z",
  );
  expect(failed.intervalDays).toBe(1);
  expect(failed.lapses).toBe(1);
  expect(() => reviewTrainingCard(c, { ...a, profileId: "b" }, now)).toThrow();
  expect(dueTrainingCards([next], "b", "2027-01-01T00:00:00Z")).toEqual([]);
});
test("study and mistake cards preserve history and an explicit legal target", () => {
  let study = createStudy({ profileId: "a", title: "Opening" });
  study = addStudyMove(study, study.rootId, "e2e4");
  const c = cardFromStudy(study, study.rootId, now);
  expect(c.acceptedMoves).toEqual(["e2e4"]);
  const game = parseGames("1. f3 e5 2. g4 Qh4# 0-1", "a")[0];
  game.analysis = [
    {
      ply: 3,
      before: { score: { cp: 0, mate: null }, depth: 15, pv: ["e2e4"] },
      after: { score: { cp: -99999, mate: -1 }, depth: 15, pv: ["d8h4"] },
      best: "e2e4",
      quality: "blunder",
      loss: 500,
      provisional: false,
    },
  ];
  expect(cardsFromMistakes([game], "a", now)[0].position.moves).toEqual([
    "f2f3",
    "e7e5",
  ]);
  expect(cardsFromMistakes([game], "b", now)).toEqual([]);
});
test("hand and brain names a piece type and human sampling stays within legal candidates", () => {
  const pos = { initialFen: START, moves: [] };
  expect(handBrainPiece(pos, "g1f3")).toBe("n");
  expect(allowedHandMove(pos, "b1c3", "n")).toBe(true);
  expect(allowedHandMove(pos, "e2e4", "n")).toBe(false);
  expect(
    sampleHumanMove(
      pos,
      [
        { uci: "e2e4", probability: 0.6 },
        { uci: "d2d4", probability: 0.4 },
      ],
      () => 0.8,
    ),
  ).toBe("d2d4");
  expect(() =>
    sampleHumanMove(pos, [{ uci: "e2e5", probability: 1 }]),
  ).toThrow();
});
