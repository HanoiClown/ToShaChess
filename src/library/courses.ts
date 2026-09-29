import { Chess } from "chess.js";
import { playUci } from "../chess/game";
import type { Color, Locale } from "../shared/contracts";
export type CourseSource = { label: string; url: string; license?: string };
export type CourseBranch = {
  atPly: number;
  line: string[];
  notes: Record<Locale, Record<number, string>>;
  id?: string;
  title?: Record<Locale, string>;
  details?: Record<Locale, Record<number, string>>;
  sources?: CourseSource[];
  branches?: CourseBranch[];
};
export type CourseEpisode = {
  id: string;
  title: Record<Locale, string>;
  initialFen: string;
  line: string[];
  notes: Record<Locale, Record<number, string>>;
  details?: Record<Locale, Record<number, string>>;
  defence: string[];
  defenceNotes: Record<Locale, Record<number, string>>;
  conditions: Record<Locale, string>;
  risk: Record<Locale, string>;
  sources: CourseSource[];
  verification?: {
    engine: string;
    depth: number;
    beforeCp: number;
    afterCp: number;
  };
};
export type CourseChapter = {
  id: string;
  title: Record<Locale, string>;
  initialFen: string;
  line: string[];
  notes: Record<Locale, Record<number, string>>;
  branches: CourseBranch[];
  summary?: Record<Locale, string>;
  details?: Record<Locale, Record<number, string>>;
  sources?: CourseSource[];
  practiceColor: Color;
};
export type Course = {
  id: string;
  title: Record<Locale, string>;
  chapters: CourseChapter[];
  overview?: Record<Locale, string>;
  episodes?: CourseEpisode[];
  modelGames?: {
    id: string;
    title: Record<Locale, string>;
    pgn: string;
    source: string;
  }[];
};
export const courseProgressKey = (
  courseId: string,
  chapterId: string,
  mode: "watch" | "practice" | "explore",
) => `course_${courseId}_${chapterId}_${mode}`;
export type CoursePath = {
  id: string;
  title?: Record<Locale, string>;
  line: string[];
  notes: CourseChapter["notes"];
  details?: CourseChapter["details"];
  sources?: CourseSource[];
};
export function coursePaths(chapter: CourseChapter): CoursePath[] {
  const paths: CoursePath[] = [
    {
      id: "main",
      line: chapter.line,
      notes: chapter.notes,
      details: chapter.details,
      sources: chapter.sources,
    },
  ];
  const visit = (
    branches: CourseBranch[],
    parent: CoursePath,
    depth: number,
  ) => {
    if (depth > 32) throw Error("Course branch nesting limit");
    for (const [i, branch] of branches.entries()) {
      if (
        !Number.isInteger(branch.atPly) ||
        branch.atPly < 0 ||
        branch.atPly > parent.line.length ||
        !branch.line.length
      )
        throw Error("Invalid branch");
      const path: CoursePath = {
        id: `${parent.id}_${branch.id ?? i}`,
        title: branch.title,
        line: parent.line.slice(0, branch.atPly).concat(branch.line),
        notes: {
          ru: { ...parent.notes.ru, ...branch.notes.ru },
          en: { ...parent.notes.en, ...branch.notes.en },
        },
        details: {
          ru: { ...parent.details?.ru, ...branch.details?.ru },
          en: { ...parent.details?.en, ...branch.details?.en },
        },
        sources: branch.sources ?? parent.sources,
      };
      // Parent annotations beyond the fork describe another position.
      for (const locale of ["ru", "en"] as const) {
        for (const key of Object.keys(path.notes[locale]))
          if (+key > branch.atPly && branch.notes[locale][+key] === undefined)
            delete path.notes[locale][+key];
        for (const key of Object.keys(path.details![locale]))
          if (
            +key > branch.atPly &&
            branch.details?.[locale][+key] === undefined
          )
            delete path.details![locale][+key];
      }
      paths.push(path);
      if (paths.length > 256) throw Error("Too many course branches");
      visit(branch.branches ?? [], path, depth + 1);
    }
  };
  visit(chapter.branches, paths[0], 0);
  return paths;
}
export function validateCourses(courses: readonly Course[]) {
  const ids = new Set<string>();
  for (const course of courses) {
    if (ids.has(course.id)) throw Error("Duplicate course");
    ids.add(course.id);
    const chapters = new Set<string>();
    for (const chapter of course.chapters) {
      if (chapters.has(chapter.id)) throw Error("Duplicate chapter");
      chapters.add(chapter.id);
      const c = new Chess(chapter.initialFen);
      for (const u of chapter.line) playUci(c, u);
      for (const locale of ["ru", "en"] as const)
        if (
          !chapter.title[locale] ||
          !chapter.notes[locale][0] ||
          !chapter.notes[locale][chapter.line.length]
        )
          throw Error(`Missing explanation ${course.id}/${chapter.id}`);
      for (const b of coursePaths(chapter)) {
        const board = new Chess(chapter.initialFen);
        for (const u of b.line) playUci(board, u);
      }
    }
  }
}
