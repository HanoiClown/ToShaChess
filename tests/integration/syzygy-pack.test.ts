import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { SyzygyPack } from "../../electron/packs/syzygy";
import manifest from "../../electron/packs/syzygy-manifest.json";
it("pins the complete 3–5 piece WDL and DTZ dataset without six-piece files", () => {
  expect(manifest.files).toHaveLength(290);
  expect(new Set(manifest.files.map((file) => file.name)).size).toBe(290);
  expect(manifest.files.reduce((total, file) => total + file.size, 0)).toBe(
    983957920,
  );
  for (const file of manifest.files) {
    expect(file.name.split(".")[0].replace("v", "").length).toBeLessThanOrEqual(
      5,
    );
    expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
});
it("installs only pinned table assets, verifies offline, resumes, and removes its own pack", async () => {
  const root = mkdtempSync(join(tmpdir(), "ToSha tablepack test "));
  const payload = Buffer.from("fixture table");
  const assets = ["KPvK.rtbw", "KPvK.rtbz"].map((name) => ({
    name,
    url: "https://example.test/" + name,
    size: payload.length,
    sha256: createHash("sha256").update(payload).digest("hex"),
  }));
  let calls = 0;
  const pack = new SyzygyPack(
    root,
    () => {},
    (async () => {
      calls++;
      return new Response(payload);
    }) as typeof fetch,
    assets,
  );
  try {
    expect(pack.status().status).toBe("missing");
    await pack.install();
    expect(pack.status().status).toBe("ready");
    expect(existsSync(join(pack.directory(), "KPvK.rtbw"))).toBe(true);
    await pack.verify();
    await pack.install();
    expect(calls).toBe(2);
    await pack.remove();
    expect(pack.status().status).toBe("missing");
  } finally {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep))
      throw Error("Invalid cleanup");
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  }
});
