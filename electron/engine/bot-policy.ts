import type { EngineLine, Position } from "../../src/shared/contracts";
import type { BotDefinition } from "../../src/bots/catalog";
import { boardAt, playUci } from "../../src/chess/game";
export function selectBotMove(
  position: Position,
  candidates: EngineLine[],
  bot: BotDefinition,
  random: () => number,
): EngineLine {
  const c = boardAt(position),
    sign = c.turn() === "w" ? 1 : -1;
  const legal = candidates.filter((line) => {
    try {
      playUci(boardAt(position), line.pv[0]);
      return true;
    } catch {
      return false;
    }
  });
  if (!legal.length) throw Error("no_legal_move");
  const score = (l: EngineLine) =>
    l.score.mate !== null
      ? l.score.cp * sign >= 0
        ? 100000
        : -100000
      : l.score.cp * sign;
  const best = Math.max(...legal.map(score));
  const mistake = random() < bot.mistakeRate;
  const allowance = mistake
    ? bot.rating <= 600
      ? 1800
      : bot.rating <= 900
        ? 700
        : 300
    : bot.rating >= 1500
      ? 25
      : 85;
  let pool = legal.filter((l) => best - score(l) <= allowance);
  if (mistake) {
    const weaker = pool.filter((l) => best - score(l) > 80);
    if (weaker.length) pool = weaker;
  }
  const styleScore = (line: EngineLine) => {
    const board = boardAt(position),
      m = playUci(board, line.pv[0]);
    const centre = 3.5 - Math.abs(m.to.charCodeAt(0) - 97 - 3.5),
      advance = m.color === "w" ? Number(m.to[1]) : 9 - Number(m.to[1]);
    switch (bot.style) {
      case "attack":
        return (
          advance * 3 +
          centre +
          (board.isCheck() ? 10 : 0) +
          (m.captured ? 4 : 0)
        );
      case "solid":
        return (
          (m.isKingsideCastle() || m.isQueensideCastle() ? 15 : 0) +
          (m.piece === "n" ? 8 : 0) +
          (m.captured ? 6 : 0) -
          advance
        );
      case "tricky":
      case "tactical":
        return (board.isCheck() ? 12 : 0) + (m.captured ? 9 : 0) + centre;
      case "development":
        return (m.piece === "n" || m.piece === "b" ? 12 : 0) + centre;
      case "positional":
        return centre * 3 + (m.piece === "n" ? 3 : 0);
      case "endgame":
        return (m.captured ? 15 : 0) + centre;
      default:
        return 0;
    }
  };
  // Evaluation bounds the pool; personality only chooses within that bound.
  return pool
    .map((line) => ({ line, rank: styleScore(line) + random() * 2 }))
    .sort((a, b) => b.rank - a.rank)[0].line;
}
