import { it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StudyStore } from "../../electron/storage/studies";
import { createStudy, addStudyMove } from "../../src/study/tree";

it("persists study branches per profile and refuses cross-owner replacement", () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-study-"));
  const store = new StudyStore(dir);
  const a = createStudy({ profileId: "a", title: "King's gambit" });
  const saved = store.save("a", a);
  expect(new StudyStore(dir).list("a")).toEqual([saved]);
  expect(store.list("b")).toEqual([]);
  expect(() => store.save("b", { ...a, profileId: "b" })).toThrow();
  expect(() => store.delete("b", a.id)).toThrow();
  expect(store.list("a")).toHaveLength(1);
});

it("recovers the previous study collection without deleting damaged data", () => {
  const dir = mkdtempSync(join(tmpdir(), "tosha-study-"));
  const store = new StudyStore(dir);
  store.save("a", createStudy({ profileId: "a", title: "First" }));
  store.save("a", createStudy({ profileId: "a", title: "Second" }));
  writeFileSync(join(dir, "studies.json"), "broken");
  const recovered = new StudyStore(dir);
  expect(recovered.recovered).toBe(true);
  expect(recovered.list("a")).toHaveLength(1);
  expect(readFileSync(join(dir, "studies.json"), "utf8")).toContain("First");
});

it("validates all imported studies before changing the collection", () => {
  const store = new StudyStore(mkdtempSync(join(tmpdir(), "tosha-study-")));
  const a = createStudy({ profileId: "a", title: "Original" });
  store.save("a", a);
  expect(() => store.merge([{ ...a, profileId: "missing" }], ["a"])).toThrow();
  expect(store.list("a")[0].title).toBe("Original");
});
