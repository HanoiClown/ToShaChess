import type { Progress, Attempt, Profile } from "./shared/contracts";
export function recordAttempt(progress: Progress, attempt: Attempt) {
  if (progress.attempts.some((x) => x.id === attempt.id)) return;
  progress.attempts.push(attempt);
  const review = progress.reviews.find((x) => x.id === attempt.itemId);
  if (review) {
    review.interval = attempt.correct
      ? ({ 1: 3, 3: 7, 7: 14, 14: 30, 30: 60, 60: 60 }[review.interval] ?? 1)
      : 1;
    review.due = new Date(
      new Date(attempt.at).valueOf() + review.interval * 86400000,
    ).toISOString();
  }
}
export function buildPlan(progress: Progress, level: Profile["level"]) {
  const weak = new Map<string, { correct: number; total: number }>();
  for (const a of progress.attempts.slice(-100)) {
    const v = weak.get(a.theme) ?? { correct: 0, total: 0 };
    v.total++;
    v.correct += +a.correct;
    weak.set(a.theme, v);
  }
  const due = [...progress.reviews]
    .filter((r) => r.due <= new Date().toISOString())
    .sort((a, b) => a.due.localeCompare(b.due));
  const theme =
    due[0]?.theme ??
    [...weak].sort(
      (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total,
    )[0]?.[0] ??
    "hanging";
  return level === "new"
    ? [
        { section: "learn", minutes: 15, theme: "basics" },
        { section: "puzzles", minutes: 10, theme: "mate" },
        { section: "play", minutes: 20, theme: "practice" },
        { section: "review", minutes: 15, theme },
      ]
    : [
        { section: "puzzles", minutes: 10, theme },
        { section: "learn", minutes: 10, theme: "openings" },
        { section: "play", minutes: 25, theme: "practice" },
        { section: "review", minutes: 15, theme },
      ];
}
