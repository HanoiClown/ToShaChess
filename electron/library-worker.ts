import { parentPort, workerData } from "node:worker_threads";
import { OfflineLibrary } from "./library";
const library = new OfflineLibrary(workerData.dir);
parentPort!.on("message", ({ id, method, input }) => {
  try {
    let result;
    if (method === "status") result = library.status();
    else if (method === "puzzles") result = library.puzzles(input);
    else if (method === "games") result = library.games(input);
    else if (method === "gamePgn") result = library.gamePgn(input);
    else throw Error("invalid_library_method");
    parentPort!.postMessage({ id, result });
  } catch (e) {
    parentPort!.postMessage({
      id,
      error: String((e as Error).message).slice(0, 300),
    });
  }
});
