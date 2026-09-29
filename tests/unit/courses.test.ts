import { test, expect } from "vitest";
import { courses } from "../../src/content/courses";
import { courseProgressKey, validateCourses } from "../../src/library/courses";
test("eight coherent bilingual courses have playable main lines and branches", () => {
  expect(courses).toHaveLength(8);
  expect(() => validateCourses(courses)).not.toThrow();
  for (const c of courses) {
    expect(c.chapters.length).toBeGreaterThanOrEqual(4);
    expect(c.chapters[1].line.length).toBeGreaterThanOrEqual(18);
    expect(c.chapters[1].branches.length).toBeGreaterThanOrEqual(2);
  }
  expect(courses.find((c) => c.id === "caro")!.title.ru).toContain("Защита");
  expect(courseProgressKey("caro", "main", "watch")).not.toBe(
    courseProgressKey("caro", "main", "practice"),
  );
  expect(courseProgressKey("caro", "main", "practice")).toMatch(
    /^[a-z0-9_-]{1,100}$/,
  );
});
