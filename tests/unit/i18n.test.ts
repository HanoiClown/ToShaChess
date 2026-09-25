import { it, expect } from "vitest";
import { ru, en, translate } from "../../src/i18n";
it("has complete RU/EN navigation and labels", () => {
  expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  expect(Object.values(en).every((x) => x.trim())).toBe(true);
  expect(translate("en", "play")).toBe("Play");
});
