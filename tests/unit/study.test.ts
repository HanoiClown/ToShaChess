import { expect, test } from "vitest";
import {
  createStudy,
  addStudyMove,
  getStudyPosition,
  setStudyMainLine,
  updateStudyNode,
  validateStudy,
} from "../../src/study/tree";
import { importStudyPgn, exportStudyPgn } from "../../src/study/pgn";
import { studyFromCourse } from "../../src/study/courses";
import { START } from "../../src/chess/game";
import { validateCourses, type Course } from "../../src/library/courses";

test("study branches keep history, identity and main line without mutating the original", () => {
  const original = createStudy({
    profileId: "learner",
    title: "King's Gambit",
  });
  const e4 = addStudyMove(original, original.rootId, "e2e4");
  const e5 = addStudyMove(e4, e4.selectedNodeId, "e7e5");
  const c5 = addStudyMove(e5, e4.selectedNodeId, "c7c5");
  expect(Object.keys(original.nodes)).toHaveLength(1);
  expect(getStudyPosition(c5).moves).toEqual(["e2e4", "c7c5"]);
  expect(c5.nodes[e4.selectedNodeId].mainChildId).toBe(e5.selectedNodeId);
  expect(addStudyMove(c5, e4.selectedNodeId, "e7e5").selectedNodeId).toBe(
    e5.selectedNodeId,
  );
  expect(
    setStudyMainLine(c5, c5.selectedNodeId).nodes[e4.selectedNodeId]
      .mainChildId,
  ).toBe(c5.selectedNodeId);
  expect(() => addStudyMove(e4, e4.selectedNodeId, "e2e5")).toThrow();
});

test("validation rejects cycles, illegal moves and orphan nodes", () => {
  const s = createStudy({ profileId: "learner", title: "Study" });
  const moved = addStudyMove(s, s.rootId, "e2e4");
  expect(validateStudy(moved)).toEqual(moved);
  const cycle = structuredClone(moved);
  cycle.nodes[moved.selectedNodeId].children.push(s.rootId);
  expect(() => validateStudy(cycle)).toThrow();
  const illegal = structuredClone(moved);
  illegal.nodes[moved.selectedNodeId].uci = "e2e5";
  expect(() => validateStudy(illegal)).toThrow();
  const orphan = structuredClone(moved);
  orphan.nodes[s.rootId].children = [];
  orphan.nodes[s.rootId].mainChildId = null;
  expect(() => validateStudy(orphan)).toThrow();
});

test("PGN round trip preserves nested alternatives, comments, bookmarks and black-to-move FEN", () => {
  const pgn =
    '[Event "Branches"]\n\n1. e4 {Claim the centre.} e5 (1... c5 2. Nf3 (2. Nc3)) 2. f4 exf4 *';
  let s = importStudyPgn(pgn, { profileId: "learner" });
  const e4 = s.nodes[s.rootId].mainChildId!;
  s = updateStudyNode(s, e4, {
    bookmarked: true,
    comment: "Centre {and} space",
  });
  const exported = exportStudyPgn(s);
  const again = importStudyPgn(exported, { profileId: "learner" });
  expect(Object.keys(again.nodes)).toHaveLength(Object.keys(s.nodes).length);
  expect(again.nodes[again.nodes[again.rootId].mainChildId!].bookmarked).toBe(
    true,
  );
  expect(exportStudyPgn(again)).toBe(exported);
  const black = importStudyPgn(
    '[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"]\n\n1... e5 *',
    { profileId: "learner" },
  );
  expect(
    getStudyPosition(black, black.nodes[black.rootId].mainChildId!).moves,
  ).toEqual(["e7e5"]);
});

test("PGN invalid notation, broken delimiters, excess nesting and multiple games fail clearly", () => {
  for (const pgn of [
    "1. e4 e5 2. Nh9 *",
    "1. e4 (1. d4 *",
    "1. e4 {oops",
    "1. e4 * 1. d4 *",
    "(1. e4)",
    "1. e4 " + "(".repeat(65),
  ])
    expect(() => importStudyPgn(pgn, { profileId: "learner" })).toThrow();
});

test("a position-only study round trips without inventing a move", () => {
  const s = createStudy({ profileId: "learner", title: "Position" });
  const restored = importStudyPgn(exportStudyPgn(s), { profileId: "learner" });
  expect(Object.keys(restored.nodes)).toHaveLength(1);
});

test("recursive course alternatives retain their own explanations and defend the same position", () => {
  const notes = {
    ru: { 0: "Центр", 1: "e4", 2: "e5", 3: "Развить коня" },
    en: { 0: "Centre", 1: "e4", 2: "e5", 3: "Develop" },
  };
  const c: Course = {
    id: "test",
    title: { ru: "Курс", en: "Course" },
    chapters: [
      {
        id: "main",
        title: { ru: "Линия", en: "Line" },
        initialFen: START,
        line: ["e2e4", "e7e5", "g1f3"],
        notes,
        practiceColor: "w",
        branches: [
          {
            atPly: 1,
            line: ["c7c5", "g1f3"],
            notes,
            branches: [
              {
                atPly: 2,
                line: ["b1c3"],
                notes: {
                  ru: { 3: "Закрытый вариант" },
                  en: { 3: "Closed variation" },
                },
              },
            ],
          },
        ],
      },
    ],
  };
  expect(() => validateCourses([c])).not.toThrow();
  const study = studyFromCourse(c, c.chapters[0], "learner", "ru");
  const target = Object.values(study.nodes).find((n) => n.uci === "b1c3")!;
  expect(getStudyPosition(study, target.id).moves).toEqual([
    "e2e4",
    "c7c5",
    "b1c3",
  ]);
  expect(target.explanation?.short.ru).toBe("Закрытый вариант");
  c.chapters[0].branches[0].branches![0].line = ["b1b3"];
  expect(() => validateCourses([c])).toThrow();
});
