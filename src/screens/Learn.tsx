import { useState } from "react";
import { Chess } from "chess.js";
import {
  BookOpen,
  ChevronLeft,
  ArrowRight,
  Check,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../ui/context";
import { lessons, type Lesson } from "../content/lessons";
import { Board } from "../ui/Board";
import { playUci } from "../chess/game";
export function Learn() {
  const { profile, locale, l, t, snapshot, fail, refresh, nav } = useApp();
  const [group, setGroup] = useState<Lesson["group"]>(
      profile.level === "new" ? "basics" : "openings",
    ),
    [selected, setSelected] = useState<string | null>(null),
    [chapter, setChapter] = useState(0),
    [index, setIndex] = useState(0),
    [hint, setHint] = useState(false),
    [feedback, setFeedback] = useState("");
  const lesson = lessons.find((x) => x.id === selected),
    completed = snapshot.database.progress[profile.id].completed;
  function open(id: string) {
    setSelected(id);
    setChapter(0);
    setIndex(0);
    setHint(false);
    setFeedback("");
  }
  if (!lesson)
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>
              {l("Понимай, а не заучивай", "Understand, don’t just memorize")}
            </h1>
            <p>
              {l(
                "Идея. Ход на доске. Ответ соперника. И ещё одна попытка.",
                "An idea. A move on the board. Your opponent’s reply. Then try again.",
              )}
            </p>
          </div>
          <BookOpen size={34} />
        </div>
        <div className="tabs">
          {(["basics", "openings", "endgames"] as const).map((x) => (
            <button
              key={x}
              className={group === x ? "active" : ""}
              onClick={() => setGroup(x)}
            >
              {x === "basics"
                ? l("С нуля", "From the beginning")
                : x === "openings"
                  ? l("Дебюты и гамбиты", "Openings & gambits")
                  : l("Эндшпиль", "Endgames")}
            </button>
          ))}
        </div>
        {group === "openings" && (
          <div className="library-banner">
            <div>
              <h2>
                {l(
                  "Атлас: 3 815 дебютных вариантов",
                  "Atlas: 3,815 opening lines",
                )}
              </h2>
              <p>
                {l(
                  "Поиск, семейства, гамбиты и тренировка по памяти. Ниже — уроки с объяснениями.",
                  "Search, families, gambits and memory practice. Guided lessons follow below.",
                )}
              </p>
            </div>
            <button className="primary" onClick={() => nav("openings")}>
              {l("Открыть атлас", "Open atlas")}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
        {group === "endgames" && (
          <div className="library-banner">
            <div>
              <h2>
                {l("Практика: 14 661 окончание", "Practice: 14,661 endgames")}
              </h2>
              <p>
                {l(
                  "Пешечные, ладейные, слоновые, коневые и ферзевые позиции по сложности.",
                  "Pawn, rook, bishop, knight and queen positions by difficulty.",
                )}
              </p>
            </div>
            <button className="primary" onClick={() => nav("endgames")}>
              {l("Тренировать окончания", "Practise endgames")}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
        <div className="lesson-list">
          {lessons
            .filter((x) => x.group === group)
            .map((x, i) => (
              <button
                key={x.id}
                className="lesson-row"
                onClick={() => open(x.id)}
              >
                <div
                  className={`lesson-art ${completed.includes(x.id) ? "finished" : ""}`}
                >
                  <img
                    src={`./pieces/w${x.group === "openings" ? "N" : x.group === "endgames" ? "K" : ["P", "P", "R", "B", "N", "Q", "K"][i % 7]}.svg`}
                    alt=""
                  />
                </div>
                <div className="lesson-row-copy">
                  <h2>{x.title[locale]}</h2>
                  <p>{x.description[locale]}</p>
                  <small>
                    {x.chapters.length}{" "}
                    {l("практических этапа", "practice chapters")}
                  </small>
                </div>
                {completed.includes(x.id) ? (
                  <span className="completed-mark">
                    <Check size={18} />
                    {t("complete")}
                  </span>
                ) : (
                  <ArrowRight size={21} />
                )}
              </button>
            ))}
        </div>
      </>
    );
  const ch = lesson.chapters[chapter],
    c = new Chess(ch.fen);
  for (const san of ch.line.slice(0, index)) c.move(san);
  const solved = index >= ch.line.length;
  const expected = !solved ? new Chess(c.fen()).move(ch.line[index]) : null,
    expectedUci = expected
      ? expected.from + expected.to + (expected.promotion ?? "")
      : "";
  function move(uci: string) {
    if (solved) return;
    if (uci !== expectedUci) {
      setFeedback(
        l(
          "Ход легальный, но задача просит другое продолжение. Попробуй ещё раз или открой намёк.",
          "That move is legal, but this exercise asks for a different continuation. Try again or reveal a hint.",
        ),
      );
      return;
    }
    let next = index + 1;
    if (next < ch.line.length) next++;
    setIndex(next);
    setHint(false);
    setFeedback(
      l(
        "Верно. Посмотри, как ответил соперник.",
        "Correct. Notice your opponent’s reply.",
      ),
    );
  }
  async function next() {
    if (chapter < lesson!.chapters.length - 1) {
      setChapter(chapter + 1);
      setIndex(0);
      setFeedback("");
      setHint(false);
    } else {
      await window.chessApp.completeLesson(lesson!.id);
      await refresh();
      setSelected(null);
    }
  }
  return (
    <>
      <button className="back-button" onClick={() => setSelected(null)}>
        <ChevronLeft size={18} />
        {l("Все уроки", "All lessons")}
      </button>
      <div className="page-heading">
        <div>
          <h1>{lesson.title[locale]}</h1>
          <p>
            {chapter + 1} / {lesson.chapters.length} · {ch.title[locale]}
          </p>
        </div>
      </div>
      <div className="game-layout lesson-layout">
        <section className="board-column">
          <Board
            fen={c.fen()}
            orientation={new Chess(ch.fen).turn()}
            locale={locale}
            onMove={move}
            disabled={solved}
            arrow={hint ? expectedUci : undefined}
          />
          <div className="lesson-moves">
            {ch.line.slice(0, index).join("  ") ||
              l(
                "Сделай первый ход задания",
                "Play the first move of the exercise",
              )}
          </div>
        </section>
        <section className="side-panel lesson-panel">
          <div className="coach-icon">
            <BookOpen size={28} />
          </div>
          <h2>{ch.title[locale]}</h2>
          <p className="lesson-body">{ch.body[locale]}</p>
          <div className="lesson-instruction">
            {solved ? (
              <>
                <Check size={20} />
                {l("Этап пройден", "Chapter complete")}
              </>
            ) : (
              <>
                <img src={`./pieces/${c.turn()}P.svg`} alt="" />
                {c.turn() === "w"
                  ? l("Ход белых", "White to move")
                  : l("Ход чёрных", "Black to move")}
              </>
            )}
          </div>
          {feedback && (
            <p className={solved ? "feedback good-text" : "feedback"}>
              {feedback}
            </p>
          )}
          {!solved ? (
            <button className="secondary full" onClick={() => setHint(true)}>
              <Lightbulb size={18} />
              {hint ? expected?.san : l("Показать намёк", "Show a hint")}
            </button>
          ) : (
            <button
              className="primary full"
              onClick={() => void next().catch(fail)}
            >
              {chapter === lesson.chapters.length - 1
                ? l("Завершить урок", "Finish lesson")
                : l("Следующий этап", "Next chapter")}
              <ArrowRight size={18} />
            </button>
          )}
          <button
            className="text-button"
            onClick={() => {
              setIndex(0);
              setFeedback("");
              setHint(false);
            }}
          >
            <RotateCcw size={16} />
            {l("Повторить этап", "Restart chapter")}
          </button>
        </section>
      </div>
    </>
  );
}
