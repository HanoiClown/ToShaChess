import {
  ArrowRight,
  BookOpen,
  Target,
  Swords,
  ChartNoAxesCombined,
  Download,
  Check,
  Clock,
} from "lucide-react";
import { useApp, type Route } from "../ui/context";
import { Board } from "../ui/Board";
import { START, boardAt } from "../chess/game";
import { buildPlan } from "../learning";
import { lessons } from "../content/lessons";
import { themeName } from "../library/catalogue";
export function Today() {
  const { snapshot, profile, locale, l, t, nav, refresh, fail } = useApp();
  const progress = snapshot.database.progress[profile.id],
    games = snapshot.database.games
      .filter((g) => g.profileId === profile.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const plan = buildPlan(progress, profile.level);
  const completedLessons = lessons.filter((x) =>
    progress.completed.includes(x.id),
  ).length;
  const nextLesson = lessons.find(
      (x) =>
        x.group === (profile.level === "new" ? "basics" : "openings") &&
        !progress.completed.includes(x.id),
    ),
    recent = games[0];
  const today = new Date().toLocaleDateString(),
    minutes = Math.floor(
      progress.activity
        .filter((a) => new Date(a.at).toLocaleDateString() === today)
        .reduce((sum, a) => sum + a.seconds, 0) / 60,
    ),
    due = progress.reviews.filter(
      (r) => r.due <= new Date().toISOString(),
    ).length;
  const descriptions: Record<string, string> = {
    puzzles: themeName(
      plan.find((x) => x.section === "puzzles")?.theme ?? "tactics",
      locale,
    ),
    learn:
      nextLesson?.title[locale] ??
      l("Повтори любимый дебют", "Revisit your favourite opening"),
    play: l("Примени новые идеи за доской", "Put new ideas into practice"),
    review: l(
      "Пойми ошибки и попробуй ещё раз",
      "Understand mistakes and try again",
    ),
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("Твой следующий ход", "Your next move")}</h1>
          <p>
            {profile.level === "new"
              ? l(
                  "Начни с малого. Шахматы осваиваются ход за ходом.",
                  "Start small. Learn chess one move at a time.",
                )
              : l(
                  "Игра с пониманием начинается с хорошей тренировки.",
                  "Better chess starts with a thoughtful practice session.",
                )}
          </p>
        </div>
        <span className="quiet-badge">
          <Clock size={16} />
          {l("План на 60 минут", "Your 60-minute plan")}
        </span>
      </div>
      <div className="today-layout">
        <section className="today-board">
          <div className="board-caption">
            <span>
              {profile.level === "new"
                ? l("Познакомься с фигурами", "Meet your pieces")
                : l("Готов к новой партии?", "Ready for a new game?")}
            </span>
            <Swords size={20} />
          </div>
          <Board fen={START} small locale={locale} />
          <div className="today-board-footer">
            <div>
              <strong>
                {l("Играй. Замечай. Расти.", "Play. Notice. Improve.")}
              </strong>
              <p>
                {l(
                  "Бот подстроится под выбранную сложность",
                  "Choose a bot level that challenges you",
                )}
              </p>
            </div>
            <button className="primary" onClick={() => nav("play")}>
              {l("За доску", "Let’s play")}
              <ArrowRight size={19} />
            </button>
          </div>
        </section>
        <section className="plan-panel">
          <h2>{l("Тренировка на сегодня", "Today’s practice")}</h2>
          <p>
            {l(
              "Иди по плану или выбери то, что интересно сейчас.",
              "Follow the plan or choose what interests you now.",
            )}
          </p>
          <div className="daily-plan">
            {plan.map((item, i) => {
              const Icon = (
                {
                  puzzles: Target,
                  learn: BookOpen,
                  play: Swords,
                  review: ChartNoAxesCombined,
                } as Record<string, typeof Target>
              )[item.section];
              return (
                <button
                  key={item.section}
                  onClick={() => nav(item.section as Route, recent?.id)}
                  className="plan-step"
                >
                  <span className="step-number">{i + 1}</span>
                  <Icon size={24} />
                  <div>
                    <strong>{t(item.section as "play")}</strong>
                    <small>{descriptions[item.section]}</small>
                  </div>
                  <span>
                    {item.minutes} {l("мин", "min")}
                  </span>
                  <ArrowRight size={17} />
                </button>
              );
            })}
          </div>
          <div className="training-note">
            <Check size={19} />
            <p>
              {l(
                "Перед ходом: шахи, взятия, угрозы. Проверь ответ соперника.",
                "Before moving: checks, captures, threats. Consider your opponent’s reply.",
              )}
            </p>
          </div>
          <div className="progress-line">
            <span>{l("Сегодня занимался", "Practice today")}</span>
            <strong>
              {minutes} {l("мин", "min")} / 60
            </strong>
          </div>
          <div className="progress-line">
            <span>{l("Позиций к повторению", "Positions due for review")}</span>
            <strong>{due}</strong>
          </div>
          <div className="progress-line">
            <span>{l("Освоено уроков", "Lessons completed")}</span>
            <strong>
              {completedLessons} / {lessons.length}
            </strong>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${(completedLessons / lessons.length) * 100}%`,
              }}
            />
          </div>
        </section>
      </div>
      {!games.length && (
        <div className="archive-banner">
          <Download size={24} />
          <div>
            <strong>
              {l("Учись на своих партиях", "Learn from your games")}
            </strong>
            <p>
              {l(
                "Выбери папку с файлами PGN. Партии добавятся только в текущий профиль.",
                "Choose a folder of PGN files. Games are added only to the current profile.",
              )}
            </p>
          </div>
          <button
            className="secondary"
            onClick={() =>
              void window.chessApp.importArchive().then(refresh).catch(fail)
            }
          >
            {l("Импорт папки PGN", "Import PGN folder")}
          </button>
        </div>
      )}
      <section className="recent-section">
        <div className="section-heading">
          <h2>{l("Последние партии", "Recent games")}</h2>
          <button className="text-button" onClick={() => nav("history")}>
            {l("Вся история", "View history")}
            <ArrowRight size={16} />
          </button>
        </div>
        {games.length ? (
          <div className="game-table">
            {games.slice(0, 3).map((g) => (
              <button
                key={g.id}
                className="game-table-row"
                onClick={() => nav("review", g.id)}
              >
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
                <div>
                  <strong>
                    {g.headers.White} <span>vs</span> {g.headers.Black}
                  </strong>
                  <small>
                    {g.bot
                      ? l("С ботом", "Bot game")
                      : l("С человеком", "Human game")}{" "}
                    · {g.moves.length} {l("полуходов", "plies")}
                  </small>
                </div>
                <span className="muted">{g.playedAt ?? "—"}</span>
                <span className="quiet-badge">
                  {g.analysis.length
                    ? l("Разбор доступен", "Review available")
                    : l("Открыть", "Open")}
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <Swords size={30} />
            <p>
              {l(
                "Здесь появятся твои партии и разборы. Начни первую — и мы найдём, над чем поработать.",
                "Your games and reviews will appear here. Play your first game to discover what to practise.",
              )}
            </p>
            <button className="text-button" onClick={() => nav("play")}>
              {l("Начать партию", "Start a game")}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
