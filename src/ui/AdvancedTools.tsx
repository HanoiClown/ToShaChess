import { useEffect, useRef, useState } from "react";
import { ChevronDown, FolderOpen, Pause, Play, RefreshCw } from "lucide-react";
import { boardAt, playUci, positionId } from "../chess/game";
import { scoreText } from "../analysis/evaluate";
import type { Locale, Position } from "../shared/contracts";
import type {
  ProviderStatus,
  SearchAnalysis,
} from "../shared/engine-providers";
import type {
  AdvancedToolsApi,
  ExplorerRatingBand,
  ExplorerResult,
  ExplorerStatus,
  OptionalEngineConfig,
  OptionalPackState,
  TablebaseResult,
} from "../shared/optional-tools";
import "./advanced-tools.css";

const basename = (path: string) => path.split(/[\\/]/).pop() ?? path;
function bytes(value: number, locale: Locale) {
  return `${(value / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}
function san(position: Position, moves: string[]) {
  try {
    const board = boardAt(position);
    return moves.map((move) => playUci(board, move).san).join(" ");
  } catch {
    return moves.join(" ");
  }
}
function wdlLabel(value: number, ru: boolean) {
  return (
    {
      2: ru ? "Выигрыш" : "Win",
      1: ru
        ? "Выигрыш без правила 50 ходов"
        : "Win without the fifty-move rule",
      0: ru ? "Ничья" : "Draw",
      "-1": ru
        ? "Поражение без правила 50 ходов"
        : "Loss without the fifty-move rule",
      "-2": ru ? "Поражение" : "Loss",
    } as Record<string, string>
  )[value];
}

/** All filesystem selection and process work stays in the host behind this interface. */
export function AdvancedTools({
  locale,
  api,
  position,
  onPlayMove,
  focus = "all",
  onOpenSettings,
}: {
  locale: Locale;
  api: AdvancedToolsApi;
  position?: Position;
  onPlayMove?: (uci: string) => void;
  focus?: "all" | "search" | "tablebase" | "explorer";
  onOpenSettings?: () => void;
}) {
  const embedded = focus !== "all";
  const ru = locale === "ru",
    l = (a: string, b: string) => (ru ? a : b);
  const [config, setConfig] = useState<OptionalEngineConfig | null>(null);
  const [draft, setDraft] = useState<OptionalEngineConfig | null>(null);
  const [engineStatus, setEngineStatus] = useState<ProviderStatus | null>(null);
  const [packs, setPacks] = useState<OptionalPackState[]>([]);
  const [index, setIndex] = useState<ExplorerStatus | null>(null);
  const [maxGames, setMaxGames] = useState("50000");
  const [fullMoves, setFullMoves] = useState("12");
  const [ratingBand, setRatingBand] = useState<ExplorerRatingBand>("all");
  const [search, setSearch] = useState<SearchAnalysis | null>(null);
  const [explorer, setExplorer] = useState<ExplorerResult | null>(null);
  const [ending, setEnding] = useState<TablebaseResult | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0),
    mounted = useRef(true),
    activeRequest = useRef<string | null>(null);
  const key = position ? positionId(position) : "";
  const pieceCount = position
    ? boardAt(position).board().flat().filter(Boolean).length
    : 0;
  const endingEligible =
    !!position && (pieceCount <= 5 || boardAt(position).isGameOver());
  const positionRef = useRef(position);
  positionRef.current = position;

  async function refresh() {
    const [status, nextPacks, nextIndex] = await Promise.all([
      api.engineStatus(),
      api.optionalPacks(),
      api.explorerStatus(),
    ]);
    if (mounted.current) {
      setEngineStatus(status);
      setPacks(nextPacks);
      setIndex(nextIndex);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void api
      .engineConfig()
      .then((value) => {
        if (mounted.current) {
          setConfig(value);
          setDraft(value);
        }
      })
      .catch((err) => {
        if (mounted.current) setError(String(err.message ?? err));
      });
    void refresh().catch((err) => {
      if (mounted.current) setError(String(err.message ?? err));
    });
    return () => {
      mounted.current = false;
      generation.current++;
      if (activeRequest.current)
        void api.cancel(activeRequest.current).catch(() => {});
    };
  }, [api]);
  useEffect(() => {
    generation.current++;
    setSearch(null);
    setExplorer(null);
    setEnding(null);
    setError("");
    if (activeRequest.current) {
      void api.cancel(activeRequest.current).catch(() => {});
      activeRequest.current = null;
    }
  }, [key, api]);
  const updating =
    Object.values(busy).some(Boolean) ||
    packs.some((pack) => pack.status === "installing") ||
    index?.state === "building";
  useEffect(() => {
    if (!updating) return;
    const timer = setInterval(() => {
      void refresh().catch(() => {});
    }, 1500);
    return () => clearInterval(timer);
  }, [updating, api]);

  async function action(name: string, task: () => Promise<void>) {
    if (busy[name]) return;
    setBusy((old) => ({ ...old, [name]: true }));
    setError("");
    setNotice("");
    try {
      await task();
    } catch (err) {
      if (mounted.current && (err as Error).name !== "AbortError")
        setError(String((err as Error).message ?? err));
    } finally {
      if (mounted.current) {
        setBusy((old) => ({ ...old, [name]: false }));
        void refresh().catch(() => {});
      }
    }
  }
  async function choose(kind: "lc0" | "custom") {
    await action("config", async () => {
      const selected = await api.chooseEngine(kind);
      if (selected && mounted.current) setDraft(selected);
    });
  }
  async function inspect(kind: "search" | "explorer" | "tablebase") {
    if (!positionRef.current) return;
    const requested = {
      initialFen: positionRef.current.initialFen,
      moves: [...positionRef.current.moves],
    };
    const version = generation.current;
    await action(kind, async () => {
      if (kind === "search") {
        const requestId = crypto.randomUUID();
        activeRequest.current = requestId;
        try {
          const result = await api.compare({
            requestId,
            position: requested,
            limits: { timeMs: 2000, multiPv: 3 },
          });
          if (
            mounted.current &&
            version === generation.current &&
            result.positionKey === positionId(requested)
          )
            setSearch(result);
        } finally {
          if (activeRequest.current === requestId) activeRequest.current = null;
        }
      } else if (kind === "explorer") {
        const result = await api.explore(requested, ratingBand);
        if (
          mounted.current &&
          version === generation.current &&
          result.positionKey === positionId(requested)
        )
          setExplorer(result);
      } else {
        const result = await api.tablebase(requested);
        if (
          mounted.current &&
          version === generation.current &&
          result.positionKey === positionId(requested)
        )
          setEnding(result);
      }
    });
  }
  const stateLabel = (state: string) =>
    (
      ({
        idle: l("Не запущен", "Idle"),
        starting: l("Запускается", "Starting"),
        ready: l("Готов", "Ready"),
        busy: l("Считает", "Searching"),
        error: l("Ошибка", "Error"),
        closed: l("Выключен", "Off"),
        missing: l("Не установлен", "Not installed"),
        installing: l("Обрабатывается", "In progress"),
        cancelled: l("Приостановлен", "Paused"),
        building: l("Индексируется", "Indexing"),
      }) as Record<string, string>
    )[state] ?? state;
  const validLimits =
    Number.isInteger(Number(maxGames)) &&
    Number(maxGames) >= 1 &&
    Number(maxGames) <= 10000000 &&
    Number.isInteger(Number(fullMoves)) &&
    Number(fullMoves) >= 1 &&
    Number(fullMoves) <= 20;
  const reason = (value?: string) =>
    (
      ({
        too_many_pieces: l(
          "Нужна позиция с 3–5 фигурами, включая королей.",
          "Choose a position with 3–5 pieces, including kings.",
        ),
        castling_rights: l(
          "Таблицы не поддерживают сохранённое право рокировки.",
          "Tablebases do not support castling rights.",
        ),
        runtime_missing: l(
          "Установите пакет Maia CPU: он включает локальный Python для чтения таблиц.",
          "Install the Maia CPU pack, which includes the local Python runtime used to read tables.",
        ),
        tables_missing: l(
          "Установите таблицы или выберите свою папку Syzygy в настройках инструментов.",
          "Install the tables or choose your Syzygy directory in tool settings.",
        ),
        missing_table: l(
          "Для этой позиции не хватает файлов WDL или DTZ. Проверьте полный пакет.",
          "WDL or DTZ files for this position are missing. Verify the complete pack.",
        ),
        fifty_move_claim: l(
          "Можно потребовать ничью по правилу 50 ходов.",
          "A draw can be claimed under the fifty-move rule.",
        ),
        checkmate: l("На доске мат.", "The position is checkmate."),
        draw: l(
          "Позиция ничейная по правилам.",
          "The position is a draw under the rules.",
        ),
      }) as Record<string, string>
    )[value ?? ""] ?? "";

  const Container = embedded ? "div" : "details";
  return (
    <Container className={`advanced-tools ${embedded ? "tool-content" : ""}`}>
      {!embedded && (
        <summary>
          <strong>
            {l(
              "Настройка дополнительных инструментов",
              "Configure optional tools",
            )}
          </strong>
          <ChevronDown size={20} aria-hidden="true" />
        </summary>
      )}
      <div className="advanced-body">
        {!embedded && (
          <p className="advanced-muted">
            {l(
              "Отдельный движок, статистика местного архива и точные таблицы окончаний. Все вычисления проходят на этом компьютере.",
              "An additional engine, statistics from your local archive, and endgame tablebases. All calculations run on this computer.",
            )}
          </p>
        )}
        {error && (
          <div className="advanced-error" role="alert">
            <strong>
              {l(
                "Не удалось завершить действие.",
                "The action could not be completed.",
              )}
            </strong>
            <p>
              {l(
                "Проверьте выбранные файлы и повторите действие.",
                "Check the selected files and retry.",
              )}
            </p>
            <details>
              <summary>{l("Подробности", "Details")}</summary>
              <p>{error}</p>
            </details>
          </div>
        )}
        {notice && <p role="status">{notice}</p>}
        {position && (
          <section className="advanced-section">
            {!embedded && <h3>{l("Текущая позиция", "Current position")}</h3>}
            {focus === "search" && (
              <p>
                {l(
                  "Сравни идеи другого движка с обычным анализом Stockfish. Это может помочь найти альтернативный план в сложной позиции.",
                  "Compare another engine's ideas with the standard Stockfish analysis to look for a different plan in a complex position.",
                )}
              </p>
            )}
            {focus === "tablebase" && (
              <p>
                {l(
                  "Узнай точный исход при правильной игре, когда на доске осталось мало фигур. Таблицы Syzygy показывают выигрыш, ничью или поражение.",
                  "Find the exact outcome with correct play when few pieces remain. Syzygy tables show a win, draw or loss.",
                )}
              </p>
            )}
            {focus === "search" && !config && (
              <p className="field-help">
                {l(
                  "Подключи дополнительный движок в настройках инструментов.",
                  "Connect an additional engine in tool settings.",
                )}
              </p>
            )}
            {focus === "tablebase" && !endingEligible && (
              <p className="field-help">
                {l(
                  "Нужна позиция с 3–5 фигурами, включая королей. Сейчас на доске",
                  "Choose a position with 3–5 pieces, including kings. Pieces currently on the board:",
                )}{" "}
                {pieceCount}.
              </p>
            )}
            {(focus === "all" ||
              focus === "search" ||
              focus === "tablebase") && (
              <div className="advanced-actions">
                {(focus === "all" || (focus === "search" && config)) && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={!config || busy.search}
                    onClick={() => void inspect("search")}
                  >
                    <Play size={17} aria-hidden="true" />
                    {busy.search
                      ? l("Анализ…", "Searching…")
                      : config
                        ? config.name
                        : l(
                            "Сначала выберите движок",
                            "Choose an engine below",
                          )}
                  </button>
                )}
                {busy.search && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (activeRequest.current)
                        void action("cancel", () =>
                          api.cancel(activeRequest.current!),
                        );
                    }}
                  >
                    <Pause size={17} aria-hidden="true" />
                    {l("Остановить", "Stop")}
                  </button>
                )}
                {(focus === "all" || focus === "tablebase") && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy.tablebase || !endingEligible}
                    onClick={() => void inspect("tablebase")}
                  >
                    {busy.tablebase
                      ? l("Проверка…", "Probing…")
                      : l("Проверить окончание", "Probe endgame")}
                  </button>
                )}
              </div>
            )}
            {(focus === "all" || focus === "search") && search && (
              <div className="advanced-result" aria-live="polite">
                <h4>
                  {search.provider.name}
                  {search.provider.version &&
                  search.provider.version !== search.provider.name
                    ? ` · ${search.provider.version}`
                    : ""}
                </h4>
                <p className="advanced-muted">
                  {l("Оценка за белых", "White perspective")} ·{" "}
                  {search.limits.timeMs / 1000} {l("с на поиск", "s search")}{" "}
                  {search.provider.network
                    ? `· ${basename(search.provider.network)}`
                    : ""}
                </p>
                {!search.lines.length ? (
                  <p>
                    {l(
                      "Движок не вернул продолжение. Попробуйте ещё раз.",
                      "The engine returned no continuation. Try again.",
                    )}
                  </p>
                ) : (
                  <ol className="advanced-lines">
                    {search.lines.map((line, i) => (
                      <li key={i}>
                        <strong>{scoreText(line.score)}</strong>
                        <span>{san(position, line.pv)}</span>
                        <small>
                          {l("Глубина", "Depth")} {line.depth}
                        </small>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="advanced-muted">
                  {l(
                    "Это оценка выбранного движка, а не точность партии. Отличающиеся оценки Stockfish и Lc0 сами по себе не доказывают ошибку.",
                    "This is the selected engine’s evaluation, not game accuracy. Differences between Stockfish and Lc0 scores do not by themselves prove a mistake.",
                  )}
                </p>
              </div>
            )}
            {(focus === "all" || focus === "tablebase") && ending && (
              <div className="advanced-result" aria-live="polite">
                <h4>
                  Syzygy ·{" "}
                  {l("за сторону, которая ходит", "side-to-move perspective")}
                </h4>
                {ending.status === "available" ? (
                  <>
                    <p>
                      <strong>{wdlLabel(ending.wdl!, ru)}</strong>
                      {ending.source === "syzygy" && <> · DTZ {ending.dtz}</>}
                    </p>
                    {ending.source === "syzygy" && (
                      <p className="advanced-muted">
                        {l(
                          "DTZ — полуходы до взятия, хода пешкой или завершения партии при правильной игре. Это не показатель расстояния до мата (DTM). Значение может округляться на один полуход. Учтён счётчик правила 50 ходов.",
                          "DTZ counts plies to a capture, pawn move, or game end with correct play. It is not distance to mate (DTM). It may be rounded by one ply. The fifty-move clock is included.",
                        )}
                      </p>
                    )}
                    {ending.reason && <p>{reason(ending.reason)}</p>}
                    {ending.moves.length > 0 && (
                      <div className="advanced-table-wrap">
                        <table>
                          <caption>
                            {l(
                              "Результат после каждого хода за текущую сторону",
                              "Outcome after each move for the current side",
                            )}
                          </caption>
                          <thead>
                            <tr>
                              <th>{l("Ход", "Move")}</th>
                              <th>{l("Результат", "Outcome")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ending.moves.map((move) => (
                              <tr key={move.uci}>
                                <td>
                                  {onPlayMove ? (
                                    <button
                                      type="button"
                                      className="advanced-move"
                                      onClick={() => onPlayMove(move.uci)}
                                    >
                                      {san(position, [move.uci])}
                                    </button>
                                  ) : (
                                    san(position, [move.uci])
                                  )}
                                </td>
                                <td>{wdlLabel(move.wdl, ru)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p>
                    {reason(ending.reason) ||
                      l(
                        "Эта позиция пока недоступна в таблицах.",
                        "This position is not currently available in the tablebases.",
                      )}
                  </p>
                )}
              </div>
            )}
            {focus === "explorer" && (
              <p>
                {l(
                  "Посмотри, какие продолжения встречались в загруженных партиях и как они заканчивались. Фильтр помогает сравнить игроков похожего уровня.",
                  "See which continuations occurred in downloaded games and how they ended. Filter by rating to compare players at a similar level.",
                )}
              </p>
            )}
            {(focus === "all" || focus === "explorer") && (
              <div className="advanced-actions">
                <label className="advanced-field">
                  <span>
                    {l(
                      "Средний рейтинг обоих игроков",
                      "Average rating of both players",
                    )}
                  </span>
                  <select
                    value={ratingBand}
                    onChange={(e) => {
                      setRatingBand(e.target.value as ExplorerRatingBand);
                      setExplorer(null);
                      generation.current++;
                    }}
                  >
                    <option value="all">
                      {l("Любой рейтинг", "All ratings")}
                    </option>
                    <option value="under1000">&lt; 1000</option>
                    <option value="1000-1599">1000–1599</option>
                    <option value="1600-2199">1600–2199</option>
                    <option value="2200plus">2200+</option>
                    <option value="unknown">
                      {l("Без рейтинга", "Unknown rating")}
                    </option>
                  </select>
                </label>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy.explorer}
                  onClick={() => void inspect("explorer")}
                >
                  {busy.explorer
                    ? l("Читаем индекс…", "Reading index…")
                    : l("Ходы в местной базе", "Moves in local archive")}
                </button>
              </div>
            )}
            {(focus === "all" || focus === "explorer") && explorer && (
              <div className="advanced-result" aria-live="polite">
                <h4>{l("Дебютная статистика", "Opening statistics")}</h4>
                <p className="advanced-muted">
                  {explorer.status.source} ·{" "}
                  {explorer.status.indexedGames.toLocaleString(locale)}{" "}
                  {l("партий в индексе", "indexed games")}
                  {explorer.status.firstDate
                    ? ` · ${explorer.status.firstDate} — ${explorer.status.lastDate}`
                    : ""}
                </p>
                {explorer.status.state === "error" ? (
                  <p>
                    {l(
                      "База изменилась или индекс недоступен. Перестройте индекс в настройках инструментов.",
                      "The archive changed or the index is unavailable. Rebuild the index in tool settings.",
                    )}
                  </p>
                ) : !explorer.games ? (
                  <p>
                    {l(
                      "В этой выборке нет партий с такой позицией. Можно увеличить индекс или сменить рейтинг.",
                      "No games in this sample reach this position. Expand the index or change the rating filter.",
                    )}
                  </p>
                ) : (
                  <div className="advanced-table-wrap">
                    <table>
                      <caption>
                        {explorer.games.toLocaleString(locale)}{" "}
                        {l(
                          "партий в выбранной позиции",
                          "games at this position",
                        )}
                      </caption>
                      <thead>
                        <tr>
                          <th>{l("Ход", "Move")}</th>
                          <th>{l("Партий", "Games")}</th>
                          <th>
                            {l(
                              "Белые / ничья / чёрные",
                              "White / draw / Black",
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {explorer.moves.map((move) => (
                          <tr key={move.uci}>
                            <td>
                              {onPlayMove ? (
                                <button
                                  type="button"
                                  className="advanced-move"
                                  onClick={() => onPlayMove(move.uci)}
                                >
                                  {move.san}
                                </button>
                              ) : (
                                move.san
                              )}
                            </td>
                            <td>{move.games.toLocaleString(locale)}</td>
                            <td>
                              {[move.whiteWins, move.draws, move.blackWins]
                                .map(
                                  (count) =>
                                    `${Math.round((count * 100) / move.games)}%`,
                                )
                                .join(" / ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="advanced-muted">
                  {l(
                    "Частоты из установленной исторической выборки. Это не прогноз Maia и не оценка качества хода; проценты округлены.",
                    "Frequencies from the installed historical sample. These are not Maia predictions or move-quality scores; percentages are rounded.",
                  )}
                </p>
              </div>
            )}
          </section>
        )}
        {embedded && onOpenSettings && (
          <button
            className="text-button tool-settings-link"
            onClick={onOpenSettings}
          >
            {l("Открыть настройки инструментов", "Open tool settings")}
          </button>
        )}
        {!embedded && (
          <>
            <details className="advanced-section">
              <summary>
                <h3>{l("Выбор движка", "Choose an engine")}</h3>
              </summary>
              <p>
                {config
                  ? `${config.name} · ${stateLabel(engineStatus?.state ?? "idle")}`
                  : l(
                      "Дополнительный движок не выбран.",
                      "No additional engine selected.",
                    )}
              </p>
              <div className="advanced-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy.config}
                  onClick={() => void choose("lc0")}
                >
                  <FolderOpen size={17} aria-hidden="true" />
                  {l("Выбрать Lc0", "Choose Lc0")}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy.config}
                  onClick={() => void choose("custom")}
                >
                  {l("Другой UCI-движок", "Other UCI engine")}
                </button>
              </div>
              {draft && (
                <div className="advanced-config">
                  <label className="advanced-field">
                    <span>{l("Название", "Name")}</span>
                    <input
                      value={draft.name}
                      maxLength={80}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </label>
                  <p className="advanced-path">{draft.executable}</p>
                  {draft.id === "lc0" && (
                    <>
                      <div className="advanced-actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy.config}
                          onClick={() =>
                            void action("config", async () => {
                              const path = await api.chooseNetwork();
                              if (path)
                                setDraft((old) =>
                                  old ? { ...old, networkPath: path } : old,
                                );
                            })
                          }
                        >
                          {l("Выбрать сеть Lc0", "Choose Lc0 network")}
                        </button>
                        <span className="advanced-path">
                          {draft.networkPath
                            ? basename(draft.networkPath)
                            : l("Сеть не выбрана", "No network selected")}
                        </span>
                      </div>
                      <label className="advanced-field">
                        <span>{l("Вычисления", "Compute backend")}</span>
                        <select
                          value={draft.backend ?? "cpu"}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              backend: e.target.value as "cpu" | "cuda",
                            })
                          }
                        >
                          <option value="cpu">CPU · DNNL/BLAS</option>
                          <option value="cuda">
                            NVIDIA CUDA ·{" "}
                            {l(
                              "требует совместимой сборки",
                              "requires compatible build",
                            )}
                          </option>
                        </select>
                      </label>
                      <p className="advanced-muted">
                        {l(
                          "CPU работает без видеокарты. Для CUDA выберите соответствующую сборку Lc0. Сеть выбирается отдельно: размер, совместимость и лицензия зависят от её автора.",
                          "CPU works without a graphics card. CUDA requires a compatible Lc0 build. Choose a network separately: size, compatibility, and license depend on its author.",
                        )}
                      </p>
                    </>
                  )}
                  <div className="advanced-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={
                        busy.config ||
                        !draft.name.trim() ||
                        (draft.id === "lc0" && !draft.networkPath)
                      }
                      onClick={() =>
                        void action("config", async () => {
                          await api.configureEngine(draft);
                          setConfig(draft);
                          setNotice(
                            l(
                              "Движок выбран. Запустите анализ позиции для проверки.",
                              "Engine selected. Analyze a position to check it.",
                            ),
                          );
                        })
                      }
                    >
                      {l("Сохранить движок", "Save engine")}
                    </button>
                  </div>
                </div>
              )}
              {config && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy.config}
                  onClick={() =>
                    void action("config", async () => {
                      await api.configureEngine(null);
                      setConfig(null);
                      setDraft(null);
                      setSearch(null);
                    })
                  }
                >
                  {l(
                    "Отключить дополнительный движок",
                    "Disable additional engine",
                  )}
                </button>
              )}
            </details>
            <details className="advanced-section">
              <summary>
                <h3>{l("Локальные пакеты", "Local packs")}</h3>
              </summary>
              <p className="advanced-muted">
                {l(
                  "Загрузка начинается только по кнопке. После установки интернет для этих инструментов не нужен.",
                  "Downloads begin only when requested. Installed tools work offline.",
                )}
              </p>
              {!packs.length && (
                <p>{l("Читаем список пакетов…", "Loading packs…")}</p>
              )}
              {packs.map((pack) => (
                <div className="advanced-pack" key={pack.id}>
                  <div className="advanced-pack-title">
                    <strong>{pack.title}</strong>
                    <span>{stateLabel(pack.status)}</span>
                  </div>
                  <p className="advanced-muted">
                    {l("Загрузка", "Download")}:{" "}
                    {bytes(pack.downloadBytes, locale)}
                    {pack.installedBytes > 0
                      ? ` · ${l("На диске", "On disk")}: ${bytes(pack.installedBytes, locale)}`
                      : ""}
                  </p>
                  <p className="advanced-muted">
                    {pack.license} ·{" "}
                    <a href={pack.source} target="_blank" rel="noreferrer">
                      {l("Источник и условия", "Source and terms")}
                    </a>
                  </p>
                  {pack.status === "installing" && (
                    <progress
                      value={Math.min(pack.bytes, pack.downloadBytes)}
                      max={Math.max(1, pack.downloadBytes)}
                      aria-label={`${pack.title}: ${l("выполнение", "progress")}`}
                    />
                  )}
                  {pack.message && (
                    <p className="advanced-path">{pack.message}</p>
                  )}
                  <div className="advanced-actions">
                    {pack.status === "installing" ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          void action(`cancel-${pack.id}`, () =>
                            api.cancelOptionalPack(pack.id),
                          )
                        }
                      >
                        {l("Приостановить", "Pause")}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy[pack.id]}
                          onClick={() =>
                            void action(pack.id, () =>
                              api.installOptionalPack(pack.id),
                            )
                          }
                        >
                          {pack.status === "ready"
                            ? l("Переустановить", "Reinstall")
                            : pack.status === "cancelled"
                              ? l("Продолжить загрузку", "Resume download")
                              : l("Установить", "Install")}
                        </button>
                        {pack.status === "ready" && (
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy[pack.id]}
                            onClick={() =>
                              void action(pack.id, () =>
                                api.verifyOptionalPack(pack.id),
                              )
                            }
                          >
                            {l("Проверить файлы", "Verify files")}
                          </button>
                        )}
                        {pack.status !== "missing" && (
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy[pack.id]}
                            onClick={() =>
                              void action(pack.id, () =>
                                api.removeOptionalPack(pack.id),
                              )
                            }
                          >
                            {l("Удалить пакет", "Remove pack")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="secondary"
                disabled={busy.tables}
                onClick={() =>
                  void action("tables", async () => {
                    const path = await api.chooseTablebaseDirectory();
                    if (path) {
                      setEnding(null);
                      setNotice(
                        `${l("Папка таблиц", "Tablebase directory")}: ${path}`,
                      );
                    }
                  })
                }
              >
                <FolderOpen size={17} aria-hidden="true" />
                {l("Своя папка Syzygy", "Use own Syzygy directory")}
              </button>
            </details>
            <details className="advanced-section">
              <summary>
                <h3>{l("Индекс дебютов", "Opening index")}</h3>
              </summary>
              <p className="advanced-muted">
                {l(
                  "Считается по уже установленному архиву партий в фоновом процессе. Частичный индекс можно использовать и дополнять. Максимум на диске — около 1 GiB.",
                  "Built from your installed game archive in a background process. Partial indexes can be used and expanded. Disk usage is capped at about 1 GiB.",
                )}
              </p>
              {index && (
                <p aria-live="polite">
                  {stateLabel(index.state)} ·{" "}
                  {index.processedGames.toLocaleString(locale)} /{" "}
                  {index.availableGames.toLocaleString(locale)}{" "}
                  {l("обработано", "processed")} ·{" "}
                  {index.indexedGames.toLocaleString(locale)}{" "}
                  {l("подходящих партий", "usable games")}
                  {index.skippedGames
                    ? ` · ${index.skippedGames.toLocaleString(locale)} ${l("пропущено", "skipped")}`
                    : ""}
                </p>
              )}
              {index?.error && <p className="advanced-path">{index.error}</p>}
              <div className="advanced-limit-fields">
                <label className="advanced-field">
                  <span>{l("Лимит партий", "Game limit")}</span>
                  <input
                    type="number"
                    min={1}
                    max={10000000}
                    step={1000}
                    value={maxGames}
                    onChange={(e) => setMaxGames(e.target.value)}
                    disabled={index?.state === "building"}
                  />
                </label>
                <label className="advanced-field">
                  <span>{l("Первые полные ходы", "First full moves")}</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={fullMoves}
                    onChange={(e) => setFullMoves(e.target.value)}
                    disabled={index?.state === "building"}
                  />
                </label>
              </div>
              <div className="advanced-actions">
                {index?.state === "building" ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      void action("cancel-index", () => api.cancelExplorer())
                    }
                  >
                    {l("Приостановить индексирование", "Pause indexing")}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy.index || !validLimits}
                      onClick={() =>
                        void action("index", async () => {
                          setIndex(
                            await api.buildExplorer({
                              maxGames: Number(maxGames),
                              maxPly: Number(fullMoves) * 2,
                            }),
                          );
                        })
                      }
                    >
                      {l("Построить / продолжить", "Build / resume")}
                    </button>
                    {Boolean(index?.processedGames) && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy.index || !validLimits}
                        onClick={() =>
                          void action("index", async () => {
                            setIndex(
                              await api.buildExplorer({
                                maxGames: Number(maxGames),
                                maxPly: Number(fullMoves) * 2,
                                rebuild: true,
                              }),
                            );
                            setExplorer(null);
                          })
                        }
                      >
                        <RefreshCw size={17} aria-hidden="true" />
                        {l("Перестроить с нуля", "Rebuild index")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </details>
          </>
        )}
      </div>
    </Container>
  );
}
