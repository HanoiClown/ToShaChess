import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, BookOpen } from "lucide-react";
import { courses } from "../content/courses";
import {
  courseProgressKey,
  coursePaths,
  type CourseChapter,
} from "../library/courses";
import { useApp } from "../ui/context";
import { Board } from "../ui/Board";
import { CoachCard } from "../ui/CoachCard";
import { boardAt, playUci } from "../chess/game";
import { playSound } from "../audio/sounds";
import "../ui/course-player.css";
import { ExplanationPanel } from "../ui/ExplanationPanel";
import { StudyWorkspace } from "../ui/StudyWorkspace";
import { studyFromCourse } from "../study/courses";
import { importStudyPgn } from "../study/pgn";
import {
  getStudyPosition,
  selectStudyNode,
  studyError,
  type StudyDocument,
} from "../study/tree";
import { engineRequest } from "../shared/engine-requests";
import type { Position } from "../shared/contracts";
import { usePanelHeight } from "../study/usePanelHeight";
export function CourseLibrary({
  onAtlas,
  onPlayFrom,
}: {
  onAtlas: () => void;
  onPlayFrom?: (position: Position) => void;
}) {
  const { locale, l, snapshot, profile, nav } = useApp();
  const [selected, setSelected] = useState<string | null>(null),
    [chapter, setChapter] = useState(0);
  const course = courses.find((c) => c.id === selected);
  if (course)
    return (
      <CoursePlayer
        key={`${profile.id}_${course.id}_${chapter}`}
        onPlayFrom={onPlayFrom}
        courseId={course.id}
        chapterId={course.chapters[chapter].id}
        onChapter={(i) => setChapter(i)}
        onExit={() => setSelected(null)}
        onNextCourse={() => {
          setSelected(
            courses[(courses.indexOf(course) + 1) % courses.length].id,
          );
          setChapter(0);
        }}
      />
    );
  return (
    <>
      <button className="back-button" onClick={() => nav("learn")}>
        {l("К урокам", "Back to lessons")}
      </button>
      <div className="page-heading">
        <div>
          <h1>{l("Дебюты: от идеи до игры", "Openings: from idea to play")}</h1>
          <p>
            {l(
              "Сначала посмотри целую линию. Затем проверь её на доске.",
              "Watch a complete line first, then practise it on the board.",
            )}
          </p>
        </div>
        <button className="secondary" onClick={onAtlas}>
          {l("Справочник: 3 815 вариантов", "Reference: 3,815 lines")}
        </button>
      </div>
      <div className="course-list">
        {courses.map((c, i) => {
          const count = c.chapters.filter((ch) =>
            snapshot.database.progress[profile.id].completed.includes(
              courseProgressKey(c.id, ch.id, "practice"),
            ),
          ).length;
          return (
            <button
              className="course-row"
              key={c.id}
              onClick={() => {
                setSelected(c.id);
                setChapter(0);
              }}
            >
              <BookOpen size={25} />
              <span>
                <strong>{c.title[locale]}</strong>
                <span>{c.chapters[0].notes[locale][0]}</span>
              </span>
              <small>
                {count}/{c.chapters.length} · {l("глав", "chapters")}
              </small>
              <ChevronRight />
            </button>
          );
        })}
      </div>
    </>
  );
}
export function CoursePlayer({
  courseId,
  chapterId,
  onChapter,
  onExit,
  onNextCourse,
  onPlayFrom,
}: {
  courseId: string;
  chapterId: string;
  onChapter: (i: number) => void;
  onExit: () => void;
  onNextCourse: () => void;
  onPlayFrom?: (position: Position) => void;
}) {
  const { locale, l, profile, snapshot, refresh, fail } = useApp();
  const course = courses.find((c) => c.id === courseId)!,
    base = course.chapters.find((c) => c.id === chapterId)!,
    chapterIndex = course.chapters.indexOf(base);
  const [mode, setMode] = useState<"watch" | "practice" | "explore">("watch"),
    [ply, setPly] = useState(0),
    [autoplay, setAutoplay] = useState(false),
    [branch, setBranch] = useState(0),
    [hint, setHint] = useState(false),
    [feedback, setFeedback] = useState(""),
    [solved, setSolved] = useState(false),
    [episodeIndex, setEpisodeIndex] = useState(0),
    [study, setStudy] = useState<StudyDocument | null>(null),
    [loading, setLoading] = useState(false);
  const scope = useRef(true),
    marked = useRef(false),
    request = useRef<ReturnType<typeof engineRequest> | null>(null),
    generation = useRef(0),
    saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pendingStudy = useRef<StudyDocument | null>(null);
  const panelRef = usePanelHeight(mode);
  useEffect(() => {
    scope.current = true;
    return () => {
      scope.current = false;
      generation.current++;
      request.current?.cancel();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const pending = pendingStudy.current;
      if (pending) void window.chessApp.saveStudy(pending).catch(() => {});
    };
  }, []);
  const episode = ["traps", "defence"].includes(base.id)
    ? course.episodes?.[episodeIndex]
    : undefined;
  const defending = base.id === "defence";
  const chapter: CourseChapter = episode
    ? {
        ...base,
        id: `${base.id}_${episode.id}`,
        title: episode.title,
        initialFen: episode.initialFen,
        practiceColor: defending
          ? boardAt({ initialFen: episode.initialFen, moves: [] }).turn()
          : boardAt({ initialFen: episode.initialFen, moves: [] }).turn() ===
              "w"
            ? "b"
            : "w",
        line: defending ? episode.defence : episode.line,
        notes: defending ? episode.defenceNotes : episode.notes,
        details: defending ? undefined : episode.details,
        summary: {
          ru: episode.conditions.ru + "\n\n" + episode.risk.ru,
          en: episode.conditions.en + "\n\n" + episode.risk.en,
        },
        sources: episode.sources,
        branches: [
          {
            atPly: 0,
            line: defending ? episode.line : episode.defence,
            notes: defending ? episode.notes : episode.defenceNotes,
            title: {
              ru: defending ? "Ошибка и наказание" : "Как защититься",
              en: defending ? "Mistake and punishment" : "How to defend",
            },
          },
        ],
      }
    : base;
  const paths = coursePaths(chapter),
    selectedPath = paths[branch] ?? paths[0],
    line = selectedPath.line;
  const board = boardAt({
      initialFen: chapter.initialFen,
      moves: line.slice(0, ply),
    }),
    complete = ply === line.length;
  useEffect(() => {
    if (
      mode === "explore" ||
      complete ||
      !(mode === "watch" ? autoplay : board.turn() !== chapter.practiceColor)
    )
      return;
    const timer = setTimeout(
      () => setPly((v) => Math.min(line.length, v + 1)),
      mode === "watch" ? 1300 : 450,
    );
    return () => clearTimeout(timer);
  }, [ply, autoplay, mode, branch, episodeIndex]);
  useEffect(() => {
    if (mode === "explore" || !complete || marked.current) return;
    marked.current = true;
    setAutoplay(false);
    if (mode === "practice") {
      setSolved(true);
      playSound("success");
    }
    const key = courseProgressKey(course.id, chapter.id, mode);
    void window.chessApp
      .completeLesson(key)
      .then(async () => {
        if (
          episode &&
          course.episodes?.every(
            (e) =>
              e.id === episode.id ||
              snapshot.database.progress[profile.id].completed.includes(
                courseProgressKey(course.id, `${base.id}_${e.id}`, mode),
              ),
          )
        )
          await window.chessApp.completeLesson(
            courseProgressKey(course.id, base.id, mode),
          );
        if (scope.current) void refresh();
      })
      .catch((e) => {
        if (scope.current) fail(e);
      });
  }, [complete, mode, chapter.id]);
  function reset(
    nextMode: "watch" | "practice" = mode === "explore" ? "watch" : mode,
    nextBranch = branch,
  ) {
    generation.current++;
    request.current?.cancel();
    setLoading(false);
    setAutoplay(false);
    setMode(nextMode);
    setBranch(nextBranch);
    setPly(0);
    setHint(false);
    setFeedback("");
    setSolved(false);
    marked.current = false;
  }
  function answer(u: string) {
    if (
      mode !== "practice" ||
      complete ||
      board.turn() !== chapter.practiceColor
    )
      return;
    if (u === line[ply]) {
      setPly((p) => p + 1);
      setHint(false);
      setFeedback("");
      return;
    }
    const alternative = paths.findIndex(
      (path) =>
        path.line[ply] === u &&
        path.line.slice(0, ply).every((m, i) => m === line[i]),
    );
    if (alternative >= 0) {
      setBranch(alternative);
      setPly((p) => p + 1);
      setFeedback(
        l(
          "Переходим в другую изучаемую ветку.",
          "Following another studied branch.",
        ),
      );
      setHint(false);
      return;
    }
    setFeedback(
      l(
        "Легальный ход вне выбранной учебной линии. Исследуй его на доске или вернись к практике по памяти.",
        "A legal move outside this study line. Explore it on the board or continue practising the repertoire.",
      ),
    );
  }
  async function enterExplore() {
    const own = ++generation.current;
    setLoading(true);
    setAutoplay(false);
    try {
      const fresh = studyFromCourse(course, chapter, profile.id, locale),
        saved = await window.chessApp.listStudies(fresh.sourceKey);
      if (!scope.current || own !== generation.current) return;
      let next =
        saved.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ??
        fresh;
      if (!saved.length) {
        let nodeId = next.rootId;
        for (const u of line.slice(0, ply)) {
          const child = next.nodes[nodeId].children.find(
            (id) => next.nodes[id].uci === u,
          );
          if (!child) break;
          nodeId = child;
        }
        next = selectStudyNode(next, nodeId);
      }
      setStudy(next);
      setMode("explore");
    } catch (e) {
      if (scope.current && own === generation.current) fail(e);
    } finally {
      if (scope.current && own === generation.current) setLoading(false);
    }
  }
  function changeStudy(next: StudyDocument) {
    setStudy(next);
    pendingStudy.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      pendingStudy.current = null;
      void saveStudy(next).catch((e) => {
        if (scope.current) setFeedback(studyError(e, locale));
      });
    }, 650);
  }
  async function saveStudy(next: StudyDocument) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingStudy.current = null;
    await window.chessApp.saveStudy(next);
    await window.chessApp.completeLesson(
      courseProgressKey(course.id, base.id, "explore"),
    );
    if (scope.current) void refresh();
  }
  const san = ply
    ? (board.history().at(-1) ?? "")
    : l("Начальная позиция", "Starting position");
  const explanation = {
    short: {
      ru: selectedPath.notes.ru[ply] ?? chapter.notes.ru[0],
      en: selectedPath.notes.en[ply] ?? chapter.notes.en[0],
    },
    detail:
      ply === 0
        ? chapter.summary
        : selectedPath.details?.ru[ply] && selectedPath.details.en[ply]
          ? {
              ru: selectedPath.details.ru[ply],
              en: selectedPath.details.en[ply],
            }
          : undefined,
    sources: selectedPath.sources,
  };
  return (
    <>
      <button className="back-button" onClick={onExit}>
        {l("К курсам", "Back to courses")}
      </button>
      <div className="page-heading">
        <div>
          <h1>{course.title[locale]}</h1>
          <p>
            {chapterIndex + 1}/{course.chapters.length} ·{" "}
            {l(
              "Учебная линия, не единственный правильный вариант",
              "A study line, not the only correct continuation",
            )}
          </p>
        </div>
      </div>
      {mode === "explore" && study ? (
        <>
          <div className="study-course-return">
            <button className="secondary" onClick={() => reset("watch")}>
              {l("Вернуться к уроку", "Return to lesson")}
            </button>
            <p>
              {l(
                "Изменения сохраняются в твоём профиле автоматически.",
                "Changes are saved to your profile automatically.",
              )}
            </p>
          </div>
          <StudyWorkspace
            study={study}
            onChange={changeStudy}
            locale={locale}
            orientation={chapter.practiceColor}
            defaultDetailed={profile.learning?.explanation === "detailed"}
            onSave={saveStudy}
            onPlayFrom={onPlayFrom}
            onAnalyze={(position) => {
              request.current?.cancel();
              const r = engineRequest();
              request.current = r;
              return r.analyze(position);
            }}
          />
          {feedback && <p role="status">{feedback}</p>}
        </>
      ) : (
        <div className="game-layout course-layout">
          <section className="board-column">
            <div className="review-controls">
              <button
                className="icon-button"
                aria-label={l("Назад", "Previous")}
                disabled={mode === "practice" || ply === 0}
                onClick={() => {
                  setAutoplay(false);
                  setPly((p) => p - 1);
                }}
              >
                <ChevronLeft />
              </button>
              <span className="course-ply">
                {ply} / {line.length}
              </span>
              <button
                className="icon-button"
                aria-label={l("Вперёд", "Next")}
                disabled={mode === "practice" || complete}
                onClick={() => setPly((p) => p + 1)}
              >
                <ChevronRight />
              </button>
              {mode === "watch" && (
                <button
                  className="secondary"
                  disabled={complete}
                  onClick={() => setAutoplay((v) => !v)}
                >
                  {autoplay ? <Pause size={17} /> : <Play size={17} />}{" "}
                  {autoplay ? l("Пауза", "Pause") : l("Автопоказ", "Autoplay")}
                </button>
              )}
            </div>
            <Board
              fen={board.fen()}
              orientation={chapter.practiceColor}
              locale={locale}
              lastMove={line[ply - 1]}
              onMove={answer}
              disabled={
                mode === "watch" ||
                complete ||
                board.turn() !== chapter.practiceColor
              }
              hintSquare={hint ? line[ply]?.slice(0, 2) : undefined}
            />
          </section>
          <section className="side-panel course-chapters" ref={panelRef}>
            <h2>{base.title[locale]}</h2>
            <div className="segmented">
              <button
                className={mode === "watch" ? "active" : ""}
                onClick={() => reset("watch")}
              >
                {l("Смотреть", "Watch")}
              </button>
              <button
                className={mode === "practice" ? "active" : ""}
                onClick={() => reset("practice")}
              >
                {l("Практика", "Practice")}
              </button>
              <button disabled={loading} onClick={() => void enterExplore()}>
                {loading
                  ? l("Открываем…", "Opening…")
                  : l("Исследовать", "Explore")}
              </button>
            </div>
            <p>
              {mode === "watch"
                ? l(
                    "Запусти автопоказ или листай ходы. Объяснение следует за позицией.",
                    "Start autoplay or step through moves. The explanation follows the position.",
                  )
                : l(
                    "Воспроизведи линию за свою сторону. Другие легальные ходы можно исследовать отдельно.",
                    "Replay the line for your side. Other legal moves can be explored separately.",
                  )}
            </p>
            {episode && (
              <label>
                {l("Эпизод", "Episode")}
                <select
                  aria-label={l("Эпизод", "Episode")}
                  value={episodeIndex}
                  onChange={(e) => {
                    reset("watch", 0);
                    setEpisodeIndex(Number(e.target.value));
                  }}
                >
                  {course.episodes!.map((e, i) => (
                    <option key={e.id} value={i}>
                      {i + 1}. {e.title[locale]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {paths.length > 1 && (
              <label>
                {l("Ветка", "Branch")}
                <select
                  aria-label={l("Ветка", "Branch")}
                  value={branch}
                  onChange={(e) =>
                    reset(
                      mode === "practice" ? "practice" : "watch",
                      Number(e.target.value),
                    )
                  }
                >
                  {paths.map((p, i) => (
                    <option key={p.id} value={i}>
                      {i === 0
                        ? l("Основная линия", "Main line")
                        : (p.title?.[locale] ??
                          `${l("Вариант", "Variation")} ${i}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === "practice" && !complete && (
              <button className="secondary" onClick={() => setHint(true)}>
                {l("Намёк: какая фигура", "Hint: which piece")}
              </button>
            )}
            {feedback && <p role="status">{feedback}</p>}
            {complete && (
              <p className="good-text" role="status">
                {solved
                  ? l(
                      "Глава пройдена в практике!",
                      "Chapter practised successfully!",
                    )
                  : l(
                      "Линия просмотрена. Теперь попробуй практику.",
                      "Line viewed. Now try practising it.",
                    )}
              </p>
            )}
            <nav aria-label={l("Главы курса", "Course chapters")}>
              {course.chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  aria-current={i === chapterIndex ? "step" : undefined}
                  onClick={() => onChapter(i)}
                >
                  <span>
                    {i + 1}. {ch.title[locale]}
                  </span>
                  <small>
                    {snapshot.database.progress[profile.id].completed.includes(
                      courseProgressKey(course.id, ch.id, "practice"),
                    )
                      ? l("Пройдено", "Done")
                      : l("Практика", "Practice")}
                  </small>
                </button>
              ))}
            </nav>
            <button
              className="primary full"
              onClick={() => {
                if (
                  episode &&
                  episodeIndex + 1 < (course.episodes?.length ?? 0)
                ) {
                  reset("watch", 0);
                  setEpisodeIndex((i) => i + 1);
                } else
                  chapterIndex < course.chapters.length - 1
                    ? onChapter(chapterIndex + 1)
                    : onNextCourse();
              }}
            >
              {episode && episodeIndex + 1 < (course.episodes?.length ?? 0)
                ? l("Следующий эпизод", "Next episode")
                : chapterIndex < course.chapters.length - 1
                  ? l("Следующий урок", "Next lesson")
                  : l("Следующий курс", "Next course")}
              <ChevronRight size={17} />
            </button>
            <button className="text-button" onClick={() => reset()}>
              {l("Начать главу заново", "Restart chapter")}
            </button>
            <CoachCard
              locale={locale}
              san={san}
              text={explanation.short[locale]}
            />
            <ExplanationPanel
              explanation={explanation}
              locale={locale}
              showShort={false}
              defaultDetailed={profile.learning?.explanation === "detailed"}
              onExplore={() => void enterExplore()}
            />
            {base.id === "plans" && !!course.modelGames?.length && (
              <details className="course-model-games">
                <summary>{l("Модельные партии", "Model games")}</summary>
                {course.modelGames.map((g) => (
                  <button
                    className="secondary"
                    key={g.id}
                    onClick={() => {
                      try {
                        const next = importStudyPgn(g.pgn, {
                          profileId: profile.id,
                          title: g.title[locale],
                          sourceKey: `model_${course.id}_${g.id}`,
                        });
                        setStudy(next);
                        setMode("explore");
                      } catch (e) {
                        fail(e);
                      }
                    }}
                  >
                    {g.title[locale]}
                  </button>
                ))}
              </details>
            )}
          </section>
        </div>
      )}
    </>
  );
}
