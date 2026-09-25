import { Chess, type Square } from "chess.js";
import archive from "./puzzles.json";
import library from "./library-puzzles.json";
import type { Score } from "../shared/contracts";
export type Puzzle = {
  id: string;
  fen: string;
  best: string;
  score: Score;
  line: string[];
  theme: string;
  source: string;
  depth: number;
  difficulty: "starter" | "practice";
  rating?: number;
  themes?: string[];
  url?: string;
};
function rotate(square: string, times: number) {
  let x = square.charCodeAt(0) - 97,
    y = Number(square[1]) - 1;
  for (let i = 0; i < times; i++) [x, y] = [7 - y, x];
  return (String.fromCharCode(97 + x) + (y + 1)) as Square;
}
const basics: Puzzle[] = [];
for (const [index, seed] of [
  { fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1", best: "g6g7" },
  { fen: "4k3/8/4K3/8/8/8/R7/8 w - - 0 1", best: "a2a8" },
].entries()) {
  for (let n = 0; n < 4; n++) {
    const original = new Chess(seed.fen),
      c = new Chess();
    c.clear();
    for (const row of original.board())
      for (const p of row)
        if (p) c.put({ type: p.type, color: p.color }, rotate(p.square, n));
    const fen = c.fen(),
      best =
        rotate(seed.best.slice(0, 2), n) + rotate(seed.best.slice(2, 4), n);
    const checked = new Chess(fen);
    checked.move({ from: best.slice(0, 2), to: best.slice(2, 4) });
    if (!checked.isCheckmate()) throw Error("Invalid starter mate");
    basics.push({
      id: `starter-${index}-${n}`,
      fen,
      best,
      line: [best],
      theme: "mate",
      score: { cp: 99999, mate: 1 },
      source: "ToShaChess",
      depth: 99,
      difficulty: "starter",
    });
  }
}
export const puzzles: Puzzle[] = [
  ...basics,
  ...archive.map((p) => ({ ...p, difficulty: "practice" as const })),
  ...library.map((p) => ({
    id: p.id,
    fen: p.fen,
    best: p.line[0],
    line: p.line,
    rating: p.rating,
    themes: p.themes,
    url: p.url,
    theme:
      [
        "mateIn1",
        "mateIn2",
        "mateIn3",
        "mateIn4",
        "mateIn5",
        "fork",
        "pin",
        "skewer",
        "defensiveMove",
        "hangingPiece",
        "pawnEndgame",
        "rookEndgame",
        "promotion",
      ].find((t) => p.themes.includes(t)) ?? p.themes[0],
    score: { cp: 0, mate: null },
    source: "Lichess",
    depth: 0,
    difficulty: "practice" as const,
  })),
];
