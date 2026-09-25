import { Chess } from "chess.js";
import { playUci } from "../chess/game";
import type { EngineLine } from "../shared/contracts";
// Imported mates must actually reach mate within the remaining solver-move budget.
// Other alternatives need enough legal engine evidence for the full exercise.
export function alternativeLine(
  fen: string,
  move: string,
  before: EngineLine,
  after: EngineLine,
  remaining: number,
  requireMate: boolean,
): string[] | null {
  const board = new Chess(fen),
    color = board.turn(),
    sign = color === "w" ? 1 : -1;
  playUci(board, move);
  if (board.isCheckmate()) return [move];
  if (before.depth < 10 || after.depth < 10) return null;
  if (before.score.mate !== null) {
    if (after.score.mate === null || after.score.cp * sign <= 0) return null;
  } else if (after.score.cp * sign < before.score.cp * sign - 50) return null;
  const path = [move];
  let own = 1;
  for (const u of after.pv) {
    if (board.turn() === color) own++;
    try {
      playUci(board, u);
    } catch {
      return null;
    }
    path.push(u);
    if (requireMate && board.isCheckmate())
      return board.turn() !== color && own <= Math.ceil(remaining / 2)
        ? path
        : null;
    if (!requireMate && path.length >= remaining) return path;
    if (board.isGameOver()) return !requireMate ? path : null;
  }
  return null;
}
