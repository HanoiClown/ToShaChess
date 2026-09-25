import type { Database, Locale } from "../shared/contracts";
import authoredPuzzles from "../content/puzzles.json";
import { lessons } from "../content/lessons";
import { openings } from "./openings";
import { localDay } from "./daily";

// Only the small authored catalogue belongs in the initial dashboard bundle.
// The remaining puzzle library is loaded when the puzzle screen opens.
const puzzleIds = new Set([
  "starter-0-0",
  "starter-0-1",
  "starter-0-2",
  "starter-0-3",
  "starter-1-0",
  "starter-1-1",
  "starter-1-2",
  "starter-1-3",
  ...authoredPuzzles.map((item) => item.id),
]);
// Additional Lichess puzzles are verified by the service against the offline
// catalogue. Keep those stored solves without loading millions of IDs in the UI.
const knownPuzzle = (id: string) =>
  puzzleIds.has(id) || /^lichess_[A-Za-z0-9]{5}$/.test(id);
const lessonIds = new Set(lessons.map((item) => item.id));
const openingIds = new Set(openings.map((item) => item.id));
const practiceSections = new Set([
  "play",
  "review",
  "learn",
  "puzzles",
  "endgames",
  "vision",
  "openings",
  "database",
]);
const DAY = 86_400_000;

type Copy = Record<Locale, string>;
export type Achievement = {
  id: string;
  title: Copy;
  description: Copy;
  current: number;
  target: number;
  earned: boolean;
};
export type Gamification = {
  xp: number;
  level: number;
  levelXp: number;
  levelTarget: number;
  streak: number;
  bestStreak: number;
  todayQualified: boolean;
  week: { day: string; qualified: boolean; isToday: boolean }[];
  today: {
    activeSeconds: number;
    solvedPuzzles: number;
    visionSessions: number;
  };
  totals: { puzzles: number; lessons: number; openings: number; games: number };
  achievements: Achievement[];
};

// Calendar ordinals, not elapsed 24-hour periods: DST must not create streak gaps.
function calendarDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
}

/** Derives rewards from evidence owned by one profile; never writes to the save. */
export function deriveGamification(
  database: Pick<Database, "progress" | "games">,
  profileId: string,
  now = new Date(),
): Gamification {
  const progress = Object.hasOwn(database.progress, profileId)
    ? database.progress[profileId]
    : undefined;
  const today = calendarDay(now);
  const timestampDay = (value: string): number | null => {
    const date = new Date(value);
    const time = date.valueOf();
    return Number.isFinite(time) && time >= 0 && time <= now.valueOf()
      ? calendarDay(date)
      : null;
  };
  const qualified = new Set<number>();
  const secondsByDay = new Map<number, number>();
  const activityIds = new Set<string>();
  for (const activity of progress?.activity ?? []) {
    const day = timestampDay(activity.at);
    if (
      day === null ||
      !activity.id ||
      activityIds.has(activity.id) ||
      !practiceSections.has(activity.section) ||
      !Number.isFinite(activity.seconds) ||
      activity.seconds <= 0 ||
      activity.seconds > 60
    )
      continue;
    activityIds.add(activity.id);
    secondsByDay.set(
      day,
      Math.min(86400, (secondsByDay.get(day) ?? 0) + activity.seconds),
    );
  }
  for (const [day, seconds] of secondsByDay) {
    if (seconds >= 300) qualified.add(day);
  }

  const solved = new Set<string>();
  const solvedToday = new Set<string>();
  const attemptIds = new Set<string>();
  for (const attempt of progress?.attempts ?? []) {
    const day = timestampDay(attempt.at);
    if (
      day === null ||
      attempt.profileId !== profileId ||
      !attempt.correct ||
      !attempt.id ||
      attemptIds.has(attempt.id) ||
      !knownPuzzle(attempt.itemId)
    )
      continue;
    attemptIds.add(attempt.id);
    solved.add(attempt.itemId);
    qualified.add(day);
    if (day === today) solvedToday.add(attempt.itemId);
  }

  let visionSessions = 0,
    visionToday = 0;
  const visionIds = new Set<string>();
  for (const session of progress?.vision ?? []) {
    const day = timestampDay(session.at);
    if (
      day === null ||
      session.profileId !== profileId ||
      !session.id ||
      visionIds.has(session.id) ||
      !Number.isFinite(session.seconds) ||
      session.seconds < 30 ||
      session.seconds > 86400 ||
      !Number.isInteger(session.correct) ||
      session.correct < 10 ||
      session.correct > 100000 ||
      !Number.isInteger(session.wrong) ||
      session.wrong < 0 ||
      session.wrong > 100000 ||
      session.correct / (session.correct + session.wrong) < 0.7
    )
      continue;
    visionIds.add(session.id);
    visionSessions++;
    qualified.add(day);
    if (day === today) visionToday++;
  }

  // Imported dates describe the original game, not practice in this application.
  // Completion is stable across later analysis/explanations. Legacy games use
  // their creation date rather than inventing a completion date from metadata.
  const completionDate = (game: Database["games"][number]) =>
    game.completedAt ?? game.createdAt;
  const finished = database.games
    .filter(
      (game) =>
        game.profileId === profileId &&
        (game.mode === "normal" || game.mode === "training") &&
        ["1-0", "0-1", "1/2-1/2"].includes(game.result) &&
        game.moves.length > 0 &&
        timestampDay(completionDate(game)) !== null &&
        timestampDay(game.createdAt) !== null &&
        new Date(game.createdAt).valueOf() <=
          new Date(completionDate(game)).valueOf(),
    )
    .sort((a, b) => completionDate(a).localeCompare(completionDate(b)));
  const gameIds = new Set<string>(),
    gamePositions = new Set<string>();
  for (const game of finished) {
    const position = `${game.initialFen}|${game.moves.join(" ")}`;
    if (!game.id || gameIds.has(game.id) || gamePositions.has(position))
      continue;
    gameIds.add(game.id);
    gamePositions.add(position);
    qualified.add(timestampDay(completionDate(game))!);
  }

  const completed = new Set(progress?.completed ?? []);
  const totals = {
    puzzles: solved.size,
    lessons: [...completed].filter((id) => lessonIds.has(id)).length,
    openings: [...completed].filter((id) => openingIds.has(id)).length,
    games: gamePositions.size,
  };
  // Undated lesson/opening completions retain XP but cannot establish a streak.
  // Vision has a single skill milestone award, so repeated rounds cannot farm XP.
  const xp =
    totals.puzzles * 10 +
    totals.lessons * 25 +
    totals.openings * 20 +
    totals.games * 30 +
    (visionSessions ? 25 : 0);
  const level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2);
  const levelStart = 50 * level * (level - 1);

  const days = [...qualified].sort((a, b) => a - b);
  let bestStreak = 0,
    run = 0,
    previous = -Infinity;
  for (const day of days) {
    run = day === previous + 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = day;
  }
  let streak = 0;
  for (
    let day = qualified.has(today) ? today : today - 1;
    qualified.has(day);
    day--
  )
    streak++;
  const achievement = (
    id: string,
    title: Copy,
    description: Copy,
    current: number,
    target: number,
  ): Achievement => ({
    id,
    title,
    description,
    current: Math.min(current, target),
    target,
    earned: current >= target,
  });
  return {
    xp,
    level,
    levelXp: xp - levelStart,
    levelTarget: 100 * level,
    streak,
    bestStreak,
    todayQualified: qualified.has(today),
    today: {
      activeSeconds: secondsByDay.get(today) ?? 0,
      solvedPuzzles: solvedToday.size,
      visionSessions: visionToday,
    },
    totals,
    week: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6 + index,
        12,
      );
      return {
        day: localDay(date),
        qualified: qualified.has(calendarDay(date)),
        isToday: index === 6,
      };
    }),
    achievements: [
      achievement(
        "first-puzzle",
        { ru: "Первое решение", en: "First solution" },
        { ru: "Реши одну задачу", en: "Solve one puzzle" },
        totals.puzzles,
        1,
      ),
      achievement(
        "puzzles-10",
        { ru: "Замечаю тактику", en: "Tactical eye" },
        { ru: "Реши 10 разных задач", en: "Solve 10 different puzzles" },
        totals.puzzles,
        10,
      ),
      achievement(
        "puzzles-50",
        { ru: "Считаю дальше", en: "Thinking ahead" },
        { ru: "Реши 50 разных задач", en: "Solve 50 different puzzles" },
        totals.puzzles,
        50,
      ),
      achievement(
        "first-lesson",
        { ru: "Новая идея", en: "A new idea" },
        { ru: "Заверши один урок", en: "Complete one lesson" },
        totals.lessons,
        1,
      ),
      achievement(
        "first-opening",
        { ru: "Знакомый дебют", en: "Opening explorer" },
        {
          ru: "Пройди один дебют по памяти",
          en: "Practise one opening from memory",
        },
        totals.openings,
        1,
      ),
      achievement(
        "first-game",
        { ru: "До последнего хода", en: "To the last move" },
        { ru: "Заверши партию в приложении", en: "Finish a game in the app" },
        totals.games,
        1,
      ),
      achievement(
        "vision",
        { ru: "Вижу доску", en: "Board vision" },
        {
          ru: "30 секунд, 10 верных полей, точность от 70%",
          en: "30 seconds, 10 correct squares, at least 70% accuracy",
        },
        visionSessions,
        1,
      ),
      achievement(
        "streak-3",
        { ru: "Вхожу в ритм", en: "Finding a rhythm" },
        { ru: "Занимайся 3 дня подряд", en: "Practise on 3 consecutive days" },
        bestStreak,
        3,
      ),
      achievement(
        "streak-7",
        { ru: "Неделя шахмат", en: "A week of chess" },
        { ru: "Занимайся 7 дней подряд", en: "Practise on 7 consecutive days" },
        bestStreak,
        7,
      ),
    ],
  };
}
