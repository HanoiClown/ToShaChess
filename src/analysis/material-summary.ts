import { Chess, type PieceSymbol } from "chess.js";
import type { Color, Position } from "../shared/contracts";
import { playUci } from "../chess/game";
const values: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};
export function materialSummary(position: Position) {
  const remaining: Record<Color, Record<PieceSymbol, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  const captured: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  const c = new Chess(position.initialFen);
  for (const u of position.moves) {
    const m = playUci(c, u);
    if (m.captured) captured[m.color].push(m.captured);
  }
  let balance = 0;
  for (const p of c.board().flat())
    if (p) {
      remaining[p.color][p.type]++;
      balance += (p.color === "w" ? 1 : -1) * values[p.type];
    }
  return { remaining, captured, balance };
}
