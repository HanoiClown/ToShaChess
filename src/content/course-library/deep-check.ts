// Offline editorial audit. Run explicitly with node --import tsx; never bundled.
import { courses } from "../courses";
import { UciEngine } from "../../../electron/engine/uci";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { Chess } from "chess.js";
const engine = new UciEngine(
  resolve("stockfish/stockfish-windows-x86-64-universal.exe"),
);
const result = [];
try {
  for (const c of courses)
    for (const e of c.episodes ?? []) {
      const sign = new Chess(e.initialFen).turn() === "w" ? 1 : -1;
      const before = (
        await engine.analyze({ initialFen: e.initialFen, moves: [] }, 1500, 1)
      )[0];
      const after = (
        await engine.analyze(
          { initialFen: e.initialFen, moves: e.line.slice(0, 1) },
          1500,
          1,
        )
      )[0];
      const defence = (
        await engine.analyze(
          { initialFen: e.initialFen, moves: e.defence.slice(0, 1) },
          1000,
          1,
        )
      )[0];
      const row = {
        id: e.id,
        before,
        after,
        defence,
        loss: (before.score.cp - after.score.cp) * sign,
        defenceLoss: (before.score.cp - defence.score.cp) * sign,
      };
      result.push(row);
      console.log(JSON.stringify(row));
    }
} finally {
  engine.dispose();
  writeFileSync(
    resolve("src/content/course-library/deep-audit.json"),
    JSON.stringify(result, null, 2),
  );
}
