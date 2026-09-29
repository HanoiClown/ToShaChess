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
import { playSound } from "../audio/sounds";
import { MaterialPanel } from "../ui/MaterialPanel";
import { materialSummary } from "../analysis/material-summary";
import { bots, legacyBot } from "../bots/catalog";
import { BotPicker } from "../ui/BotPicker";
import { chooseQuip } from "../bots/quips";
import { engineRequest } from "../shared/engine-requests";
import { useEnginePacks } from "../ui/EnginePacks";
import type { PackId } from "../shared/packs";
export function Play({
  active = true,
  gameId,
}: {
  active?: boolean;
  gameId?: string;
}) {
  const { snapshot, profile, locale, l, t, nav, fail } = useApp();
  const saved = snapshot.database.games
    .filter(
      (g) =>
        g.profileId === profile.id &&
        g.mode !== "import" &&
        g.result === "*" &&
        (!gameId || g.id === gameId),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const [game, setGame] = useState<GameRecord | null>(() => saved ?? null),
    [paused, setPaused] = useState(!!saved),
    [view, setView] = useState(saved?.moves.length ?? 0),
    [busy, setBusy] = useState(false),
    [hint, setHint] = useState<EngineLine | null>(null),
    [flipped, setFlipped] = useState(false),
    [confirm, setConfirm] = useState(false);
  const [color, setColor] = useState<Color>(profile.opponent?.color ?? "w"),
    [mode, setMode] = useState<"normal" | "training">("training"),
    [level, setLevel] = useState(profile.level === "new" ? 0 : 1),
    [time, setTime] = useState("0");
  const [botId, setBotId] = useState(
    profile.opponent?.botId &&
      bots.some((b) => b.id === profile.opponent!.botId)
      ? profile.opponent.botId
      : profile.level === "new"
        ? "pixel"
        : "spark",
  );
  const [quip, setQuip] = useState("");
  const { packs } = useEnginePacks();
  const [opponent, setOpponent] = useState<"stockfish" | "maia">(
      profile.opponent?.provider ?? "stockfish",
    ),
    [maiaPack, setMaiaPack] = useState<PackId>(
      profile.opponent?.maia.pack ?? "maia-cpu",
    ),
    [maiaElo, setMaiaElo] = useState(profile.opponent?.maia.selfElo ?? 1100),
    [humanElo, setHumanElo] = useState(
      profile.opponent?.maia.opponentElo ?? 1100,
    ),
    [temperature, setTemperature] = useState(
      profile.opponent?.maia.temperature ?? 1,
    );
  const lastQuip = useRef({ ply: -3, at: 0 });
  const bot =
    bots.find((b) => b.id === (game?.botId ?? botId)) ?? legacyBot(game?.level);
  const hintRequest = useRef<ReturnType<typeof engineRequest> | null>(null);
  useEffect(() => {
    if (!active) {
      setPaused(true);
      pausedRef.current = true;
      setBusy(false);
      hintRequest.current?.cancel();
    }
    return () => {
      hintRequest.current?.cancel();
    };
  }, [active]);
  useEffect(() => {
    if (!game || snapshot.database.settings.botQuips === false) {
      setQuip("");
      return;
    }
    const c = boardAt(game),
      m = c.history({ verbose: true }).at(-1);
    const event =
      game.result !== "*"
        ? "end"
        : !m
          ? "start"
          : c.isCheck()
            ? "check"
            : m.captured
              ? m.color === game.playerColor
                ? "loss"
                : "capture"
              : null;
    if (!event) return;
    const text = chooseQuip({
      botId: bot.id,
      event,
      locale,
      ply: game.moves.length,
      now: Date.now(),
      lastPly: lastQuip.current.ply,
      lastAt: lastQuip.current.at,
    });
    if (text) {
      setQuip(text);
      lastQuip.current = { ply: game.moves.length, at: Date.now() };
    }
  }, [
    game?.id,
    game?.moves.length,
    game?.result,
    locale,
    snapshot.database.settings.botQuips,
  ]);
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
    playSound("end");
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
    const result = terminalResult(c);
    if (result !== "*") void finish(next, result).catch(fail);
    else void save(next);
  }
  useEffect(() => {
    const current = game;
    if (!current || current.result !== "*" || paused || !active) return;
    const c = boardAt(current);
    if (c.turn() === current.playerColor) return;
    let cancelled = false;
    const request = engineRequest();
    setBusy(true);
    window.chessApp
      .botMove({
        requestId: request.requestId,
        position: { initialFen: current.initialFen, moves: current.moves },
        botId: current.botId ?? legacyBot(current.level).id,
        maia: current.maia,
        strong: current.strongStockfish,
      })
      .then(({ move }) => {
        if (!cancelled && request.active) makeMove(move);
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
      request.cancel();
    };
  }, [game?.id, game?.moves.length, game?.result, paused, active]);
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
    const chosen = bots.find((b) => b.id === botId)!;
    g.botId = chosen.id;
    g.botRating = chosen.rating;
    g.headers[color === "w" ? "Black" : "White"] =
      `${chosen.name[locale]} (≈${chosen.rating})`;
    if (opponent === "maia") {
      if (packs.find((p) => p.id === maiaPack)?.status !== "ready")
        throw Error("maia_pack_missing");
      g.maia = {
        pack: maiaPack,
        selfElo: maiaElo,
        opponentElo: humanElo,
        temperature,
      };
      g.botRating = undefined;
      g.headers[color === "w" ? "Black" : "White"] =
        `Maia-3 · ${maiaElo} Lichess model`;
      g.headers.Engine = `Maia-3 ${maiaPack}`;
    }
    lastQuip.current = { ply: -3, at: 0 };
    await window.chessApp.saveGame(g);
    // Hidden, unfinished Maia inputs must not prevent starting a Stockfish game.
    const ratingOrPrevious = (value: number, previous?: number) =>
      Number.isInteger(value) && value >= 600 && value <= 2600
        ? value
        : (previous ?? 1100);
    await window.chessApp.updateProfile({
      ...profile,
      opponent: {
        provider: opponent,
        botId,
        color,
        maia: g.maia ?? {
          pack: maiaPack,
          selfElo: ratingOrPrevious(maiaElo, profile.opponent?.maia.selfElo),
          opponentElo: ratingOrPrevious(
            humanElo,
            profile.opponent?.maia.opponentElo,
          ),
          temperature,
        },
      },
    });
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
    if (moves.length > (game.startPly ?? 0)) moves.pop();
    let c = boardAt({ ...game, moves });
    if (c.turn() !== game.playerColor && moves.length > (game.startPly ?? 0))
      moves.pop();
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
    hintRequest.current?.cancel();
    const request = engineRequest();
    hintRequest.current = request;
    setBusy(true);
    try {
      const [line] = await request.analyze({
        initialFen: game.initialFen,
        moves: game.moves,
      });
      if (request.active) setHint(line);
    } catch (e) {
      if (request.active) fail(e);
    } finally {
      if (request.active) setBusy(false);
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
          <img
            src={human ? `./pieces/${side}N.svg` : `./bots/${bot.id}.svg`}
            alt=""
          />
        </div>
        <div>
          <strong>
            {human
              ? profile.name
              : game?.maia
                ? "Maia-3"
                : game?.strongStockfish
                  ? "Stockfish"
                  : bot.name[locale]}
          </strong>
          <small>
            {human
              ? l("Ты", "You")
              : game?.maia
                ? `${game.maia.selfElo} · ${l("модель Lichess", "Lichess model")}`
                : game?.strongStockfish
                  ? l(
                      "Сильная защита · 1,5 с на ход",
                      "Strong defence · 1.5s per move",
                    )
                  : `≈${game?.botRating ?? bot.rating} Elo`}
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
          {quip && (
            <p className="bot-dialogue" aria-live="polite">
              {bot.name[locale]}: {quip}
            </p>
          )}
          <div className="board-with-eval">
            {game?.mode === "training" && hint && (
              <EvalBar
                locale={locale}
                score={hint.score}
                orientation={orientation}
              />
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
          <small className="muted">
            {l(
              "ПКМ: стрелка или отметка клетки. ЛКМ очищает отметки.",
              "Right-click: draw an arrow or mark a square. Left-click clears marks.",
            )}
          </small>
          <MaterialPanel
            locale={locale}
            orientation={orientation}
            summary={materialSummary(
              game
                ? {
                    initialFen: game.initialFen,
                    moves: game.moves.slice(0, view),
                  }
                : { initialFen: START, moves: [] },
            )}
          />
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
                {l("Соперник", "Opponent")}
                <select
                  value={opponent}
                  onChange={(e) =>
                    setOpponent(e.target.value as "stockfish" | "maia")
                  }
                >
                  <option value="stockfish">
                    {l("Персонажи · Stockfish", "Characters · Stockfish")}
                  </option>
                  <option value="maia">
                    {l("Maia-3 · человеческие ходы", "Maia-3 · human moves")}
                  </option>
                </select>
              </label>
              {opponent === "maia" ? (
                <div className="human-settings">
                  <label>
                    {l("Модель", "Model")}
                    <select
                      value={maiaPack}
                      onChange={(e) => setMaiaPack(e.target.value as PackId)}
                    >
                      {packs.map((p) => (
                        <option
                          value={p.id}
                          key={p.id}
                          disabled={p.status !== "ready"}
                        >
                          {p.title}{" "}
                          {p.status !== "ready"
                            ? l("— не установлена", "— not installed")
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {l(
                      "Уровень соперника · шкала Lichess",
                      "Opponent level · Lichess scale",
                    )}
                    <input
                      type="number"
                      min={600}
                      max={2600}
                      step={100}
                      value={maiaElo}
                      onChange={(e) => setMaiaElo(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    {l(
                      "Твой уровень для модели · шкала Lichess",
                      "Your level for the model · Lichess scale",
                    )}
                    <input
                      type="number"
                      min={600}
                      max={2600}
                      step={100}
                      value={humanElo}
                      onChange={(e) => setHumanElo(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    {l("Разнообразие ответов", "Reply variety")}
                    <select
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                    >
                      <option value={0.65}>
                        {l("Привычные ответы", "Familiar replies")}
                      </option>
                      <option value={1}>
                        {l("Исходная модель", "Original policy")}
                      </option>
                      <option value={1.3}>
                        {l("Больше экспериментов", "More experiments")}
                      </option>
                    </select>
                  </label>
                  <p className="field-help">
                    {l(
                      "Это условие обученной модели, не подтверждённый рейтинг бота и не шкала Chess.com. Изменение разнообразия может менять силу игры.",
                      "This is a model condition, not a measured bot rating or a Chess.com rating. Reply variety can change playing strength.",
                    )}
                  </p>
                  {packs.find((p) => p.id === maiaPack)?.status !== "ready" && (
                    <button
                      className="secondary"
                      onClick={() => nav("settings")}
                    >
                      {l(
                        "Установить Maia в настройках",
                        "Install Maia in Settings",
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <BotPicker
                  selectedId={botId}
                  locale={locale}
                  onSelect={setBotId}
                />
              )}
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
                <select
                  aria-label={l("Контроль времени", "Time control")}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                >
                  <option value="0">{l("Без часов", "Untimed")}</option>
                  <option value="10">10 + 0</option>
                  <option value="15+10">15 + 10</option>
                </select>
              </label>
              <button
                className="primary large full"
                disabled={
                  opponent === "maia" &&
                  (packs.find((p) => p.id === maiaPack)?.status !== "ready" ||
                    ![maiaElo, humanElo].every(
                      (n) => Number.isInteger(n) && n >= 600 && n <= 2600,
                    ))
                }
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
                    ? game.maia
                      ? l("Maia выбирает ответ…", "Maia is choosing a reply…")
                      : l("Stockfish обдумывает ход…", "Stockfish is thinking…")
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
