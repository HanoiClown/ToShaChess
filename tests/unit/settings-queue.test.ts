import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

it("serializes rapid preference changes and merges each with the latest saved settings", async () => {
  let settings = { sound: true, volume: 65, budget: 5000000, engineMs: 300 };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = true;
  vi.stubGlobal("window", {
    chessApp: {
      snapshot: async () => ({ database: { settings: { ...settings } } }),
      updateSettings: async (next: typeof settings) => {
        if (first) {
          first = false;
          await gate;
        }
        settings = next;
        return { database: { settings: { ...settings } } };
      },
    },
  });
  const { saveSettingsPatch } = await import("../../src/audio/settings");
  const volume = saveSettingsPatch({ volume: 20 });
  const detail = saveSettingsPatch({ engineMs: 800 });
  const mute = saveSettingsPatch({ sound: false });
  release();
  await Promise.all([volume, detail, mute]);
  expect(settings).toEqual({
    sound: false,
    volume: 20,
    budget: 5000000,
    engineMs: 800,
  });
  settings.budget = 1000000;
  await saveSettingsPatch({ volume: 0 });
  expect(settings).toEqual({
    sound: false,
    volume: 0,
    budget: 1000000,
    engineMs: 800,
  });
});
