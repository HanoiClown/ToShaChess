import { Chess } from "chess.js";
import type { Color, GameRecord, Score } from "../shared/contracts";
import { playUci } from "../chess/game";
export type SideAccuracy = {
  value: number | null;
  analyzed: number;
  total: number;
};
function expectation(score: Score, color: Color) {
  const sign = color === "w" ? 1 : -1;
  if (score.mate !== null && score.mate !== 0)
    return score.mate * sign > 0 ? 1 : 0;
  return (
    1 / (1 + Math.exp(-Math.max(-3000, Math.min(3000, score.cp * sign)) / 250))
  );
}
export function moveAccuracy(
  before: Score,
  after: Score,
  color: Color,
): number {
  return (
    100 *
    (1 - Math.max(0, expectation(before, color) - expectation(after, color)))
  );
}
export function gameAccuracy(game: GameRecord): {
  w: SideAccuracy;
  b: SideAccuracy;
  complete: boolean;
} {
  const result = {
    w: { value: null, analyzed: 0, total: 0 } as SideAccuracy,
    b: { value: null, analyzed: 0, total: 0 } as SideAccuracy,
    complete: false,
  };
  const sum = { w: 0, b: 0 },
    rows = new Map(game.analysis.map((a) => [a.ply, a]));
  const c = new Chess(game.initialFen);
  let provisional = false;
  game.moves.forEach((u, i) => {
    const side = c.turn();
    playUci(c, u);
    if (i < (game.startPly ?? 0)) return;
    result[side].total++;
    const a = rows.get(i + 1);
    if (!a) return;
    provisional ||= a.provisional;
    let after = a.after.score;
    if (c.isCheckmate()) after = { cp: 0, mate: c.turn() === "w" ? -1 : 1 };
    else if (c.isDraw()) after = { cp: 0, mate: null };
    sum[side] += moveAccuracy(a.before.score, after, side);
    result[side].analyzed++;
  });
  for (const s of ["w", "b"] as const)
    if (result[s].analyzed)
      result[s].value = Math.round((sum[s] / result[s].analyzed) * 10) / 10;
  result.complete =
    game.result !== "*" &&
    game.moves.length > (game.startPly ?? 0) &&
    !provisional &&
    result.w.analyzed + result.b.analyzed === game.moves.length - (game.startPly ?? 0);
  return result;
}
