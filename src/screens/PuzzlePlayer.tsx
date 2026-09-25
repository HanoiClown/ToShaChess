import { useState, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import { ArrowRight, ArrowLeft, Target, Lightbulb } from "lucide-react";
import { useApp } from "../ui/context";
import { Board } from "../ui/Board";
import type { Puzzle } from "../content/puzzles";
import { themeName, advanceSolution } from "../library/catalogue";
import { playUci } from "../chess/game";
import { pvSan } from "../analysis/evaluate";
import { alternativeLine } from "../library/alternatives";
export function PuzzlePlayer({
  puzzle,
  number,
  total,
  back,
  next,
}: {
  puzzle: Puzzle;
  number: number;
  total: number;
  back: () => void;
  next?: () => void;
}) {
  const { profile, locale, l, fail, refresh, snapshot } = useApp();
  const favorite = snapshot.database.progress[profile.id].favorites.includes(
    puzzle.id,
  );
  const [line, setLine] = useState(puzzle.line),
    [offset, setOffset] = useState(0),
    [feedback, setFeedback] = useState(""),
    [hint, setHint] = useState(false),
    [checking, setChecking] = useState(false),
    [solved, setSolved] = useState(false);
  const started = useRef(Date.now()),
    alive = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void window.chessApp.cancelEngine();
    };
  }, []);
  const board = new Chess(puzzle.fen);
  for (const u of line.slice(0, offset)) playUci(board, u);
  async function record(correct: boolean) {
    await window.chessApp.attempt({
      id: crypto.randomUUID(),
      profileId: profile.id,
      itemId: puzzle.id,
      theme: puzzle.theme,
      correct,
      at: new Date().toISOString(),
      seconds: Math.min(
        86400,
        Math.round((Date.now() - started.current) / 1000),
      ),
    });
    await refresh();
  }
  async function answer(uci: string) {
    if (lock.current || solved) return;
    lock.current = true;
    setChecking(true);
    try {
      let path = line;
      const child = new Chess(board.fen());
      playUci(child, uci);
      let accepted = uci === line[offset];
      if (!accepted && child.isCheckmate()) {
        accepted = true;
        path = [...line.slice(0, offset), uci];
      }
      if (!accepted) {
        const [before] = await window.chessApp.engine({
          initialFen: board.fen(),
          moves: [],
        });
        const [after] = await window.chessApp.engine({
          initialFen: board.fen(),
          moves: [uci],
        });
        if (!alive.current) return;
        const alternative = alternativeLine(
          board.fen(),
          uci,
          before,
          after,
          line.length - offset,
          puzzle.themes?.includes("mate") ?? puzzle.theme === "mate",
        );
        accepted = alternative !== null;
        if (alternative) path = [...line.slice(0, offset), ...alternative];
      }
      if (!alive.current) return;
      if (!accepted) {
        setFeedback(
          l(
            "Есть более сильное продолжение. Попробуй снова.",
            "There is a stronger continuation. Try again.",
          ),
        );
        await record(false);
        return;
      }
      const result = advanceSolution(puzzle.fen, path, offset, uci);
      setLine(path);
      setOffset(result.offset);
      setHint(false);
      setSolved(result.complete);
      setFeedback(
        result.complete
          ? l("Задача решена целиком!", "Complete solution found!")
          : l(
              "Верно. Соперник ответил — найди следующий ход.",
              "Correct. Your opponent replied — find the next move.",
            ),
      );
      if (result.complete) await record(true);
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      lock.current = false;
      if (alive.current) setChecking(false);
    }
  }
  return (
    <>
      <button className="back-button" disabled={checking} onClick={back}>
        <ArrowLeft size={18} />
        {l("К библиотеке", "Back to library")}
      </button>
      <div className="page-heading">
        <div>
          <h1>{themeName(puzzle.theme, locale)}</h1>
          <p>
            {number} / {total} ·{" "}
            {puzzle.rating
              ? `${l("Сложность", "Rating")} ${puzzle.rating} · `
              : ""}
            {puzzle.id.replace("lichess_", "")}
          </p>
        </div>
        <span className="quiet-badge">
          {l("Ходы", "Moves")}:{" "}
          {Math.min(Math.ceil(offset / 2), Math.ceil(line.length / 2))} /{" "}
          {Math.ceil(line.length / 2)}
        </span>
      </div>
      {puzzle.source !== "personal" && (
        <button
          className="secondary favorite-action"
          aria-pressed={favorite}
          onClick={() =>
            void window.chessApp
              .favorite(profile.id, puzzle.id, !favorite)
              .then(refresh)
              .catch(fail)
          }
        >
          {favorite
            ? l("Убрать из избранного", "Remove from favorites")
            : l("В избранное", "Add to favorites")}
        </button>
      )}
      <div className="game-layout">
        <section className="board-column">
          <Board
            fen={board.fen()}
            locale={locale}
            orientation={new Chess(puzzle.fen).turn()}
            onMove={(u) => void answer(u)}
            disabled={solved || checking}
            lastMove={line[offset - 1]}
            arrow={hint && !solved ? line[offset] : undefined}
          />
        </section>
        <section className="side-panel puzzle-panel">
          <div className="coach-icon">
            <Target size={28} />
          </div>
          <h2>
            {solved
              ? l("Идея найдена", "You found the idea")
              : board.turn() === "w"
                ? l("Ход белых", "White to move")
                : l("Ход чёрных", "Black to move")}
          </h2>
          <p>
            {l(
              "Проверь шахи, взятия и угрозы. Продолжай до конца варианта.",
              "Check forcing moves, captures and threats. Continue to the end of the line.",
            )}
          </p>
          <div
            className={`feedback ${solved ? "good-text" : ""}`}
            role="status"
          >
            {checking
              ? l(
                  "Stockfish проверяет альтернативу…",
                  "Stockfish is checking the alternative…",
                )
              : feedback}
          </div>
          {solved ? (
            <>
              <p className="variation-text">{pvSan(puzzle.fen, line, 30)}</p>
              <button
                className="primary full"
                disabled={checking}
                onClick={next ?? back}
              >
                {next
                  ? l("Следующая задача", "Next puzzle")
                  : l("Подборка пройдена", "Collection complete")}
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <button
              className="secondary full"
              disabled={checking}
              onClick={() => setHint(true)}
            >
              <Lightbulb size={18} />
              {l("Показать намёк", "Show a hint")}
            </button>
          )}
          <button
            className="text-button"
            disabled={checking}
            onClick={() => {
              setLine(puzzle.line);
              setOffset(0);
              setSolved(false);
              setHint(false);
              setFeedback("");
              started.current = Date.now();
            }}
          >
            {l("Повторить позицию", "Restart position")}
          </button>
          <small>
            {puzzle.source === "Lichess"
              ? "Lichess · CC0"
              : puzzle.source === "personal"
                ? l("Из твоей партии", "From your game")
                : l("Учебная позиция", "Practice position")}
          </small>
          <small>
            {l(
              "Правильные ответы и ошибки сохраняются только в твоём профиле.",
              "Correct solutions and mistakes are saved only to your profile.",
            )}
          </small>
        </section>
      </div>
    </>
  );
}
