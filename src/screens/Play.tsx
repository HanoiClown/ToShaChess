import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  Swords,
  Lightbulb,
  Undo2,
  Flag,
  RotateCw,
  Play as PlayIcon,
  Pause,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../ui/context";
import { Board, EvalBar } from "../ui/Board";
import { MoveList } from "../ui/MoveList";
import {
  boardAt,
  newGame,
  playUci,
  START,
  terminalResult,
  timeoutResult,
} from "../chess/game";
import { pvSan } from "../analysis/evaluate";
import type { Color, GameRecord, EngineLine } from "../shared/contracts";
function moveSound() {
  try {
    const context = new AudioContext(),
      osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, context.currentTime + 0.06);
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.08);
    osc.onended = () => void context.close();
  } catch {
    /* Audio may be disabled by the OS. */
  }
}
export function Play() {
  const { snapshot, profile, locale, l, t, nav, fail } = useApp();
  const saved = snapshot.database.games
    .filter(
      (g) =>
        g.profileId === profile.id && g.mode !== "import" && g.result === "*",
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const [game, setGame] = useState<GameRecord | null>(() => saved ?? null),
    [paused, setPaused] = useState(!!saved),
    [view, setView] = useState(saved?.moves.length ?? 0),
    [busy, setBusy] = useState(false),
    [hint, setHint] = useState<EngineLine | null>(null),
    [flipped, setFlipped] = useState(false),
    [confirm, setConfirm] = useState(false);
  const [color, setColor] = useState<Color>("w"),
    [mode, setMode] = useState<"normal" | "training">("training"),
    [level, setLevel] = useState(profile.level === "new" ? 0 : 1),
    [time, setTime] = useState("0");
  const ref = useRef(game),
    pausedRef = useRef(paused),
    tick = useRef(Date.now()),
    lastSave = useRef(0);
  ref.current = game;
  pausedRef.current = paused;
  const names = [
    l("Первые шаги", "First steps"),
    l("Начинающий", "Beginner"),
    l("Практика", "Practice"),
    l("Сильный", "Strong"),
    l("Эксперт", "Expert"),
  ];
  const sync = (g: GameRecord) => {
    ref.current = g;
    setGame(g);
  };
  const save = (g: GameRecord) => window.chessApp.saveGame(g).catch(fail);
  async function finish(g: GameRecord, result: GameRecord["result"]) {
    const ended = { ...g, result, updatedAt: new Date().toISOString() };
    sync(ended);
    setBusy(false);
    setConfirm(false);
    await window.chessApp.cancelEngine();
    await window.chessApp.saveGame(ended);
    await window.chessApp.analyze(g.id);
    nav("review", g.id);
  }
  function makeMove(uci: string) {
    const current = ref.current;
    if (!current || current.result !== "*" || pausedRef.current) return;
    const c = boardAt(current);
    try {
      playUci(c, uci);
    } catch {
      return;
    }
    const next = {
      ...current,
      moves: [...current.moves, uci],
      updatedAt: new Date().toISOString(),
      clock: current.clock
        ? {
            ...current.clock,
            [c.turn() === "w" ? "b" : "w"]:
              current.clock[c.turn() === "w" ? "b" : "w"] +
              current.clock.increment,
          }
        : undefined,
    };
    sync(next);
    setView(next.moves.length);
    setHint(null);
    tick.current = Date.now();
    if (snapshot.database.settings.sound) moveSound();
    const result = terminalResult(c);
    if (result !== "*") void finish(next, result).catch(fail);
    else void save(next);
  }
  useEffect(() => {
    const current = game;
    if (!current || current.result !== "*" || paused) return;
    const c = boardAt(current);
    if (c.turn() === current.playerColor) return;
    let cancelled = false;
    setBusy(true);
    window.chessApp
      .engine(
        { initialFen: current.initialFen, moves: current.moves },
        current.level ?? 1,
      )
      .then((lines) => {
        if (!cancelled && lines[0]?.pv[0]) makeMove(lines[0].pv[0]);
      })
      .catch((e) => {
        if (!cancelled) {
          setPaused(true);
          fail(e);
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      void window.chessApp.cancelEngine();
    };
  }, [game?.id, game?.moves.length, game?.result, paused]);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now(),
        elapsed = now - tick.current;
      tick.current = now;
      const g = ref.current;
      if (!g?.clock || g.result !== "*" || pausedRef.current) return;
      const side = boardAt(g).turn(),
        clock = { ...g.clock, [side]: Math.max(0, g.clock[side] - elapsed) },
        next = { ...g, clock };
      sync(next);
      if (clock[side] === 0) {
        pausedRef.current = true;
        void finish(next, timeoutResult(boardAt(next), side)).catch(fail);
      } else if (now - lastSave.current > 3000) {
        lastSave.current = now;
        void save(next);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const listener = (event: Event) => {
      setPaused(true);
      pausedRef.current = true;
      const g = ref.current;
      if (g)
        (event as CustomEvent<Promise<unknown>[]>).detail.push(
          window.chessApp.saveGame(g),
        );
    };
    window.addEventListener("chess-before-switch", listener);
    return () => window.removeEventListener("chess-before-switch", listener);
  }, []);
  async function start() {
    const minutes = Number(time.split("+")[0]),
      increment = time.includes("+") ? Number(time.split("+")[1]) : 0;
    const g = newGame(
      profile.id,
      profile.name,
      color,
      mode,
      minutes,
      increment,
      level,
    );
    await window.chessApp.saveGame(g);
    sync(g);
    setView(0);
    setHint(null);
    setPaused(false);
    tick.current = Date.now();
  }
  async function undo() {
    if (!game || game.mode !== "training") return;
    await window.chessApp.cancelEngine();
    const moves = [...game.moves];
    if (moves.length) moves.pop();
    let c = boardAt({ ...game, moves });
    if (c.turn() !== game.playerColor && moves.length) moves.pop();
    const next = {
      ...game,
      moves,
      analysis: [],
      explanations: {},
      updatedAt: new Date().toISOString(),
    };
    sync(next);
    setView(moves.length);
    setHint(null);
    setBusy(false);
    await save(next);
  }
  async function requestHint() {
    if (!game) return;
    setBusy(true);
    try {
      const [line] = await window.chessApp.engine({
        initialFen: game.initialFen,
        moves: game.moves,
      });
      setHint(line);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  const current = game ? boardAt(game) : new Chess(),
    display = game ? boardAt(game, view) : current,
    orientation = flipped
      ? game?.playerColor === "b"
        ? "w"
        : "b"
      : (game?.playerColor ?? color);
  const clock = (side: Color) => {
    if (!game?.clock) return "∞";
    const total = Math.ceil(game.clock[side] / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };
  const playerBar = (side: Color) => {
    const human = game ? game.playerColor === side : color === side;
    return (
      <div className="player-bar">
        <div className={`player-avatar ${human ? "human" : "bot"}`}>
          <img src={`./pieces/${side}${human ? "N" : "K"}.svg`} alt="" />
        </div>
        <div>
          <strong>{human ? profile.name : "Stockfish"}</strong>
          <small>
            {human ? l("Ты", "You") : names[game?.level ?? level]}
            {!human && busy ? " · " + l("думает…", "thinking…") : ""}
          </small>
        </div>
        <div
          className={`chess-clock ${game?.result === "*" && current.turn() === side && !paused ? "running" : ""}`}
        >
          {clock(side)}
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("За доску", "Let’s play")}</h1>
          <p>
            {l(
              "Каждая партия — новая возможность понять игру.",
              "Every game is another chance to understand chess.",
            )}
          </p>
        </div>
        <button
          className="icon-button"
          title={l("Перевернуть доску", "Flip board")}
          onClick={() => setFlipped(!flipped)}
        >
          <RotateCw size={20} />
        </button>
      </div>
      <div className="game-layout">
        <section className="board-column">
          {playerBar(orientation === "w" ? "b" : "w")}
          <div className="board-with-eval">
            {game?.mode === "training" && hint && (
              <EvalBar score={hint.score} orientation={orientation} />
            )}
            <Board
              fen={display.fen()}
              orientation={orientation}
              locale={locale}
              lastMove={game?.moves[view - 1]}
              arrow={hint?.pv[0]}
              onMove={makeMove}
              disabled={
                !game ||
                busy ||
                paused ||
                game.result !== "*" ||
                view !== game.moves.length ||
                current.turn() !== game.playerColor
              }
            />
          </div>
          {playerBar(orientation)}
          {game && view !== game.moves.length && (
            <button
              className="secondary full"
              onClick={() => setView(game.moves.length)}
            >
              {l("Вернуться к текущей позиции", "Return to current position")}
            </button>
          )}
        </section>
        <section className="side-panel">
          {!game || game.result !== "*" ? (
            <div className="game-setup">
              <div className="setup-title">
                <Swords size={36} />
                <h2>{l("Новая партия", "New game")}</h2>
              </div>
              <label>
                {l("Сложность соперника", "Opponent level")}
                <select
                  value={level}
                  onChange={(e) => setLevel(+e.target.value)}
                >
                  {names.map((name, i) => (
                    <option value={i} key={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="field-help">
                {l(
                  "Учебные уровни — не рейтинг Chess.com.",
                  "Practice levels are not Chess.com ratings.",
                )}
              </p>
              <label>
                {l("Твой цвет", "Your colour")}
                <div className="segmented">
                  <button
                    className={color === "w" ? "active" : ""}
                    onClick={() => setColor("w")}
                  >
                    {t("white")}
                  </button>
                  <button
                    className={color === "b" ? "active" : ""}
                    onClick={() => setColor("b")}
                  >
                    {t("black")}
                  </button>
                </div>
              </label>
              <label>
                {l("Режим", "Mode")}
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                >
                  <option value="training">
                    {l(
                      "Тренировка — с подсказками",
                      "Training — hints available",
                    )}
                  </option>
                  <option value="normal">
                    {l(
                      "Обычная партия — без подсказок",
                      "Normal game — no hints",
                    )}
                  </option>
                </select>
              </label>
              <label>
                {l("Контроль времени", "Time control")}
                <select value={time} onChange={(e) => setTime(e.target.value)}>
                  <option value="0">{l("Без часов", "Untimed")}</option>
                  <option value="10">10 + 0</option>
                  <option value="15+10">15 + 10</option>
                </select>
              </label>
              <button
                className="primary large full"
                onClick={() => void start().catch(fail)}
              >
                <PlayIcon size={21} />
                {l("Начать партию", "Start game")}
              </button>
              <div className="subtle-note">
                <Shield size={18} />
                {l(
                  "После партии разбор начнётся автоматически.",
                  "Your review starts automatically after the game.",
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="panel-title">
                <h2>
                  {game.mode === "training"
                    ? l("Тренировочная партия", "Training game")
                    : l("Обычная партия", "Normal game")}
                </h2>
                <span className={`status-dot ${busy ? "working" : ""}`} />
              </div>
              <div className="game-turn">
                {paused
                  ? l("Партия приостановлена", "Game paused")
                  : busy
                    ? l("Stockfish обдумывает ход…", "Stockfish is thinking…")
                    : l(
                        "Твой ход. Проверь угрозы.",
                        "Your move. Check the threats.",
                      )}
              </div>
              {paused && (
                <button
                  className="primary full"
                  onClick={() => {
                    tick.current = Date.now();
                    setPaused(false);
                  }}
                >
                  <PlayIcon size={18} />
                  {l("Продолжить партию", "Resume game")}
                </button>
              )}
              <MoveList
                game={game}
                selected={view}
                onSelect={setView}
                locale={locale}
                showQuality={false}
              />
              <div className="move-controls">
                <button
                  className="icon-button"
                  onClick={() => setView(Math.max(0, view - 1))}
                  aria-label={l("Предыдущий ход", "Previous move")}
                >
                  <ChevronLeft />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setView(Math.min(game.moves.length, view + 1))}
                  aria-label={l("Следующий ход", "Next move")}
                >
                  <ChevronRight />
                </button>
              </div>
              {game.mode === "training" && (
                <div className="training-controls">
                  <button
                    className="secondary"
                    disabled={busy || current.turn() !== game.playerColor}
                    onClick={() => void requestHint()}
                  >
                    <Lightbulb size={18} />
                    {l("Намёк", "Hint")}
                  </button>
                  <button
                    className="secondary"
                    disabled={!game.moves.length}
                    onClick={() => void undo().catch(fail)}
                  >
                    <Undo2 size={18} />
                    {l("Вернуть ход", "Take back")}
                  </button>
                </div>
              )}
              {hint && (
                <div className="hint-box">
                  <strong>
                    {l("Рассмотри продолжение", "Consider this line")}
                  </strong>
                  <p>{pvSan(current.fen(), hint.pv, 6)}</p>
                  <small>
                    {l(
                      "Сначала попробуй объяснить, что угрожает сопернику.",
                      "First try to explain what threat it creates.",
                    )}
                  </small>
                </div>
              )}
              <div className="game-actions">
                {game.mode === "training" && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setPaused(!paused);
                      tick.current = Date.now();
                    }}
                  >
                    <Pause size={16} />
                    {paused ? l("Продолжить", "Resume") : l("Пауза", "Pause")}
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => setConfirm(true)}
                >
                  <Flag size={16} />
                  {l("Сдаться", "Resign")}
                </button>
                {(current.isThreefoldRepetition() ||
                  current.isDrawByFiftyMoves()) && (
                  <button
                    className="text-button"
                    onClick={() => void finish(game, "1/2-1/2").catch(fail)}
                  >
                    {l("Заявить ничью", "Claim draw")}
                  </button>
                )}
              </div>
              {confirm && (
                <div className="confirm-box">
                  <p>
                    {l(
                      "Завершить партию и перейти к разбору?",
                      "End this game and open the review?",
                    )}
                  </p>
                  <button
                    className="danger"
                    onClick={() =>
                      void finish(
                        game,
                        game.playerColor === "w" ? "0-1" : "1-0",
                      ).catch(fail)
                    }
                  >
                    {l("Да, сдаться", "Yes, resign")}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfirm(false)}
                  >
                    {t("cancel")}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
