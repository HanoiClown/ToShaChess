import { Worker } from "node:worker_threads";
import { join } from "node:path";
export class LibraryClient {
  private worker: Worker | null = null;
  private counter = 0;
  private pending = new Map<
    number,
    {
      resolve: (v: any) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(private dir: string) {}
  private reset(error: Error) {
    const old = this.worker;
    this.worker = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
    void old?.terminate();
  }
  call(
    method: "status" | "puzzles" | "games" | "gamePgn",
    input?: unknown,
  ): Promise<any> {
    if (!this.worker) {
      const worker = new Worker(join(__dirname, "library-worker.cjs"), {
        workerData: { dir: this.dir },
      });
      this.worker = worker;
      worker.on("message", ({ id, result, error }) => {
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        clearTimeout(p.timer);
        error ? p.reject(Error(error)) : p.resolve(result);
      });
      worker.on("error", (error) => {
        if (this.worker === worker)
          this.reset(error instanceof Error ? error : Error(String(error)));
      });
      worker.on("exit", (code) => {
        if (this.worker === worker)
          this.reset(Error(`Library worker stopped: ${code}`));
      });
    }
    return new Promise((resolve, reject) => {
      const id = ++this.counter;
      const timer = setTimeout(
        () => this.reset(Error("library_timeout")),
        45000,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ id, method, input });
    });
  }
  close() {
    this.reset(Error("library_closed"));
  }
}
