import { Chess } from "chess.js";
import { playUci } from "../chess/game";
import type { Puzzle } from "../content/puzzles";
import type { Locale } from "../shared/contracts";
export const levels = {
  first: ["Первые шаги · до 1000", "First steps · under 1000"],
  beginner: ["Базовый · 1000–1499", "Basic · 1000–1499"],
  intermediate: ["Средний · 1500–1999", "Intermediate · 1500–1999"],
  advanced: ["Сложный · 2000+", "Advanced · 2000+"],
} as const;
export const themes: Record<string, [string, string]> = {
  mate: ["Все маты", "All mates"],
  mateIn1: ["Мат в 1", "Mate in 1"],
  mateIn2: ["Мат в 2", "Mate in 2"],
  mateIn3: ["Мат в 3", "Mate in 3"],
  mateIn4: ["Мат в 4", "Mate in 4"],
  mateIn5: ["Мат в 5+", "Mate in 5+"],
  fork: ["Вилка", "Fork"],
  pin: ["Связка", "Pin"],
  skewer: ["Сквозное нападение", "Skewer"],
  discoveredAttack: ["Вскрытое нападение", "Discovered attack"],
  discoveredCheck: ["Вскрытый шах", "Discovered check"],
  doubleCheck: ["Двойной шах", "Double check"],
  hangingPiece: ["Незащищённая фигура", "Hanging piece"],
  trappedPiece: ["Ловля фигуры", "Trapped piece"],
  defensiveMove: ["Защита", "Defence"],
  sacrifice: ["Жертва", "Sacrifice"],
  deflection: ["Отвлечение", "Deflection"],
  attraction: ["Завлечение", "Attraction"],
  intermezzo: ["Промежуточный ход", "Intermezzo"],
  quietMove: ["Тихий ход", "Quiet move"],
  clearance: ["Освобождение поля или линии", "Clearance"],
  collinearMove: ["Ход по линии атаки", "Collinear move"],
  interference: ["Перекрытие", "Interference"],
  capturingDefender: ["Устранение защитника", "Remove the defender"],
  xRayAttack: ["Рентген", "X-ray attack"],
  zugzwang: ["Цугцванг", "Zugzwang"],
  advancedPawn: ["Продвинутая пешка", "Advanced pawn"],
  promotion: ["Превращение пешки", "Promotion"],
  underPromotion: ["Слабое превращение", "Underpromotion"],
  enPassant: ["Взятие на проходе", "En passant"],
  castling: ["Рокировка", "Castling"],
  endgame: ["Все окончания", "All endgames"],
  pawnEndgame: ["Пешечные окончания", "Pawn endgames"],
  rookEndgame: ["Ладейные окончания", "Rook endgames"],
  bishopEndgame: ["Слоновые окончания", "Bishop endgames"],
  knightEndgame: ["Коневые окончания", "Knight endgames"],
  queenEndgame: ["Ферзевые окончания", "Queen endgames"],
  queenRookEndgame: ["Ферзь и ладья", "Queen and rook"],
  backRankMate: ["Мат по последней горизонтали", "Back-rank mate"],
  smotheredMate: ["Спёртый мат", "Smothered mate"],
  anastasiaMate: ["Мат Анастасии", "Anastasia’s mate"],
  arabianMate: ["Арабский мат", "Arabian mate"],
  balestraMate: ["Мат Балестра", "Balestra mate"],
  blindSwineMate: ["Мат ладьями на предпоследней", "Blind swine mate"],
  bodenMate: ["Мат Бодена", "Boden’s mate"],
  cornerMate: ["Угловой мат", "Corner mate"],
  doubleBishopMate: ["Мат двумя слонами", "Two-bishop mate"],
  dovetailMate: ["Мат ферзём в упор", "Dovetail mate"],
  epauletteMate: ["Эполетный мат", "Epaulette mate"],
  hookMate: ["Мат крюком", "Hook mate"],
  killBoxMate: ["Мат в квадрате 3×3", "Kill-box mate"],
  morphysMate: ["Мат Морфи", "Morphy’s mate"],
  operaMate: ["Оперный мат", "Opera mate"],
  pillsburysMate: ["Мат Пиллсбери", "Pillsbury’s mate"],
  swallowstailMate: ["Мат «ласточкин хвост»", "Swallow’s tail mate"],
  triangleMate: ["Мат треугольником", "Triangle mate"],
  vukovicMate: ["Мат Вуковича", "Vuković mate"],
  kingsideAttack: ["Атака на королевском фланге", "Kingside attack"],
  queensideAttack: ["Атака на ферзевом фланге", "Queenside attack"],
  exposedKing: ["Открытый король", "Exposed king"],
  attackingF2F7: ["Атака на f2/f7", "Attack f2/f7"],
  opening: ["Тактика в дебюте", "Opening tactics"],
  middlegame: ["Миттельшпиль", "Middlegame"],
  crushing: ["Решающий перевес", "Winning advantage"],
  advantage: ["Получение перевеса", "Gain an advantage"],
  equality: ["Уравнение", "Equalize"],
  oneMove: ["Задача на 1 ход", "1-move puzzle"],
  short: ["Задача на 2 хода", "2-move puzzle"],
  long: ["Задача на 3 хода", "3-move puzzle"],
  veryLong: ["Задача на 4+ хода", "4+ move puzzle"],
  master: ["Партии титулованных игроков", "Titled-player games"],
  masterVsMaster: ["Мастер против мастера", "Master versus master"],
  superGM: ["Партии супергроссмейстеров", "Elite grandmaster games"],
  tactics: ["Расчёт", "Calculation"],
  hanging: ["Защита фигур", "Piece safety"],
  king: ["Безопасность короля", "King safety"],
};
export function themeName(theme: string, locale: Locale) {
  return (
    themes[theme]?.[locale === "ru" ? 0 : 1] ?? theme.replace(/([A-Z])/g, " $1")
  );
}
export function levelOf(rating: number) {
  return rating < 1000
    ? "first"
    : rating < 1500
      ? "beginner"
      : rating < 2000
        ? "intermediate"
        : "advanced";
}
export type PuzzleFilter = {
  level?: string;
  theme?: string;
  phase?: string;
  solved?: string;
  sort?: string;
  search?: string;
};
export function filterPuzzles(
  pool: Puzzle[],
  f: PuzzleFilter,
  solved = new Set<string>(),
) {
  return pool
    .filter(
      (p) =>
        (!f.level ||
          f.level === "all" ||
          levelOf(p.rating ?? 600) === f.level) &&
        (!f.theme ||
          f.theme === "all" ||
          (p.themes ?? [p.theme]).includes(f.theme)) &&
        (!f.phase ||
          f.phase === "all" ||
          (p.themes ?? [p.theme]).includes(f.phase)) &&
        (!f.solved ||
          f.solved === "all" ||
          (f.solved === "done" ? solved.has(p.id) : !solved.has(p.id))) &&
        (!f.search || p.id.toLowerCase().includes(f.search.toLowerCase())),
    )
    .sort((a, b) =>
      f.sort === "hard"
        ? (b.rating ?? 600) - (a.rating ?? 600)
        : f.sort === "unseen"
          ? Number(solved.has(a.id)) - Number(solved.has(b.id)) ||
            (a.rating ?? 600) - (b.rating ?? 600)
          : (a.rating ?? 600) - (b.rating ?? 600),
    );
}
export function advanceSolution(
  fen: string,
  line: string[],
  offset: number,
  move: string,
) {
  const board = new Chess(fen);
  for (const u of line.slice(0, offset)) playUci(board, u);
  if (line[offset] !== move)
    return { correct: false, offset, fen: board.fen(), complete: false };
  playUci(board, move);
  let next = offset + 1;
  if (next < line.length) {
    playUci(board, line[next]);
    next++;
  }
  return {
    correct: true,
    offset: next,
    fen: board.fen(),
    complete: next >= line.length,
  };
}
