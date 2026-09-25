import { it, expect } from "vitest";
import { Chess } from "chess.js";
import {
  parseGames,
  boardAt,
  exportGame,
  positionId,
} from "../../src/chess/game";
it("imports SAN, rejects illegal moves and preserves positions on export", () => {
  const [g] = parseGames("1. e4 e5 2. Nf3 Nc6 *", "hanoi");
  expect(g.moves).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
  expect(() => parseGames("1. e4 e5 2. Ke5", "hanoi")).toThrow();
  expect(boardAt(parseGames(exportGame(g), "sister")[0]).fen()).toBe(
    boardAt(g).fen(),
  );
  expect(g.profileId).toBe("hanoi");
});
it("separates identity by owner, ignores links, handles unknown dates", () => {
  const [a] = parseGames('[Date "1970.01.01"]\n\n1. e4 *', "hanoi");
  const [b] = parseGames("1. e4 *", "sister");
  expect(a.playedAt).toBe(null);
  expect(a.id).not.toBe(b.id);
  expect(positionId(a)).toBe(positionId(b));
});
it.each(["", '[Date "????.??.??"]\n', '[Date "2016.02.31"]\n'])(
  "imports a Lichess UTCDate when the standard Date is absent or invalid: %s",
  (dateHeader) => {
    const [game] = parseGames(
      `[Event "Rated Classical game"]\n${dateHeader}[UTCDate "2016.11.30"]\n[Result "0-1"]\n\n1. e4 e6 0-1`,
      "player",
    );
    expect(game.playedAt).toBe("2016-11-30");
    expect(parseGames(exportGame(game), "player")[0].playedAt).toBe(
      "2016-11-30",
    );
  },
);
it("prefers a valid standard Date over UTCDate and rejects invalid fallback dates", () => {
  expect(
    parseGames(
      '[Date "2016.12.01"]\n[UTCDate "2016.11.30"]\n\n1. e4 *',
      "player",
    )[0].playedAt,
  ).toBe("2016-12-01");
  expect(
    parseGames('[UTCDate "2016.02.31"]\n\n1. e4 *', "player")[0].playedAt,
  ).toBeNull();
});
it("imports multiple PGNs and FEN promotion", () => {
  expect(
    parseGames('[Event "A"]\n\n1. e4 *\n\n[Event "B"]\n\n1. d4 *', "hanoi"),
  ).toHaveLength(2);
  const [g] = parseGames(
    '[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+ *',
    "hanoi",
  );
  expect(boardAt(g).get("a8")?.type).toBe("q");
});
it("validates special rules through the rules library", () => {
  const c = new Chess();
  for (const m of ["e4", "a6", "e5", "d5", "exd6"]) c.move(m);
  expect(c.get("d5")).toBeUndefined();
  const mate = new Chess();
  for (const m of ["f3", "e5", "g4", "Qh4#"]) mate.move(m);
  expect(mate.isCheckmate()).toBe(true);
});
