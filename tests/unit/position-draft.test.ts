import { expect, test } from "vitest";
import {
  draftFromFen,
  validateDraft,
  emptyDraft,
} from "../../src/editor/position-draft";
import { START } from "../../src/chess/game";
test("rejects incomplete and impossible immediate positions before engine access", () => {
  expect(validateDraft(emptyDraft()).ok).toBe(false);
  for (const fen of [
    "8/8/8/8/8/8/4k3/4K3 w - - 0 1",
    "P6k/8/8/8/8/8/8/4K3 w - - 0 1",
    "4k3/8/8/8/8/8/8/4K3 w K - 0 1",
    "4k3/8/8/8/8/8/8/4K3 w - e6 0 1",
  ])
    expect(validateDraft(draftFromFen(fen)).ok).toBe(false);
});
test("roundtrips standard FEN, accepts valid en passant and rejects malformed text", () => {
  expect(validateDraft(draftFromFen(START))).toEqual({ ok: true, fen: START });
  expect(
    validateDraft(draftFromFen("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1")).ok,
  ).toBe(true);
  expect(() => draftFromFen("not a position")).toThrow();
  expect(() => draftFromFen("8/8/8/8/8/8/8/8 w - - 0")).toThrow();
});
