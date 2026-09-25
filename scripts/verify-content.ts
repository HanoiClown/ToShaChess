import { Chess } from "chess.js";
import { lessons } from "../src/content/lessons";
import { puzzles } from "../src/content/puzzles";
import { playUci } from "../src/chess/game";
import { openings } from "../src/library/openings";
let chapters = 0;
for (const l of lessons) {
  for (const ch of l.chapters) {
    const c = new Chess(ch.fen);
    for (const san of ch.line) c.move(san);
    if (!ch.body.ru || !ch.body.en) throw Error(l.id);
    chapters++;
  }
}
if (
  puzzles.length < 40 ||
  new Set(puzzles.map((p) => p.fen)).size !== puzzles.length
)
  throw Error("Need 40 unique puzzles");
for (const p of puzzles) {
  const c = new Chess(p.fen);
  for (const u of p.line) playUci(c, u);
  if (p.source !== "Lichess" && p.depth < 10)
    throw Error("Insufficient puzzle verification");
  if (p.themes?.some((t) => /^mateIn\d+$/.test(t)) && !c.isCheckmate())
    throw Error("Expected checkmate " + p.id);
}
for (const o of openings) {
  const c = new Chess();
  for (const u of o.line) playUci(c, u);
}
console.log(
  `Verified ${lessons.length} bilingual lessons, ${chapters} legal chapters, ${puzzles.length} unique legal puzzles and ${openings.length} opening lines.`,
);
