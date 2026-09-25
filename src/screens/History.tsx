import { useState } from "react";
import {
  Download,
  Upload,
  Search,
  ArrowRight,
  FileText,
  History,
} from "lucide-react";
import { useApp } from "../ui/context";
export function HistoryScreen() {
  const { snapshot, profile, locale, l, t, nav, refresh, fail } = useApp();
  const [text, setText] = useState(""),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const games = snapshot.database.games
    .filter(
      (g) =>
        g.profileId === profile.id &&
        (filter === "all" ||
          (filter === "bots" && g.bot) ||
          (filter === "humans" && !g.bot)) &&
        `${g.headers.White} ${g.headers.Black}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (b.playedAt ?? "").localeCompare(a.playedAt ?? ""));
  async function doImport(value = text) {
    setBusy(true);
    try {
      const count = await window.chessApp.importPgn(value);
      await refresh();
      setText("");
      setStatus(
        l(
          `Добавлено: ${count.added}. Уже были в истории: ${count.skipped}.`,
          `Added: ${count.added}. Already in your history: ${count.skipped}.`,
        ),
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("Твоя шахматная история", "Your chess history")}</h1>
          <p>
            {l(
              "Партии, к которым стоит вернуться. Прогресс, который остаётся с тобой.",
              "Games worth revisiting. Progress that stays with you.",
            )}
          </p>
        </div>
        <History size={32} />
      </div>
      <div className="import-panel">
        <div>
          <FileText size={25} />
          <h2>{l("Добавить партию", "Import a game")}</h2>
          <p>
            {l(
              "Вставь PGN или ходы: 1. e4 e5 2. Nf3 Nc6 …",
              "Paste a PGN or moves: 1. e4 e5 2. Nf3 Nc6 …",
            )}
          </p>
        </div>
        <textarea
          value={text}
          maxLength={10000000}
          onChange={(e) => setText(e.target.value)}
          placeholder={"1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *"}
          aria-label="PGN"
        />
        <div className="import-actions">
          <button
            className="primary"
            disabled={!text.trim() || busy}
            onClick={() => void doImport()}
          >
            <Upload size={17} />
            {l("Импортировать", "Import")}
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void window.chessApp
                .openPgn()
                .then((value) => {
                  if (value) void doImport(value);
                })
                .catch(fail)
            }
          >
            <FileText size={17} />
            {l("Открыть PGN", "Open PGN")}
          </button>
          {
            <button
              className="text-button"
              onClick={() =>
                void window.chessApp
                  .importArchive()
                  .then(async (result) => {
                    await refresh();
                    setStatus(
                      l(
                        `Из архива добавлено ${result.added} партий.`,
                        `Added ${result.added} archived games.`,
                      ),
                    );
                  })
                  .catch(fail)
              }
            >
              {l("Импорт папки PGN", "Import PGN folder")}
            </button>
          }
        </div>
        {status && (
          <p className="good-text" role="status">
            {status}
          </p>
        )}
      </div>
      <div className="history-toolbar">
        <div className="tabs">
          {["all", "humans", "bots"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? l("Все партии", "All games")
                : f === "humans"
                  ? l("С людьми", "Against people")
                  : l("С ботами", "Against bots")}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={l("Найти соперника", "Find opponent")}
          />
        </div>
      </div>
      <div className="game-table">
        {games.map((g) => (
          <div className="game-table-row" key={g.id}>
            <span
              className={`result-tile ${g.result === "*" ? "pending" : g.result === (g.playerColor === "w" ? "1-0" : "0-1") ? "win" : "loss"}`}
            >
              {g.result === "*"
                ? "·"
                : g.result === "1/2-1/2"
                  ? "½"
                  : g.result === (g.playerColor === "w" ? "1-0" : "0-1")
                    ? "+"
                    : "−"}
            </span>
            <button className="game-name" onClick={() => nav("review", g.id)}>
              <strong>
                {g.headers.White ?? "White"} <span>vs</span>{" "}
                {g.headers.Black ?? "Black"}
              </strong>
              <small>
                {g.playedAt ?? l("Дата неизвестна", "Unknown date")} ·{" "}
                {g.headers.TimeControl ?? "—"} · {g.result}
              </small>
            </button>
            <span className="muted">
              {g.analysis.length}/{g.moves.length}
            </span>
            <button
              className="icon-button"
              title={l("Экспорт PGN", "Export PGN")}
              onClick={() => void window.chessApp.exportPgn(g.id).catch(fail)}
            >
              <Download size={17} />
            </button>
            <button className="secondary" onClick={() => nav("review", g.id)}>
              {t("review")}
              <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </div>
      {!games.length && (
        <div className="empty-state compact">
          <History size={35} />
          <p>
            {l(
              "В этом профиле пока нет подходящих партий.",
              "No matching games in this profile yet.",
            )}
          </p>
        </div>
      )}
    </>
  );
}
