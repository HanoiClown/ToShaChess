import { it, expect } from "vitest";
import { Chess } from "chess.js";
import { puzzles } from "../../src/content/puzzles";
import {
  filterPuzzles,
  levelOf,
  advanceSolution,
  themeName,
  themes,
} from "../../src/library/catalogue";
import { openings, openingPriority } from "../../src/library/openings";
import { alternativeLine } from "../../src/library/alternatives";
// DISTINCT theme from the complete 2026-09-10 Lichess puzzle snapshot (73 IDs).
// Kept in the test so the public source suite does not need the multi-GB pack.
const fullPackThemes =
  `advancedPawn advantage anastasiaMate arabianMate attackingF2F7 attraction
backRankMate balestraMate bishopEndgame blindSwineMate bodenMate capturingDefender castling clearance
collinearMove cornerMate crushing defensiveMove deflection discoveredAttack discoveredCheck doubleBishopMate
doubleCheck dovetailMate enPassant endgame epauletteMate equality exposedKing fork hangingPiece hookMate
interference intermezzo killBoxMate kingsideAttack knightEndgame long master masterVsMaster mate mateIn1
mateIn2 mateIn3 mateIn4 mateIn5 middlegame morphysMate oneMove opening operaMate pawnEndgame pillsburysMate
pin promotion queenEndgame queenRookEndgame queensideAttack quietMove rookEndgame sacrifice short skewer
smotheredMate superGM swallowstailMate trappedPiece triangleMate underPromotion veryLong vukovicMate
xRayAttack zugzwang`.split(/\s+/);
it("labels every full-pack and starter theme in Russian and English", () => {
  const all = new Set([
    ...fullPackThemes,
    ...puzzles.flatMap((puzzle) => puzzle.themes ?? [puzzle.theme]),
  ]);
  for (const id of all) {
    expect(themes[id], `Missing bilingual labels for ${id}`).toHaveLength(2);
    expect(themeName(id, "ru"), `Russian label for ${id}`).toMatch(
      /[А-Яа-яЁё]/,
    );
    expect(themeName(id, "en"), `English label for ${id}`).toMatch(/[A-Za-z]/);
  }
});
it("does not shorten a puzzle using an incomplete PV or award a mate before checkmate", () => {
  const fen = new Chess().fen(),
    before = { score: { cp: 0, mate: null }, pv: ["e2e4"], depth: 16 };
  expect(
    alternativeLine(fen, "d2d4", before, { ...before, pv: ["d7d5"] }, 5, false),
  ).toBeNull();
  expect(
    alternativeLine(
      fen,
      "d2d4",
      before,
      { ...before, pv: ["d7d5", "c2c4", "e7e6", "b1c3"] },
      5,
      false,
    ),
  ).toHaveLength(5);
  const mateBefore = { ...before, score: { cp: 99997, mate: 3 } };
  expect(
    alternativeLine(
      fen,
      "d2d4",
      mateBefore,
      { ...mateBefore, pv: ["d7d5", "c2c4", "e7e6", "b1c3"] },
      5,
      true,
    ),
  ).toBeNull();
  const mateFen = "7k/8/5KQ1/8/8/8/8/8 w - - 0 1";
  expect(
    alternativeLine(
      mateFen,
      "g6g7",
      mateBefore,
      { ...mateBefore, pv: [] },
      1,
      true,
    ),
  ).toEqual(["g6g7"]);
  const longer = { ...mateBefore, pv: ["h8h7", "g5g7"] };
  expect(
    alternativeLine(mateFen, "g6g5", mateBefore, longer, 1, true),
  ).toBeNull();
  expect(alternativeLine(mateFen, "g6g5", mateBefore, longer, 3, true)).toEqual(
    ["g6g5", "h8h7", "g5g7"],
  );
});
it("ships a real diverse library with unique positions and difficulty bands", () => {
  const imported = puzzles.filter((p) => p.source === "Lichess");
  expect(imported.length).toBe(30000);
  expect(
    new Set(imported.map((p) => p.fen.split(" ").slice(0, 4).join(" "))).size,
  ).toBe(30000);
  for (const level of ["first", "beginner", "intermediate", "advanced"])
    expect(filterPuzzles(imported, { level }).length).toBeGreaterThan(1000);
  expect(filterPuzzles(imported, { theme: "endgame" }).length).toBeGreaterThan(
    1000,
  );
  expect(filterPuzzles(imported, { theme: "mateIn1" }).length).toBeGreaterThan(
    100,
  );
  const solved = new Set([imported[0].id]);
  expect(
    filterPuzzles(imported, { solved: "done" }, solved).map((p) => p.id),
  ).toEqual([...solved]);
  expect(levelOf(999)).toBe("first");
  expect(levelOf(1000)).toBe("beginner");
});
it("requires all solver moves and applies opponent replies without changing a puzzle on error", () => {
  const p = {
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    line: ["e1e8", "g8h7", "e8h8"],
  };
  // General legal continuation test, not a forced mate claim.
  const fen = new Chess().fen(),
    line = ["e2e4", "e7e5", "g1f3"];
  expect(advanceSolution(fen, line, 0, "d2d4")).toEqual({
    correct: false,
    offset: 0,
    fen,
    complete: false,
  });
  const first = advanceSolution(fen, line, 0, "e2e4");
  expect(first.offset).toBe(2);
  expect(first.complete).toBe(false);
  expect(new Chess(first.fen).turn()).toBe("w");
  expect(advanceSolution(fen, line, 2, "g1f3").complete).toBe(true);
});
it("contains thousands of opening lines and marks priority as an editorial learning order", () => {
  expect(openings.length).toBeGreaterThan(3000);
  expect(new Set(openings.map((x) => x.id)).size).toBe(openings.length);
  expect(
    openingPriority(openings.find((x) => x.name === "Italian Game")!),
  ).toBe(1);
  expect(
    openingPriority(openings.find((x) => x.name.includes("Bongcloud"))!),
  ).toBe(3);
});
