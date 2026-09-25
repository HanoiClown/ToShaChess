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
import { Board, EvalBar } from "../ui/Board";
import { MoveList, qualitySymbol } from "../ui/MoveList";
import { boardAt, playUci, moveNames } from "../chess/game";
import { localAdvice, pvSan, scoreText, themeFor } from "../analysis/evaluate";
import type { CoachReply, GameRecord } from "../shared/contracts";
export function Review() {
  const { snapshot, profile, reviewId, nav, locale, l, t, fail } = useApp();
  const games = snapshot.database.games
    .filter((g) => g.profileId === profile.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const game = games.find((g) => g.id === reviewId) ?? games[0];
  const [ply, setPly] = useState(1),
    [variant, setVariant] = useState<number | null>(null),
    [flipped, setFlipped] = useState(false),
    [question, setQuestion] = useState(""),
    [reply, setReply] = useState<CoachReply | null>(null),
    [asking, setAsking] = useState(false);
  useEffect(() => {
    setPly(game?.moves.length ? 1 : 0);
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
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPly((x) => Math.max(0, x - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPly((x) => Math.min(game?.moves.length ?? 0, x + 1));
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game?.moves.length]);
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
  const a = game.analysis.find((a) => a.ply === ply),
    job = snapshot.analysisJobs.includes(game.id),
    locked = game.mode === "normal" && game.result === "*";
  const pre = boardAt(game, Math.max(0, ply - 1)),
    display =
      variant === null
        ? boardAt(game, ply)
        : boardAt(game, Math.max(0, ply - 1));
  if (variant !== null && a) {
    for (const u of a.before.pv.slice(0, variant)) {
      try {
        playUci(display, u);
      } catch {
        break;
      }
    }
  }
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
              : game.analysis.length === game.moves.length
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
            <div className="review-position-title">
              <span>
                {variant !== null
                  ? l("Лучшее продолжение", "Best continuation")
                  : ply
                    ? `${Math.ceil(ply / 2)}. ${moveNames(game)[ply - 1]}`
                    : l("Начальная позиция", "Starting position")}
              </span>
              <span className="muted">
                {a
                  ? `Stockfish · ${l("глубина", "depth")} ${a.after.depth}`
                  : "Stockfish 19"}
              </span>
            </div>
            <div className="board-with-eval">
              <EvalBar score={a?.after.score} orientation={orientation} />
              <Board
                fen={display.fen()}
                orientation={orientation}
                locale={locale}
                lastMove={
                  variant === null
                    ? game.moves[ply - 1]
                    : variant
                      ? a?.before.pv[variant - 1]
                      : undefined
                }
                arrow={variant === 0 ? a?.best : undefined}
              />
            </div>
            <div className="review-controls">
              {variant !== null ? (
                <>
                  <button
                    className="secondary"
                    onClick={() => setVariant(null)}
                  >
                    {l("Вернуться к партии", "Back to game")}
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => setVariant(Math.max(0, variant - 1))}
                  >
                    <ChevronLeft />
                  </button>
                  <span>
                    {variant} / {a?.before.pv.length}
                  </span>
                  <button
                    className="icon-button"
                    onClick={() =>
                      setVariant(
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
                    onClick={() => setPly(0)}
                  >
                    <ChevronsLeft />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={l("Назад", "Previous")}
                    onClick={() => setPly(Math.max(0, ply - 1))}
                  >
                    <ChevronLeft />
                  </button>
                  <span>
                    {ply} / {game.moves.length}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={l("Вперёд", "Next")}
                    onClick={() => setPly(Math.min(game.moves.length, ply + 1))}
                  >
                    <ChevronRight />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={l("В конец", "Last position")}
                    onClick={() => setPly(game.moves.length)}
                  >
                    <ChevronsRight />
                  </button>
                </>
              )}
            </div>
            <EvaluationChart game={game} ply={ply} select={setPly} />
            <div className="chart-caption">
              <span>
                {l(
                  "Оценка за белых · нажми на график для перехода",
                  "White’s evaluation · click the graph to navigate",
                )}
              </span>
              <strong>{a ? scoreText(a.after.score) : "—"}</strong>
            </div>
          </section>
          <section className="side-panel review-panel">
            <div className="panel-title">
              <h2>{l("Ходы и объяснения", "Moves and explanations")}</h2>
              <span>
                {game.analysis.length}/{game.moves.length}
              </span>
            </div>
            {job && (
              <div className="analysis-progress">
                <div className="progress-track">
                  <span
                    style={{
                      width: `${(game.analysis.length / Math.max(1, game.moves.length)) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {game.analysis.length === game.moves.length
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
              onSelect={setPly}
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
                      "Понимай идею каждого хода",
                      "Understand the idea behind each move",
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
                    onClick={() => setVariant(0)}
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
                  <button key={x.ply} onClick={() => setPly(x.ply)}>
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
