import { expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppService } from "../../electron/service";
import { Store } from "../../electron/storage/store";
import { profileSchema, validateDatabase } from "../../electron/storage/schema";
import { newGame } from "../../src/chess/game";
import { profileStore, profileDatabase } from "../helpers/profile-fixtures";

const settings = {
  provider: "maia" as const,
  botId: "spark",
  color: "b" as const,
  maia: {
    pack: "maia-23m" as const,
    selfElo: 1500,
    opponentElo: 900,
    temperature: 1.3,
  },
};

it("preserves bounded opponent settings while legacy profiles keep their defaults", () => {
  const legacy = profileDatabase();
  expect(validateDatabase(legacy).profiles[0].opponent).toBeUndefined();
  const profile = { ...legacy.profiles[0], opponent: settings };
  expect(profileSchema.parse(profile).opponent).toEqual(settings);
  for (const invalid of [
    { ...settings, provider: "cloud" },
    { ...settings, color: "white" },
    { ...settings, maia: { ...settings.maia, pack: "arbitrary-model" } },
    { ...settings, maia: { ...settings.maia, selfElo: 599 } },
    { ...settings, maia: { ...settings.maia, opponentElo: 2601 } },
    { ...settings, maia: { ...settings.maia, temperature: Infinity } },
  ])
    expect(() =>
      profileSchema.parse({ ...profile, opponent: invalid }),
    ).toThrow();
});

it("keeps opponent settings per profile across restart without changing an unfinished game", () => {
  const directory = mkdtempSync(join(tmpdir(), "tosha-opponent-preferences-"));
  const store = profileStore(directory);
  const service = new AppService(store, "unused", () => {});
  try {
    service.selectProfile("hanoi");
    const game = newGame("hanoi", "Player", "w", "training", 0, 0, 1);
    game.moves = ["e2e4", "e7e5"];
    service.saveGame(game);
    const originalGame = structuredClone(service.getGame(game.id));
    service.updateProfile({ ...store.data.profiles[0], opponent: settings });
    service.selectProfile("sister");
    expect(store.data.profiles[1].opponent).toBeUndefined();
    expect(() =>
      service.updateProfile({
        ...store.data.profiles[0],
        opponent: { ...settings, color: "w" },
      }),
    ).toThrow("wrong_profile");
    const second = {
      ...settings,
      provider: "stockfish" as const,
      botId: "pixel",
      color: "w" as const,
    };
    service.updateProfile({ ...store.data.profiles[1], opponent: second });
    const reopened = new Store(directory);
    expect(
      reopened.data.profiles.find((p) => p.id === "hanoi")!.opponent,
    ).toEqual(settings);
    expect(
      reopened.data.profiles.find((p) => p.id === "sister")!.opponent,
    ).toEqual(second);
    expect(reopened.data.games[0]).toEqual(originalGame);
  } finally {
    service.dispose();
  }
});
