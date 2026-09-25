import { profileStore } from "../helpers/profile-fixtures";
import { it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../electron/storage/store";
it("persists separate profiles, recovers last good backup and serializes updates", () => {
  const dir = mkdtempSync(join(tmpdir(), "chesshome-"));
  const s = profileStore(dir);
  s.update((d) => {
    d.progress.hanoi.completed.push("board");
  });
  s.update((d) => {
    d.progress.sister.completed.push("pawn");
  });
  expect(new Store(dir).data.progress.sister.completed).toEqual(["pawn"]);
  writeFileSync(join(dir, "chess-home.json"), "broken");
  const recovered = new Store(dir);
  expect(recovered.data.progress.hanoi.completed).toEqual(["board"]);
  expect(recovered.recovered).toBe(true);
  expect(readFileSync(join(dir, "chess-home.json"), "utf8")).toContain(
    "profiles",
  );
});
