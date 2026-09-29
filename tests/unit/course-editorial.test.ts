import { expect, test } from "vitest";
import { Chess } from "chess.js";
import { courses } from "../../src/content/courses";
import { playUci } from "../../src/chess/game";

test("editorial courses preserve old progress IDs and contain six distinct lessons", () => {
  for (const course of courses) {
    expect(course.chapters.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        "ideas",
        "main",
        "replies",
        "plans",
        "traps",
        "defence",
      ]),
    );
    expect(
      new Set(course.chapters.map((c) => c.initialFen + c.line.join(" "))).size,
    ).toBe(6);
    for (const chapter of course.chapters) {
      for (const locale of ["ru", "en"] as const) {
        for (let i = 0; i <= chapter.line.length; i++) {
          expect(
            chapter.notes[locale][i],
            `${course.id}/${chapter.id}/${locale}/${i}`,
          ).toBeTruthy();
          expect(chapter.notes[locale][i]).not.toMatch(
            /Пешка занимает|Фигура выходит|The pawn occupies|The piece moves to/,
          );
        }
      }
    }
  }
});

test("every trap has its own legal punishment and defensive alternative", () => {
  const episodes = courses.flatMap((c) => (c as any).episodes ?? []);
  expect(episodes.length).toBeGreaterThanOrEqual(48);
  expect(
    new Set(
      episodes.map(
        (e) => `${e.initialFen.split(" ").slice(0, 4).join(" ")}:${e.line[0]}`,
      ),
    ).size,
  ).toBe(episodes.length);
  for (const e of episodes) {
    for (const line of [e.line, e.defence]) {
      const board = new Chess(e.initialFen);
      expect(line.length).toBeGreaterThanOrEqual(2);
      for (const u of line) expect(() => playUci(board, u)).not.toThrow();
    }
    expect(e.line[0]).not.toBe(e.defence[0]);
    for (const locale of ["ru", "en"]) {
      expect(e.conditions[locale]).toBeTruthy();
      expect(e.risk[locale]).toBeTruthy();
      for (let i = 0; i <= e.line.length; i++)
        expect(e.notes[locale][i]).toBeTruthy();
    }
  }
});

test("real model games are complete legal public scores and critical decisions have explanations", () => {
  const sources = new Set<string>();
  for (const course of courses) {
    expect(course.modelGames?.length).toBeGreaterThanOrEqual(2);
    for (const g of course.modelGames ?? []) {
      expect(g.source).toMatch(/^https:\/\/lichess\.org\/[A-Za-z0-9]{8}$/);
      expect(sources.has(g.source)).toBe(false);
      sources.add(g.source);
      const c = new Chess();
      expect(() => c.loadPgn(g.pgn)).not.toThrow();
      expect(c.history().length).toBeGreaterThanOrEqual(40);
      expect(c.getHeaders().Result).not.toBe("*");
    }
    const main = course.chapters.find((c) => c.id === "main")!;
    for (const locale of ["ru", "en"] as const)
      expect(
        Object.keys(main.details?.[locale] ?? {}).length,
      ).toBeGreaterThanOrEqual(3);
    const colours = new Set(
      course.episodes?.map((e) => new Chess(e.initialFen).turn()),
    );
    expect(colours).toEqual(new Set(["w", "b"]));
  }
});

test("Caro mate is mate and the h4 queen example really loses the queen", () => {
  const mate = courses
    .find((c) => c.id === "caro")!
    .episodes!.find((e) => e.id === "caro-smothered")!;
  const board = new Chess(mate.initialFen);
  for (const u of mate.line) playUci(board, u);
  expect(board.isCheckmate()).toBe(true);
  const queen = courses
    .find((c) => c.id === "kings")!
    .episodes!.find((e) => e.id === "kings-h4-queen")!;
  const c = new Chess(queen.initialFen);
  for (const u of queen.line) playUci(c, u);
  expect(
    c
      .board()
      .flat()
      .filter((p) => p?.color === "b" && p.type === "q"),
  ).toHaveLength(0);
});
