import { it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../electron/storage/store";
import { Budget } from "../../electron/coach/budget";
it("reservations survive restart and do not reset on profile switch; months settle correctly", () => {
  const dir = mkdtempSync(join(tmpdir(), "chess-budget-"));
  const store = new Store(dir);
  const b = new Budget(store);
  expect(b.reserve("one", 4900000, new Date(2026, 8, 25))).toBe(true);
  expect(b.reserve("two", 200000, new Date(2026, 8, 25))).toBe(false);
  const reopened = new Budget(new Store(dir));
  expect(reopened.reserve("three", 200000, new Date(2026, 8, 25))).toBe(false);
  expect(reopened.reserve("oct", 200000, new Date(2026, 9, 1))).toBe(true);
  reopened.settle("one", 1000);
  expect(reopened.total(new Date(2026, 8, 25))).toBe(1000);
  expect(reopened.total(new Date(2026, 9, 1))).toBe(200000);
});
