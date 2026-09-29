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
import { usePlySequence } from "../ui/usePlySequence";
import { playSound } from "../audio/sounds";
import { engineRequest } from "../shared/engine-requests";
import { buildRefutation } from "../library/puzzle-feedback";
import { CoachCard } from "../ui/CoachCard";
import { scoreText } from "../analysis/evaluate";
import type { Score, EngineLine } from "../shared/contracts";
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
    [verifying, setVerifying] = useState(false),
    [solved, setSolved] = useState(false);
  const sequence = usePlySequence(puzzle.id);
  const [mistake, setMistake] = useState<{
      uci: string;
      fen: string;
      reply: string[];
      before: Score;
      after: Score;
      san: string;
    } | null>(null),
    [preview, setPreview] = useState(0);
  const request = useRef<ReturnType<typeof engineRequest> | null>(null);
  const started = useRef(Date.now()),
    alive = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.cancel();
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
    if (lock.current || solved || mistake) return;
    lock.current = true;
    setChecking(true);
    try {
      let path = line;
      const child = new Chess(board.fen());
      let moved;
      try {
        moved = playUci(child, uci);
      } catch {
        return;
      }
      let evaluated: { before: EngineLine; after: EngineLine } | null = null;
      let accepted = uci === line[offset];
      if (!accepted && child.isCheckmate()) {
        accepted = true;
        path = [...line.slice(0, offset), uci];
      }
      if (!accepted) {
        setVerifying(true);
        const r = engineRequest();
        request.current?.cancel();
        request.current = r;
        const [before] = await r.analyze({
          initialFen: board.fen(),
          moves: [],
        });
        if (!alive.current || !r.active) return;
        const [after] = await r.analyze({
          initialFen: board.fen(),
          moves: [uci],
        });
        if (!alive.current || !r.active) return;
        evaluated = { before, after };
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
      setVerifying(false);
      if (!accepted) {
        if (evaluated) {
          setMistake({
            uci,
            fen: child.fen(),
            reply: buildRefutation(child.fen(), evaluated.after),
            before: evaluated.before.score,
            after: evaluated.after.score,
            san: moved.san,
          });
          setPreview(0);
          setHint(false);
        }
        playSound("error");
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
      setHint(false);
      setFeedback("");
      if (!(await sequence.play(offset, result.offset, setOffset))) return;
      setSolved(result.complete);
      setFeedback(
        result.complete
          ? l("Задача решена целиком!", "Complete solution found!")
          : l(
              "Верно. Соперник ответил — найди следующий ход.",
              "Correct. Your opponent replied — find the next move.",
            ),
      );
      if (result.complete) {
        playSound("success");
        await record(true);
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      lock.current = false;
      if (alive.current) {
        setChecking(false);
        setVerifying(false);
      }
    }
  }
  const visible = new Chess(mistake?.fen ?? board.fen());
  if (mistake)
    for (const u of mistake.reply.slice(0, preview)) playUci(visible, u);
  async function showReply() {
    if (!mistake || sequence.playing) return;
    setChecking(true);
    try {
      await sequence.play(preview, mistake.reply.length, setPreview);
    } finally {
      if (alive.current) setChecking(false);
    }
  }
  function retry() {
    setMistake(null);
    setPreview(0);
    setFeedback("");
    setHint(false);
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
        <section className={`board-column ${mistake ? "puzzle-wrong" : ""}`}>
          {mistake && (
            <CoachCard
              locale={locale}
              san={mistake.san}
              quality="mistake"
              score={mistake.after}
              text={`${l("Оценка за белых", "White evaluation")}: ${scoreText(mistake.before, locale)} → ${scoreText(mistake.after, locale)}. ${l("Посмотри ответ соперника и попробуй другой ход.", "Watch the opponent’s reply and try a different move.")}`}
            />
          )}
          <Board
            fen={visible.fen()}
            locale={locale}
            orientation={new Chess(puzzle.fen).turn()}
            onMove={(u) => void answer(u)}
            disabled={solved || checking || !!mistake}
            lastMove={
              mistake
                ? preview
                  ? mistake.reply[preview - 1]
                  : mistake.uci
                : line[offset - 1]
            }
            moveQuality={mistake && preview === 0 ? "mistake" : undefined}
            hintSquare={hint && !solved ? line[offset]?.slice(0, 2) : undefined}
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
            {verifying
              ? l(
                  "Stockfish проверяет альтернативу…",
                  "Stockfish is checking the alternative…",
                )
              : sequence.playing
                ? l(
                    "Следи за ходами на доске…",
                    "Watch the moves on the board…",
                  )
                : feedback}
          </div>
          {mistake && (
            <div className="refutation-actions">
              <button
                className="secondary full"
                disabled={
                  checking ||
                  !mistake.reply.length ||
                  preview === mistake.reply.length
                }
                onClick={() => void showReply()}
              >
                {l("Посмотреть ответ", "Watch the reply")}
              </button>
              <button
                className="primary full"
                disabled={checking}
                onClick={retry}
              >
                {l("Попробовать снова", "Try again")}
              </button>
            </div>
          )}
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
              disabled={checking || !!mistake}
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
              setMistake(null);
              setPreview(0);
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
