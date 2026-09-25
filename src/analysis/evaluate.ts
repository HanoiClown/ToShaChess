import { Chess } from "chess.js";
import type {
  Analysis,
  Color,
  GameRecord,
  Locale,
  Quality,
  Score,
} from "../shared/contracts";
import { boardAt, playUci } from "../chess/game";
import { translate, choose } from "../i18n";
export function scoreText(s: Score) {
  return s.mate !== null
    ? `M${s.mate}`
    : `${s.cp > 0 ? "+" : ""}${(s.cp / 100).toFixed(2)}`;
}
export function expectation(s: Score, color: Color) {
  const v = s.cp * (color === "w" ? 1 : -1);
  return 1 / (1 + Math.exp(-Math.max(-3000, Math.min(3000, v)) / 250));
}
export function classify(
  before: Score,
  after: Score,
  color: Color,
  isBest: boolean,
  legalCount: number,
): Quality {
  if (legalCount === 1) return "good";
  if (isBest) return "best";
  const loss = Math.max(
    0,
    expectation(before, color) - expectation(after, color),
  );
  if (loss >= 0.3) return "blunder";
  if (loss >= 0.15) return "mistake";
  if (loss >= 0.07) return "inaccuracy";
  if (loss >= 0.02 || (before.cp - after.cp) * (color === "w" ? 1 : -1) >= 100)
    return "good";
  return "excellent";
}
export function pvSan(fen: string, pv: string[], max = 8) {
  const c = new Chess(fen);
  const result: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      const n = c.moveNumber(),
        side = c.turn();
      const m = playUci(c, u);
      result.push(`${n}${side === "w" ? "." : "…"}${m.san}`);
    } catch {
      break;
    }
  }
  return result.join(" ");
}
export function themeFor(game: GameRecord, a: Analysis): string {
  const c = boardAt(game, a.ply),
    before = boardAt(game, a.ply - 1),
    played = game.moves[a.ply - 1];
  if (c.isStalemate() || a.after.score.mate !== null) return "mate";
  if (a.after.pv[0]) {
    try {
      const next = playUci(new Chess(c.fen()), a.after.pv[0]);
      if (next.captured && next.to === played.slice(2, 4)) return "hanging";
      if (/[+#]/.test(next.san)) return "king";
    } catch {
      /* absent PV fact */
    }
  }
  if (
    c.isCheck() ||
    a.after.pv.slice(0, 2).some((u) => {
      try {
        return playUci(new Chess(c.fen()), u).san.includes("+");
      } catch {
        return false;
      }
    })
  )
    return "king";
  if (
    before
      .board()
      .flat()
      .filter((p) => p && p.type !== "p" && p.type !== "k").length <= 2
  )
    return "endgame";
  return "tactics";
}
export function localAdvice(
  game: GameRecord,
  a: Analysis,
  locale: Locale,
  question = "",
): string {
  const l = (ru: string, en: string) => choose(locale, ru, en),
    before = boardAt(game, a.ply - 1),
    after = boardAt(game, a.ply);
  const played = playUci(new Chess(before.fen()), game.moves[a.ply - 1]).san;
  let best = "";
  try {
    best = playUci(new Chess(before.fen()), a.best).san;
  } catch {
    best = "—";
  }
  const quality = translate(locale, a.quality),
    theme = themeFor(game, a),
    reply = pvSan(after.fen(), a.after.pv, 4);
  const reasons: Record<string, [string, string]> = {
    hanging: [
      "Проверь поле назначения: в лучшем ответе соперник забирает только что пошедшую фигуру.",
      "Check the destination square: the best reply captures the piece you just moved.",
    ],
    mate: [
      after.isStalemate()
        ? "Это пат: шаха нет, но у соперника нет легальных ходов. Партия заканчивается вничью."
        : "В этой позиции есть форсированный мат. Просмотри линию до конца.",
      "This position contains stalemate or a forced mating sequence. Follow the line all the way to its conclusion.",
    ],
    king: [
      "В варианте есть шах или непосредственная угроза королю. Сначала проверь вынуждающие ответы.",
      "The line includes a check or an immediate king threat. Examine forcing replies first.",
    ],
    endgame: [
      "В окончании проверь активность короля и результат размена перед тем, как упрощать позицию.",
      "In an endgame, check king activity and the result of a trade before simplifying.",
    ],
    tactics: [
      "Сравни свой ход с лучшим продолжением. Проверяй шахи, взятия и угрозы обеих сторон.",
      "Compare your move with the best continuation. Check forcing moves, captures and threats for both sides.",
    ],
  };
  const reason = reasons[theme] ?? reasons.tactics;
  const good = ["best", "excellent", "good", "book", "brilliant"].includes(
    a.quality,
  );
  return [
    `${played} — ${quality}.`,
    l(
      `Оценка за белых: ${scoreText(a.before.score)} → ${scoreText(a.after.score)}.`,
      `White's evaluation: ${scoreText(a.before.score)} → ${scoreText(a.after.score)}.`,
    ),
    good
      ? l(
          "Этот ход сохраняет качество позиции по текущему расчёту.",
          "This move preserves the quality of the position at this search depth.",
        )
      : l(...reason),
    l(`Лучший ход: ${best}.`, `Best move: ${best}.`),
    reply
      ? l(`Ответ соперника: ${reply}`, `Opponent's continuation: ${reply}`)
      : l("Позиция завершена.", "The position is terminal."),
    l(
      `Попробуй найти ${best} самостоятельно из позиции до хода.`,
      `Try to find ${best} on your own from the position before the move.`,
    ),
    question
      ? l(
          "Свободный ответ требует подключённого ИИ. Выше — проверенные факты локального анализа.",
          "Free-form answers need a connected AI. The facts above come from local analysis.",
        )
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export function material(c: Chess, color: Color) {
  return c
    .board()
    .flat()
    .reduce(
      (n, p) => n + (p ? value[p.type] * (p.color === color ? 1 : -1) : 0),
      0,
    );
}
export function brilliantCandidate(
  before: Chess,
  played: string,
  lines: import("../shared/contracts").EngineLine[],
  after: import("../shared/contracts").EngineLine,
) {
  if (
    lines.length < 2 ||
    lines[0].depth < 16 ||
    after.depth < 16 ||
    lines[0].pv[0] !== played ||
    before.moves().length < 2
  )
    return false;
  const color = before.turn(),
    sign = color === "w" ? 1 : -1;
  if (
    after.score.cp * sign < 0 ||
    (lines[0].score.cp - lines[1].score.cp) * sign < 100
  )
    return false;
  const c = new Chess(before.fen()),
    m = playUci(c, played);
  if (value[m.piece] < 3 || m.captured) return false;
  try {
    const response = playUci(c, after.pv[0]);
    return (
      response.captured !== undefined &&
      response.to === m.to &&
      material(c, color) <= material(before, color) - 3
    );
  } catch {
    return false;
  }
}
