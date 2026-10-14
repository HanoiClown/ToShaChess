// Downloads the official Stockfish 19 build for the current platform and checks a pinned SHA-256.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
if (process.platform === "win32") {
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(root, "scripts", "setup-stockfish.ps1")],
    { stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}
const builds = {
  "linux-x64": {
    name: "stockfish-linux-x86-64-universal",
    sha256: "9defc0d4e55d49c65a6d042f3e571a39fcea499ade6dbe741b53b8c65e03611f",
  },
  "linux-arm64": {
    name: "stockfish-linux-arm64-universal",
    sha256: "fe26cfd1d9db4c8af3d21e24d9ff34cacb31c1f940085a7583da11796f2bac01",
  },
  "linux-riscv64": {
    name: "stockfish-linux-riscv64-universal",
    sha256: "d4b4d118c003bc669a939d9fb208e3ef6b367730fd79a70dbc278b18475df3d1",
  },
};
const build = builds[`${process.platform}-${process.arch}`];
if (!build) throw Error(`No Stockfish 19 build for ${process.platform}-${process.arch}`);
const binary = join(root, "stockfish", build.name);
if (existsSync(binary)) {
  console.log("Stockfish already present.");
  process.exit(0);
}
const url = `https://github.com/official-stockfish/Stockfish/releases/download/sf_19/${build.name}.tar.gz`;
const response = await fetch(url);
if (!response.ok) throw Error(`Download failed: ${response.status} ${url}`);
const data = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(data).digest("hex") !== build.sha256)
  throw Error("Stockfish archive checksum mismatch");
const temp = mkdtempSync(join(tmpdir(), "toshachess-stockfish-"));
try {
  const archive = join(temp, "stockfish.tar.gz");
  writeFileSync(archive, data);
  // The archive contains a top-level `stockfish/` folder with the binary, source and license.
  const tar = spawnSync("tar", ["-xzf", archive, "-C", root], { stdio: "inherit" });
  if (tar.status !== 0) throw Error("Stockfish archive extraction failed");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
if (!existsSync(binary)) throw Error("Stockfish executable not found after extraction");
chmodSync(binary, 0o755);
console.log("Stockfish 19 installed with upstream source and license.");
