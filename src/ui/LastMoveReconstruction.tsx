import { useEffect, useRef, useState } from "react";
import { Chess, type PieceSymbol } from "chess.js";
import { useApp } from "./context";
import { CoachCard } from "./CoachCard";
import { restoreBeforeMove } from "../editor/photo-position";
import type { PositionDraft } from "../editor/position-draft";
import { engineRequest } from "../shared/engine-requests";
import { classify, pvSan, scoreText } from "../analysis/evaluate";
import type { EngineLine, Position, Quality } from "../shared/contracts";
import { savePositionStudy } from "./study-actions";

type Comparison = {
  position: Position;
  san: string;
  before: EngineLine;
  after: EngineLine;
  quality: Quality;
  afterFen: string;
};
export function LastMoveReconstruction({
  draft,
  onExplore,
}: {
  draft: PositionDraft;
  onExplore: (position: Position) => void;
}) {
  const { l, locale, profile, nav, fail } = useApp();
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [capture, setCapture] = useState("");
  const [result, setResult] = useState<Comparison | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef<ReturnType<typeof engineRequest> | null>(null);
  useEffect(() => {
    request.current?.cancel();
    setResult(null);
    setBusy(false);
    setError("");
    return () => request.current?.cancel();
  }, [draft, from, to, capture]);
  async function compare() {
    request.current?.cancel();
    setResult(null);
    setError("");
    let fen: string;
    try {
      fen = restoreBeforeMove(
        draft,
        from,
        to,
        (capture || null) as Exclude<PieceSymbol, "k"> | null,
      );
    } catch {
      setError(
        l(
          "Этот ход не получается восстановить. На поле «куда» должна стоять ходившая фигура, «откуда» — пустовать. Проверь поля и взятую фигуру. Рокировку, превращение и взятие на проходе восстанови вручную.",
          "Cannot reconstruct this move. The moved piece must be on the destination and the source must be empty. Check the squares and captured piece. Rebuild castling, promotion and en passant manually.",
        ),
      );
      return;
    }
    const r = engineRequest();
    request.current = r;
    setBusy(true);
    const c = new Chess(fen),
      legalCount = c.moves().length,
      color = c.turn(),
      move = c.move({ from, to });
    const position = { initialFen: fen, moves: [from + to] };
    try {
      const before = await r.analyze({ initialFen: fen, moves: [] });
      if (!r.active) return;
      const after = await r.analyze(position);
      if (!r.active) return;
      if (!before[0] || !after[0]) throw Error("No engine result");
      setResult({
        position,
        san: move.san,
        before: before[0],
        after: after[0],
        afterFen: c.fen(),
        quality: classify(
          before[0].score,
          after[0].score,
          color,
          before[0].pv[0] === from + to,
          legalCount,
        ),
      });
    } catch (e) {
      if (r.active) {
        setError(
          l(
            "Stockfish не завершил расчёт. Проверь движок и повтори попытку.",
            "Stockfish could not finish. Check the engine and try again.",
          ),
        );
      }
    } finally {
      if (r.active) setBusy(false);
    }
  }
  return (
    <details className="editor-last-move">
      <summary>
        {l("Восстановить последний ход", "Reconstruct the last move")}
      </summary>
      <p className="muted">
        {l(
          "Если на фото позиция после хода, укажи его поля: например d4 → c6. Сам снимок не доказывает, был ли ход ошибкой.",
          "If the picture shows the position after a move, enter its squares, for example d4 → c6. The picture alone does not prove the move was a mistake.",
        )}
      </p>
      <div className="editor-actions">
        <label>
          {l("Откуда", "From square")}
          <input
            placeholder="d4"
            value={from}
            maxLength={2}
            onChange={(e) => setFrom(e.target.value.trim().toLowerCase())}
          />
        </label>
        <label>
          {l("Куда", "To square")}
          <input
            placeholder="c6"
            value={to}
            maxLength={2}
            onChange={(e) => setTo(e.target.value.trim().toLowerCase())}
          />
        </label>
      </div>
      <label>
        {l("Что было взято этим ходом", "Piece captured by this move")}
        <select value={capture} onChange={(e) => setCapture(e.target.value)}>
          <option value="">{l("Ничего", "Nothing")}</option>
          {["q", "r", "b", "n", "p"].map((t, i) => (
            <option value={t} key={t}>
              {
                [
                  l("Ферзь", "Queen"),
                  l("Ладья", "Rook"),
                  l("Слон", "Bishop"),
                  l("Конь", "Knight"),
                  l("Пешка", "Pawn"),
                ][i]
              }
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        {l(
          "Очередь хода определится по перемещённой фигуре. Неизвестные права рокировки и взятия на проходе сбрасываются; для особого хода задай исходную позицию вручную.",
          "The moved piece determines whose turn it was. Unknown castling and en passant rights are cleared; set up special moves manually.",
        )}
      </p>
      <button
        className="secondary full"
        disabled={busy || !from || !to}
        onClick={() => void compare()}
      >
        {busy
          ? l("Проверяю ход…", "Checking move…")
          : l("Сравнить до и после", "Compare before and after")}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <CoachCard
            locale={locale}
            san={result.san}
            quality={result.quality}
            score={result.after.score}
            text={l(
              `Оценка за белых: до ${scoreText(result.before.score, locale)}, после ${scoreText(result.after.score, locale)}. Ответ: ${pvSan(result.afterFen, result.after.pv, 6) || "конец партии"}.`,
              `White's evaluation: before ${scoreText(result.before.score, locale)}, after ${scoreText(result.after.score, locale)}. Reply: ${pvSan(result.afterFen, result.after.pv, 6) || "game over"}.`,
            )}
          />
          <p className="muted">
            {l(
              "Оценка Stockfish при текущей глубине расчёта.",
              "Stockfish evaluation at the current search depth.",
            )}
          </p>
          <div className="editor-actions">
            <button
              className="secondary"
              onClick={() => onExplore({ ...result.position, moves: [] })}
            >
              {l("До хода", "Before move")}
            </button>
            <button
              className="secondary"
              onClick={() => onExplore(result.position)}
            >
              {l("После хода", "After move")}
            </button>
            <button
              className="primary"
              onClick={() =>
                void savePositionStudy(
                  profile.id,
                  result.position,
                  l(`Разбор ${result.san}`, `${result.san} study`),
                )
                  .then((s) => nav("studies", s.id))
                  .catch(fail)
              }
            >
              {l("Разобрать варианты", "Explore alternatives")}
            </button>
          </div>
        </>
      )}
    </details>
  );
}
