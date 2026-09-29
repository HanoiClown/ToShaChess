import { basename, join, resolve } from "node:path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
} from "node:fs";
import { OptionalEngineService, SyzygyService } from "./engine/optional";
import { OfflineOpeningExplorer } from "./library-explorer";
import { SyzygyPack } from "./packs/syzygy";
import { Lc0Pack } from "./packs/lc0";
import type { PackManager } from "./packs/manager";
import type {
  AdvancedToolsApi,
  OptionalEngineConfig,
  OptionalPackId,
} from "../src/shared/optional-tools";
type NativePicker = (
  kind: "engine" | "network" | "tablebase",
) => Promise<string | null>;
/** Machine-specific paths stay out of portable profile backups. Only native-picked binaries may execute. */
export class AdvancedHost implements AdvancedToolsApi {
  private engine = new OptionalEngineService();
  private selected: OptionalEngineConfig | null = null;
  private tableDirectory: string;
  private approved = new Set<string>();
  private requests = new Map<string, AbortController>();
  private explorer: OfflineOpeningExplorer;
  private syzygy: SyzygyPack;
  private lc0: Lc0Pack;
  private configFile: string;
  constructor(
    private options: {
      dataPath: string;
      packRoot: string;
      scripts: string;
      workerPath: string;
      libraryDir: string;
      packs: PackManager;
      owner: () => string;
      pick: NativePicker;
      notify: () => void;
    },
  ) {
    this.configFile = join(options.dataPath, "optional-tools.json");
    this.syzygy = new SyzygyPack(options.packRoot, options.notify);
    this.lc0 = new Lc0Pack(
      options.packRoot,
      join(options.scripts, "unpack-python.ps1"),
      options.notify,
    );
    this.tableDirectory = this.syzygy.directory();
    this.explorer = new OfflineOpeningExplorer(
      {
        libraryDir: options.libraryDir,
        indexPath: join(options.packRoot, "opening-index.sqlite"),
        workerPath: options.workerPath,
      },
      options.notify,
    );
    try {
      const config = JSON.parse(readFileSync(this.configFile, "utf8"));
      if (config.version === 1) {
        if (
          typeof config.tableDirectory === "string" &&
          existsSync(config.tableDirectory)
        )
          this.tableDirectory = config.tableDirectory;
        if (config.engine) {
          this.engine.configure(config.engine);
          this.selected = this.engine.config();
          this.approved.add(resolve(config.engine.executable));
          if (config.engine.networkPath)
            this.approved.add(resolve(config.engine.networkPath));
        }
      }
    } catch {
      /* A moved installation can choose its local paths again. */
    }
  }
  private persist() {
    mkdirSync(this.options.dataPath, { recursive: true });
    writeFileSync(
      this.configFile + ".tmp",
      JSON.stringify({
        version: 1,
        engine: this.selected,
        tableDirectory: this.tableDirectory,
      }),
    );
    renameSync(this.configFile + ".tmp", this.configFile);
  }
  async engineConfig() {
    return this.selected ? structuredClone(this.selected) : null;
  }
  async chooseEngine(kind: "lc0" | "custom") {
    this.options.owner();
    if (!["lc0", "custom"].includes(kind)) throw Error("invalid_engine");
    const executable =
      kind === "lc0"
        ? (this.lc0.executable() ?? (await this.options.pick("engine")))
        : await this.options.pick("engine");
    if (!executable) return null;
    this.approved.add(resolve(executable));
    return {
      id: kind,
      name: kind === "lc0" ? "Lc0" : basename(executable, ".exe"),
      executable,
      backend: "cpu" as const,
    };
  }
  async chooseNetwork() {
    this.options.owner();
    const path = await this.options.pick("network");
    if (path) this.approved.add(resolve(path));
    return path;
  }
  async configureEngine(config: OptionalEngineConfig | null) {
    this.options.owner();
    if (config) {
      if (
        !this.approved.has(resolve(config.executable)) ||
        (config.networkPath && !this.approved.has(resolve(config.networkPath)))
      )
        throw Error("choose_engine_in_dialog");
      // Keep process arguments and arbitrary file-valued UCI options outside renderer control.
      config = {
        id: config.id,
        name: config.name,
        executable: config.executable,
        networkPath: config.networkPath,
        backend: config.backend,
      };
    }
    this.cancelAll();
    this.engine.configure(config);
    this.selected = this.engine.config();
    this.persist();
  }
  async engineStatus() {
    return this.engine.status();
  }
  async compare(input: Parameters<AdvancedToolsApi["compare"]>[0]) {
    const owner = this.options.owner();
    if (!input || !/^[-\w]{1,100}$/.test(input.requestId))
      throw Error("invalid_request");
    await this.cancel(input.requestId);
    const controller = new AbortController();
    this.requests.set(input.requestId, controller);
    try {
      const result = await this.engine.analyze(
        input.position,
        input.limits,
        controller.signal,
      );
      if (owner !== this.options.owner() || controller.signal.aborted)
        throw Error("Cancelled");
      return result;
    } finally {
      if (this.requests.get(input.requestId) === controller)
        this.requests.delete(input.requestId);
    }
  }
  async cancel(id: string) {
    if (typeof id !== "string" || id.length > 100)
      throw Error("invalid_request");
    this.requests.get(id)?.abort();
    this.requests.delete(id);
  }
  cancelAll() {
    for (const controller of this.requests.values()) controller.abort();
    this.requests.clear();
  }
  async explorerStatus() {
    return this.explorer.status();
  }
  async buildExplorer(input: Parameters<AdvancedToolsApi["buildExplorer"]>[0]) {
    this.options.owner();
    return this.explorer.build(input);
  }
  async cancelExplorer() {
    this.explorer.cancel();
  }
  async explore(
    position: Parameters<AdvancedToolsApi["explore"]>[0],
    ratingBand?: Parameters<AdvancedToolsApi["explore"]>[1],
  ) {
    this.options.owner();
    return this.explorer.query(position, { ratingBand });
  }
  async tablebase(position: Parameters<AdvancedToolsApi["tablebase"]>[0]) {
    const owner = this.options.owner(),
      request = new AbortController(),
      id = `tb-${crypto.randomUUID()}`;
    this.requests.set(id, request);
    const service = new SyzygyService({
      python: this.options.packs.python(),
      script: join(this.options.scripts, "tablebase-bridge.py"),
      tableDir: this.tableDirectory,
    });
    try {
      const result = await service.probe(position, request.signal);
      if (owner !== this.options.owner() || request.signal.aborted)
        throw Error("Cancelled");
      return result;
    } finally {
      service.dispose();
      this.requests.delete(id);
    }
  }
  async chooseTablebaseDirectory() {
    this.options.owner();
    const path = await this.options.pick("tablebase");
    if (path) {
      this.tableDirectory = path;
      this.persist();
    }
    return path;
  }
  async optionalPacks() {
    return [this.syzygy.status(), this.lc0.status()];
  }
  private pack(id: OptionalPackId) {
    if (id === "syzygy-3-5") return this.syzygy;
    if (id === "lc0-cpu") return this.lc0;
    throw Error("invalid_pack");
  }
  async installOptionalPack(id: OptionalPackId) {
    this.options.owner();
    await this.pack(id).install();
  }
  async cancelOptionalPack(id: OptionalPackId) {
    this.pack(id).cancel();
  }
  async verifyOptionalPack(id: OptionalPackId) {
    await this.pack(id).verify();
  }
  async removeOptionalPack(id: OptionalPackId) {
    this.options.owner();
    if (id === "lc0-cpu" && this.selected?.id === "lc0") {
      this.engine.dispose();
      this.selected = null;
      this.persist();
    }
    await this.pack(id).remove();
  }
  dispose() {
    this.cancelAll();
    this.engine.dispose();
    this.explorer.dispose();
    this.syzygy.cancel();
    this.lc0.cancel();
  }
}
