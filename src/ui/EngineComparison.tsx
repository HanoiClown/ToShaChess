import { useEffect, useRef, useState } from "react";
import type { EngineLine, Locale, Position } from "../shared/contracts";
import type { HumanPrediction } from "../shared/engine-providers";
import { boardAt, playUci } from "../chess/game";
import { engineRequest } from "../shared/engine-requests";
import { scoreText, pvSan } from "../analysis/evaluate";
import { useEnginePacks } from "./EnginePacks";
import type { PackId } from "../shared/packs";
export function EngineComparison({
  position,
  locale,
}: {
  position: Position;
  locale: Locale;
}) {
  const ru = locale === "ru",
    { packs } = useEnginePacks(),
    [pack, setPack] = useState<PackId>("maia-cpu"),
    [elo, setElo] = useState(1100);
  const [human, setHuman] = useState<HumanPrediction | null>(null),
    [lines, setLines] = useState<EngineLine[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const requests = useRef<ReturnType<typeof engineRequest>[]>([]),
    generation = useRef(0),
    key = position.initialFen + "|" + position.moves.join(" ");
  useEffect(() => {
    generation.current++;
    setHuman(null);
    setLines([]);
    setError("");
    setBusy(false);
    return () => {
      generation.current++;
      requests.current.forEach((r) => r.cancel());
    };
  }, [key, pack, elo]);
  async function compare() {
    const own = ++generation.current;
    requests.current.forEach((r) => r.cancel());
    const sf = engineRequest(),
      maia = engineRequest();
    requests.current = [sf, maia];
    setBusy(true);
    setError("");
    const results = await Promise.allSettled([
      sf.analyze(position),
      window.chessApp.predictHuman({
        requestId: maia.requestId,
        position,
        pack,
        selfElo: elo,
        opponentElo: elo,
      }),
    ]);
    if (own !== generation.current) return;
    if (results[0].status === "fulfilled") setLines(results[0].value);
    else setError(String(results[0].reason.message));
    if (results[1].status === "fulfilled") setHuman(results[1].value);
    else setError(String(results[1].reason.message));
    setBusy(false);
  }
  const name = (uci: string) => {
    try {
      return playUci(boardAt(position), uci).san;
    } catch {
      return uci;
    }
  };
  return (
    <details className="settings-section comparison-panel">
      <summary>
        {ru
          ? "Человек и движок · сравнить ответы"
          : "Human and engine · compare replies"}
      </summary>
      <p>
        {ru
          ? "Maia оценивает вероятность человеческого хода. Stockfish ищет сильные продолжения. Вероятность и качество хода — разные величины."
          : "Maia estimates how likely a human move is. Stockfish searches for strong continuations. Move probability and move quality are different measures."}
      </p>
      <div className="pack-actions">
        <label>
          {ru ? "Модель" : "Model"}
          <select
            value={pack}
            onChange={(e) => setPack(e.target.value as PackId)}
          >
            {packs.map((p) => (
              <option value={p.id} key={p.id} disabled={p.status !== "ready"}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ru ? "Уровень Lichess обеих сторон" : "Lichess level for both sides"}
          <input
            type="number"
            min={600}
            max={2600}
            step={100}
            value={elo}
            onChange={(e) => setElo(Number(e.target.value))}
          />
        </label>
        <button
          className="secondary"
          disabled={
            busy ||
            packs.find((p) => p.id === pack)?.status !== "ready" ||
            !Number.isInteger(elo) ||
            elo < 600 ||
            elo > 2600 ||
            boardAt(position).isGameOver()
          }
          onClick={() => void compare()}
        >
          {busy
            ? ru
              ? "Считаем…"
              : "Calculating…"
            : ru
              ? "Сравнить"
              : "Compare"}
        </button>
      </div>
      {!packs.some((p) => p.status === "ready") && (
        <p className="field-help">
          {ru
            ? "Для вероятностей установи Maia в настройках. Обычный анализ Stockfish доступен отдельно."
            : "Install Maia in Settings for probabilities. Standard Stockfish analysis is available separately."}
        </p>
      )}
      {error && (
        <p role="alert" className="warning-text">
          {error}
        </p>
      )}
      {!!lines.length && (
        <table>
          <caption>
            {ru
              ? "Stockfish · лучшие найденные продолжения"
              : "Stockfish · best continuations found"}
          </caption>
          <thead>
            <tr>
              <th>{ru ? "Вариант" : "Line"}</th>
              <th>{ru ? "Оценка за белых" : "White evaluation"}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td>{pvSan(boardAt(position).fen(), line.pv.slice(0, 6))}</td>
                <td>
                  {scoreText(line.score)} · {ru ? "гл." : "depth"} {line.depth}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {human && (
        <table>
          <caption>
            {ru
              ? "Maia · вероятные человеческие ходы"
              : "Maia · likely human moves"}
          </caption>
          <thead>
            <tr>
              <th>{ru ? "Ход" : "Move"}</th>
              <th>{ru ? "Вероятность модели" : "Model probability"}</th>
            </tr>
          </thead>
          <tbody>
            {human.candidates.slice(0, 5).map((c) => (
              <tr key={c.uci}>
                <td>{name(c.uci)}</td>
                <td>{(c.probability * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
