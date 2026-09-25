import { useState, useRef, useEffect } from "react";
import { Eye, Play, Square, Check, Timer } from "lucide-react";
import { useApp } from "../ui/context";
import { Board } from "../ui/Board";
import { START } from "../chess/game";
import { newRound, clickTarget, type Round } from "../library/vision";
import type { VisionSettings } from "../shared/contracts";
import { playSound } from "../audio/sounds";
export function Vision() {
  const { snapshot, profile, locale, l, fail, refresh } = useApp(),
    progress = snapshot.database.progress[profile.id];
  const [settings, setSettings] = useState(progress.visionSettings),
    [round, setRound] = useState<Round | null>(null),
    [now, setNow] = useState(0),
    [feedback, setFeedback] = useState(""),
    [saving, setSaving] = useState(false);
  const current = useRef(round),
    saved = useRef(false),
    alive = useRef(true),
    sessionId = useRef("");
  current.current = round;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function finish(r: Round, time: number) {
    if (saved.current) return;
    saved.current = true;
    playSound("end");
    const ended = { ...r, finished: true };
    current.current = ended;
    setRound(ended);
    setNow(time);
    setSaving(true);
    try {
      await window.chessApp.saveVision({
        ...settings,
        id: sessionId.current,
        profileId: profile.id,
        at: new Date().toISOString(),
        seconds: Math.min(
          86400,
          Math.max(0, (Math.min(time, r.deadline ?? time) - r.started) / 1000),
        ),
        correct: r.correct,
        wrong: r.wrong,
      });
      if (alive.current) await refresh();
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  useEffect(() => {
    if (!round || round.finished) return;
    const id = setInterval(() => {
      const time = performance.now();
      setNow(time);
      const r = current.current;
      if (r && r.deadline !== null && time >= r.deadline)
        void finish(r, r.deadline);
    }, 100);
    return () => clearInterval(id);
  }, [round?.started, round?.finished]);
  function start() {
    saved.current = false;
    sessionId.current = crypto.randomUUID();
    const time = performance.now(),
      r = newRound(settings.duration, time);
    current.current = r;
    setRound(r);
    setNow(time);
    setFeedback("");
  }
  function click(square: string) {
    const r = current.current;
    if (!r || r.finished) return;
    const time = performance.now(),
      next = clickTarget(r, square, time);
    current.current = next;
    setRound(next);
    setNow(time);
    if (next.finished) {
      void finish(next, time);
      return;
    }
    playSound(square === r.target ? "move" : "error");
    setFeedback(
      square === r.target
        ? l("Верно", "Correct")
        : l(
            `Это ${square}. Найди ${r.target}.`,
            `That is ${square}. Find ${r.target}.`,
          ),
    );
  }
  async function change(next: VisionSettings) {
    setSettings(next);
    try {
      await window.chessApp.visionSettings(profile.id, next);
      await refresh();
    } catch (e) {
      fail(e);
    }
  }
  const running = !!round && !round.finished,
    seconds = round
      ? Math.max(
          0,
          Math.ceil(
            ((round.deadline ?? now) - (round.deadline ? now : round.started)) /
              1000,
          ),
        )
      : settings.duration;
  const comparable = progress.vision.filter(
      (r) =>
        r.duration === settings.duration &&
        r.orientation === settings.orientation &&
        r.coordinates === settings.coordinates,
    ),
    best = comparable.reduce((n, r) => Math.max(n, r.correct), 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("Видение доски", "Board vision")}</h1>
          <p>
            {l(
              "Увидел e4 — найди e4. Учись ориентироваться без пересчёта клеток.",
              "See e4 — find e4. Learn to navigate without counting squares.",
            )}
          </p>
        </div>
        <Eye size={30} />
      </div>
      <div className="game-layout vision-layout">
        <section className="board-column">
          <Board
            fen={START}
            showPieces={false}
            coordinates={settings.coordinates}
            orientation={settings.orientation}
            locale={locale}
            onSquare={click}
            disabled={!running}
          />
          <p className="source-note">
            {settings.orientation === "w"
              ? l("Вид со стороны белых", "White’s perspective")
              : l("Вид со стороны чёрных", "Black’s perspective")}
          </p>
        </section>
        <section className="side-panel vision-panel">
          <div className="vision-prompt">
            <span>
              {round?.finished
                ? l("Раунд завершён", "Round complete")
                : running
                  ? l("Найди поле", "Find the square")
                  : l("Готов к тренировке?", "Ready to practise?")}
            </span>
            <strong data-testid="vision-target">
              {running ? round.target : round?.finished ? round.correct : "e4"}
            </strong>
            <small>
              {round?.finished
                ? l("верных полей", "correct squares")
                : l("Нажми на нужную клетку доски", "Click the correct square")}
            </small>
          </div>
          <div className="vision-score">
            <span>
              <Timer size={18} />
              {settings.duration
                ? `${seconds} ${l("сек", "sec")}`
                : round
                  ? `${seconds} ${l("сек", "sec")}`
                  : l("Без таймера", "Untimed")}
            </span>
            <span>
              <Check size={18} />
              {round?.correct ?? 0}
            </span>
            <span>
              {l("Ошибки", "Errors")}: {round?.wrong ?? 0}
            </span>
          </div>
          <p role="status" className="vision-feedback">
            {feedback}
          </p>
          <fieldset disabled={running || saving}>
            <label>
              {l("Режим", "Mode")}
              <select
                value={settings.duration}
                onChange={(e) =>
                  void change({
                    ...settings,
                    duration: Number(
                      e.target.value,
                    ) as VisionSettings["duration"],
                  })
                }
              >
                <option value="0">
                  {l("Свободная тренировка", "Free practice")}
                </option>
                {[30, 60, 120].map((s) => (
                  <option key={s} value={s}>
                    {s} {l("секунд", "seconds")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {l("Сторона доски", "Board orientation")}
              <select
                value={settings.orientation}
                onChange={(e) =>
                  void change({
                    ...settings,
                    orientation: e.target.value as "w" | "b",
                  })
                }
              >
                <option value="w">{l("За белых", "White")}</option>
                <option value="b">{l("За чёрных", "Black")}</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.coordinates}
                onChange={(e) =>
                  void change({ ...settings, coordinates: e.target.checked })
                }
              />
              {l(
                "Показывать буквы и цифры по краям",
                "Show file and rank labels",
              )}
            </label>
          </fieldset>
          {running ? (
            <button
              className="secondary full"
              onClick={() => void finish(round, performance.now())}
            >
              <Square size={17} />
              {l("Завершить раунд", "Finish round")}
            </button>
          ) : (
            <button className="primary full" disabled={saving} onClick={start}>
              <Play size={18} />
              {round
                ? l("Ещё один раунд", "Another round")
                : l("Начать тренировку", "Start training")}
            </button>
          )}
          <small className="muted">
            {l("Рекорд с этими настройками", "Best with these settings")}:{" "}
            {best} · {comparable.length} {l("раундов", "rounds")}
          </small>
        </section>
      </div>
      <section className="recent-section">
        <h2>{l("Последние результаты", "Recent results")}</h2>
        {progress.vision.length ? (
          <div className="vision-history">
            {[...progress.vision]
              .reverse()
              .slice(0, 8)
              .map((r) => (
                <div key={r.id}>
                  <span>
                    {new Date(r.at).toLocaleDateString(locale)} ·{" "}
                    {Math.round(r.seconds)} {l("сек", "sec")}
                  </span>
                  <strong>
                    {r.correct} {l("верно", "correct")} / {r.wrong}{" "}
                    {l("ошибок", "errors")}
                  </strong>
                  <small>
                    {r.orientation === "w"
                      ? l("Белые", "White")
                      : l("Чёрные", "Black")}{" "}
                    ·{" "}
                    {r.coordinates
                      ? l("С подписями", "Labels on")
                      : l("Без подписей", "Labels off")}
                  </small>
                </div>
              ))}
          </div>
        ) : (
          <p className="muted">
            {l(
              "Результаты появятся после первого завершённого раунда.",
              "Finish your first round to start your history.",
            )}
          </p>
        )}
      </section>
    </>
  );
}
