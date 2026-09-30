import { useEffect, useState, useRef } from "react";
import {
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Square,
  Lightbulb,
  Send,
  Target,
  RotateCw,
} from "lucide-react";
import { useApp } from "../ui/context";
import { savePositionStudy } from "../ui/study-actions";
import { PositionTools } from "../ui/PositionTools";
import { reviewPosition } from "../analysis/review-position";
import { useReviewExploration } from "../analysis/review-exploration";
import "../ui/review-exploration.css";
import { Board, EvalBar } from "../ui/Board";
import { MoveList, qualitySymbol } from "../ui/MoveList";
import { boardAt, playUci, moveNames } from "../chess/game";
import { localAdvice, pvSan, scoreText, themeFor } from "../analysis/evaluate";
import type { CoachReply, GameRecord } from "../shared/contracts";
import { CoachCard } from "../ui/CoachCard";
import { AccuracySummary } from "../ui/AccuracySummary";
import { MaterialPanel } from "../ui/MaterialPanel";
import { gameAccuracy } from "../analysis/accuracy";
import { materialSummary } from "../analysis/material-summary";
import { usePanelHeight } from "../study/usePanelHeight";
export function Review() {
  const { snapshot, profile, reviewId, nav, locale, l, t, fail } = useApp();
  const games = snapshot.database.games
    .filter((g) => g.profileId === profile.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const game = games.find((g) => g.id === reviewId) ?? games[0];
  const panelRef = usePanelHeight(`${game?.id}|${game?.result}`);
  const [ply, setPly] = useState(1),
    [variant, setVariant] = useState<number | null>(null),
    [flipped, setFlipped] = useState(false),
    [question, setQuestion] = useState(""),
    [reply, setReply] = useState<CoachReply | null>(null),
    [asking, setAsking] = useState(false);
  const a = game?.analysis.find((a) => a.ply === ply),
    locked = game?.mode === "normal" && game.result === "*";
  const sourcePosition = game ? reviewPosition(game, ply, variant) : undefined;
  const exploration = useReviewExploration(
    sourcePosition,
    `${game?.id}|${ply}|${variant}|${variant === null ? "" : a?.before.pv.join(" ")}|${sourcePosition?.initialFen}|${sourcePosition?.moves.join(" ")}`,
    !!game && !locked,
  );
  function selectPly(next: number) {
    exploration.close();
    setPly(next);
  }
  function selectVariant(next: number | null) {
    exploration.close();
    setVariant(next);
  }
  function tryMove(uci: string) {
    try {
      exploration.move(uci);
    } catch (error) {
      fail(error);
    }
  }
  useEffect(() => {
    const panel = panelRef.current;
    if (
      exploration.scratch &&
      panel &&
      getComputedStyle(panel).overflowY === "auto"
    )
      panel.scrollTo({ top: 0 });
  }, [exploration.scratch]);
  useEffect(() => {
    setPly(
      game?.moves.length
        ? Math.min(game.moves.length, (game.startPly ?? 0) + 1)
        : 0,
    );
    setVariant(null);
    setReply(null);
    setQuestion("");
  }, [game?.id]);
  const currentRequest = useRef("");
  currentRequest.current = `${game?.id}|${ply}|${locale}`;
  useEffect(() => {
    setVariant(null);
    setReply(null);
    setAsking(false);
  }, [ply, locale]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable ||
        target.closest("nav")
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (exploration.scratch)
          exploration.seek(exploration.scratch.cursor - 1);
        else if (variant !== null) selectVariant(Math.max(0, variant - 1));
        else selectPly(Math.max(0, ply - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (exploration.scratch)
          exploration.seek(exploration.scratch.cursor + 1);
        else if (variant !== null)
          selectVariant(Math.min(a?.before.pv.length ?? 0, variant + 1));
        else selectPly(Math.min(game?.moves.length ?? 0, ply + 1));
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    game?.moves.length,
    ply,
    variant,
    a?.before.pv.length,
    exploration.scratch,
  ]);
  if (!game)
    return (
      <div className="empty-state">
        <ChartNoAxesCombined size={56} />
        <h1>
          {l(
            "Каждая ошибка может стать уроком",
            "Every mistake can become a lesson",
          )}
        </h1>
        <p>
          {l(
            "Сыграй партию или добавь PGN. Здесь появятся оценки, варианты и объяснения каждого хода.",
            "Play a game or import a PGN. Evaluations, variations and explanations will appear here.",
          )}
        </p>
        <button className="primary" onClick={() => nav("history")}>
          {l("Добавить партию", "Import a game")}
        </button>
      </div>
    );
  const job = snapshot.analysisJobs.includes(game.id);
  const displayedPosition = exploration.position,
    totalToAnalyze = game.moves.length - (game.startPly ?? 0);
  const pre = boardAt(game, Math.max(0, ply - 1)),
    display = boardAt(displayedPosition);
  const scratch = exploration.scratch;
  const displayScore =
    exploration.lines[0]?.score ??
    (scratch
      ? undefined
      : variant === null
        ? a?.after.score
        : variant === 0
          ? a?.before.score
          : undefined);
  const orientation = flipped
    ? game.playerColor === "w"
      ? "b"
      : "w"
    : game.playerColor;
  const cloud = game.explanations[locale]?.[String(ply)],
    other = game.explanations[locale === "ru" ? "en" : "ru"]?.[String(ply)];
  const text = reply?.text ?? cloud ?? (a ? localAdvice(game, a, locale) : "");
  const ownMistakes = game.analysis.filter(
    (x) =>
      boardAt(game, x.ply - 1).turn() === game.playerColor &&
      ["mistake", "blunder", "inaccuracy"].includes(x.quality),
  );
  async function ask() {
    if (!game || !a) return;
    const id = game.id,
      p = ply,
      request = currentRequest.current;
    setAsking(true);
    try {
      const r = await window.chessApp.coach(id, p, question);
      if (request === currentRequest.current) {
        setReply(r);
        setQuestion("");
      }
    } catch (e) {
      if (request === currentRequest.current) fail(e);
    } finally {
      if (request === currentRequest.current) setAsking(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("Разбор партии", "Game review")}</h1>
          <p>
            {game.headers.White} <span className="muted">vs</span>{" "}
            {game.headers.Black} · {game.result}
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary"
            disabled={locked}
            onClick={() =>
              void savePositionStudy(
                profile.id,
                displayedPosition,
                l("Исследование партии", "Game study"),
                `game-${game.id}`,
              )
                .then((s) => nav("studies", s.id))
                .catch(fail)
            }
          >
            {l("Исследовать позицию", "Explore position")}
          </button>
          <button
            className="icon-button"
            onClick={() => setFlipped(!flipped)}
            title={l("Перевернуть доску", "Flip board")}
          >
            <RotateCw size={19} />
          </button>
          <button
            className={job ? "secondary" : "primary"}
            disabled={locked || !game.moves.length}
            onClick={() =>
              void (
                job
                  ? window.chessApp.cancelAnalysis(game.id)
                  : window.chessApp.analyze(game.id)
              ).catch(fail)
            }
          >
            {job ? <Square size={16} /> : <ChartNoAxesCombined size={18} />}{" "}
            {job
              ? l("Остановить", "Stop")
              : game.analysis.length ===
                  game.moves.length - (game.startPly ?? 0)
                ? l("Продолжить объяснения", "Continue explanations")
                : l("Анализировать", "Analyze")}
          </button>
        </div>
      </div>
      {locked ? (
        <div className="notice">
          {l(
            "В обычной партии подсказки доступны после завершения.",
            "Normal-game hints become available after the game ends.",
          )}
          <button className="text-button" onClick={() => nav("play")}>
            {l("Вернуться в игру", "Return to game")}
          </button>
        </div>
      ) : (
        <div className="game-layout review-layout">
          <section className="board-column">
            <CoachCard
              locale={locale}
              san={
                ply
                  ? moveNames(game)[ply - 1]
                  : l("Начальная позиция", "Starting position")
              }
              quality={!scratch && variant === null ? a?.quality : undefined}
              score={displayScore}
              variant={!!scratch || variant !== null}
              pending={!scratch && job && !a}
              text={
                scratch
                  ? l(
                      "Пробуй ответы за обе стороны и проверяй позицию Stockfish.",
                      "Try replies for either side and check the position with Stockfish.",
                    )
                  : variant !== null
                    ? l(
                        "Сравни это продолжение с ходом в партии.",
                        "Compare this continuation with the played move.",
                      )
                    : text.split("\n").filter(Boolean).slice(1, 2).join(" ") ||
                      l(
                        "Выбери ход для объяснения.",
                        "Select a move to see its explanation.",
                      )
              }
            />
            <div className="review-position-title">
              <span>
                {scratch
                  ? l("Твой вариант", "Your variation")
                  : variant !== null
                    ? l("Лучшее продолжение", "Best continuation")
                    : ply
                      ? `${Math.ceil(ply / 2)}. ${moveNames(game)[ply - 1]}`
                      : l("Начальная позиция", "Starting position")}
              </span>
              <span className="muted">
                {scratch
                  ? display.turn() === "w"
                    ? l("Ход белых", "White to move")
                    : l("Ход чёрных", "Black to move")
                  : a
                    ? `Stockfish · ${l("глубина", "depth")} ${variant === 0 ? a.before.depth : a.after.depth}`
                    : "Stockfish 19"}
              </span>
            </div>
            <div className="board-with-eval">
              <EvalBar
                locale={locale}
                score={displayScore}
                orientation={orientation}
              />
              <Board
                fen={display.fen()}
                orientation={orientation}
                locale={locale}
                onMove={tryMove}
                moveQuality={
                  !scratch && variant === null ? a?.quality : undefined
                }
                lastMove={
                  scratch
                    ? displayedPosition.moves.at(-1)
                    : variant === null
                      ? game.moves[ply - 1]
                      : variant
                        ? a?.before.pv[variant - 1]
                        : undefined
                }
                arrow={!scratch && variant === 0 ? a?.best : undefined}
              />
            </div>
            <div
              className={`review-controls${scratch ? " review-scratch-controls" : ""}`}
            >
              {scratch ? (
                <>
                  <button
                    className="secondary"
                    onClick={() => selectVariant(null)}
                  >
                    {l("Вернуться к партии", "Back to game")}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={l(
                      "Назад в варианте",
                      "Previous variation move",
                    )}
                    disabled={scratch.cursor === 0}
                    onClick={() => exploration.seek(scratch.cursor - 1)}
                  >
                    <ChevronLeft />
                  </button>
                  <span>
                    {scratch.cursor} / {scratch.moves.length}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={l("Вперёд в варианте", "Next variation move")}
                    disabled={scratch.cursor === scratch.moves.length}
                    onClick={() => exploration.seek(scratch.cursor + 1)}
                  >
                    <ChevronRight />
                  </button>
                  <button
                    className="text-button"
                    disabled={!scratch.moves.length}
                    onClick={exploration.reset}
                  >
                    {l("Сбросить вариант", "Reset variation")}
                  </button>
                </>
              ) : variant !== null ? (
                <>
                  <button
                    className="secondary"
                    onClick={() => selectVariant(null)}
                  >
                    {l("Вернуться к партии", "Back to game")}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={l(
                      "Назад в лучшем варианте",
                      "Previous best-line move",
                    )}
                    disabled={variant === 0}
                    onClick={() => selectVariant(Math.max(0, variant - 1))}
                  >
                    <ChevronLeft />
                  </button>
                  <span>
                    {variant} / {a?.before.pv.length}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={l(
                      "Вперёд в лучшем варианте",
                      "Next best-line move",
                    )}
                    disabled={variant >= (a?.before.pv.length ?? 0)}
                    onClick={() =>
                      selectVariant(
                        Math.min(a?.before.pv.length ?? 0, variant + 1),
                      )
                    }
                  >
                    <ChevronRight />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="icon-button"
                    aria-label={l("В начало", "First position")}
                    onClick={() => selectPly(0)}
                  >
                    <ChevronsLeft />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={l("Назад", "Previous")}
                    onClick={() => selectPly(Math.max(0, ply - 1))}
                  >
                    <ChevronLeft />
                  </button>
                  <span>
                    {ply} / {game.moves.length}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={l("Вперёд", "Next")}
                    onClick={() =>
                      selectPly(Math.min(game.moves.length, ply + 1))
                    }
                  >
                    <ChevronRight />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={l("В конец", "Last position")}
                    onClick={() => selectPly(game.moves.length)}
                  >
                    <ChevronsRight />
                  </button>
                </>
              )}
            </div>
            <p className="review-try-note">
              {l(
                "Перетащи фигуру или нажми на неё и на поле назначения. Можно ходить за обе стороны; партия не изменится.",
                "Drag a piece, or select it and its destination. Play either side; the saved game stays unchanged.",
              )}
            </p>
            <EvaluationChart game={game} ply={ply} select={selectPly} />
            <MaterialPanel
              locale={locale}
              orientation={orientation}
              summary={materialSummary(displayedPosition)}
            />
            <div className="chart-caption">
              <span>
                {l(
                  "Оценка за белых · нажми на график для перехода",
                  "White’s evaluation · click the graph to navigate",
                )}
              </span>
              <strong>{a ? scoreText(a.after.score, locale) : "—"}</strong>
            </div>
          </section>
          <section
            className="side-panel review-panel scroll-panel"
            ref={panelRef}
            tabIndex={0}
            aria-label={l("Разбор и объяснения", "Analysis and explanations")}
          >
            <section
              className="review-exploration"
              aria-label={l("Позиция на доске", "Position on the board")}
            >
              <div className="review-exploration-heading">
                <h2>{l("Позиция на доске", "Position on the board")}</h2>
                <button
                  className="secondary"
                  disabled={!exploration.busy && display.isGameOver()}
                  onClick={() =>
                    exploration.busy
                      ? exploration.cancel()
                      : void exploration.analyze()
                  }
                >
                  {exploration.busy ? (
                    <Square size={16} />
                  ) : (
                    <ChartNoAxesCombined size={17} />
                  )}
                  {exploration.busy
                    ? l("Остановить проверку", "Stop checking")
                    : l("Проверить позицию", "Check position")}
                </button>
              </div>
              <p className="muted" role="status">
                {exploration.busy
                  ? l(
                      "Stockfish проверяет позицию на доске…",
                      "Stockfish is checking the position on the board…",
                    )
                  : exploration.failed
                    ? l(
                        "Не удалось проверить позицию. Попробуй ещё раз — вариант остался на доске.",
                        "Could not check this position. Try again; your variation is still on the board.",
                      )
                    : display.isCheckmate()
                      ? l(
                          "Мат. Вернись на ход назад, чтобы попробовать другой ответ.",
                          "Checkmate. Go back a move to try another reply.",
                        )
                      : display.isGameOver()
                        ? l(
                            "Ничья в этой позиции. Вернись на ход назад, чтобы продолжить разбор.",
                            "This position is drawn. Go back a move to continue exploring.",
                          )
                        : l(
                            "Stockfish · оценка за белых. Нажми на ход продолжения, чтобы открыть его на доске.",
                            "Stockfish · White’s evaluation. Select a continuation move to play it on the board.",
                          )}
              </p>
              {!!exploration.lines.length && (
                <div className="review-exploration-lines">
                  {exploration.lines.map((line, lineIndex) => {
                    const board = boardAt(displayedPosition);
                    const moves: { uci: string; san: string }[] = [];
                    for (const uci of line.pv.slice(0, 20)) {
                      try {
                        moves.push({ uci, san: playUci(board, uci).san });
                      } catch {
                        break;
                      }
                    }
                    return (
                      <div className="review-engine-line" key={lineIndex}>
                        <div className="review-engine-line-meta">
                          <strong className="review-engine-score">
                            {scoreText(line.score, locale)}
                          </strong>
                          <small>
                            {l("Глубина", "Depth")} {line.depth}
                          </small>
                        </div>
                        <div className="review-engine-moves">
                          {moves.map((move, index) => (
                            <button
                              className="text-button"
                              key={`${index}-${move.uci}`}
                              aria-label={`${l("Продолжение", "Continuation")} ${lineIndex + 1}, ${l("ход", "move")} ${index + 1}: ${move.san}`}
                              onClick={() => {
                                try {
                                  exploration.follow(
                                    moves.map((m) => m.uci),
                                    index + 1,
                                  );
                                } catch (error) {
                                  fail(error);
                                }
                              }}
                            >
                              {move.san}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            <AccuracySummary locale={locale} accuracy={gameAccuracy(game)} />
            <div className="panel-title">
              <h2>{l("Ходы и объяснения", "Moves and explanations")}</h2>
              <span>
                {game.analysis.length}/{totalToAnalyze}
              </span>
            </div>
            {job && (
              <div className="analysis-progress">
                <div className="progress-track">
                  <span
                    style={{
                      width: `${(game.analysis.length / Math.max(1, totalToAnalyze)) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {game.analysis.length === totalToAnalyze
                    ? l("Готовим объяснения…", "Preparing explanations…")
                    : l(
                        "Stockfish проверяет позиции…",
                        "Stockfish is checking positions…",
                      )}
                </small>
              </div>
            )}
            <MoveList
              game={game}
              selected={ply}
              onSelect={selectPly}
              locale={locale}
            />
            <div className="coach-area">
              <div className="coach-heading">
                <div className="coach-icon">
                  <Lightbulb size={23} />
                </div>
                <div>
                  <strong>
                    {reply?.source === "openai" || cloud
                      ? t("cloud")
                      : t("local")}
                  </strong>
                  <small>
                    {l(
                      scratch
                        ? "Объяснение выбранного хода в партии"
                        : "Понимай идею каждого хода",
                      scratch
                        ? "Explanation of the selected game move"
                        : "Understand the idea behind each move",
                    )}
                  </small>
                </div>
                {a && (
                  <span className={`quality-badge ${a.quality}`}>
                    {qualitySymbol[a.quality]} {t(a.quality)}
                  </span>
                )}
              </div>
              {a ? (
                <>
                  <div className="coach-text">{text}</div>
                  {!cloud && other && (
                    <details>
                      <summary>
                        {l(
                          "Есть сохранённое объяснение на английском",
                          "A saved Russian explanation is available",
                        )}
                      </summary>
                      <p className="coach-text">{other}</p>
                    </details>
                  )}
                  <button
                    className="secondary full"
                    onClick={() => selectVariant(0)}
                  >
                    <Play size={16} />
                    {l("Показать лучший вариант", "Show the best line")}
                  </button>
                </>
              ) : (
                <p className="empty-inline">
                  {job
                    ? l(
                        "Этот ход ещё анализируется. Можно выбрать уже готовый.",
                        "This move is still being analyzed. Select an available move.",
                      )
                    : l(
                        "Запусти анализ, чтобы увидеть оценку и советы.",
                        "Start analysis to see evaluations and advice.",
                      )}
                </p>
              )}
              <form
                className="coach-question"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask();
                }}
              >
                <input
                  value={question}
                  maxLength={2000}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={l(
                    "Почему этот ход лучше?",
                    "Why is this move better?",
                  )}
                  aria-label={l("Вопрос тренеру", "Ask your coach")}
                />
                <button
                  disabled={!a || asking}
                  aria-label={l("Отправить вопрос", "Send question")}
                >
                  <Send size={18} />
                </button>
              </form>
              <small className="muted">
                {asking
                  ? l(
                      "Тренер готовит ответ…",
                      "Your coach is preparing an answer…",
                    )
                  : snapshot.hasKey
                    ? l(
                        "Новый ответ учитывается в общем лимите $5/месяц.",
                        "New responses count toward the shared $5/month budget.",
                      )
                    : l(
                        "Без API доступны локальные объяснения и варианты.",
                        "Local explanations and variations work without an API key.",
                      )}
              </small>
            </div>
            <div className="position-tools">
              <PositionTools
                position={displayedPosition}
                locale={locale}
                onPlayMove={tryMove}
                onOpenSettings={() => nav("settings")}
              />
            </div>
          </section>
        </div>
      )}
      {!locked && game.analysis.length > 0 && (
        <section className="review-summary">
          <div className="section-heading">
            <h2>
              {l(
                "Что взять в следующую партию",
                "Take this into your next game",
              )}
            </h2>
            <button className="secondary" onClick={() => nav("puzzles")}>
              <Target size={18} />
              {l("Потренировать ошибки", "Practise mistakes")}
            </button>
          </div>
          {ownMistakes.length ? (
            <div className="key-moves">
              {ownMistakes
                .sort((a, b) => b.loss - a.loss)
                .slice(0, 3)
                .map((x) => (
                  <button key={x.ply} onClick={() => selectPly(x.ply)}>
                    <span className={`quality-dot ${x.quality}`}>
                      {qualitySymbol[x.quality]}
                    </span>
                    <div>
                      <strong>
                        {Math.ceil(x.ply / 2)}. {moveNames(game)[x.ply - 1]} ·{" "}
                        {t(x.quality)}
                      </strong>
                      <p>{t(themeFor(game, x) as "tactics")}</p>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                ))}
            </div>
          ) : (
            <p className="muted">
              {l(
                "В рассчитанной части нет крупных ошибок твоей стороны. Продолжай проверять ответы соперника.",
                "No major mistakes from your side in the analyzed portion. Keep checking your opponent’s replies.",
              )}
            </p>
          )}
          <details className="grading-help">
            <summary>
              {l("Как определяются метки ходов?", "How are moves classified?")}
            </summary>
            <p>
              {l(
                "Метки — собственная оценка приложения, а не формула Chess.com. Используется изменение нормализованной оценки: 0,30 — зевок, 0,15 — ошибка, 0,07 — неточность. «Блестящий» требует проверенной жертвы и единственного сильного продолжения. Результат зависит от глубины поиска.",
                "These are the app’s own labels, not Chess.com’s formula. Normalized evaluation loss: 0.30 for blunders, 0.15 for mistakes, 0.07 for inaccuracies. Brilliant requires a verified sacrifice and a uniquely strong continuation. Results depend on search depth.",
              )}
            </p>
          </details>
        </section>
      )}
    </>
  );
}
function EvaluationChart({
  game,
  ply,
  select,
}: {
  game: GameRecord;
  ply: number;
  select: (n: number) => void;
}) {
  const points = game.analysis.map((a) => ({
    x: (a.ply / Math.max(1, game.moves.length)) * 600,
    y: 50 - (Math.max(-800, Math.min(800, a.after.score.cp)) / 800) * 45,
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg
      className="eval-chart"
      viewBox="0 0 600 100"
      role="img"
      aria-label="Evaluation graph"
      onClick={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        select(
          Math.min(
            game.moves.length,
            Math.max(
              1,
              Math.round(((e.clientX - b.left) / b.width) * game.moves.length),
            ),
          ),
        );
      }}
    >
      <rect width="600" height="100" fill="#262522" />
      <line
        x1="0"
        x2="600"
        y1="50"
        y2="50"
        stroke="#57544f"
        strokeDasharray="4 4"
      />
      {points.length > 0 && (
        <>
          <polygon
            points={`0,100 0,${points[0].y} ${line} ${points.at(-1)!.x},100`}
            fill="#b4b0a3"
            fillOpacity=".35"
          />
          <polyline
            points={line}
            fill="none"
            stroke="#e7e5dd"
            strokeWidth="1.8"
          />
        </>
      )}
      <line
        x1={(ply / Math.max(1, game.moves.length)) * 600}
        x2={(ply / Math.max(1, game.moves.length)) * 600}
        y1="0"
        y2="100"
        stroke="#81b64c"
        strokeWidth="2"
      />
    </svg>
  );
}
