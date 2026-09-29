import { it, expect } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { Lc0Pack } from "../../electron/packs/lc0";
it("verifies an immutable engine archive, installs runtime files, and rejects a damaged installation", async () => {
  const root = await mkdtemp(join(tmpdir(), "ToSha lc0 pack "));
  const archive = Buffer.from("verified fixture archive");
  let downloads = 0;
  const asset = {
    url: "https://example.test/lc0.zip",
    size: archive.length,
    sha256: createHash("sha256").update(archive).digest("hex"),
  };
  const pack = new Lc0Pack(root, "unused.ps1", () => {}, {
    asset,
    fetcher: (async () => {
      downloads++;
      return new Response(archive);
    }) as typeof fetch,
    extract: async (_archive, target) => {
      await mkdir(join(target, "runtime"), { recursive: true });
      await writeFile(join(target, "runtime/lc0.exe"), "fixture binary");
      await writeFile(join(target, "runtime/COPYING"), "fixture license");
    },
  });
  try {
    expect(pack.executable()).toBeNull();
    await pack.install();
    expect(pack.status().status).toBe("ready");
    expect(pack.executable()).toBe(join(root, "lc0-cpu/runtime/lc0.exe"));
    await pack.verify();
    expect(downloads).toBe(1);
    await writeFile(pack.executable()!, "changed");
    await expect(pack.verify()).rejects.toThrow(/checksum/);
    expect(pack.status().status).toBe("error");
    await pack.install();
    expect(downloads).toBe(1);
    expect(pack.status().status).toBe("ready");
    await pack.remove();
    expect(pack.executable()).toBeNull();
  } finally {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep))
      throw Error("Invalid cleanup path");
    await rm(root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  }
});
