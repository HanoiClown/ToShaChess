import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile, rm, lstat, statfs } from "node:fs/promises";
import { join } from "node:path";
import manifest from "./syzygy-manifest.json";
import { safePackPath, sha256, verifiedDownload, type Artifact } from "./files";
import type { OptionalPackState } from "../../src/shared/optional-tools";

export type TableAsset = Artifact & { name: string };
export class SyzygyPack {
  private controller: AbortController | null = null;
  private state: OptionalPackState;
  constructor(
    private root: string,
    private notify: () => void = () => {},
    private fetcher: typeof fetch = fetch,
    private assets: TableAsset[] = manifest.files,
  ) {
    if (
      assets.some((asset) => !/^[KQRBNP]+v[KQRBNP]+\.rtb[wz]$/.test(asset.name))
    )
      throw Error("Invalid table asset");
    const total = assets.reduce((sum, asset) => sum + asset.size, 0);
    const ready =
      existsSync(this.receipt()) &&
      assets.every((asset) => existsSync(join(this.directory(), asset.name)));
    this.state = {
      id: "syzygy-3-5",
      title: "Syzygy · 3–5",
      status: ready ? "ready" : "missing",
      bytes: 0,
      downloadBytes: total,
      installedBytes: ready ? total : 0,
      message: "",
      license: "Table files: freely redistributable (Ronald de Man)",
      source: "https://github.com/syzygy1/tb",
    };
  }
  directory() {
    return safePackPath(this.root, "syzygy-3-5");
  }
  private receipt() {
    return safePackPath(this.directory(), "receipt.json");
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
  async install() {
    const controller = this.begin();
    try {
      await this.plain(this.directory());
      await mkdir(this.directory(), { recursive: true });
      const disk = await statfs(this.directory());
      if (
        Number(disk.bavail) * Number(disk.bsize) <
        this.state.downloadBytes + 16 * 1024 * 1024
      )
        throw Error("insufficient_disk_space");
      let completed = 0;
      for (const asset of this.assets) {
        controller.signal.throwIfAborted();
        const file = safePackPath(this.directory(), asset.name);
        await this.plain(file);
        await this.plain(file + ".part");
        await verifiedDownload(
          asset,
          file,
          controller.signal,
          (bytes) =>
            this.update({ bytes: completed + bytes, message: asset.name }),
          this.fetcher,
        );
        completed += asset.size;
      }
      await writeFile(
        this.receipt(),
        JSON.stringify({
          sourceCommit: manifest.sourceCommit,
          files: this.assets.length,
          bytes: completed,
        }),
      );
      this.update({
        status: "ready",
        bytes: completed,
        installedBytes: completed,
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
      let checked = 0;
      for (const asset of this.assets) {
        controller.signal.throwIfAborted();
        const file = safePackPath(this.directory(), asset.name);
        await this.plain(file);
        if (
          !existsSync(file) ||
          statSync(file).size !== asset.size ||
          (await sha256(file)) !== asset.sha256
        )
          throw Error("table_checksum_mismatch: " + asset.name);
        checked += asset.size;
        this.update({ bytes: checked, message: asset.name });
      }
      await writeFile(
        this.receipt(),
        JSON.stringify({
          sourceCommit: manifest.sourceCommit,
          files: this.assets.length,
          bytes: checked,
        }),
      );
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
    const target = this.directory(); // fixed child of the configured pack root
    await this.plain(target);
    await rm(target, { recursive: true, force: true });
    this.update({
      status: "missing",
      bytes: 0,
      installedBytes: 0,
      message: "",
    });
  }
}
