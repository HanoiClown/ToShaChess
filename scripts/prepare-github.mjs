import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
} from "node:fs";
import { resolve, join, relative } from "node:path";
const root = process.cwd(),
  out = resolve(root, "ToShaChess-GitHub");
if (existsSync(out))
  throw Error(
    "ToShaChess-GitHub already exists. Preserve it; choose a fresh workspace for another export.",
  );
mkdirSync(out);
const entries = [
  "src",
  "electron",
  "public",
  "licenses",
  "tests",
  ".github",
  "package.json",
  "package-lock.json",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
  "vitest.config.ts",
  "playwright.config.ts",
  ".gitignore",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
];
for (const p of entries)
  if (existsSync(join(root, p)))
    cpSync(join(root, p), join(out, p), {
      recursive: true,
      filter: (path) => !path.split(/[\\/]/).includes("__pycache__"),
    });
mkdirSync(join(out, "scripts"));
for (const p of [
  "build-electron.mjs",
  "start.mjs",
  "verify-content.ts",
  "import-library.py",
  "generate-themes.py",
  "setup-stockfish.ps1",
  "prepare-github.mjs",
  "smoke-portable.mjs",
  "download-big-library.py",
  "verify-big-library.py",
  "maia-bridge.py",
  "maia-lock.json",
  "setup-maia.py",
  "unpack-python.ps1",
  "tablebase-bridge.py",
])
  cpSync(join(root, "scripts", p), join(out, "scripts", p));
mkdirSync(join(out, "docs"));
cpSync(join(root, "docs/PUBLISHING.md"), join(out, "docs/PUBLISHING.md"));
cpSync(join(root, "docs/LIBRARY.md"), join(out, "docs/LIBRARY.md"));
for (const file of [
  "TRAINING.md",
  "AUTHORING.md",
  "ENGINES.md",
  "OPTIONAL_TOOLS.md",
])
  if (existsSync(join(root, "docs", file)))
    cpSync(join(root, "docs", file), join(out, "docs", file));
let count = 0;
function audit(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name),
      rel = relative(out, path);
    if (item.isSymbolicLink()) throw Error("Unexpected symlink: " + rel);
    if (item.isDirectory()) {
      if (
        [
          "data",
          "history",
          ".git",
          "node_modules",
          "stockfish",
          "library-packs",
          "engine-packs",
          "__pycache__",
        ].includes(item.name)
      )
        throw Error("Private/generated directory: " + rel);
      audit(path);
      continue;
    }
    if (
      /\.(pgn|enc|exe|dll|pyd|zip|7z|sqlite|sqlite3|zst|db|pt|pth|ckpt|safetensors|whl|onnx|pb|gz|rtbw|rtbz)$/i.test(
        item.name,
      ) ||
      item.name.startsWith(".env")
    )
      throw Error("Private/generated file: " + rel);
    if (statSync(path).size > 50 * 1024 * 1024)
      throw Error("Oversized Git file: " + rel);
    if (/\.(tsx?|mjs|cjs|json|md|txt|py|ya?ml|ps1)$/.test(item.name)) {
      const text = readFileSync(path, "utf8");
      if (
        /sk-(?:proj-)?[A-Za-z0-9_-]{30,}/.test(text) ||
        /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/.test(text)
      )
        throw Error("Possible credential in " + rel);
    }
    count++;
  }
}
audit(out);
console.log(
  JSON.stringify({
    folder: out,
    files: count,
    history: "fresh export; original Git history not copied",
    data: "no saved games, key files or personal PGN archive",
  }),
);
