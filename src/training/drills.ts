import type { PieceSymbol } from "chess.js";
import { boardAt, playUci } from "../chess/game";
import type { Position } from "../shared/contracts";
import type { HumanCandidate } from "../shared/engine-providers";
export function handBrainPiece(position: Position, uci: string): PieceSymbol {
  return playUci(boardAt(position), uci).piece;
}
export function allowedHandMove(
  position: Position,
  uci: string,
  piece: PieceSymbol,
): boolean {
  try {
    return handBrainPiece(position, uci) === piece;
  } catch {
    return false;
  }
}
export function sampleHumanMove(
  position: Position,
  candidates: HumanCandidate[],
  rng: () => number = Math.random,
): string {
  if (!candidates.length) throw Error("training_prediction_empty");
  let sum = 0;
  const seen = new Set<string>();
  for (const c of candidates) {
    if (!Number.isFinite(c.probability) || c.probability < 0 || seen.has(c.uci))
      throw Error("training_prediction_invalid");
    playUci(boardAt(position), c.uci);
    sum += c.probability;
    seen.add(c.uci);
  }
  if (sum <= 0) throw Error("training_prediction_invalid");
  let threshold = Math.max(0, Math.min(0.999999999, rng())) * sum;
  for (const c of candidates) {
    threshold -= c.probability;
    if (threshold < 0) return c.uci;
  }
  return candidates.at(-1)!.uci;
}
