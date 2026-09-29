import type { Chess, Square } from "chess.js";
import type { Color } from "../shared/contracts";
export type BoardMark = { from: Square; to: Square };
export function legalArrow(board: Chess, from: Square, to: Square): boolean {
  return board
    .moves({ square: from, verbose: true })
    .some((move) => move.to === to);
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
