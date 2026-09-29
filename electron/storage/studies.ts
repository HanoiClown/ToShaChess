import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, renameSync, statSync, openSync, fsyncSync, closeSync } from "node:fs";
import { join } from "node:path";
import { validateStudy, type StudyDocument } from "../../src/study/tree";

const MAX_BYTES = 25_000_000;
export class StudyStore {
  private documents: StudyDocument[] = [];
  readonly file: string;
  recovered = false;
  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "studies.json");
    if (!existsSync(this.file)) return;
    const read = (path: string) => {
      if (statSync(path).size > MAX_BYTES) throw Error("study_storage_limit");
      const data = JSON.parse(readFileSync(path, "utf8"));
      if (data.version !== 1 || !Array.isArray(data.studies) || data.studies.length > 200) throw Error("invalid_study_storage");
      const studies: StudyDocument[] = data.studies.map(validateStudy);
      if (new Set(studies.map((s) => s.id)).size !== studies.length) throw Error("duplicate_study");
      return studies;
    };
    try { this.documents = read(this.file); }
    catch (error) {
      if (!existsSync(this.file + ".bak")) throw error;
      this.documents = read(this.file + ".bak");
      copyFileSync(this.file, this.file + ".damaged-" + Date.now());
      this.recovered = true;
      this.persist(this.documents, false);
    }
  }
  private persist(studies: StudyDocument[], backup = true) {
    const body = JSON.stringify({ version: 1, studies });
    if (Buffer.byteLength(body) > MAX_BYTES || studies.length > 200) throw Error("study_storage_limit");
    const temp = this.file + ".tmp";
    writeFileSync(temp, body);
    const fd = openSync(temp, "r+");
    try { fsyncSync(fd); } finally { closeSync(fd); }
    if (backup && existsSync(this.file)) copyFileSync(this.file, this.file + ".bak");
    renameSync(temp, this.file);
    this.documents = studies;
  }
  list(profileId: string, sourceKey?: string) {
    return structuredClone(this.documents.filter((s) => s.profileId === profileId && (sourceKey === undefined || s.sourceKey === sourceKey)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)));
  }
  save(profileId: string, input: unknown) {
    const study = validateStudy(input);
    if (study.profileId !== profileId) throw Error("wrong_profile");
    const previous = this.documents.find((s) => s.id === study.id);
    if (previous && previous.profileId !== profileId) throw Error("wrong_profile");
    const saved = { ...study, createdAt: previous?.createdAt ?? study.createdAt, updatedAt: new Date().toISOString() };
    this.persist([...this.documents.filter((s) => s.id !== saved.id), saved]);
    return structuredClone(saved);
  }
  delete(profileId: string, id: string) {
    if (typeof id !== "string" || id.length > 100) throw Error("invalid_study");
    const previous = this.documents.find((s) => s.id === id);
    if (previous && previous.profileId !== profileId) throw Error("wrong_profile");
    this.persist(this.documents.filter((s) => s.id !== id));
  }
  export() { return structuredClone(this.documents); }
  prepareMerge(input: unknown, owners: string[]) {
    if (!Array.isArray(input) || input.length > 200) throw Error("invalid_studies");
    const next = new Map(this.documents.map((s) => [s.id, s]));
    for (const raw of input) {
      const s = validateStudy(raw);
      if (!owners.includes(s.profileId)) throw Error("wrong_profile");
      const old = next.get(s.id);
      if (old && old.profileId !== s.profileId) throw Error("wrong_profile");
      if (!old || s.updatedAt > old.updatedAt) next.set(s.id, s);
    }
    const output = [...next.values()];
    if (output.length > 200 || Buffer.byteLength(JSON.stringify(output)) > MAX_BYTES) throw Error("study_storage_limit");
    return output;
  }
  merge(input: unknown, owners: string[]) { this.persist(this.prepareMerge(input, owners)); }
  replace(input: StudyDocument[]) { this.persist(input.map(validateStudy)); }
}
