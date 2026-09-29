import { it, expect } from "vitest";
import { createStudy } from "../../src/study/tree";
import { StudySaveQueue } from "../../src/study/save-queue";

it("a failed old write cannot overwrite a newer queued revision on retry", async () => {
  const queue = new StudySaveQueue();
  const old = createStudy({ profileId: "test", title: "Old" });
  const latest = { ...old, title: "Latest" };
  let rejectFirst!: (error: Error) => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  queue.pending.set(old.id, old);
  const first = queue.flush(
    () =>
      new Promise((_resolve, reject) => {
        rejectFirst = reject;
        started();
      }),
  );
  const failed = expect(first).rejects.toThrow("disk busy");
  await ready;
  queue.pending.set(latest.id, latest);
  const writes: string[] = [];
  const second = queue.flush(async (document) => {
    writes.push(document.title);
  });
  rejectFirst(Error("disk busy"));
  await failed;
  await second;
  await queue.flush(async (document) => {
    writes.push(document.title);
  });
  expect(writes).toEqual(["Latest"]);
  expect(queue.pending.size).toBe(0);
});

it("edits made during a successful write remain pending for the next flush", async () => {
  const queue = new StudySaveQueue();
  const old = createStudy({ profileId: "test", title: "Old" });
  const latest = { ...old, title: "Latest" };
  queue.pending.set(old.id, old);
  await queue.flush(async () => {
    queue.pending.set(latest.id, latest);
  });
  expect(queue.pending.get(old.id)).toBe(latest);
  await queue.flush(async (document) => {
    expect(document).toBe(latest);
  });
  expect(queue.pending.size).toBe(0);
});
