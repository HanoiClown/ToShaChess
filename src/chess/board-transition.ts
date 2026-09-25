import { Chess, type Move, type Square } from "chess.js";
import type { Color } from "../shared/contracts";

export type BoardTransition = {
  direction: "forward" | "backward";
  pieces: { from: Square; to: Square }[];
  sound: "move" | "capture" | "check";
};

function movingPieces(move: Move): BoardTransition["pieces"] {
  const pieces = [{ from: move.from, to: move.to }];
  const rank = move.color === "w" ? "1" : "8";
  if (move.isKingsideCastle())
    pieces.push({ from: `h${rank}` as Square, to: `f${rank}` as Square });
  if (move.isQueensideCastle())
    pieces.push({ from: `a${rank}` as Square, to: `d${rank}` as Square });
  return pieces;
}

/** Only animate legal adjacent positions; unrelated puzzle/reset positions snap. */
export function boardTransition(
  beforeFen: string,
  afterFen: string,
): BoardTransition | null {
  if (beforeFen === afterFen) return null;
  try {
    const before = new Chess(beforeFen),
      after = new Chess(afterFen);
    const beforeKey = before.fen(),
      afterKey = after.fen();
    if (beforeKey === afterKey || before.turn() === after.turn()) return null;
    const beforePieces = before.board().flat(),
      afterPieces = after.board().flat();
    const changed = beforePieces
      .map((piece, index) => ({ piece, next: afterPieces[index] }))
      .filter(
        ({ piece, next }) =>
          piece?.type !== next?.type || piece?.color !== next?.color,
      );
    // A legal ply changes 2 squares, 3 for en passant, or 4 for castling.
    // Generate moves only from changed source squares to keep replay inexpensive.
    if (changed.length < 2 || changed.length > 4) return null;
    const findMove = (chess: Chess, target: string, reverse: boolean) => {
      for (const { piece, next } of changed) {
        const source = reverse ? next : piece;
        if (source?.color !== chess.turn()) continue;
        const move = chess
          .moves({ square: source.square, verbose: true })
          .find((candidate) => candidate.after === target);
        if (move) return move;
      }
    };
    const forward = findMove(before, afterKey, false);
    const move = forward ?? findMove(after, beforeKey, true);
    if (!move) return null;
    const pieces = movingPieces(move);
    return {
      direction: forward ? "forward" : "backward",
      pieces: forward
        ? pieces
        : pieces.map(({ from, to }) => ({ from: to, to: from })),
      sound: after.isCheck() ? "check" : move.captured ? "capture" : "move",
    };
  } catch {
    return null;
  }
}

/** Offset of the old square from the new one, in displayed square units. */
export function travelOffset(from: Square, to: Square, orientation: Color) {
  const sign = orientation === "w" ? 1 : -1;
  return {
    x: (from.charCodeAt(0) - to.charCodeAt(0)) * sign,
    y: (Number(to[1]) - Number(from[1])) * sign,
  };
}
