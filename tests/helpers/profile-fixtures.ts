import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { emptyProgress, freshDatabase } from "../../electron/storage/schema";
import { Store } from "../../electron/storage/store";

/** Explicit legacy data for tests that exercise two existing profiles. */
export function profileDatabase() {
  const database = freshDatabase();
  database.profiles = [
    {
      id: "hanoi",
      name: "Игрок 1",
      locale: "ru",
      level: "beginner",
      color: "#81b64c",
    },
    {
      id: "sister",
      name: "Игрок 2",
      locale: "ru",
      level: "new",
      color: "#b69be8",
    },
  ];
  database.progress = { hanoi: emptyProgress(), sister: emptyProgress() };
  return database;
}

export function seedProfiles(directory: string) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "chess-home.json"),
    JSON.stringify(profileDatabase()),
  );
}

export function profileStore(directory: string) {
  seedProfiles(directory);
  return new Store(directory);
}
