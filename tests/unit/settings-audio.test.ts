import { describe, expect, it } from "vitest";
import {
  freshDatabase,
  settingsSchema,
  validateDatabase,
} from "../../electron/storage/schema";

describe("portable volume preferences", () => {
  it("migrates older saves without changing mute, budget or analysis detail", () => {
    const old = structuredClone(freshDatabase()) as unknown as {
      settings: Record<string, unknown>;
    };
    old.settings = { sound: false, budget: 2000000, engineMs: 800 };
    expect(validateDatabase(old).settings).toEqual({
      sound: false,
      volume: 65,
      budget: 2000000,
      engineMs: 800,
    });
  });
  it("keeps zero volume and rejects invalid persisted levels", () => {
    const settings = { ...freshDatabase().settings, volume: 0 };
    expect(settingsSchema.parse(settings).volume).toBe(0);
    for (const volume of [-1, 101, 0.5, NaN])
      expect(() => settingsSchema.parse({ ...settings, volume })).toThrow();
  });
});
