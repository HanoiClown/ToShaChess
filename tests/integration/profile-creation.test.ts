import { afterEach, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppService } from "../../electron/service";
import { Store } from "../../electron/storage/store";
import {
  freshDatabase,
  mergeBackup,
  validateDatabase,
} from "../../electron/storage/schema";
import { profileDatabase, seedProfiles } from "../helpers/profile-fixtures";

const services: AppService[] = [];
afterEach(() => {
  services.splice(0).forEach((service) => service.dispose());
});
function app(directory = mkdtempSync(join(tmpdir(), "chess-profile-"))) {
  const service = new AppService(new Store(directory), "unused", () => {});
  services.push(service);
  return service;
}
const input = {
  name: " Анна ",
  nickname: " Queen_Anna ",
  skillLevel: "new" as const,
  rating: 0,
  locale: "ru" as const,
};

it("starts and reloads an empty installation ready to create the first profile", () => {
  const service = app();
  expect(service.snapshot().database.profiles).toEqual([]);
  expect(service.snapshot().database.progress).toEqual({});
  expect(new Store(service.store.dir).data.profiles).toEqual([]);
  expect(validateDatabase(freshDatabase()).profiles).toEqual([]);
});

it("creates and selects a trimmed profile with its own persisted progress", () => {
  const service = app();
  const snapshot = service.createProfile(input);
  const profile = snapshot.database.profiles[0];
  expect(profile).toMatchObject({
    name: "Анна",
    nickname: "Queen_Anna",
    skillLevel: "new",
    level: "new",
    rating: 0,
    locale: "ru",
  });
  expect(profile.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(snapshot.activeProfile).toBe(profile.id);
  expect(snapshot.database.progress[profile.id].completed).toEqual([]);
  expect(new Store(service.store.dir).data.profiles).toEqual(
    snapshot.database.profiles,
  );
  const second = service.createProfile({
    ...input,
    nickname: "player_two",
    skillLevel: "advanced",
    rating: 1800,
  });
  expect(second.database.profiles[1].level).toBe("beginner");
  expect(second.database.progress[profile.id]).not.toBe(
    second.database.progress[second.activeProfile!],
  );
});

it("rejects duplicate normalized nicknames without changing persisted profiles", () => {
  const service = app();
  service.createProfile(input);
  expect(() =>
    service.createProfile({ ...input, nickname: "queen_anna" }),
  ).toThrow("nickname_taken");
  expect(() =>
    service.createProfile({ ...input, nickname: "Ｑｕｅｅｎ_Ａｎｎａ" }),
  ).toThrow("nickname_taken");
  service.createProfile({ ...input, nickname: "second" });
  const profile = service.store.data.profiles[1];
  expect(() =>
    service.updateProfile({ ...profile, nickname: "QUEEN_ANNA" }),
  ).toThrow("nickname_taken");
  expect(
    new Store(service.store.dir).data.profiles.map((p) => p.nickname),
  ).toEqual(["Queen_Anna", "second"]);
});

it.each([
  { name: " " },
  { name: "x".repeat(41) },
  { nickname: "" },
  { nickname: "bad name" },
  { nickname: "../escape" },
  { skillLevel: "expert" },
  { rating: -1 },
  { rating: 3001 },
  { rating: 12.5 },
])("rejects invalid profile input %j before writing it", (invalid) => {
  const service = app();
  expect(() =>
    service.createProfile({ ...input, ...invalid } as typeof input),
  ).toThrow();
  expect(service.store.data.profiles).toEqual([]);
});

it("limits creation to twenty profiles and leaves existing progress intact", () => {
  const service = app();
  for (let i = 0; i < 20; i++)
    service.createProfile({ ...input, nickname: `player_${i}` });
  expect(() =>
    service.createProfile({ ...input, nickname: "overflow" }),
  ).toThrow("profile_limit");
  expect(new Store(service.store.dir).data.profiles).toHaveLength(20);
});

it("preserves legacy profile names and progress without inventing nicknames or ratings", () => {
  const directory = mkdtempSync(join(tmpdir(), "chess-migration-"));
  seedProfiles(directory);
  const store = new Store(directory);
  store.update((database) => {
    database.profiles[0].name = "Existing name";
    database.progress.hanoi.completed = ["board"];
  });
  const service = app(directory);
  expect(service.store.data.profiles[0]).toMatchObject({
    id: "hanoi",
    name: "Existing name",
  });
  expect(service.store.data.profiles[0].nickname).toBeUndefined();
  expect(service.store.data.profiles[0].rating).toBeUndefined();
  service.createProfile(input);
  expect(new Store(directory).data.progress.hanoi.completed).toEqual(["board"]);
});

it("restores backups into empty installations and accepts an empty backup", () => {
  const restored = mergeBackup(freshDatabase(), profileDatabase());
  expect(restored.profiles.map((p) => p.id)).toEqual(["hanoi", "sister"]);
  expect(mergeBackup(restored, freshDatabase()).profiles).toEqual(
    restored.profiles,
  );
  expect(mergeBackup(freshDatabase(), freshDatabase()).profiles).toEqual([]);
});

it("rejects nickname collisions during backup merge without changing either database", () => {
  const first = app();
  const second = app();
  first.createProfile(input);
  second.createProfile({ ...input, nickname: "queen_anna" });
  const before = structuredClone(first.store.data);
  expect(() => mergeBackup(first.store.data, second.store.data)).toThrow(
    "nickname_taken",
  );
  expect(first.store.data).toEqual(before);
  expect(second.store.data.profiles[0].nickname).toBe("queen_anna");
});
