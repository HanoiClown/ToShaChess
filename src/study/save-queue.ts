import type { StudyDocument } from "./tree";

/** Serialize disk writes while retaining the most recent unsaved revision. */
export class StudySaveQueue {
  readonly pending = new Map<string, StudyDocument>();
  private writing: Promise<void> = Promise.resolve();

  flush(save: (document: StudyDocument) => Promise<unknown>): Promise<void> {
    const next = this.writing
      .catch(() => {})
      .then(async () => {
        for (const document of [...this.pending.values()]) {
          await save(document);
          if (this.pending.get(document.id) === document)
            this.pending.delete(document.id);
        }
      });
    this.writing = next;
    return next;
  }
}
