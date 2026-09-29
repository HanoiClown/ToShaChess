import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type PieceSymbol } from "chess.js";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type {
  EngineLine,
  GameRecord,
  Locale,
  Position,
} from "../shared/contracts";
import type { HumanPrediction } from "../shared/engine-providers";
import type { StudyDocument } from "../study/tree";
import type {
  TrainingCard,
  TrainingMode,
  TrainingReviewInput,
} from "../training/types";
import {
  cardsFromMistakes,
  cardFromStudy,
  dueTrainingCards,
} from "../training/cards";
import {
  allowedHandMove,
  handBrainPiece,
  sampleHumanMove,
} from "../training/drills";
import { boardAt, playUci } from "../chess/game";
import { Board } from "../ui/Board";
import { ExplanationPanel } from "../ui/ExplanationPanel";
import { scoreText } from "../analysis/evaluate";
import { usePanelHeight } from "../study/usePanelHeight";
import "../training/training.css";
export type TrainingHubApi = {
  list: () => Promise<TrainingCard[]>;
  save: (card: TrainingCard) => Promise<TrainingCard>;
  review: (input: TrainingReviewInput) => Promise<TrainingCard>;
  postpone: (id: string) => Promise<TrainingCard>;
  delete: (id: string) => Promise<void>;
  studies: () => Promise<StudyDocument[]>;
  analyze: (position: Position) => Promise<EngineLine[]>;
  predict?: (position: Position) => Promise<HumanPrediction>;
  cancel?: () => void;
};
const pieceNames: Record<PieceSymbol, [string, string]> = {
  p: ["пешкой", "a pawn"],
  n: ["конём", "a knight"],
  b: ["слоном", "a bishop"],
  r: ["ладьёй", "a rook"],
  q: ["ферзём", "the queen"],
  k: ["королём", "the king"],
};
export function TrainingHub({
  profileId,
  locale,
  games,
  api,
  onPlayFrom,
  onExit,
}: {
  profileId: string;
  locale: Locale;
  games: GameRecord[];
  api: TrainingHubApi;
  onPlayFrom?: (position: Position, providerId?: "stockfish" | "maia") => void;
  onExit?: () => void;
}) {
  const ru = locale === "ru",
    [cards, setCards] = useState<TrainingCard[]>([]),
    [studies, setStudies] = useState<StudyDocument[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [mode, setMode] = useState<TrainingMode>("recall"),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [studyId, setStudyId] = useState("");
  const mounted = useRef(true),
    generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    const own = ++generation.current;
    setLoading(true);
    setSelected(null);
    void Promise.all([api.list(), api.studies()])
      .then(([queue, documents]) => {
        if (mounted.current && own === generation.current) {
          setCards(queue);
          setStudies(documents);
          setStudyId(documents[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (mounted.current && own === generation.current)
          setError(
            ru
              ? "Не удалось открыть очередь. Перейди в раздел ещё раз."
              : "Cannot load your practice queue. Reopen this section.",
          );
      })
      .finally(() => {
        if (mounted.current && own === generation.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
      generation.current++;
      api.cancel?.();
    };
  }, [profileId]);
  const mistakeCards = useMemo(
    () => cardsFromMistakes(games, profileId),
    [games, profileId],
  );
  const card = cards.find((c) => c.id === selected),
    due = dueTrainingCards(cards, profileId),
    candidates = mistakeCards.filter(
      (c) => !cards.some((saved) => saved.id === c.id),
    );
  function update(card: TrainingCard) {
    setCards((queue) => [...queue.filter((c) => c.id !== card.id), card]);
  }
  async function save(card: TrainingCard) {
    setLoading(true);
    setError("");
    try {
      const saved = await api.save(card);
      if (mounted.current) update(saved);
    } catch {
      if (mounted.current)
        setError(
          ru
            ? "Не удалось сохранить повторение. Проверь доступ к папке данных."
            : "Cannot save this review. Check access to the data folder.",
        );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  async function addStudy() {
    const study = studies.find((s) => s.id === studyId);
    if (!study) return;
    try {
      const node = study.nodes[study.selectedNodeId],
        id = node.mainChildId ? node.id : (node.parentId ?? study.rootId);
      await save(cardFromStudy(study, id));
    } catch {
      setError(
        ru
          ? "В этом исследовании ещё нет продолжения. Добавь ход и сохрани его."
          : "This study has no continuation yet. Add a move and save it.",
      );
    }
  }
  return (
    <>
      {onExit && (
        <button className="back-button" onClick={onExit}>
          <ArrowLeft size={16} />
          {ru ? "К обучению" : "Back to learning"}
        </button>
      )}
      <div className="page-heading">
        <div>
          <h1>{ru ? "Личная практика" : "Personal practice"}</h1>
          <p>
            {ru
              ? "Повторяй свои варианты, возвращайся к ошибкам и играй из выбранной позиции."
              : "Recall your variations, revisit mistakes and play from a selected position."}
          </p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {card ? (
        <>
          <button
            className="back-button"
            onClick={() => {
              api.cancel?.();
              setSelected(null);
            }}
          >
            {ru ? "К очереди повторений" : "Back to review queue"}
          </button>
          <div className="training-mode">
            <label>
              {ru ? "Режим занятия" : "Practice mode"}
            <select
              aria-label={ru ? "Режим занятия" : "Practice mode"}
              value={mode}
                onChange={(e) => {
                  api.cancel?.();
                  setMode(e.target.value as TrainingMode);
                }}
              >
                <option value="recall">
                  {ru ? "Вспомнить продолжение" : "Recall continuation"}
                </option>
                <option value="rescue">
                  {ru ? "Найти защиту" : "Find a defence"}
                </option>
                <option value="guess" disabled={!api.predict}>
                  {ru ? "Угадать ответ Maia" : "Predict Maia's reply"}
                </option>
                <option value="convert">
                  {ru ? "Доиграть позицию" : "Play out position"}
                </option>
                <option value="handbrain">
                  {ru ? "Рука и мозг" : "Hand and brain"}
                </option>
              </select>
            </label>
          </div>
          <TrainingDrill
            key={`${profileId}_${card.id}_${mode}`}
            card={card}
            locale={locale}
            mode={mode}
            api={api}
            onPlayFrom={onPlayFrom}
            onReviewed={(reviewed) => update(reviewed)}
          />
        </>
      ) : (
        <>
          <section className="training-intake">
            <h2>{ru ? "Добавить в практику" : "Add to practice"}</h2>
            <p>
              {ru
                ? "Сохрани исследование с продолжением или разбери свою партию. Очередь объяснит, почему предлагает каждую позицию."
                : "Save a study with a continuation or analyze one of your games. Each queued position explains why it was recommended."}
            </p>
            {!!studies.length && (
              <div className="training-add">
                <label>
                  {ru ? "Исследование" : "Study"}
                  <select
                    aria-label={ru ? "Исследование" : "Study"}
                    value={studyId}
                    onChange={(e) => setStudyId(e.target.value)}
                  >
                    {studies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary"
                  disabled={loading}
                  onClick={() => void addStudy()}
                >
                  {ru ? "Добавить позицию" : "Add position"}
                </button>
              </div>
            )}
            {!!candidates.length && (
              <button
                className="secondary"
                disabled={loading}
                onClick={() => void save(candidates[0])}
              >
                {ru
                  ? `Добавить ошибку из партии (${candidates.length} доступно)`
                  : `Add a game mistake (${candidates.length} available)`}
              </button>
            )}
          </section>
          <div className="training-queue-heading">
            <h2>{ru ? "Очередь повторений" : "Review queue"}</h2>
            <span>
              {due.length} {ru ? "пора повторить" : "due now"}
            </span>
          </div>
          {loading && !cards.length && (
            <p role="status">{ru ? "Открываем очередь…" : "Loading queue…"}</p>
          )}
          {!loading && !cards.length && (
            <p className="training-empty">
              {ru
                ? "Пока нет повторений. Начни с позиции из исследования или своей ошибки."
                : "No reviews yet. Start with a study position or a mistake from your games."}
            </p>
          )}
          <div className="training-queue">
            {[...cards]
              .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
              .map((c) => (
                <article key={c.id} className="training-row">
                  <button
                    className="training-open"
                    onClick={() => {
                      setMode(
                        c.source.kind === "mistake" ? "rescue" : "recall",
                      );
                      setSelected(c.id);
                    }}
                  >
                    <strong>{c.title[locale]}</strong>
                    <span>{c.reason[locale]}</span>
                    <small>
                      {Date.parse(c.dueAt) <= Date.now()
                        ? ru
                          ? "Пора повторить"
                          : "Due now"
                        : new Date(c.dueAt).toLocaleString(
                            ru ? "ru-RU" : "en-GB",
                          )}
                    </small>
                  </button>
                  <div className="training-row-actions">
                    <button
                      className="text-button"
                      disabled={loading}
                      onClick={() => {
                        void api
                          .postpone(c.id)
                          .then(update)
                          .catch(() =>
                            setError(
                              ru
                                ? "Не удалось перенести занятие."
                                : "Could not postpone practice.",
                            ),
                          );
                      }}
                    >
                      {ru ? "Отложить на день" : "Postpone one day"}
                    </button>
                    <button
                      className="text-button"
                      disabled={loading}
                      onClick={() => {
                        void api
                          .delete(c.id)
                          .then(() =>
                            setCards((q) => q.filter((x) => x.id !== c.id)),
                          )
                          .catch(() =>
                            setError(
                              ru
                                ? "Не удалось удалить повторение."
                                : "Could not remove the review.",
                            ),
                          );
                      }}
                    >
                      {ru ? "Убрать из очереди" : "Remove from queue"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </>
      )}
    </>
  );
}
function TrainingDrill({
  card,
  locale,
  mode,
  api,
  onReviewed,
  onPlayFrom,
}: {
  card: TrainingCard;
  locale: Locale;
  mode: TrainingMode;
  api: TrainingHubApi;
  onReviewed: (card: TrainingCard) => void;
  onPlayFrom?: (position: Position, providerId?: "stockfish" | "maia") => void;
}) {
  const ru = locale === "ru",
    [position, setPosition] = useState(card.position),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [finished, setFinished] = useState(false),
    [targets, setTargets] = useState(card.acceptedMoves),
    [lines, setLines] = useState<EngineLine[]>([]),
    [prediction, setPrediction] = useState<HumanPrediction | null>(null),
    [piece, setPiece] = useState<PieceSymbol | null>(null),
    [provider, setProvider] = useState<"stockfish" | "maia">("stockfish"),
    [attempted, setAttempted] = useState(false),
    [saved, setSaved] = useState(false);
  const generation = useRef(0),
    mounted = useRef(true),
    attemptId = useRef(crypto.randomUUID()),
    reviewBusy = useRef(false),
    attemptedOutcome = useRef<"remembered" | "again">("again");
  const panelRef = usePanelHeight(card.id);
  const playerColor = boardAt(card.position).turn(),
    board = boardAt(position);
  useEffect(() => {
    mounted.current = true;
    void prepare(card.position);
    return () => {
      mounted.current = false;
      generation.current++;
      api.cancel?.();
    };
  }, []);
  async function prepare(pos: Position) {
    const own = ++generation.current;
    setBusy(true);
    setFeedback("");
    setLines([]);
    setPrediction(null);
    setPiece(null);
    try {
      if (mode === "guess") {
        if (!api.predict) throw Error();
        const p = await api.predict(pos);
        if (!mounted.current || own !== generation.current) return;
        const sorted = [...p.candidates].sort(
          (a, b) => b.probability - a.probability,
        );
        sampleHumanMove(pos, sorted, () => 0);
        setPrediction(p);
        setTargets([sorted[0].uci]);
      } else if (mode === "rescue" || mode === "handbrain") {
        const result = await api.analyze(pos);
        if (!mounted.current || own !== generation.current) return;
        if (!result[0]?.pv[0]) throw Error();
        setLines(result);
        setTargets([result[0].pv[0]]);
        if (mode === "handbrain")
          setPiece(handBrainPiece(pos, result[0].pv[0]));
      }
    } catch {
      if (mounted.current && own === generation.current)
        setFeedback(
          ru
            ? "Движок недоступен. Повтори попытку или выбери другой режим; позиция сохранена."
            : "The engine is unavailable. Retry or choose another mode; the position is preserved.",
        );
    } finally {
      if (mounted.current && own === generation.current) setBusy(false);
    }
  }
  async function answer(move: string) {
    if (busy || finished) return;
    if (mode === "handbrain") {
      if (!piece || !allowedHandMove(position, move, piece)) {
        setFeedback(
          ru
            ? "Выбери фигуру того типа, который назвал тренер."
            : "Choose the piece type named by the coach.",
        );
        return;
      }
      const own = ++generation.current;
      setBusy(true);
      setFeedback("");
      let next = { ...position, moves: [...position.moves, move] };
      setPosition(next);
      try {
        if (boardAt(next).isGameOver()) {
          setFinished(true);
          setFeedback(ru ? "Позиция завершена." : "The position is finished.");
          return;
        }
        if (provider === "maia" && !api.predict)
          throw Error("maia_unavailable");
        const reply =
          provider === "maia"
            ? sampleHumanMove(next, (await api.predict!(next)).candidates)
            : (await api.analyze(next))[0]?.pv[0];
        if (!mounted.current || own !== generation.current) return;
        if (!reply) throw Error();
        playUci(boardAt(next), reply);
        next = { ...next, moves: [...next.moves, reply] };
        setPosition(next);
        if (boardAt(next).isGameOver()) {
          setFinished(true);
          setFeedback(
            ru
              ? "Партия завершена. Можно вернуться к началу и попробовать другую идею."
              : "The game is finished. Return to the starting position to try another idea.",
          );
          return;
        }
        await prepare(next);
      } catch {
        if (mounted.current && own === generation.current)
          setFeedback(
            ru
              ? "Не удалось получить ответ соперника. Вернись к началу и повтори."
              : "The opponent could not reply. Restart the position and try again.",
          );
      } finally {
        if (mounted.current && own === generation.current) setBusy(false);
      }
      return;
    }
    if (!targets.length) return;
    setAttempted(true);
    setFinished(true);
    setPosition({ ...position, moves: [...position.moves, move] });
    const matches = targets.includes(move);
    attemptedOutcome.current = matches ? "remembered" : "again";
    setFeedback(
      mode === "guess"
        ? matches
          ? ru
            ? "Ход совпал с первым прогнозом Maia."
            : "Your move matches Maia's top prediction."
          : ru
            ? "Maia выше оценивает вероятность другого хода. Это не оценка качества твоего хода."
            : "Maia assigns another move a higher probability. This is not a judgment of move quality."
        : matches
          ? ru
            ? "Ты нашёл изучаемое продолжение. Проверь ответ соперника."
            : "You found the studied continuation. Check the opponent's reply."
          : ru
            ? "Это другой легальный ход. Сравни его с изучаемым продолжением; само отличие ещё не означает ошибку."
            : "This is another legal move. Compare it with the studied continuation; a different move is not necessarily a mistake.",
    );
    if (mode !== "guess") void record(matches ? "remembered" : "again");
  }
  async function record(outcome: "remembered" | "again") {
    if (reviewBusy.current || saved) return;
    reviewBusy.current = true;
    try {
      const reviewed = await api.review({
        cardId: card.id,
        attemptId: attemptId.current,
        outcome,
      });
      if (mounted.current) {
        onReviewed(reviewed);
        setSaved(true);
      }
    } catch {
      if (mounted.current)
        setFeedback(
          ru
            ? "Ответ показан, но повторение не удалось сохранить. Нажми «Сохранить результат»."
            : "The answer is shown, but review progress could not be saved. Press Save result.",
        );
    } finally {
      reviewBusy.current = false;
    }
  }
  function reset() {
    api.cancel?.();
    generation.current++;
    setPosition(card.position);
    setFinished(false);
    setAttempted(false);
    setPiece(null);
    void prepare(card.position);
  }
  const pieceText = piece ? pieceNames[piece][ru ? 0 : 1] : "";
  const targetSan = targets
    .map((u) => {
      try {
        return playUci(boardAt(card.position), u).san;
      } catch {
        return u;
      }
    })
    .join(" / ");
  return (
    <div className="game-layout training-layout">
      <section className="board-column">
        <div className="review-controls">
          <button className="secondary" onClick={reset}>
            <RotateCcw size={17} />
            {ru ? "Начать заново" : "Restart"}
          </button>
          <span>
            {busy
              ? ru
                ? "Подготавливаем…"
                : "Preparing…"
              : mode === "handbrain" && piece
                ? ru
                  ? `Ходи ${pieceText}`
                  : `Move ${pieceText}`
                : ru
                  ? "Твой ход"
                  : "Your move"}
          </span>
        </div>
        <Board
          fen={board.fen()}
          locale={locale}
          orientation={playerColor}
          lastMove={position.moves.at(-1)}
          onMove={(move) => void answer(move)}
          disabled={
            busy ||
            finished ||
            mode === "convert" ||
            (mode === "guess" && !prediction) ||
            (mode === "rescue" && !lines.length) ||
            (mode === "handbrain" && (!piece || board.turn() !== playerColor))
          }
        />
      </section>
      <section className="side-panel training-panel" ref={panelRef}>
        <h2>{card.title[locale]}</h2>
        <ExplanationPanel
          locale={locale}
          explanation={{
            short: card.reason,
            detail: {
              ru: "Вспомни цель хода, проверь шахи, взятия и угрозы обеих сторон. В режиме повторения сравниваем с выбранной линией, а в режиме защиты — с лучшим найденным продолжением Stockfish при текущем расчёте.",
              en: "Recall the purpose of the move and check both sides' checks, captures and threats. Recall practice compares with a selected line; defence practice compares with Stockfish's best continuation found at the current search settings.",
            },
          }}
        />
        {mode === "guess" && (
          <p>
            {ru
              ? "Угадай наиболее вероятный ход модели в этой позиции. Прогноз Maia не является лучшим ходом Stockfish или обещанием ответа конкретного человека."
              : "Guess the model's most likely move in this position. Maia's prediction is not Stockfish's best move or a promise about a particular person."}
          </p>
        )}
        {mode === "handbrain" && (
          <>
            <p>
              {ru
                ? "Тренер называет тип фигуры; ты выбираешь конкретную фигуру и поле. Соперник отвечает, затем начинается следующий ход."
                : "The coach names a piece type; you choose which piece and its destination. The opponent replies and the next turn begins."}
            </p>
            <label>
              {ru ? "Соперник" : "Opponent"}
              <select
                aria-label={ru ? "Соперник" : "Opponent"}
                value={provider}
                onChange={(e) =>
                  setProvider(e.target.value as "stockfish" | "maia")
                }
                disabled={busy}
              >
                <option value="stockfish">Stockfish</option>
                <option value="maia" disabled={!api.predict}>
                  Maia
                </option>
              </select>
            </label>
          </>
        )}
        {mode === "convert" && (
          <>
            <p>
              {ru
                ? "Продолжи эту позицию в режиме игры. В следующем окне выбери свою сторону и соперника."
                : "Continue this position in Play. Choose your side and opponent in the next window."}
            </p>
            <button
              className="primary"
              disabled={!onPlayFrom}
              onClick={() => onPlayFrom?.(card.position, "stockfish")}
            >
              {ru
                ? "Выбрать соперника и доиграть"
                : "Choose opponent and play out"}
            </button>
            <button
              className="secondary"
              disabled={!onPlayFrom || !api.predict}
              onClick={() => onPlayFrom?.(card.position, "maia")}
            >
              Maia — {ru ? "сыграть отсюда" : "play from here"}
            </button>
          </>
        )}
        <p role="status">{feedback}</p>
        {attempted && (
          <>
            <p>
              {ru ? "Продолжение для сравнения: " : "Continuation to compare: "}
              <strong>{targetSan}</strong>
            </p>
            <button
              className="secondary"
              onClick={() => {
                const next = {
                  ...card.position,
                  moves: [...card.position.moves, targets[0]],
                };
                setPosition(next);
              }}
            >
              {ru ? "Показать на доске" : "Show on board"}
            </button>
            {!saved && mode !== "guess" && (
              <button
                className="secondary"
                onClick={() => void record(attemptedOutcome.current)}
              >
                {ru ? "Сохранить результат" : "Save result"}
              </button>
            )}
            {saved && (
              <small>
                {ru
                  ? "Повторение сохранено. Повторный показ этого задания не добавляет новую попытку."
                  : "Review saved. Replaying this exercise does not add another attempt."}
              </small>
            )}
          </>
        )}
        {attempted && prediction && (
          <div className="training-predictions">
            <strong>{ru ? "Прогноз Maia" : "Maia prediction"}</strong>
            {prediction.candidates.slice(0, 5).map((c) => (
              <p key={c.uci}>
                {playUci(boardAt(card.position), c.uci).san} ·{" "}
                {(c.probability * 100).toFixed(1)}%
              </p>
            ))}
          </div>
        )}
        {attempted && lines.length > 0 && (
          <div className="training-lines">
            <p>Stockfish · {scoreText(lines[0].score)}</p>
            {lines[0].pv.slice(0, 8).map((u, i) => (
              <button
                className="text-button"
                key={i}
                onClick={() =>
                  setPosition({
                    ...card.position,
                    moves: [
                      ...card.position.moves,
                      ...lines[0].pv.slice(0, i + 1),
                    ],
                  })
                }
              >
                {
                  playUci(
                    boardAt({
                      ...card.position,
                      moves: [
                        ...card.position.moves,
                        ...lines[0].pv.slice(0, i),
                      ],
                    }),
                    u,
                  ).san
                }
              </button>
            ))}
          </div>
        )}
        {!busy && feedback && !attempted && mode !== "convert" && (
          <button className="secondary" onClick={reset}>
            {ru ? "Повторить подготовку" : "Retry preparation"}
          </button>
        )}
      </section>
    </div>
  );
}
