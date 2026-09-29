import { addStudyMove, createStudy } from "../study/tree";
import { boardAt, newGame, terminalResult } from "../chess/game";
import type {
  Color,
  GameRecord,
  Locale,
  Position,
  Profile,
} from "../shared/contracts";
export async function savePositionStudy(
  profileId: string,
  position: Position,
  title: string,
  sourceKey?: string,
) {
  let study = createStudy({
    profileId,
    title,
    initialFen: position.initialFen,
    sourceKey,
  });
  for (const move of position.moves)
    study = addStudyMove(study, study.selectedNodeId, move);
  return window.chessApp.saveStudy(study);
}
export async function createPracticeGame(
  profile: Profile,
  position: Position,
  color: Color,
  locale: Locale,
  maia?: GameRecord["maia"],
  strong = false,
) {
  const game = newGame(profile.id, profile.name, color, "training", 0, 0, 1);
  game.initialFen = position.initialFen;
  game.moves = [...position.moves];
  game.startPly = position.moves.length;
  game.botId = "spark";
  game.botRating = 600;
  game.maia = maia;
  game.headers[color === "w" ? "Black" : "White"] = maia
    ? `Maia-3 · ${maia.selfElo} Lichess model`
    : locale === "ru"
      ? "Искра (≈600)"
      : "Spark (≈600)";
  game.headers.Event = "ToShaChess position practice";
  if (maia) game.botRating = undefined;
  if (strong && !maia) {
    game.strongStockfish = true;
    game.botRating = undefined;
    game.headers[color === "w" ? "Black" : "White"] = "Stockfish · 1500 ms";
  }
  game.result = terminalResult(boardAt(position));
  await window.chessApp.saveGame(game);
  return game;
}
