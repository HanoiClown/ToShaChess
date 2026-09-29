import readline from "node:readline";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";

const [kind, log, behavior = "normal", delayText = "0", marker] =
  process.argv.slice(2);
const delay = Number(delayText);
const record = (entry) => appendFileSync(log, JSON.stringify(entry) + "\n");
const emit = (value) =>
  process.stdout.write(
    typeof value === "string" ? value + "\n" : JSON.stringify(value) + "\n",
  );
record({ event: "spawn", args: process.argv.slice(2), cwd: process.cwd() });
let position = { initialFen: new Chess().fen(), moves: [] };
let goTimer;
let ownBook = true;
function boardAt(value) {
  const board = new Chess(value.initialFen);
  for (const u of value.moves)
    board.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  return board;
}
const startup = setTimeout(() => {
  if (kind === "maia")
    emit({ type: "ready", modelId: "maia3-5m", version: "fixture" });
}, delay);
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  record({ event: "input", line });
  if (kind === "uci") {
    if (line === "uci")
      setTimeout(() => {
        emit("id name Fixture");
        emit("option name MultiPV type spin default 1 min 1 max 8");
        emit("option name Label type string default fixture");
        if (behavior === "book")
          emit("option name OwnBook type check default true");
        emit("uciok");
      }, delay);
    if (line === "isready") emit("readyok");
    if (line === "setoption name OwnBook value false") ownBook = false;
    if (line.startsWith("position fen ")) {
      const [fen, moves] = line.slice(13).split(" moves ");
      position = { initialFen: fen, moves: moves ? moves.split(" ") : [] };
    }
    if (line.startsWith("go ")) {
      if (behavior === "crash-once" && !existsSync(marker)) {
        writeFileSync(marker, "crashed");
        process.exit(2);
      }
      if (behavior === "silent") return;
      goTimer = setTimeout(
        () => {
          const b = boardAt(position);
          const move = b.moves({ verbose: true })[0];
          const uci =
            behavior === "illegal"
              ? "a1h8"
              : move.from + move.to + (move.promotion ?? "");
          if (behavior !== "book" || !ownBook)
            emit(`info depth 8 score cp 24 pv ${uci}`);
          emit(`bestmove ${uci}`);
        },
        behavior === "slow" ? 500 : 10,
      );
    }
    if (line === "stop" && behavior !== "silent") {
      clearTimeout(goTimer);
      emit("bestmove (none)");
    }
    if (line === "quit") process.exit(0);
    return;
  }
  const request = JSON.parse(line);
  if (behavior === "crash-once" && !existsSync(marker)) {
    writeFileSync(marker, "crashed");
    process.exit(2);
  }
  if (behavior === "silent") return;
  setTimeout(
    () => {
      const moves = boardAt(request.position).moves({ verbose: true });
      const candidates = moves.map((m) => ({
        uci: m.from + m.to + (m.promotion ?? ""),
        probability: 1 / moves.length,
      }));
      if (behavior === "illegal") candidates[0].uci = "a1h8";
      if (behavior === "duplicate") candidates[1].uci = candidates[0].uci;
      if (behavior === "invalid-mass") candidates[0].probability = 0.8;
      if (behavior === "missing-move") candidates.pop();
      if (behavior === "stale")
        emit({
          id: request.id + "-old",
          type: "prediction",
          candidates: [{ uci: "a1h8", probability: 1 }],
        });
      emit({ id: request.id, type: "prediction", candidates });
    },
    behavior === "slow" ? 500 : 10,
  );
});
process.on("SIGTERM", () => {
  clearTimeout(startup);
  process.exit(0);
});
