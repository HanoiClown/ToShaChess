import { Chess, DEFAULT_POSITION } from "chess.js";
import type { GameRecord, Color } from "../shared/contracts";
export const START = DEFAULT_POSITION;
export function playUci(chess: Chess, uci: string) {
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  });
}
export function boardAt(
  game: Pick<GameRecord, "initialFen" | "moves">,
  ply = game.moves.length,
) {
  const c = new Chess(game.initialFen);
  for (const m of game.moves.slice(0, ply)) playUci(c, m);
  return c;
}
export function hash(text: string) {
  let h = 14695981039346656037n;
  for (let i = 0; i < text.length; i++)
    h = BigInt.asUintN(64, (h ^ BigInt(text.charCodeAt(i))) * 1099511628211n);
  return h.toString(16);
}
export function positionId(game: Pick<GameRecord, "initialFen" | "moves">) {
  return hash(game.initialFen + "|" + game.moves.join(" "));
}
export function parseGames(
  text: string,
  profileId: string,
  playerName = "HanoiClown",
): GameRecord[] {
  if (text.length > 10_000_000) throw Error("PGN > 10 MB");
  const chunks = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\n\s*\n(?=\[Event\s)/)
    .filter(Boolean);
  if (!chunks.length || chunks.length > 10000)
    throw Error("Empty PGN / too many games");
  return chunks.map((chunk, index) => {
    const chess = new Chess();
    try {
      chess.loadPgn(chunk);
    } catch (e) {
      throw Error(`PGN ${index + 1}: ${String(e)}`);
    }
    const history = chess.history({ verbose: true });
    if (history.length > 4000) throw Error("Game too long");
    const headers = chess.getHeaders(),
      initialFen = history[0]?.before ?? headers.FEN ?? START;
    const date = headers.Date;
    let playedAt: string | null = null;
    if (date && /^\d{4}\.\d{2}\.\d{2}$/.test(date) && date > "1970.01.01") {
      const iso = date.replaceAll(".", "-");
      const d = new Date(iso + "T12:00:00Z");
      if (!Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === iso)
        playedAt = iso;
    }
    const moves = history.map((m) => m.from + m.to + (m.promotion ?? "")),
      result = headers.Result;
    const now = new Date().toISOString();
    const inferred = chess.isCheckmate()
      ? chess.turn() === "w"
        ? "0-1"
        : "1-0"
      : chess.isStalemate() || chess.isInsufficientMaterial()
        ? "1/2-1/2"
        : null;
    if (inferred && result && result !== "*" && result !== inferred)
      throw Error(`PGN ${index + 1}: result contradicts the position`);
    return {
      id: profileId + "_" + positionId({ initialFen, moves }),
      profileId,
      initialFen,
      moves,
      headers,
      playerColor:
        headers.Black?.toLowerCase() === playerName.toLowerCase() ? "b" : "w",
      mode: "import",
      bot:
        headers.Event === "Play vs Bot" ||
        /bot/i.test((headers.White ?? "") + (headers.Black ?? "")),
      playedAt,
      createdAt: now,
      updatedAt: now,
      result:
        inferred ??
        (["1-0", "0-1", "1/2-1/2"].includes(result)
          ? (result as GameRecord["result"])
          : "*"),
      analysis: [],
      explanations: {},
    };
  });
}
export function exportGame(game: GameRecord) {
  const c = boardAt(game);
  for (const [k, v] of Object.entries(game.headers)) c.setHeader(k, v);
  c.setHeader("Result", game.result);
  return c.pgn().replace(/(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, game.result);
}
export function newGame(
  profileId: string,
  name: string,
  color: Color,
  mode: "normal" | "training",
  minutes: number,
  increment: number,
  level: number,
): GameRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    profileId,
    initialFen: START,
    moves: [],
    headers: {
      White: color === "w" ? name : "Stockfish",
      Black: color === "b" ? name : "Stockfish",
      Event: "ToShaChess",
      Date: now.slice(0, 10).replaceAll("-", "."),
      TimeControl: minutes ? `${minutes * 60}+${increment}` : "-",
    },
    playerColor: color,
    mode,
    bot: true,
    playedAt: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    result: "*",
    analysis: [],
    explanations: {},
    level,
    ...(minutes
      ? {
          clock: {
            w: minutes * 60000,
            b: minutes * 60000,
            increment: increment * 1000,
          },
        }
      : {}),
  };
}
export function terminalResult(c: Chess): GameRecord["result"] {
  if (c.isCheckmate()) return c.turn() === "w" ? "0-1" : "1-0";
  if (c.isStalemate() || c.isInsufficientMaterial()) return "1/2-1/2";
  // Threefold / 50 move claims remain explicit UI actions.
  if (Number(c.fen().split(" ")[4]) >= 150) return "1/2-1/2";
  const key = (fen: string) => fen.split(" ").slice(0, 4).join(" "),
    target = key(c.fen()),
    history = c.history({ verbose: true });
  const appearances =
    1 + history.filter((m) => key(m.before) === target).length;
  if (appearances >= 5) return "1/2-1/2";
  return "*";
}
export function timeoutResult(c: Chess, flagged: Color): GameRecord["result"] {
  const winner = flagged === "w" ? "b" : "w";
  if (
    c.isInsufficientMaterial() ||
    !c
      .board()
      .flat()
      .some((p) => p && p.color === winner && p.type !== "k")
  )
    return "1/2-1/2";
  return winner === "w" ? "1-0" : "0-1";
}
export function moveNames(game: Pick<GameRecord, "initialFen" | "moves">) {
  const c = new Chess(game.initialFen);
  return game.moves.map((u) => playUci(c, u).san);
}
