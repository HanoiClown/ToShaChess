import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Lightbulb,
} from "lucide-react";
import { useApp } from "../ui/context";
import { Board } from "../ui/Board";
import { START, playUci } from "../chess/game";
import { usePlySequence } from "../ui/usePlySequence";
import { playSound } from "../audio/sounds";
import {
  openings,
  openingName,
  openingPriority,
  openingLevel,
  family,
  type Opening,
} from "../library/openings";
import { pvSan } from "../analysis/evaluate";
export function Openings() {
  const { locale, l, nav, snapshot, profile } = useApp();
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("all"),
    [level, setLevel] = useState("all"),
    [priority, setPriority] = useState("all"),
    [gambits, setGambits] = useState(false),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<Opening | null>(null);
  const completed = snapshot.database.progress[profile.id].completed;
  const families = useMemo(() => [...new Set(openings.map(family))].sort(), []);
  const filtered = useMemo(
    () =>
      openings
        .filter(
          (o) =>
            (group === "all" || family(o) === group) &&
            (level === "all" || openingLevel(o) === level) &&
            (priority === "all" || openingPriority(o) === Number(priority)) &&
            (!gambits || /gambit/i.test(o.name)) &&
            `${o.name} ${openingName(o, "ru")} ${o.eco} ${o.pgn}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort(
          (a, b) =>
            openingPriority(a) - openingPriority(b) ||
            a.line.length - b.line.length ||
            a.name.localeCompare(b.name),
        ),
    [group, level, priority, gambits, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 18)),
    p = Math.min(page, pages - 1);
  if (selected)
    return (
      <OpeningPlayer
        key={selected.id}
        opening={selected}
        back={() => setSelected(null)}
      />
    );
  return (
    <>
      <button className="back-button" onClick={() => nav("learn")}>
        <ArrowLeft size={17} />
        {l("К урокам", "Back to lessons")}
      </button>
      <div className="page-heading">
        <div>
          <h1>{l("Атлас дебютов", "Opening atlas")}</h1>
          <p>
            {l(
              "От первого хода до варианта. Изучай на доске и проверяй память.",
              "From the first move to a variation. Explore on the board and test your memory.",
            )}
          </p>
        </div>
        <span className="quiet-badge">
          <BookOpen size={18} />
          {openings.length.toLocaleString(locale)} {l("вариантов", "lines")}
        </span>
      </div>
      <div className="library-filters">
        <label>
          {l("Семейство", "Family")}
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">{l("Все дебюты", "All openings")}</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {openingName({ name: f } as Opening, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {l("Длина варианта", "Line length")}
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">{l("Любая", "Any")}</option>
            <option value="first">
              {l("Короткий · до 4 ходов", "Short · up to 4 moves")}
            </option>
            <option value="beginner">
              {l("Базовый · до 7 ходов", "Basic · up to 7 moves")}
            </option>
            <option value="intermediate">
              {l("Средний · до 11 ходов", "Medium · up to 11 moves")}
            </option>
            <option value="advanced">
              {l("Длинный · 12+ ходов", "Long · 12+ moves")}
            </option>
          </select>
        </label>
        <label>
          {l("Порядок изучения", "Learning priority")}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">
              {l("Все, базовые сначала", "All, essentials first")}
            </option>
            <option value="1">
              {l("1 · Освоить сначала", "1 · Learn first")}
            </option>
            <option value="2">
              {l("2 · Расширять репертуар", "2 · Expand repertoire")}
            </option>
            <option value="3">
              {l("3 · Изучать осторожно", "3 · Explore cautiously")}
            </option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={gambits}
            onChange={(e) => {
              setGambits(e.target.checked);
              setPage(0);
            }}
          />
          {l("Только гамбиты", "Gambits only")}
        </label>
      </div>
      <label className="library-search">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder={l(
            "Название, ECO или ходы: e4 e5…",
            "Name, ECO or moves: e4 e5…",
          )}
        />
      </label>
      <p className="source-note">
        {l(
          "Приоритет — рекомендация для начинающего, не оценка силы дебюта. Редкие жертвы могут быть рискованными. Названия вариантов сохранены из источника.",
          "Priority is a beginner learning recommendation, not an objective ranking. Rare sacrifices can be risky. Variation names are preserved from the source.",
        )}
      </p>
      <div className="section-heading">
        <strong>
          {filtered.length} {l("вариантов найдено", "lines found")}
        </strong>
      </div>
      <div className="library-list">
        {filtered.slice(p * 18, p * 18 + 18).map((o) => (
          <button
            key={o.id}
            className="library-row"
            onClick={() => {
              setSelected(o);
              document.querySelector(".workspace")?.scrollTo(0, 0);
            }}
          >
            <span className="library-rating">
              {o.eco}
              <small>
                {l("Приоритет", "Priority")} {openingPriority(o)}
              </small>
            </span>
            <div>
              <strong>{openingName(o, locale)}</strong>
              <small>{o.pgn}</small>
            </div>
            {completed.includes(o.id) ? (
              <Check size={20} />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">
          {l(
            "Ничего не найдено. Попробуй другое название или ECO.",
            "No matches. Try another name or ECO code.",
          )}
        </p>
      )}
      <div className="pagination">
        <button
          className="secondary"
          disabled={p === 0}
          onClick={() => setPage(p - 1)}
        >
          {l("Назад", "Previous")}
        </button>
        <span>
          {p + 1} / {pages}
        </span>
        <button
          className="secondary"
          disabled={p + 1 >= pages}
          onClick={() => setPage(p + 1)}
        >
          {l("Далее", "Next")}
        </button>
      </div>
      <p className="source-note">Lichess chess-openings · CC0 · 25.09.2026</p>
    </>
  );
}
function OpeningPlayer({
  opening: o,
  back,
}: {
  opening: Opening;
  back: () => void;
}) {
  const { locale, l, fail, refresh } = useApp();
  const [ply, setPly] = useState(0),
    [practice, setPractice] = useState(false),
    [color, setColor] = useState<"w" | "b">("w"),
    [hint, setHint] = useState(false),
    [feedback, setFeedback] = useState(""),
    [saving, setSaving] = useState(false);
  const sequence = usePlySequence(o.id);
  const board = new Chess();
  for (const u of o.line.slice(0, ply)) playUci(board, u);
  const done = ply >= o.line.length;
  async function move(uci: string) {
    if (!practice || done || saving || sequence.playing) return;
    if (uci !== o.line[ply]) {
      playSound("error");
      setFeedback(
        l(
          "Легальный ход, но в этом упражнении нужно воспроизвести выбранный вариант.",
          "Legal move, but this exercise asks you to reproduce the selected line.",
        ),
      );
      return;
    }
    let next = ply + 1;
    if (next < o.line.length) next++;
    setHint(false);
    setFeedback("");
    if (!(await sequence.play(ply, next, setPly))) return;
    setFeedback(
      l(
        "Верно. Обрати внимание на ответ соперника.",
        "Correct. Notice your opponent’s reply.",
      ),
    );
    if (next >= o.line.length) {
      playSound("success");
      setSaving(true);
      try {
        await window.chessApp.completeLesson(o.id);
        await refresh();
        setFeedback(
          l(
            "Вариант пройден и сохранён в твоём профиле.",
            "Line completed and saved to your profile.",
          ),
        );
      } catch (e) {
        fail(e);
      } finally {
        setSaving(false);
      }
    }
  }
  return (
    <>
      <button className="back-button" onClick={back}>
        <ArrowLeft size={17} />
        {l("К атласу", "Back to atlas")}
      </button>
      <div className="page-heading">
        <div>
          <h1>{openingName(o, locale)}</h1>
          <p>
            {o.eco} · {l("Полуходы", "Plies")}: {ply} / {o.line.length}
          </p>
        </div>
      </div>
      <div className="game-layout">
        <section className="board-column">
          <Board
            fen={board.fen()}
            locale={locale}
            orientation={color}
            disabled={!practice || done || saving || sequence.playing}
            onMove={(u) => void move(u)}
            lastMove={o.line[ply - 1]}
            hintSquare={hint && !done ? o.line[ply]?.slice(0, 2) : undefined}
          />
          {!practice && (
            <div className="review-controls">
              <button className="secondary" onClick={() => setPly(0)}>
                {l("Начало", "Start")}
              </button>
              <button
                className="icon-button"
                aria-label={l("Предыдущий ход", "Previous move")}
                onClick={() => setPly(Math.max(0, ply - 1))}
              >
                <ArrowLeft />
              </button>
              <span>
                {ply} / {o.line.length}
              </span>
              <button
                className="icon-button"
                aria-label={l("Следующий ход", "Next move")}
                onClick={() => setPly(Math.min(o.line.length, ply + 1))}
              >
                <ArrowRight />
              </button>
              <button
                className="secondary"
                onClick={() => setPly(o.line.length)}
              >
                {l("Конец", "End")}
              </button>
            </div>
          )}
        </section>
        <section className="side-panel lesson-panel">
          <h2>
            {practice
              ? l("Воспроизведи вариант", "Reproduce the line")
              : l("Изучи последовательность", "Explore the sequence")}
          </h2>
          <p className="lesson-body">
            {l(
              "Следи за развитием, борьбой за центр и безопасностью короля. Название варианта не означает, что каждый его ход — лучший по Stockfish.",
              "Watch development, central control and king safety. A named line does not mean every move is Stockfish’s best.",
            )}
          </p>
          <label className="opening-side">
            {l("Твой цвет", "Your colour")}
            <select
              disabled={(practice && !done) || sequence.playing || saving}
              value={color}
              onChange={(e) => setColor(e.target.value as "w" | "b")}
            >
              <option value="w">{l("Белые", "White")}</option>
              <option value="b" disabled={o.line.length < 2}>
                {l("Чёрные", "Black")}
              </option>
            </select>
          </label>
          {!practice || done ? (
            <button
              className="primary full"
              disabled={sequence.playing || saving}
              onClick={() => {
                setPractice(true);
                setPly(color === "w" ? 0 : 1);
                setFeedback("");
                setHint(false);
              }}
            >
              {l("Тренировать по памяти", "Practise from memory")}
            </button>
          ) : (
            <button
              className="secondary full"
              disabled={sequence.playing || saving}
              onClick={() => setHint(true)}
            >
              <Lightbulb size={18} />
              {l("Показать намёк", "Show a hint")}
            </button>
          )}
          <p className="feedback" role="status">
            {feedback}
          </p>
          {!practice || done ? (
            <p className="variation-text">{pvSan(START, o.line, 80)}</p>
          ) : (
            <p className="variation-text">
              {pvSan(START, o.line.slice(0, ply), 80) ||
                l("Сделай первый ход", "Play the first move")}
            </p>
          )}
          <button
            className="text-button"
            disabled={sequence.playing || saving}
            onClick={() => {
              setPractice(false);
              setHint(false);
              setFeedback("");
            }}
          >
            {l("Режим просмотра", "Explore mode")}
          </button>
        </section>
      </div>
    </>
  );
}
