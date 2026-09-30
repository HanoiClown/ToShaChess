import type { Chess, Square } from "chess.js";
import type { Color } from "../shared/contracts";
export type BoardMark = { from: Square; to: Square };
export function legalArrow(board: Chess, from: Square, to: Square): boolean {
  return board
    .moves({ square: from, verbose: true })
    .some((move) => move.to === to);
}
/** A plan follows the piece's shape, independent of the current position's legality. */
export function planningArrow(board: Chess, from: Square, to: Square): boolean {
  const piece = board.get(from);
  if (!piece || from === to) return false;
  const file = to.charCodeAt(0) - from.charCodeAt(0),
    rank = Number(to[1]) - Number(from[1]),
    dx = Math.abs(file),
    dy = Math.abs(rank);
  switch (piece.type) {
    case "r":
      return dx === 0 || dy === 0;
    case "b":
      return dx === dy;
    case "q":
      return dx === 0 || dy === 0 || dx === dy;
    case "n":
      return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
    case "k":
      return dx <= 1 && dy <= 1;
    case "p": {
      const forward = piece.color === "w" ? 1 : -1,
        startRank = piece.color === "w" ? "2" : "7";
      return (
        (rank === forward && dx <= 1) ||
        (dx === 0 && from[1] === startRank && rank === 2 * forward)
      );
    }
  }
}
export function arrowPoints(
  from: Square,
  to: Square,
  orientation: Color,
  knight: boolean,
): string {
  const point = (square: Square) => {
    const file = square.charCodeAt(0) - 97,
      rank = Number(square[1]) - 1;
    return {
      x: (orientation === "w" ? file : 7 - file) * 12.5 + 6.25,
      y: (orientation === "w" ? 7 - rank : rank) * 12.5 + 6.25,
    };
  };
  const a = point(from),
    b = point(to),
    points = [a];
  if (knight)
    points.push(
      Math.abs(b.x - a.x) > Math.abs(b.y - a.y)
        ? { x: b.x, y: a.y }
        : { x: a.x, y: b.y },
    );
  points.push(b);
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}
export function toggleMark(marks: BoardMark[], mark: BoardMark): BoardMark[] {
  const same = (m: BoardMark) => m.from === mark.from && m.to === mark.to;
  return marks.some(same) ? marks.filter((m) => !same(m)) : [...marks, mark];
}
export function squareAt(
  x: number,
  y: number,
  size: number,
  orientation: Color,
): Square | null {
  if (size <= 0 || x < 0 || y < 0 || x >= size || y >= size) return null;
  const files = orientation === "w" ? "abcdefgh" : "hgfedcba",
    ranks = orientation === "w" ? "87654321" : "12345678";
  return (files[Math.floor((x / size) * 8)] +
    ranks[Math.floor((y / size) * 8)]) as Square;
}
