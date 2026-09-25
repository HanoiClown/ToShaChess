import { it, expect, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../../electron/storage/store";
import { CloudCoach } from "../../electron/coach/provider";
it("does not retry quota failures and preserves uncertain reservations", async () => {
  const store = new Store(mkdtempSync(join(tmpdir(), "chess-coach-")));
  const denied = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: { code: "insufficient_quota" } }), {
        status: 429,
      }),
  );
  const coach = new CloudCoach(store, () => "test-key", denied as typeof fetch);
  await expect(coach.request("Explain", "en")).rejects.toThrow(
    "cloud_unavailable",
  );
  expect(denied).toHaveBeenCalledTimes(1);
  expect(store.data.usage[0].actual).toBe(0);
  const failed = new CloudCoach(
    store,
    () => "test-key",
    vi.fn(async () => {
      throw Error("network");
    }) as typeof fetch,
  );
  await expect(failed.request("Explain", "ru")).rejects.toThrow();
  expect(store.data.usage[1].actual).toBe(null);
});
