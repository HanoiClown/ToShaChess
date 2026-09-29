import { Chess, type PieceSymbol, type Square } from "chess.js";
import {
  draftFromFen,
  validateDraft,
  type PositionDraft,
} from "./position-draft";
import type { Color } from "../shared/contracts";

/** Pixels establish placement only. History must be supplied by the player. */
export function draftFromScan(
  placement: string,
  rotated: boolean,
  turn: Color,
): PositionDraft {
  const d = draftFromFen(`${placement} ${turn} - - 0 1`);
  if (!rotated) return d;
  return rotateDraft(d);
}
export function rotateSquare(square: string): Square {
  return ("hgfedcba"[square.charCodeAt(0) - 97] +
    (9 - Number(square[1]))) as Square;
}
export function rotateDraft(d: PositionDraft): PositionDraft {
  const pieces: PositionDraft["pieces"] = {};
  for (const [square, piece] of Object.entries(d.pieces)) {
    pieces[rotateSquare(square)] = piece;
  }
  return { ...d, pieces };
}

/** Reconstruct a normal move/capture, validating by playing it forward again.
 * Castling, promotion and en-passant require manual setup: pixels cannot
 * establish their missing pieces or prior rights. Never guess them. */
export function restoreBeforeMove(
  after: PositionDraft,
  from: string,
  to: string,
  captured: Exclude<PieceSymbol, "k"> | null,
): string {
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to) || from === to)
    throw Error("move_squares");
  const moved = after.pieces[to as Square];
  if (!moved || after.pieces[from as Square]) throw Error("move_placement");
  if (
    moved.type === "k" &&
    Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2
  )
    throw Error("move_special");
  if (moved.type === "p" && /[18]/.test(to[1])) throw Error("move_special");
  const pieces = { ...after.pieces, [from]: moved };
  delete pieces[to as Square];
  if (captured)
    pieces[to as Square] = {
      type: captured,
      color: moved.color === "w" ? "b" : "w",
    };
  const before = validateDraft({
    ...after,
    pieces,
    turn: moved.color,
    castling: "",
    ep: "-",
    halfmove: 0,
    fullmove: Math.max(1, after.fullmove - (moved.color === "b" ? 1 : 0)),
  });
  if (!before.ok) throw Error("move_illegal");
  try {
    const board = new Chess(before.fen);
    board.move({ from, to });
    const result = draftFromFen(board.fen());
    for (const sq of new Set([
      ...Object.keys(after.pieces),
      ...Object.keys(result.pieces),
    ])) {
      const a = after.pieces[sq as Square],
        b = result.pieces[sq as Square];
      if (a?.type !== b?.type || a?.color !== b?.color) throw Error("mismatch");
    }
    return before.fen;
  } catch {
    throw Error("move_illegal");
  }
}
