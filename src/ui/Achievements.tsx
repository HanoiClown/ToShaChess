import { ArrowRight, Check, Circle, Sprout } from "lucide-react";
import type { Gamification } from "../library/gamification";
import { useApp, type Route } from "./context";

export function Achievements({ progress }: { progress: Gamification }) {
  const { l, locale, nav } = useApp();
  const earned = progress.achievements.filter((item) => item.earned).length;
  const goals: {
    title: string;
    current: number;
    target: number;
    route: Route;
  }[] = [
    {
      title: l("10 минут практики", "10 minutes of practice"),
      current: Math.floor(progress.today.activeSeconds / 60),
      target: 10,
      route: "learn",
    },
    {
      title: l("3 разные задачи", "3 different puzzles"),
      current: progress.today.solvedPuzzles,
      target: 3,
      route: "puzzles",
    },
    {
      title: l("Тренировка координат", "Board-vision practice"),
      current: progress.today.visionSessions,
      target: 1,
      route: "vision",
    },
  ];
  return (
    <section className="growth-panel" aria-labelledby="growth-title">
      <div className="growth-heading">
        <div>
          <h2 id="growth-title">
            <Sprout size={21} aria-hidden="true" />
            {l("Шаг за шагом", "Step by step")}
          </h2>
          <p>
            {l(
              "Опыт за новые навыки. Каждый профиль растёт в своём темпе.",
              "Experience for new skills. Every profile grows at its own pace.",
            )}
          </p>
        </div>
        <div className="growth-level">
          <div>
            <strong>
              {l(`Уровень ${progress.level}`, `Level ${progress.level}`)}
            </strong>
            <span>{progress.xp.toLocaleString(locale)} XP</span>
          </div>
          <progress
            value={progress.levelXp}
            max={progress.levelTarget}
            aria-label={l(
              "Прогресс до следующего уровня",
              "Progress to the next level",
            )}
          />
          <small>
            {l(
              `${progress.levelTarget - progress.levelXp} XP до следующего уровня`,
              `${progress.levelTarget - progress.levelXp} XP to the next level`,
            )}
          </small>
        </div>
      </div>
      <div className="growth-body">
        <div className="growth-streak">
          <h3>
            {l("Серия дней", "Practice streak")} <span>{progress.streak}</span>
          </h3>
          <p>
            {progress.todayQualified
              ? l(
                  "Сегодня засчитано. Хорошая работа за доской.",
                  "Today counts. Good work at the board.",
                )
              : progress.streak
                ? l(
                    "Серия продолжается. Сегодня ещё есть время позаниматься.",
                    "Your streak is active. There is still time to practise today.",
                  )
                : l(
                    "Одна решённая задача — начало новой серии.",
                    "One solved puzzle starts a new streak.",
                  )}
          </p>
          <ol
            className="growth-week"
            aria-label={l("Последние семь дней", "Last seven days")}
          >
            {progress.week.map((day) => {
              const date = new Date(`${day.day}T12:00:00`);
              return (
                <li
                  key={day.day}
                  className={day.qualified ? "is-earned" : ""}
                  aria-current={day.isToday ? "date" : undefined}
                  aria-label={`${date.toLocaleDateString(locale, { day: "numeric", month: "long" })}: ${day.qualified ? l("занятие засчитано", "practice completed") : l("пока без занятия", "no qualifying practice")}`}
                >
                  <span className="growth-day-mark" aria-hidden="true">
                    {day.qualified ? <Check size={17} /> : <Circle size={10} />}
                  </span>
                  <span aria-hidden="true">
                    {date.toLocaleDateString(locale, { weekday: "short" })}
                  </span>
                </li>
              );
            })}
          </ol>
          <small>
            {l(
              `Лучшая серия: ${progress.bestStreak}`,
              `Best streak: ${progress.bestStreak}`,
            )}
          </small>
        </div>
        <div className="growth-goals">
          <h3>{l("Небольшие цели на сегодня", "Small goals for today")}</h3>
          <ul>
            {goals.map((goal) => (
              <li key={goal.route}>
                <button onClick={() => nav(goal.route)}>
                  {goal.current >= goal.target ? (
                    <Check
                      size={18}
                      className="good-text"
                      aria-label={l("Выполнено", "Complete")}
                    />
                  ) : (
                    <Circle size={16} aria-hidden="true" />
                  )}
                  <span>{goal.title}</span>
                  <strong>
                    {Math.min(goal.current, goal.target)}/{goal.target}
                  </strong>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <details className="growth-details">
        <summary>
          {l("Достижения и правила", "Achievements and rules")}{" "}
          <span>
            {earned}/{progress.achievements.length}
          </span>
        </summary>
        <ul className="growth-achievements">
          {progress.achievements.map((item) => (
            <li key={item.id}>
              {item.earned ? (
                <Check size={19} className="good-text" aria-hidden="true" />
              ) : (
                <Circle size={17} aria-hidden="true" />
              )}
              <div>
                <strong>{item.title[locale]}</strong>
                <p>{item.description[locale]}</p>
                <small>
                  {item.earned
                    ? l("Получено", "Earned")
                    : `${item.current}/${item.target}`}
                </small>
              </div>
            </li>
          ))}
        </ul>
        <p>
          {l(
            "День считается за 5 активных минут в учебных разделах, решённую задачу, завершённую партию в приложении или тренировку координат: от 30 секунд, 10 верных полей и 70% точности. Календарь использует местное время компьютера.",
            "A day counts with 5 active minutes in practice sections, a solved puzzle, a finished in-app game, or board vision: at least 30 seconds, 10 correct squares and 70% accuracy. The calendar uses your computer’s local time.",
          )}
        </p>
        <p>
          {l(
            "XP начисляется один раз: задача +10, урок +25, дебют по памяти +20, уникальная завершённая партия +30, первая тренировка координат по этим правилам +25. Повторы, импорт партий и время сами по себе XP не добавляют. Уроки без даты дают опыт, но не дни серии. Уровень опыта не является шахматным рейтингом.",
            "XP is awarded once: puzzle +10, lesson +25, opening from memory +20, unique finished game +30, first qualifying board-vision session +25. Repeats, imported games and time alone add no XP. Undated lessons add experience but no streak days. Your experience level is not a chess rating.",
          )}
        </p>
      </details>
    </section>
  );
}
