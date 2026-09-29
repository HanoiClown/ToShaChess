import { Chess } from "chess.js";
import { playUci } from "../chess/game";
import type { EngineLine } from "../shared/contracts";
export function buildRefutation(
  fenAfterMistake: string,
  line: EngineLine,
  maxPlies = 4,
): string[] {
  const c = new Chess(fenAfterMistake),
    result: string[] = [];
  for (const u of line.pv.slice(0, maxPlies)) {
    try {
      playUci(c, u);
      result.push(u);
    } catch {
      break;
    }
  }
  return result;
}
