import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import {
  mkdir,
  writeFile,
  copyFile,
  rm,
  lstat,
  realpath,
  statfs,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { safePackPath, sha256, verifiedDownload, type Artifact } from "./files";
import { lock, models, modelAsset, maiaVersion } from "./manifest";
import type { PackId, PackState } from "../../src/shared/packs";

function sizeOf(path: string): number {
  if (!existsSync(path)) return 0;
  return readdirSync(path, { withFileTypes: true }).reduce(
    (n, x) =>
      n +
      (x.isSymbolicLink()
        ? 0
        : x.isDirectory()
          ? sizeOf(join(path, x.name))
          : statSync(join(path, x.name)).size),
    0,
  );
}
async function run(
  executable: string,
  args: string[],
  signal: AbortSignal,
  progress: (line: string) => void,
) {
  signal.throwIfAborted();
  await new Promise<void>((accept, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let tail = "";
    const output = (chunk: Buffer) => {
      tail = (tail + chunk.toString()).slice(-2000);
      progress(tail.split(/\r?\n/).filter(Boolean).at(-1) ?? "Installing");
    };
    child.stdout.on("data", output);
    child.stderr.on("data", output);
    const cancel = () => {
      if (process.platform === "win32" && child.pid)
        spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        }).on("error", () => child.kill());
      else child.kill();
    };
    signal.addEventListener("abort", cancel, { once: true });
    child.once("error", (error) => {
      signal.removeEventListener("abort", cancel);
      reject(error);
    });
    child.once("close", (code) => {
      signal.removeEventListener("abort", cancel);
      if (signal.aborted) reject(Error("Cancelled"));
      else if (code) reject(Error(`runtime_setup_failed: ${tail.slice(-600)}`));
      else accept();
    });
  });
}
export class PackManager {
  private busy?: { id: PackId; controller: AbortController };
  private states = new Map<PackId, PackState>();
  private notification?: ReturnType<typeof setTimeout>;
  constructor(
    readonly root: string,
    private scripts: string,
    private notify: () => void,
  ) {
    for (const id of Object.keys(models) as PackId[]) {
      const model = models[id],
        runtime = id === "maia-cpu";
      const ready =
        existsSync(this.receipt(id)) &&
        existsSync(this.python()) &&
        existsSync(this.modelPath(id));
      this.states.set(id, {
        id,
        title: `Maia-3 ${runtime ? "5M · CPU" : id === "maia-23m" ? "23M" : "79M"}`,
        description: runtime
          ? {
              ru: "Человеческие ходы. Включает переносимый Python и PyTorch для процессора.",
              en: "Human move prediction. Includes portable Python and PyTorch for CPU.",
            }
          : {
              ru: "Более крупная модель. Использует уже установленный переносимый runtime.",
              en: "Larger model using the installed portable runtime.",
            },
        status: ready ? "ready" : "missing",
        bytes: 0,
        downloadBytes:
          model.size +
          (runtime
            ? lock.python.size + lock.packages.reduce((n, p) => n + p.size, 0)
            : 0),
        installedBytes: ready ? this.savedSize(id) : 0,
        message: "",
        license: "Maia: AGPL-3.0 · runtime: third-party licenses",
        source: "https://github.com/CSSLab/maia3",
        ...(runtime ? {} : { requires: "maia-cpu" as const }),
      });
    }
  }
  private id(input: string): PackId {
    if (!Object.hasOwn(models, input)) throw Error("invalid_pack");
    return input as PackId;
  }
  private receipt(id: PackId) {
    return safePackPath(this.root, `${id}.json`);
  }
  private savedSize(id: PackId) {
    try {
      return (
        Number(
          JSON.parse(readFileSync(this.receipt(id), "utf8")).installedBytes,
        ) || 0
      );
    } catch {
      return 0;
    }
  }
  runtime() {
    return safePackPath(this.root, "maia-cpu");
  }
  python() {
    return join(this.runtime(), "python", "python.exe");
  }
  modelPath(id: PackId) {
    return join(this.runtime(), "models", `${models[id].model}.pt`);
  }
  list() {
    return [...this.states.values()].map((s) => ({ ...s }));
  }
  private update(id: PackId, value: Partial<PackState>) {
    Object.assign(this.states.get(id)!, value);
    if (!this.notification)
      this.notification = setTimeout(() => {
        this.notification = undefined;
        this.notify();
      }, 180);
  }
  config(input: string) {
    const id = this.id(input);
    if (this.states.get(id)!.status !== "ready")
      throw Error("maia_pack_missing");
    return {
      executable: this.python(),
      args: [
        join(this.scripts, "maia-bridge.py"),
        "--pack",
        this.runtime(),
        "--model",
        models[id].model,
      ],
      cwd: this.runtime(),
      modelId: models[id].model,
      modelVersion: maiaVersion,
      startupTimeoutMs: 60000,
      requestTimeoutMs: 30000,
    };
  }
  async verify(input: string) {
    const id = this.id(input);
    if (this.busy) throw Error("pack_busy");
    const controller = new AbortController();
    this.busy = { id, controller };
    this.update(id, { status: "installing", message: "verify" });
    try {
      if (
        !existsSync(this.python()) ||
        !existsSync(this.modelPath(id)) ||
        (await sha256(this.modelPath(id))) !== models[id].sha256
      )
        throw Error("pack_checksum_mismatch");
      await run(
        this.python(),
        ["-c", "import torch, chess, maia3; print('runtime_verified')"],
        controller.signal,
        () => {},
      );
      const installedBytes =
        id === "maia-cpu"
          ? sizeOf(join(this.runtime(), "python")) + models[id].size
          : models[id].size;
      await writeFile(
        this.receipt(id),
        JSON.stringify({
          version: 1,
          model: models[id].model,
          source: maiaVersion,
          sha256: models[id].sha256,
          installedBytes,
        }),
      );
      this.update(id, { status: "ready", message: "", installedBytes });
    } catch (error) {
      this.update(id, {
        status: controller.signal.aborted ? "cancelled" : "error",
        message: String((error as Error).message),
      });
      throw error;
    } finally {
      this.busy = undefined;
    }
    return this.list();
  }
  async install(input: string) {
    const id = this.id(input);
    if (process.platform !== "win32") throw Error("pack_windows_only");
    if (this.busy) throw Error("pack_busy");
    if (id !== "maia-cpu" && this.states.get("maia-cpu")!.status !== "ready")
      throw Error("pack_dependency_missing");
    const controller = new AbortController(),
      signal = controller.signal;
    this.busy = { id, controller };
    this.update(id, { status: "installing", bytes: 0, message: "download" });
    const cache = safePackPath(this.root, ".downloads");
    let completed = 0;
    const download = async (asset: Artifact, name: string) => {
      const file = safePackPath(cache, `${asset.sha256}/${name}`);
      await verifiedDownload(asset, file, signal, (bytes) =>
        this.update(id, { bytes: completed + bytes, message: "download" }),
      );
      completed += statSync(file).size;
      return file;
    };
    try {
      await mkdir(this.runtime(), { recursive: true });
      const disk = await statfs(this.runtime());
      const needed =
        id === "maia-cpu" ? 1200 * 1048576 : models[id].size * 2 + 16 * 1048576;
      if (Number(disk.bavail) * Number(disk.bsize) < needed)
        throw Error("insufficient_disk_space");
      if (id === "maia-cpu") {
        const archive = await download(lock.python, "python.zip");
        for (const item of lock.packages) await download(item, item.file);
        const pythonDir = join(this.runtime(), "python");
        await mkdir(pythonDir, { recursive: true });
        // Script parameters carry paths as arguments rather than shell interpolation.
        await run(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            join(this.scripts, "unpack-python.ps1"),
            "-Archive",
            archive,
            "-Destination",
            pythonDir,
          ],
          signal,
          () => this.update(id, { message: "unpack" }),
        );
        await writeFile(
          join(pythonDir, "python313._pth"),
          "python313.zip\n.\nLib\\site-packages\nimport site\n",
        );
        await run(
          this.python(),
          [
            join(this.scripts, "setup-maia.py"),
            "--cache",
            cache,
            "--lock",
            join(this.scripts, "maia-lock.json"),
          ],
          signal,
          () => this.update(id, { message: "install" }),
        );
      }
      const checkpoint = await download(
        modelAsset(id),
        `${models[id].model}.pt`,
      );
      await mkdir(join(this.runtime(), "models"), { recursive: true });
      await copyFile(checkpoint, this.modelPath(id));
    } catch (error) {
      this.update(id, {
        status: signal.aborted ? "cancelled" : "error",
        message: String((error as Error).message),
      });
      throw error;
    } finally {
      this.busy = undefined;
    }
    return this.verify(id);
  }
  cancel(input: string) {
    const id = this.id(input);
    if (this.busy?.id === id) this.busy.controller.abort();
  }
  async remove(input: string) {
    const id = this.id(input);
    if (this.busy) throw Error("pack_busy");
    const target = id === "maia-cpu" ? this.runtime() : this.modelPath(id);
    const base = await realpath(this.root);
    if (existsSync(target)) {
      if ((await lstat(target)).isSymbolicLink())
        throw Error("invalid_pack_path");
      const checked = await realpath(target);
      if (!checked.toLowerCase().startsWith(resolve(base).toLowerCase() + "\\"))
        throw Error("invalid_pack_path");
      await rm(checked, { recursive: id === "maia-cpu", force: true });
    }
    for (const affected of id === "maia-cpu"
      ? (Object.keys(models) as PackId[])
      : [id]) {
      await rm(this.receipt(affected), { force: true });
      this.update(affected, {
        status: "missing",
        installedBytes: 0,
        bytes: 0,
        message: "",
      });
    }
    return this.list();
  }
  dispose() {
    this.busy?.controller.abort();
    clearTimeout(this.notification);
  }
}
