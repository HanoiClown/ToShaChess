export type Round = {
  target: string;
  started: number;
  deadline: number | null;
  correct: number;
  wrong: number;
  finished: boolean;
};
export const squares = [..."abcdefgh"].flatMap((f) =>
  [..."12345678"].map((r) => f + r),
);
export function nextTarget(previous = "", random = Math.random) {
  const pool = squares.filter((s) => s !== previous);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
export function newRound(
  duration: number,
  now: number,
  random = Math.random,
): Round {
  return {
    target: nextTarget("", random),
    started: now,
    deadline: duration ? now + duration * 1000 : null,
    correct: 0,
    wrong: 0,
    finished: false,
  };
}
export function clickTarget(
  round: Round,
  square: string,
  now: number,
  random = Math.random,
): Round {
  if (round.finished) return round;
  if (round.deadline !== null && now >= round.deadline)
    return { ...round, finished: true };
  if (square !== round.target) return { ...round, wrong: round.wrong + 1 };
  return {
    ...round,
    correct: round.correct + 1,
    target: nextTarget(round.target, random),
  };
}
