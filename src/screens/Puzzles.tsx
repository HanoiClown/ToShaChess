import { useState, useMemo } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Target,
  Check,
  Search,
  BookOpen,
} from "lucide-react";
import { useApp } from "../ui/context";
import { puzzles, type Puzzle } from "../content/puzzles";
import { filterPuzzles, levels, themes, themeName } from "../library/catalogue";
import { PuzzlePlayer } from "./PuzzlePlayer";
import { dailyPuzzles, localDay } from "../library/daily";
export function Puzzles({ endgames = false }: { endgames?: boolean }) {
  const { profile, locale, l, snapshot } = useApp(),
    progress = snapshot.database.progress[profile.id];
  const [mode, setMode] = useState(
      endgames
        ? "endgames"
        : progress.reviews.some((r) => r.due <= new Date().toISOString())
          ? "mistakes"
          : "library",
    ),
    [level, setLevel] = useState(profile.level === "new" ? "first" : "all"),
    [theme, setTheme] = useState("all"),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("easy"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [queue, setQueue] = useState<Puzzle[]>([]),
    [index, setIndex] = useState(0);
  const solved = useMemo(
    () =>
      new Set(progress.attempts.filter((a) => a.correct).map((a) => a.itemId)),
    [progress.attempts],
  );
  const mistakes = useMemo(
    () =>
      [...progress.reviews]
        .sort((a, b) => a.due.localeCompare(b.due))
        .map(
          (r) =>
            puzzles.find((p) => p.id === r.id) ??
            ({
              id: r.id,
              fen: r.fen,
              best: r.best,
              line: [r.best],
              theme: r.theme,
              source: "personal",
              score: { cp: 0, mate: null },
              depth: 0,
              difficulty: "practice",
            } as Puzzle),
        ),
    [progress.reviews],
  );
  const base =
    mode === "favorites"
      ? puzzles.filter((p) => progress.favorites.includes(p.id))
      : mode === "daily"
        ? dailyPuzzles(puzzles, localDay(), profile.level)
        : mode === "mistakes"
          ? mistakes
          : mode === "starter"
            ? puzzles.filter((p) => p.difficulty === "starter")
            : mode === "endgames"
              ? puzzles.filter((p) => p.themes?.includes("endgame"))
              : puzzles;
  const filtered = useMemo(
    () =>
      filterPuzzles(
        base,
        {
          level: ["mistakes", "daily", "favorites"].includes(mode)
            ? "all"
            : level,
          theme,
          solved: status,
          sort,
          search: query,
        },
        solved,
      ),
    [
      mode,
      level,
      theme,
      status,
      sort,
      query,
      solved,
      progress.reviews,
      progress.favorites,
    ],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 16)),
    currentPage = Math.min(page, pages - 1),
    active = queue[index];
  function choose(p: Puzzle) {
    setQueue(filtered);
    setIndex(filtered.indexOf(p));
    document.querySelector(".workspace")?.scrollTo(0, 0);
  }
  const themeKeys = Object.keys(themes).filter((t) =>
    base.some((p) => (p.themes ?? [p.theme]).includes(t)),
  );
  if (active)
    return (
      <PuzzlePlayer
        key={active.id}
        puzzle={active}
        number={index + 1}
        total={queue.length}
        back={() => setQueue([])}
        next={index + 1 < queue.length ? () => setIndex(index + 1) : undefined}
      />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {endgames
              ? l("Мастерская эндшпиля", "Endgame workshop")
              : l("Библиотека тактики", "Tactics library")}
          </h1>
          <p>
            {l(
              "Маты, комбинации и защита. Найди всю последовательность ходов.",
              "Mates, combinations and defence. Find the complete sequence.",
            )}
          </p>
        </div>
        <span className="quiet-badge">
          <BookOpen size={18} />
          {puzzles.length.toLocaleString(locale)}{" "}
          {l("позиций во всей библиотеке", "positions in the full library")}
        </span>
      </div>
      <div className="tabs library-tabs">
        {(endgames
          ? ["endgames"]
          : ["library", "starter", "endgames", "mistakes", "favorites", "daily"]
        ).map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => {
              setMode(m);
              setTheme("all");
              setStatus("all");
              setQuery("");
              setPage(0);
            }}
          >
            {
              (
                {
                  library: l("Все задачи", "All puzzles"),
                  starter: l("С нуля", "First steps"),
                  endgames: l("Окончания", "Endgames"),
                  mistakes: l("Мои ошибки", "My mistakes"),
                  favorites: l("Избранное", "Favorites"),
                  daily: l("Пять задач дня", "Daily five"),
                } as Record<string, string>
              )[m]
            }
            <span className="count">
              {m === "library"
                ? puzzles.length
                : m === "starter"
                  ? 8
                  : m === "endgames"
                    ? puzzles.filter((p) => p.themes?.includes("endgame"))
                        .length
                    : m === "favorites"
                      ? progress.favorites.length
                      : m === "daily"
                        ? 5
                        : mistakes.length}
            </span>
          </button>
        ))}
      </div>
      {mode === "daily" && (
        <p className="notice">
          {l(
            "Пять позиций на сегодня. Подборка обновляется каждый день; сложность зависит от учебного маршрута профиля.",
            "Five positions for today. A fresh set each day, matched to your profile’s starting path.",
          )}{" "}
          {l("Решено", "Solved")}: {base.filter((p) => solved.has(p.id)).length}{" "}
          / {base.length}
        </p>
      )}
      {mode === "favorites" && !base.length && (
        <p className="notice">
          {l(
            "Открой любую задачу и нажми «В избранное», чтобы сохранить её здесь.",
            "Open any puzzle and choose Add to favorites to save it here.",
          )}
        </p>
      )}
      <div className="library-filters">
        <label>
          {l("Сложность", "Difficulty")}
          <select
            aria-label={l("Сложность задач", "Puzzle difficulty")}
            value={level}
            disabled={["mistakes", "daily", "favorites"].includes(mode)}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">{l("Любая сложность", "All levels")}</option>
            {Object.entries(levels).map(([id, n]) => (
              <option key={id} value={id}>
                {n[locale === "ru" ? 0 : 1]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {l("Тема", "Theme")}
          <select
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">{l("Все темы", "All themes")}</option>
            {themeKeys.map((t) => (
              <option key={t} value={t}>
                {themeName(t, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {l("Прогресс", "Progress")}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">{l("Все позиции", "All positions")}</option>
            <option value="new">{l("Ещё не решены", "Not solved yet")}</option>
            <option value="done">{l("Решены", "Solved")}</option>
          </select>
        </label>
        <label>
          {l("Порядок", "Order")}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="easy">
              {l("От простого к сложному", "Easiest first")}
            </option>
            <option value="hard">
              {l("Сложные сначала", "Hardest first")}
            </option>
            <option value="unseen">
              {l("Нерешённые сначала", "Unsolved first")}
            </option>
          </select>
        </label>
      </div>
      <div className="theme-shortcuts">
        {(mode === "endgames"
          ? [
              "pawnEndgame",
              "rookEndgame",
              "bishopEndgame",
              "knightEndgame",
              "queenEndgame",
              "promotion",
            ]
          : ["mateIn1", "mateIn2", "mateIn3", "fork", "pin", "defensiveMove"]
        ).map((t) => (
          <button
            key={t}
            className={theme === t ? "active" : ""}
            onClick={() => {
              setTheme(theme === t ? "all" : t);
              setPage(0);
            }}
          >
            {themeName(t, locale)}{" "}
            <span>{base.filter((p) => p.themes?.includes(t)).length}</span>
          </button>
        ))}
      </div>
      <div className="section-heading library-summary">
        <div>
          <strong>
            {filtered.length.toLocaleString(locale)}{" "}
            {l("подходящих задач", "matching puzzles")}
          </strong>
          <p className="muted">
            {l(
              "Рейтинг задачи Lichess — ориентир сложности, не твой игровой рейтинг.",
              "Lichess puzzle ratings describe difficulty, not your playing rating.",
            )}
          </p>
        </div>
        <button
          className="primary"
          disabled={!filtered.length}
          onClick={() =>
            choose(filtered.find((p) => !solved.has(p.id)) ?? filtered[0])
          }
        >
          {l("Начать подборку", "Start collection")}
          <ArrowRight size={18} />
        </button>
      </div>
      <label className="library-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder={l("Найти задачу по ID", "Find a puzzle by ID")}
        />
      </label>
      {!filtered.length ? (
        <div className="empty-state compact">
          <Target size={36} />
          <p>
            {mode === "mistakes"
              ? l(
                  "После ошибок в партиях и задачах здесь появятся повторения.",
                  "Reviews appear here after mistakes in games and puzzles.",
                )
              : l(
                  "Нет задач с такими фильтрами. Измени сложность или тему.",
                  "No puzzles match these filters. Change the level or theme.",
                )}
          </p>
        </div>
      ) : (
        <div className="library-list">
          {filtered.slice(currentPage * 16, currentPage * 16 + 16).map((p) => (
            <button
              className="library-row"
              key={p.id}
              onClick={() => choose(p)}
            >
              <span className="library-rating">
                {p.rating ?? "—"}
                <small>{p.rating ? "Lichess" : l("Основы", "Basics")}</small>
              </span>
              <div>
                <strong>{themeName(p.theme, locale)}</strong>
                <small>
                  {(p.themes ?? [p.theme])
                    .filter((t) => themes[t])
                    .slice(0, 4)
                    .map((t) => themeName(t, locale))
                    .join(" · ")}{" "}
                  · {l("Ходы", "Moves")}: {Math.ceil(p.line.length / 2)}
                </small>
              </div>
              <span className="puzzle-id">{p.id.replace("lichess_", "")}</span>
              {solved.has(p.id) ? (
                <Check size={20} />
              ) : (
                <ArrowRight size={19} />
              )}
            </button>
          ))}
        </div>
      )}
      <div className="pagination">
        <button
          className="secondary"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          <ArrowLeft size={17} />
          {l("Назад", "Previous")}
        </button>
        <span>
          {currentPage + 1} / {pages}
        </span>
        <button
          className="secondary"
          disabled={currentPage + 1 >= pages}
          onClick={() => setPage(currentPage + 1)}
        >
          {l("Далее", "Next")}
          <ArrowRight size={17} />
        </button>
      </div>
      <p className="source-note">
        {l(
          "30 000 задач Lichess · CC0 · загружены 25.09.2026. Дополнительно — учебные позиции и твои ошибки.",
          "30,000 Lichess puzzles · CC0 · downloaded 2026-09-25. Plus introductory positions and your own mistakes.",
        )}
      </p>
    </>
  );
}
