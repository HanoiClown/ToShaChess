import type { Puzzle } from "../content/puzzles";
import type { SkillLevel } from "../shared/contracts";
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dailyPuzzles(all: Puzzle[], day: string, level: SkillLevel) {
  const [min, max] = {
    new: [500, 1000],
    beginner: [500, 1500],
    intermediate: [1300, 2000],
    advanced: [1800, 4001],
  }[level];
  const pool = all.filter(
    (p) => p.rating !== undefined && p.rating >= min && p.rating < max,
  );
  const hash = (s: string) => {
    let n = 2166136261;
    for (let i = 0; i < s.length; i++)
      n = Math.imul(n ^ s.charCodeAt(i), 16777619);
    return n >>> 0;
  };
  return pool
    .map((p) => ({ p, key: hash(`${day}:${p.id}`) }))
    .sort((a, b) => a.key - b.key || a.p.id.localeCompare(b.p.id))
    .slice(0, 5)
    .map((x) => x.p);
}
