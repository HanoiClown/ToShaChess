import { Chess, type Square, type PieceSymbol } from "chess.js";
import type { Color } from "../shared/contracts";
export type PositionDraft = {
  pieces: Partial<Record<Square, { type: PieceSymbol; color: Color }>>;
  turn: Color;
  castling: string;
  ep: string;
  halfmove: number;
  fullmove: number;
};
export const emptyDraft = (): PositionDraft => ({
  pieces: {},
  turn: "w",
  castling: "",
  ep: "-",
  halfmove: 0,
  fullmove: 1,
});
export function draftFromFen(fen: string): PositionDraft {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw Error("invalid_fen");
  const [board, turn, castling, ep, half, full] = fields;
  if (
    !/^[wb]$/.test(turn) ||
    !/^(-|K?Q?k?q?)$/.test(castling) ||
    !/^(-|[a-h][36])$/.test(ep) ||
    !/^\d+$/.test(half) ||
    !/^\d+$/.test(full)
  )
    throw Error("invalid_fen");
  const rows = board.split("/");
  if (rows.length !== 8) throw Error("invalid_fen");
  const d = emptyDraft();
  d.turn = turn as Color;
  d.castling = castling === "-" ? "" : castling;
  d.ep = ep;
  d.halfmove = Number(half);
  d.fullmove = Number(full);
  rows.forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) f += Number(ch);
      else if (/[prnbqk]/i.test(ch) && f < 8) {
        d.pieces[("abcdefgh"[f] + (8 - r)) as Square] = {
          type: ch.toLowerCase() as PieceSymbol,
          color: ch === ch.toUpperCase() ? "w" : "b",
        };
        f++;
      } else throw Error("invalid_fen");
    }
    if (f !== 8) throw Error("invalid_fen");
  });
  return d;
}
export function validateDraft(
  d: PositionDraft,
): { ok: true; fen: string } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const kings = (color: Color) =>
    Object.entries(d.pieces)
      .filter(([, p]) => p?.color === color && p.type === "k")
      .map(([s]) => s);
  const w = kings("w"),
    b = kings("b");
  if (w.length !== 1 || b.length !== 1) errors.push("kings");
  if (
    w.length === 1 &&
    b.length === 1 &&
    Math.abs(w[0].charCodeAt(0) - b[0].charCodeAt(0)) <= 1 &&
    Math.abs(+w[0][1] - +b[0][1]) <= 1
  )
    errors.push("adjacent");
  if (
    Object.entries(d.pieces).some(
      ([s, p]) => p?.type === "p" && /[18]/.test(s[1]),
    )
  )
    errors.push("pawns");
  const is = (s: Square, type: PieceSymbol, color: Color) =>
    d.pieces[s]?.type === type && d.pieces[s]?.color === color;
  for (const [right, king, rook, color] of [
    ["K", "e1", "h1", "w"],
    ["Q", "e1", "a1", "w"],
    ["k", "e8", "h8", "b"],
    ["q", "e8", "a8", "b"],
  ] as const)
    if (
      d.castling.includes(right) &&
      (!is(king, "k", color) || !is(rook, "r", color))
    )
      errors.push("castling");
  if (d.ep !== "-") {
    const file = d.ep[0],
      white = d.turn === "w",
      rank = white ? "6" : "3";
    if (
      !new RegExp(`^[a-h]${rank}$`).test(d.ep) ||
      d.pieces[d.ep as Square] ||
      !is((file + (white ? "5" : "4")) as Square, "p", white ? "b" : "w") ||
      d.pieces[(file + (white ? "7" : "2")) as Square] ||
      d.halfmove !== 0
    )
      errors.push("ep");
  }
  if (
    !Number.isSafeInteger(d.halfmove) ||
    d.halfmove < 0 ||
    d.halfmove > 10000 ||
    !Number.isSafeInteger(d.fullmove) ||
    d.fullmove < 1 ||
    d.fullmove > 100000
  )
    errors.push("counters");
  let board = "";
  for (let rank = 8; rank >= 1; rank--) {
    let empty = 0;
    for (const file of "abcdefgh") {
      const p = d.pieces[(file + rank) as Square];
      if (!p) empty++;
      else {
        if (empty) board += empty;
        empty = 0;
        board += p.color === "w" ? p.type.toUpperCase() : p.type;
      }
    }
    if (empty) board += empty;
    if (rank > 1) board += "/";
  }
  const fen = `${board} ${d.turn} ${d.castling || "-"} ${d.ep} ${d.halfmove} ${d.fullmove}`;
  if (!errors.length)
    try {
      const c = new Chess(fen),
        other = d.turn === "w" ? b[0] : w[0];
      if (c.isAttacked(other as Square, d.turn)) errors.push("previous_check");
    } catch {
      errors.push("invalid_fen");
    }
  return errors.length
    ? { ok: false, errors: [...new Set(errors)] }
    : { ok: true, fen };
}
