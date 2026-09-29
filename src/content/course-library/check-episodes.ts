// Authoring audit only; never imported by the application.
import { Chess } from "chess.js";
import { UciEngine } from "../../../electron/engine/uci";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const candidates: Record<string, [string, string, string][]> = {
  kings: [
    ["king-diagonal", "e4 e5 f4 exf4", "g4"],
    ["h4-queen", "e4 e5 f4 exf4 Nf3", "Qh4+"],
    ["ignore-g4", "e4 e5 f4 exf4 Nf3 g5 h4 g4", "Bc4"],
    ["declined-greed", "e4 e5 f4 Bc5", "fxe5"],
    ["ignore-c6", "e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bb5+ c6", "d3"],
    [
      "ignore-nc4",
      "e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6 d4 Nh5 Nc3",
      "Qxh4+",
    ],
  ],
  evans: [
    ["bishop-tempo", "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3", "Nf6"],
    ["queen-fork", "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4", "Nf6"],
    ["central-greed", "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4", "Qxd4"],
    [
      "lost-bishop",
      "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 h3 Na5",
      "e5",
    ],
    [
      "recapture-choice",
      "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 Nc3 Nf6 e5 dxe5",
      "dxe5",
    ],
    ["declined-trap", "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4", "d6"],
  ],
  scotch: [
    ["f7-sacrifice", "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6", "Bxf7+"],
    ["ignore-e5", "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 O-O Bc5 e5", "O-O"],
    ["ignore-d5", "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 O-O Bc5 e5 d5", "h3"],
    [
      "loose-queen",
      "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 O-O Bc5 e5 d5 exf6 dxc4 Re1+ Be6 Ng5 Qd5 Nc3",
      "O-O",
    ],
    ["pawn-overreach", "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3", "dxc3"],
    [
      "bishop-check",
      "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 Nf6 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5",
      "O-O",
    ],
  ],
  goring: [
    ["greedy-e4", "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Nf6 e5", "Nxe5"],
    ["pinned-knight", "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Bb4", "Qd4"],
    [
      "queen-tempo",
      "e4 e5 Nf3 Nc6 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Bg4 Be2 O-O-O Nc3",
      "Qxd4",
    ],
    [
      "bishop-left",
      "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Bb4 Bc4 d6 O-O Bxc3",
      "Re1",
    ],
    [
      "queen-vs-bishop",
      "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Bb4 Bc4 d6 O-O Bxc3 bxc3 Nf6 Re1 O-O Ba3",
      "a6",
    ],
    ["double-pawn-delay", "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2", "a6"],
  ],
  danish: [
    ["f7-queen", "e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2", "Bc5"],
    ["queen-grab", "e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5 Nf6", "Bxb7"],
    [
      "forget-check",
      "e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5 Nf6 Bxf7+ Kxf7 Qxd8",
      "Nc6",
    ],
    ["early-queen", "e4 e5 d4 exd4 c3", "Qh4"],
    ["undefended-rook", "e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5", "Qg5"],
    ["knight-grab", "e4 e5 d4 exd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 Nf6", "Bxf7+"],
  ],
  vienna: [
    ["knight-fork", "e4 e5 Nc3 Nf6 f4 exf4 e5", "Ne4"],
    ["queen-sacrifice", "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3", "Qh4+"],
    ["ignore-knight", "e4 e5 Nc3 Nf6 f4 d5 fxe5", "Bc5"],
    ["bishop-fork", "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3", "a6"],
    ["greed-f4", "e4 e5 Nc3 Bc5 f4", "Qh4+"],
    [
      "centre-overreach",
      "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 Nxc3 bxc3 c5",
      "dxc5",
    ],
  ],
  morra: [
    [
      "siberian",
      "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 Qc7 O-O Nf6 Qe2 Ng4",
      "h3",
    ],
    [
      "bishop-taken",
      "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1 O-O Bf4 e5",
      "h3",
    ],
    ["ignore-e5", "e4 c5 d4 cxd4 c3 Nf6 e5", "Nc6"],
    [
      "ignore-nb6",
      "e4 c5 d4 cxd4 c3 Nf6 e5 Nd5 Nf3 Nc6 cxd4 d6 Bc4 Nb6",
      "O-O",
    ],
    [
      "queen-pin",
      "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1",
      "d5",
    ],
    [
      "greedy-queen",
      "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2",
      "Nxe4",
    ],
  ],
  caro: [
    ["bishop-trap", "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3", "Bg4"],
    ["forgot-h7", "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4", "Nf6"],
    ["smothered", "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2", "Ngf6"],
    ["ignore-knight", "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5", "Nf3"],
    ["advance-chain", "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 Be3", "Bxc2"],
    [
      "panov-pin",
      "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3",
      "Qe2",
    ],
  ],
};
const engine = new UciEngine(
  resolve("stockfish/stockfish-windows-x86-64-universal.exe"),
);
const result: any[] = [];
try {
  for (const [course, items] of Object.entries(candidates)) {
    for (const [id, prefix, bad] of items) {
      const b = new Chess();
      try {
        for (const s of prefix.split(" ")) b.move(s);
        const fen = b.fen();
        const before = (
          await engine.analyze({ initialFen: fen, moves: [] }, 500, 1)
        )[0];
        const move = b.move(bad);
        const u = move.from + move.to + (move.promotion ?? "");
        const after = (
          await engine.analyze({ initialFen: fen, moves: [u] }, 500, 1)
        )[0];
        const c = new Chess(fen);
        const line = [u, ...after.pv.slice(0, 3)];
        const san = line.map(
          (x) =>
            c.move({ from: x.slice(0, 2), to: x.slice(2, 4), promotion: x[4] })
              .san,
        );
        const d = new Chess(fen);
        const defence = before.pv.slice(0, 3);
        const defenceSan = defence.map(
          (x) =>
            d.move({ from: x.slice(0, 2), to: x.slice(2, 4), promotion: x[4] })
              .san,
        );
        const delta =
          (before.score.cp - after.score.cp) * (b.turn() === "b" ? 1 : -1);
        const row = {
          course,
          id,
          prefix,
          bad,
          fen,
          line,
          san,
          defence,
          defenceSan,
          before: before.score,
          after: after.score,
          depth: after.depth,
          delta,
        };
        const old = result.findIndex((v) => v.course === course && v.id === id);
        if (old >= 0) result.splice(old, 1);
        result.push(row);
        console.log(JSON.stringify(row));
      } catch (e) {
        console.log(JSON.stringify({ course, id, error: String(e) }));
      }
    }
  }
} finally {
  engine.dispose();
  writeFileSync(
    resolve(
      ".superpowers/sdd/community-training/episode-candidate-recheck.json",
    ),
    JSON.stringify(result, null, 2),
  );
}
