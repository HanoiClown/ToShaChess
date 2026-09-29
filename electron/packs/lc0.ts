import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  mkdir,
  readdir,
  writeFile,
  rm,
  lstat,
  rename,
  statfs,
} from "node:fs/promises";
import { join, relative } from "node:path";
import { safePackPath, sha256, verifiedDownload, type Artifact } from "./files";
import type { OptionalPackState } from "../../src/shared/optional-tools";

export const LC0_ASSET: Artifact = {
  url: "https://github.com/LeelaChessZero/lc0/releases/download/v0.32.1/lc0-v0.32.1-windows-cpu-dnnl.zip",
  size: 24001097,
  sha256: "b9cfcfbd3dabffbfd452f6e8e087c22273721bef48eba19640b6d92006c142f5",
};
type Receipt = {
  archive: string;
  executable: string;
  files: { path: string; size: number; sha256: string }[];
};
type Dependencies = {
  asset?: Artifact;
  fetcher?: typeof fetch;
  extract?: (
    archive: string,
    target: string,
    signal: AbortSignal,
  ) => Promise<void>;
};
/** Installs only an explicitly requested CPU runtime; no weights are selected implicitly. */
export class Lc0Pack {
  private controller: AbortController | null = null;
  private state: OptionalPackState;
  private asset: Artifact;
  constructor(
    private root: string,
    private unpackScript: string,
    private notify: () => void = () => {},
    private dependencies: Dependencies = {},
  ) {
    this.asset = dependencies.asset ?? LC0_ASSET;
    const receipt = this.receipt();
    this.state = {
      id: "lc0-cpu",
      title: "Lc0 0.32.1 · CPU",
      status: receipt ? "ready" : "missing",
      bytes: 0,
      downloadBytes: this.asset.size,
      installedBytes:
        receipt?.files.reduce((total, file) => total + file.size, 0) ?? 0,
      message: "",
      license: "GPL-3.0-or-later · engine; choose network separately",
      source: "https://github.com/LeelaChessZero/lc0/tree/v0.32.1",
    };
  }
  directory() {
    return safePackPath(this.root, "lc0-cpu");
  }
  private receipt(): Receipt | null {
    try {
      const value = JSON.parse(
        readFileSync(safePackPath(this.directory(), "receipt.json"), "utf8"),
      ) as Receipt;
      if (
        value.archive !== this.asset.sha256 ||
        !Array.isArray(value.files) ||
        !value.files.length ||
        !value.files.every(
          (file) =>
            typeof file.path === "string" &&
            Number.isSafeInteger(file.size) &&
            /^[a-f0-9]{64}$/.test(file.sha256) &&
            existsSync(safePackPath(this.directory(), file.path)),
        ) ||
        !existsSync(safePackPath(this.directory(), value.executable))
      )
        return null;
      return value;
    } catch {
      return null;
    }
  }
  executable() {
    const receipt = this.receipt();
    return receipt ? safePackPath(this.directory(), receipt.executable) : null;
  }
  status() {
    return { ...this.state };
  }
  private update(patch: Partial<OptionalPackState>) {
    Object.assign(this.state, patch);
    this.notify();
  }
  private async plain(path: string) {
    if ((await lstat(path).catch(() => null))?.isSymbolicLink())
      throw Error("unsafe_pack_symlink");
  }
  private begin() {
    if (this.controller) throw Error("pack_busy");
    const controller = new AbortController();
    this.controller = controller;
    this.update({ status: "installing", bytes: 0, message: "" });
    return controller;
  }
  private async extract(
    archive: string,
    destination: string,
    signal: AbortSignal,
  ) {
    if (this.dependencies.extract)
      return this.dependencies.extract(archive, destination, signal);
    return new Promise<void>((accept, reject) => {
      const child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          this.unpackScript,
          "-Archive",
          archive,
          "-Destination",
          destination,
        ],
        { windowsHide: true, shell: false, stdio: "ignore" },
      );
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        error ? reject(error) : accept();
      };
      const abort = () => {
        child.kill();
        finish(new DOMException("Installation cancelled", "AbortError"));
      };
      const timeout = setTimeout(() => {
        child.kill();
        finish(Error("lc0_extract_timeout"));
      }, 120000);
      signal.addEventListener("abort", abort, { once: true });
      child.on("error", (error) => finish(error));
      child.on("close", (code) =>
        finish(code === 0 ? undefined : Error("lc0_extract_failed")),
      );
      if (signal.aborted) abort();
    });
  }
  private async inventory(
    root: string,
    signal: AbortSignal,
  ): Promise<Receipt["files"]> {
    const files: Receipt["files"] = [];
    const visit = async (directory: string) => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        signal.throwIfAborted();
        const file = safePackPath(directory, entry.name);
        await this.plain(file);
        if (entry.isDirectory()) await visit(file);
        else if (entry.isFile())
          files.push({
            path: relative(root, file),
            size: (await lstat(file)).size,
            sha256: await sha256(file),
          });
        else throw Error("unsafe_archive_entry");
      }
    };
    await visit(root);
    return files;
  }
  async install() {
    const controller = this.begin(),
      staging = safePackPath(this.root, "lc0-cpu.staging");
    try {
      await this.plain(this.directory());
      await this.plain(staging);
      await mkdir(this.root, { recursive: true });
      const disk = await statfs(this.root);
      if (Number(disk.bavail) * Number(disk.bsize) < 256 * 1024 * 1024)
        throw Error("insufficient_disk_space");
      const cache = safePackPath(this.root, ".downloads");
      await this.plain(cache);
      const assetCache = safePackPath(cache, this.asset.sha256);
      await this.plain(assetCache);
      const archive = safePackPath(assetCache, "lc0.zip");
      await this.plain(archive);
      await this.plain(archive + ".part");
      await verifiedDownload(
        this.asset,
        archive,
        controller.signal,
        (bytes) => this.update({ bytes }),
        this.dependencies.fetcher,
      );
      await rm(staging, { recursive: true, force: true });
      await mkdir(staging, { recursive: true });
      await this.extract(archive, staging, controller.signal);
      const files = await this.inventory(staging, controller.signal);
      const binaries = files.filter((file) =>
        /(^|[\\/])lc0\.exe$/i.test(file.path),
      );
      if (binaries.length !== 1) throw Error("lc0_binary_missing");
      const receipt: Receipt = {
        archive: this.asset.sha256,
        executable: binaries[0].path,
        files,
      };
      await writeFile(
        safePackPath(staging, "receipt.json"),
        JSON.stringify(receipt),
      );
      controller.signal.throwIfAborted();
      await rm(this.directory(), { recursive: true, force: true });
      await rename(staging, this.directory());
      this.update({
        status: "ready",
        installedBytes: files.reduce((sum, file) => sum + file.size, 0),
        message: "",
      });
    } catch (error) {
      this.update({
        status: controller.signal.aborted ? "cancelled" : "error",
        message: (error as Error).message,
      });
      throw error;
    } finally {
      this.controller = null;
    }
  }
  async verify() {
    const controller = this.begin();
    try {
      await this.plain(this.directory());
      const receipt = this.receipt();
      if (!receipt) throw Error("lc0_receipt_missing");
      let checked = 0;
      for (const item of receipt.files) {
        controller.signal.throwIfAborted();
        const file = safePackPath(this.directory(), item.path);
        await this.plain(file);
        if (
          (await lstat(file)).size !== item.size ||
          (await sha256(file)) !== item.sha256
        )
          throw Error("lc0_checksum_mismatch");
        checked += item.size;
      }
      this.update({ status: "ready", installedBytes: checked, message: "" });
    } catch (error) {
      this.update({
        status: controller.signal.aborted ? "cancelled" : "error",
        message: (error as Error).message,
      });
      throw error;
    } finally {
      this.controller = null;
    }
  }
  cancel() {
    this.controller?.abort();
  }
  async remove() {
    if (this.controller) throw Error("pack_busy");
    const target = this.directory(); // fixed managed child, never a user-selected executable
    await this.plain(target);
    await rm(target, { recursive: true, force: true });
    const staging = safePackPath(this.root, "lc0-cpu.staging");
    const downloads = safePackPath(this.root, ".downloads");
    const archiveCache = safePackPath(downloads, this.asset.sha256);
    await this.plain(staging);
    await this.plain(downloads);
    await this.plain(archiveCache);
    await rm(staging, { recursive: true, force: true });
    await rm(archiveCache, { recursive: true, force: true });
    this.update({
      status: "missing",
      bytes: 0,
      installedBytes: 0,
      message: "",
    });
  }
}
