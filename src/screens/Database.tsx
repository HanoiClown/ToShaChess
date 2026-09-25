import { useEffect, useRef, useState } from "react";
import {
  Database as DatabaseIcon,
  Search,
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useApp } from "../ui/context";
import type {
  LibraryStatus,
  LibraryFilter,
  LibraryGame,
} from "../shared/library";
import type { Puzzle } from "../content/puzzles";
import type { GameRecord } from "../shared/contracts";
import { themes, themeName } from "../library/catalogue";
import { PuzzlePlayer } from "./PuzzlePlayer";
import { Board } from "../ui/Board";
import { MoveList } from "../ui/MoveList";
import { parseGames, boardAt } from "../chess/game";
export function DatabaseScreen() {
  const { l, locale, profile, fail, nav, refresh } = useApp();
  const [status, setStatus] = useState<LibraryStatus | null>(null),
    [mode, setMode] = useState<"puzzles" | "games">("puzzles"),
    [busy, setBusy] = useState(true),
    [problem, setProblem] = useState(""),
    [rows, setRows] = useState<Puzzle[]>([]),
    [games, setGames] = useState<LibraryGame[]>([]),
    [more, setMore] = useState(false),
    [active, setActive] = useState<Puzzle | null>(null),
    [game, setGame] = useState<GameRecord | null>(null),
    [pgn, setPgn] = useState(""),
    [ply, setPly] = useState(0);
  const [level, setLevel] = useState(
      (profile.skillLevel ?? profile.level) === "new"
        ? "first"
        : (profile.skillLevel ?? profile.level),
    ),
    [theme, setTheme] = useState("all"),
    [puzzleId, setPuzzleId] = useState(""),
    [player, setPlayer] = useState(""),
    [eco, setEco] = useState(""),
    [minElo, setMinElo] = useState(0),
    [page, setPage] = useState(1);
  const cursors = useRef<(LibraryFilter["after"] | number | undefined)[]>([
    undefined,
  ]);
  const alive = useRef(true),
    request = useRef(0);
  useEffect(() => {
    alive.current = true;
    void loadStatus();
    return () => {
      alive.current = false;
      request.current++;
    };
  }, []);
  async function loadStatus() {
    setBusy(true);
    setProblem("");
    await window.chessApp
      .libraryStatus()
      .then((s) => {
        if (alive.current) {
          setStatus(s);
          if (!s.puzzles && s.games) setMode("games");
          setBusy(false);
        }
      })
      .catch((e) => {
        if (alive.current) {
          setProblem(String(e));
          setBusy(false);
        }
      });
  }
  async function search(nextPage = 1) {
    if (busy) return;
    const token = ++request.current;
    setBusy(true);
    setProblem("");
    try {
      const cursor = nextPage === 1 ? undefined : cursors.current[nextPage - 1];
      if (nextPage === 1) cursors.current = [undefined];
      if (mode === "puzzles") {
        const bands: Record<string, [number, number]> = {
          first: [0, 999],
          beginner: [1000, 1499],
          intermediate: [1500, 1999],
          advanced: [2000, 4000],
          all: [0, 4000],
        };
        const [minRating, maxRating] = bands[level];
        const result = await window.chessApp.libraryPuzzles({
          theme: theme === "all" ? undefined : theme,
          minRating,
          maxRating,
          id: puzzleId.trim() || undefined,
          after: cursor as LibraryFilter["after"],
        });
        if (!alive.current || token !== request.current) return;
        setRows(result.items);
        setMore(result.more);
        const last = result.items.at(-1);
        cursors.current[nextPage] = last
          ? { rating: last.rating!, id: last.id }
          : undefined;
      } else {
        const result = await window.chessApp.libraryGames({
          player: player.trim(),
          eco: eco.trim().toUpperCase() || undefined,
          minRating: minElo,
          after: cursor as number | undefined,
        });
        if (!alive.current || token !== request.current) return;
        setGames(result.items);
        setMore(result.more);
        cursors.current[nextPage] = result.items.at(-1)?.id;
      }
      setPage(nextPage);
    } catch (e) {
      if (alive.current && token === request.current) setProblem(String(e));
    } finally {
      if (alive.current && token === request.current) setBusy(false);
    }
  }
  function switchMode(m: "puzzles" | "games") {
    setMode(m);
    setRows([]);
    setGames([]);
    setMore(false);
    setPage(1);
    cursors.current = [undefined];
  }
  async function openPuzzle(p: Puzzle) {
    setBusy(true);
    try {
      const [checked] = await window.chessApp.libraryLookup([p.id]);
      if (checked && alive.current) setActive(checked);
    } catch (e) {
      fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function openGame(id: number) {
    setBusy(true);
    try {
      const text = await window.chessApp.libraryGamePgn(id),
        [parsed] = parseGames(
          text,
          profile.id,
          profile.nickname || profile.name,
        );
      if (!parsed) throw Error("invalid_game");
      if (alive.current) {
        setPgn(text);
        setGame(parsed);
        setPly(0);
      }
    } catch (e) {
      fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  if (active)
    return (
      <PuzzlePlayer
        puzzle={active}
        number={1}
        total={1}
        back={() => setActive(null)}
      />
    );
  if (game)
    return (
      <>
        <button className="back-button" onClick={() => setGame(null)}>
          <ArrowLeft size={18} />
          {l("К базе партий", "Back to game database")}
        </button>
        <div className="page-heading">
          <div>
            <h1>
              {game.headers.White} — {game.headers.Black}
            </h1>
            <p>
              {game.playedAt
                ? new Date(game.playedAt).toLocaleDateString(locale, {
                    timeZone: "UTC",
                  })
                : game.headers.UTCDate || game.headers.Date}{" "}
              · {game.result} · {game.headers.ECO}
            </p>
          </div>
        </div>
        <div className="game-layout">
          <section className="board-column">
            <Board fen={boardAt(game, ply).fen()} locale={locale} disabled />
            <div className="playback-controls">
              <button
                className="secondary"
                aria-label={l("В начало", "Start")}
                onClick={() => setPly(0)}
              >
                <ChevronsLeft />
              </button>
              <button
                className="secondary"
                aria-label={l("Предыдущий ход", "Previous move")}
                disabled={!ply}
                onClick={() => setPly(ply - 1)}
              >
                <ArrowLeft />
              </button>
              <span>
                {ply} / {game.moves.length}
              </span>
              <button
                className="secondary"
                aria-label={l("Следующий ход", "Next move")}
                disabled={ply === game.moves.length}
                onClick={() => setPly(ply + 1)}
              >
                <ArrowRight />
              </button>
              <button
                className="secondary"
                aria-label={l("В конец", "End")}
                onClick={() => setPly(game.moves.length)}
              >
                <ChevronsRight />
              </button>
            </div>
          </section>
          <section className="side-panel">
            <h2>
              {l("Партия из открытого архива", "Game from the open archive")}
            </h2>
            <p>
              {l(
                "Это сыгранная партия, а не образец безошибочной игры. Сохрани её в профиль, чтобы разобрать со Stockfish.",
                "This is a played game, not a model of perfect play. Save it to your profile to analyze it with Stockfish.",
              )}
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await window.chessApp.importPgn(pgn);
                  await refresh();
                  nav("history");
                } catch (e) {
                  fail(e);
                } finally {
                  if (alive.current) setBusy(false);
                }
              }}
            >
              {l("Сохранить для разбора", "Save for analysis")}
            </button>
            <MoveList
              game={game}
              selected={ply}
              onSelect={setPly}
              locale={locale}
              showQuality={false}
            />
          </section>
        </div>
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("Большая офлайн-база", "Extended offline database")}</h1>
          <p>
            {l(
              "Миллионы позиций и партий. Открывай только то, что хочешь изучить.",
              "Millions of positions and games. Open only what you want to study.",
            )}
          </p>
        </div>
        <DatabaseIcon size={30} />
      </div>
      {status && (
        <p className="database-summary">
          {l("Задачи", "Puzzles")}: {status.puzzleCount.toLocaleString(locale)}{" "}
          · {l("Партии", "Games")}: {status.gameCount.toLocaleString(locale)} ·{" "}
          {(status.bytes / 1024 ** 3).toFixed(1)}{" "}
          {l("ГБ на диске", "GiB on disk")} · {status.source}
        </p>
      )}
      {status && !status.puzzles && !status.games ? (
        <section className="settings-section">
          <h2>
            {l(
              "Дополнительный пакет ещё не установлен",
              "Additional data pack is not installed",
            )}
          </h2>
          <p>
            {l(
              "Основные 30 048 задач доступны в разделе «Задачи». Большой пакет можно скачать по инструкции LIBRARY.md и перенести в папку library-packs рядом с приложением. После установки перезапусти приложение.",
              "The core 30,048 puzzles are available in Puzzles. Download the extended pack following LIBRARY.md and place library-packs beside the app. Restart after installation.",
            )}
          </p>
          <button className="primary" onClick={() => nav("puzzles")}>
            {l("К основным задачам", "Open core puzzles")}
          </button>
        </section>
      ) : (
        <>
          <div className="tabs">
            <button
              className={mode === "puzzles" ? "active" : ""}
              disabled={busy || !status?.puzzles}
              onClick={() => switchMode("puzzles")}
            >
              {l("Все задачи Lichess", "All Lichess puzzles")}
            </button>
            <button
              className={mode === "games" ? "active" : ""}
              disabled={busy || !status?.games}
              onClick={() => switchMode("games")}
            >
              {l("Архив партий", "Game archive")}
            </button>
          </div>
          <form
            className="database-filters"
            onChange={() => {
              setRows([]);
              setGames([]);
              setMore(false);
              setPage(1);
              cursors.current = [undefined];
            }}
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            {mode === "puzzles" ? (
              <>
                <label>
                  {l("Сложность", "Difficulty")}
                  <select
                    value={level}
                    disabled={busy}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="first">{l("До 1000", "Under 1000")}</option>
                    <option value="beginner">1000–1499</option>
                    <option value="intermediate">1500–1999</option>
                    <option value="advanced">2000+</option>
                    <option value="all">{l("Любая", "Any")}</option>
                  </select>
                </label>
                <label>
                  {l("Тема", "Theme")}
                  <select
                    value={theme}
                    disabled={busy}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="all">{l("Все темы", "All themes")}</option>
                    {Object.keys(themes).map((t) => (
                      <option value={t} key={t}>
                        {themeName(t, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {l("ID задачи (необязательно)", "Puzzle ID (optional)")}
                  <input
                    value={puzzleId}
                    maxLength={20}
                    disabled={busy}
                    onChange={(e) => setPuzzleId(e.target.value)}
                    placeholder="00sHx"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  {l("Ник начинается с", "Player name starts with")}
                  <input
                    value={player}
                    maxLength={40}
                    disabled={busy}
                    onChange={(e) => setPlayer(e.target.value)}
                  />
                </label>
                <label>
                  {l("Код дебюта ECO", "Opening ECO code")}
                  <input
                    value={eco}
                    placeholder="C50"
                    pattern="[A-Ea-e][0-9]{0,2}"
                    maxLength={3}
                    disabled={busy}
                    onChange={(e) => setEco(e.target.value)}
                  />
                </label>
                <label>
                  {l("Рейтинг обоих игроков от", "Both players rated at least")}
                  <select
                    value={minElo}
                    disabled={busy}
                    onChange={(e) => setMinElo(Number(e.target.value))}
                  >
                    {[0, 1000, 1500, 2000, 2200, 2500].map((n) => (
                      <option key={n} value={n}>
                        {n || l("Любой", "Any")}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <button
              className="primary"
              disabled={
                busy || !(mode === "puzzles" ? status?.puzzles : status?.games)
              }
            >
              <Search size={17} />
              {l("Найти", "Search")}
            </button>
          </form>
          {busy && (
            <p role="status" className="notice">
              {l(
                "Загружаем… Интерфейс остаётся доступным.",
                "Loading… You can still navigate the app.",
              )}
            </p>
          )}
          {problem && (
            <p role="alert" className="notice">
              {l(
                "Не удалось выполнить запрос. Проверь фильтры и целостность пакета данных.",
                "Unable to complete the query. Check filters and data pack integrity.",
              )}
              {!status && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => void loadStatus()}
                >
                  {l("Повторить загрузку", "Retry loading")}
                </button>
              )}
            </p>
          )}
          <div className="library-list">
            {mode === "puzzles"
              ? rows.map((p) => (
                  <button
                    className="library-row"
                    disabled={busy}
                    key={p.id}
                    onClick={() => void openPuzzle(p)}
                  >
                    <span className="library-rating">
                      {p.rating}
                      <small>Lichess</small>
                    </span>
                    <div>
                      <strong>{themeName(p.theme, locale)}</strong>
                      <small>
                        {p.themes
                          ?.slice(0, 4)
                          .map((t) => themeName(t, locale))
                          .join(" · ")}
                      </small>
                    </div>
                    <span className="puzzle-id">
                      {p.id.replace("lichess_", "")}
                    </span>
                    <ArrowRight size={17} />
                  </button>
                ))
              : games.map((g) => (
                  <button
                    className="library-row database-game-row"
                    disabled={busy}
                    key={g.id}
                    onClick={() => void openGame(g.id)}
                  >
                    <span className="library-rating">{g.eco || "—"}</span>
                    <div>
                      <strong>
                        {g.white} ({g.white_elo}) — {g.black} ({g.black_elo})
                      </strong>
                      <small>
                        {g.opening} · {g.date}
                      </small>
                    </div>
                    <span>{g.result}</span>
                    <ArrowRight size={17} />
                  </button>
                ))}
          </div>
          {!busy && !rows.length && !games.length && (
            <p className="empty-inline">
              {l(
                "Выбери фильтры и нажми «Найти». Если список пуст, попробуй другие параметры.",
                "Choose filters and press Search. If the list is empty, try different filters.",
              )}
            </p>
          )}
          <div className="pagination">
            <button
              className="secondary"
              disabled={busy || page < 2}
              onClick={() => void search(page - 1)}
            >
              {l("Назад", "Previous")}
            </button>
            <span>{page}</span>
            <button
              className="secondary"
              disabled={busy || !more}
              onClick={() => void search(page + 1)}
            >
              {l("Далее", "Next")}
            </button>
          </div>
        </>
      )}
      {status?.issue === "game_payload_unavailable" && (
        <p role="alert" className="notice">
          {l(
            "Файл с партиями отсутствует или недоступен. Перенеси папку library-packs целиком, затем перезапусти приложение.",
            "The game payload is missing or unavailable. Copy the entire library-packs folder, then restart the app.",
          )}
        </p>
      )}
    </>
  );
}
