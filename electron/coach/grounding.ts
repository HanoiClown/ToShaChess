import { Chess } from "chess.js";
import { boardAt, playUci, hash } from "../../src/chess/game";
import { localAdvice } from "../../src/analysis/evaluate";
import type { GameRecord, Analysis, Locale } from "../../src/shared/contracts";
export function coachContext(game: GameRecord, a: Analysis, locale: Locale) {
  const before = boardAt(game, a.ply - 1).fen(),
    after = boardAt(game, a.ply).fen();
  return {
    positionId: hash(
      JSON.stringify([
        game.initialFen,
        game.moves.slice(0, a.ply),
        a,
        "Stockfish19",
      ]),
    ),
    ply: a.ply,
    before,
    after,
    played: game.moves[a.ply - 1],
    lines: { before: a.before.pv, after: a.after.pv },
    facts: localAdvice(game, a, locale),
  };
}
type Context = ReturnType<typeof coachContext>;
export const responseContract =
  'Return only JSON {"moves":[{"positionId":"exact supplied ID","ply":number,"text":"2-4 sentences explaining only supplied facts","evidence":[{"anchor":"before or after","moves":["UCI moves copied from the start of that supplied line"]}]}]}. Include each supplied position exactly once and at least one nonempty evidence line per position. Do not write a move in text unless it occurs in the supplied legal lines or is the played move. Do not invent reasons not established by the facts. Answer the user question only within these facts.';
export function parseGrounded(
  raw: string,
  contexts: Context[],
): { ply: number; text: string }[] {
  const result = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  if (!Array.isArray(result.moves) || result.moves.length !== contexts.length)
    throw Error("cloud_invalid_response");
  const seen = new Set<number>();
  return result.moves.map((item: any) => {
    const c = contexts.find(
      (c) => c.ply === item.ply && c.positionId === item.positionId,
    );
    if (
      !c ||
      seen.has(item.ply) ||
      typeof item.text !== "string" ||
      !item.text.trim() ||
      item.text.length > 10000 ||
      !Array.isArray(item.evidence) ||
      !item.evidence.length
    )
      throw Error("cloud_invalid_response");
    seen.add(item.ply);
    const allowed = new Set<string>();
    const played = playUci(new Chess(c.before), c.played);
    allowed.add(played.san.replace(/[+#]/g, ""));
    allowed.add(c.played);
    for (const anchor of ["before", "after"] as const) {
      const board = new Chess(c[anchor]);
      for (const move of c.lines[anchor]) {
        allowed.add(move);
        allowed.add(playUci(board, move).san.replace(/[+#]/g, ""));
      }
    }
    for (const e of item.evidence) {
      if (
        !["before", "after"].includes(e.anchor) ||
        !Array.isArray(e.moves) ||
        !e.moves.length
      )
        throw Error("cloud_invalid_response");
      const anchor = e.anchor as "before" | "after",
        board = new Chess(c[anchor]);
      for (let i = 0; i < e.moves.length; i++) {
        if (e.moves[i] !== c.lines[anchor][i])
          throw Error("cloud_invalid_response");
        playUci(board, e.moves[i]);
      }
    }
    const notation =
      item.text.match(
        /\b(?:[a-h][1-8][a-h][1-8][qrbn]?|[KQRBN](?:[a-h]|[1-8])?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)\b/g,
      ) ?? [];
    if (notation.some((move: string) => !allowed.has(move)))
      throw Error("cloud_invalid_response");
    return { ply: item.ply, text: item.text };
  });
}
