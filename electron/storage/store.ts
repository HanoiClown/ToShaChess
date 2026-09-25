import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  renameSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { join } from "node:path";
import { freshDatabase, validateDatabase } from "./schema";
import type { Database } from "../../src/shared/contracts";
export class Store {
  data: Database;
  recovered = false;
  readonly file: string;
  constructor(readonly dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "chess-home.json");
    if (!existsSync(this.file)) {
      this.data = freshDatabase();
      this.persist(false);
      return;
    }
    try {
      this.data = validateDatabase(JSON.parse(readFileSync(this.file, "utf8")));
    } catch (error) {
      if (!existsSync(this.file + ".bak"))
        throw Error(`Cannot read saved data: ${String(error)}`);
      this.data = validateDatabase(
        JSON.parse(readFileSync(this.file + ".bak", "utf8")),
      );
      copyFileSync(this.file, this.file + ".damaged-" + Date.now());
      this.recovered = true;
      this.persist(false);
    }
  }
  private persist(backup = true) {
    const temp = this.file + ".tmp";
    writeFileSync(temp, JSON.stringify(this.data));
    const fd = openSync(temp, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (backup && existsSync(this.file))
      copyFileSync(this.file, this.file + ".bak");
    renameSync(temp, this.file);
  }
  update(mutator: (data: Database) => void) {
    const previous = this.data;
    this.data = structuredClone(previous);
    try {
      mutator(this.data);
      this.persist();
    } catch (e) {
      this.data = previous;
      throw e;
    }
    return this.data;
  }
  replace(data: Database) {
    const safe = validateDatabase(data);
    this.update((d) => Object.assign(d, safe));
  }
}
