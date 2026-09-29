import { it, expect } from "vitest";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Chess } from "chess.js";
import { START, playUci } from "../../src/chess/game";
const python = resolve("engine-packs/maia-cpu/python/python.exe");
it.skipIf(!existsSync(python))("runs portable Maia offline and returns a complete legal distribution for both colours", async () => {
  const child = spawn(python, [resolve("scripts/maia-bridge.py"), "--pack", resolve("engine-packs/maia-cpu")], { windowsHide: true, env: { ...process.env, HF_HUB_OFFLINE: "1" } });
  const replies: any[] = [];
  let text = "", errors = "";
  child.stderr.on("data", (s) => { errors += s; });
  child.stdout.on("data", (chunk) => {
    text += chunk;
    const lines = text.split(/\r?\n/); text = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) replies.push(JSON.parse(line));
  });
  const positions = [{ initialFen: START, moves: ["e2e4"] }, { initialFen: START, moves: ["e2e4", "e7e5"] }];
  child.stdin.end(positions.map((position, i) => JSON.stringify({ id: String(i), op: "predict", position, selfElo: 1000, opponentElo: 1000 })).join("\n") + "\n");
  const code = await new Promise((res, rej) => { child.on("exit", res); child.on("error", rej); });
  expect(code, errors).toBe(0);
  expect(replies[0]).toMatchObject({ type: "ready", modelId: "maia3-5m" });
  positions.forEach((p, i) => {
    const c = new Chess(p.initialFen); p.moves.forEach((m) => playUci(c, m));
    const reply = replies.find((r) => r.id === String(i));
    expect(reply.type).toBe("prediction");
    expect(reply.candidates).toHaveLength(c.moves().length);
    expect(reply.candidates.reduce((s: number, m: any) => s + m.probability, 0)).toBeCloseTo(1, 5);
    for (const m of reply.candidates) expect(() => playUci(new Chess(c.fen()), m.uci)).not.toThrow();
  });
}, 90000);
