import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  safeStorage,
  Menu,
  shell,
} from "electron";
import { join, dirname } from "node:path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { Store } from "./storage/store";
import { mergeBackup } from "./storage/schema";
import { AppService } from "./service";
import { PackManager } from "./packs/manager";
import { AdvancedHost } from "./advanced-host";
import { OfflineLibrary } from "./library";
import { LibraryClient } from "./library-client";
import { exportGame } from "../src/chess/game";
let win: BrowserWindow | null = null,
  service: AppService;
const root = app.isPackaged ? process.resourcesPath : app.getAppPath();
const dataPath =
  process.env.CHESS_HOME_DATA ??
  join(app.isPackaged ? dirname(app.getPath("exe")) : app.getAppPath(), "data");
// Test/alternate installations must not share Chromium cache or the instance lock.
if (process.env.CHESS_HOME_DATA)
  app.setPath("userData", join(dataPath, "chromium"));
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    win?.restore();
    win?.focus();
  });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    try {
      const store = new Store(dataPath);
      const libraryPath =
        process.env.TOSHACHESS_LIBRARY ??
        join(
          app.isPackaged ? dirname(app.getPath("exe")) : app.getAppPath(),
          "library-packs",
        );
      const library = new OfflineLibrary(libraryPath),
        libraryWorker = new LibraryClient(libraryPath);
      app.on("will-quit", () => {
        library.close();
        libraryWorker.close();
      });
      const notify = () => {
        if (win && !win.isDestroyed()) win.webContents.send("state-changed");
      };
      service = new AppService(
        store,
        join(root, "stockfish", "stockfish-windows-x86-64-universal.exe"),
        notify,
      );
      const secret = join(dataPath, "api-key.enc");
      const packs = new PackManager(
        process.env.TOSHACHESS_ENGINES ??
          join(
            app.isPackaged ? dirname(app.getPath("exe")) : app.getAppPath(),
            "engine-packs",
          ),
        join(root, "scripts"),
        () => {
          if (win && !win.isDestroyed()) win.webContents.send("packs-changed");
        },
      );
      service.packs = packs;
      const advanced = new AdvancedHost({
        dataPath,
        packRoot: packs.root,
        scripts: join(root, "scripts"),
        workerPath: join(__dirname, "library-explorer-worker.cjs"),
        libraryDir: libraryPath,
        packs,
        owner: () => service.trainingOwner(),
        notify: () => {
          if (win && !win.isDestroyed()) win.webContents.send("packs-changed");
        },
        pick: async (kind) => {
          const result = await dialog.showOpenDialog(
            win!,
            kind === "tablebase"
              ? { properties: ["openDirectory"] }
              : {
                  properties: ["openFile"],
                  filters:
                    kind === "engine"
                      ? [{ name: "UCI engine", extensions: ["exe"] }]
                      : [
                          {
                            name: "Lc0 network",
                            extensions: ["pb", "gz", "onnx"],
                          },
                          { name: "All files", extensions: ["*"] },
                        ],
                },
          );
          return result.canceled ? null : result.filePaths[0];
        },
      });
      app.on("will-quit", () => advanced.dispose());
      if (existsSync(secret)) {
        try {
          service.apiKey = (
            await safeStorage.decryptStringAsync(readFileSync(secret))
          ).result;
        } catch {
          service.keyIssue = true;
        }
      }
      if (
        store.recovered ||
        service.studies.recovered ||
        service.training.recovered
      )
        service.notice = "storage_recovered";
      const handle = (name: string, fn: (...args: any[]) => unknown) =>
        ipcMain.handle(name, async (event, ...args) => {
          if (
            !win ||
            event.sender !== win.webContents ||
            event.senderFrame !== win.webContents.mainFrame
          )
            throw Error("Invalid sender");
          try {
            return await fn(...args);
          } catch (error) {
            throw Error(String((error as Error).message).slice(0, 1000));
          }
        });
      let closeAllowed = false,
        closeHandshake = false;
      handle("close-listen", () => {
        closeHandshake = true;
      });
      handle("close-ready", () => {
        closeAllowed = true;
        setImmediate(() => win?.close());
      });
      handle("snapshot", () => service.snapshot());
      for (const name of [
        "engineConfig",
        "chooseEngine",
        "chooseNetwork",
        "configureEngine",
        "engineStatus",
        "compare",
        "cancel",
        "explorerStatus",
        "buildExplorer",
        "cancelExplorer",
        "explore",
        "tablebase",
        "chooseTablebaseDirectory",
        "optionalPacks",
        "installOptionalPack",
        "cancelOptionalPack",
        "verifyOptionalPack",
        "removeOptionalPack",
      ] as const)
        handle(`advanced-${name}`, (...args) =>
          (advanced[name] as (...values: any[]) => unknown).apply(
            advanced,
            args,
          ),
        );
      handle("training-list", () =>
        service.training.list(service.trainingOwner()),
      );
      handle("training-save", (card) =>
        service.training.save(service.trainingOwner(), card),
      );
      handle("training-review", (input) =>
        service.training.review(service.trainingOwner(), input),
      );
      handle("training-postpone", (id) =>
        service.training.postpone(service.trainingOwner(), id),
      );
      handle("training-delete", (id) =>
        service.training.delete(service.trainingOwner(), id),
      );
      handle("packs-list", () => packs.list());
      handle("packs-install", (id) => {
        service.releaseMaia();
        return packs.install(id);
      });
      handle("packs-verify", (id) => {
        service.releaseMaia();
        return packs.verify(id);
      });
      handle("packs-cancel", (id) => packs.cancel(id));
      handle("packs-remove", (id) => {
        service.releaseMaia();
        return packs.remove(id);
      });
      handle("maia-predict", (input) => service.predictHuman(input));
      handle("study-list", (sourceKey) => service.listStudies(sourceKey));
      handle("study-save", (study) => service.saveStudy(study));
      handle("study-delete", (id) => service.deleteStudy(id));
      handle("fullscreen-get", () => win!.isFullScreen());
      handle("fullscreen-toggle", () => {
        win!.setFullScreen(!win!.isFullScreen());
      });
      handle("library-status", () => libraryWorker.call("status"));
      handle("library-puzzles", (f) => libraryWorker.call("puzzles", f));
      handle("library-games", (f) => libraryWorker.call("games", f));
      handle("library-game-pgn", (id) => libraryWorker.call("gamePgn", id));
      handle("library-lookup", (ids) => library.getPuzzles(ids));
      service.extraPuzzle = (id) => library.getPuzzle(id);
      handle("select-profile", (id) => {
        advanced.cancelAll();
        return service.selectProfile(id);
      });
      handle("create-profile", (input) => service.createProfile(input));
      handle("update-profile", (p) => service.updateProfile(p));
      handle("save-game", (g) => service.saveGame(g));
      handle("import-pgn", (text) => {
        if (typeof text !== "string") throw Error("invalid_pgn");
        return service.importPgn(text);
      });
      handle("open-pgn", async () => {
        const result = await dialog.showOpenDialog(win!, {
          filters: [{ name: "PGN", extensions: ["pgn"] }],
          properties: ["openFile"],
        });
        if (result.canceled) return null;
        const path = result.filePaths[0];
        if (statSync(path).size > 10000000) throw Error("PGN > 10 MB");
        return readFileSync(path, "utf8");
      });
      handle("import-archive", async () => {
        const owner = service.activeProfile;
        if (!owner) throw Error("select_profile");
        const picked = await dialog.showOpenDialog(win!, {
          properties: ["openDirectory"],
        });
        if (picked.canceled) return { added: 0, skipped: 0 };
        if (service.activeProfile !== owner) throw Error("wrong_profile");
        const folder = picked.filePaths[0];
        const files = readdirSync(folder, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(".pgn"))
          .map((entry) => join(folder, entry.name));
        // Check the entire selection before reading or importing the first game.
        // The optional library contains multi-gigabyte PGNs read by byte range.
        for (const file of files)
          if (statSync(file).size > 10000000)
            throw Error("archive_pgn_too_large");
        let added = 0,
          skipped = 0;
        for (const file of files) {
          const count = service.importPgn(readFileSync(file, "utf8"));
          added += count.added;
          skipped += count.skipped;
        }
        store.update((d) => {
          d.archiveImported = true;
        });
        notify();
        return { added, skipped };
      });
      handle("export-pgn", async (id) => {
        const game = service.getGame(id),
          result = await dialog.showSaveDialog(win!, {
            defaultPath: `game-${id.slice(0, 12)}.pgn`,
            filters: [{ name: "PGN", extensions: ["pgn"] }],
          });
        if (result.canceled || !result.filePath) return false;
        writeFileSync(result.filePath, exportGame(game), "utf8");
        return true;
      });
      handle("analyze", (id) => service.analyze(id));
      handle("cancel-analysis", (id) => service.cancelAnalysis(id));
      handle("engine", (position, level) => {
        if (
          !position ||
          typeof position.initialFen !== "string" ||
          !Array.isArray(position.moves) ||
          position.moves.some(
            (x: unknown) =>
              typeof x !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(x),
          ) ||
          (level !== undefined &&
            (!Number.isInteger(level) || level < 0 || level > 4))
        )
          throw Error("invalid_position");
        return service.engine(position, level);
      });
      handle("cancel-engine", () => service.cancelEngine());
      handle("analyze-position", (input) => service.analyzePosition(input));
      handle("bot-move", (input) => service.botMove(input));
      handle("cancel-request", (id) => {
        if (typeof id !== "string" || id.length > 100)
          throw Error("invalid_request");
        service.cancelRequest(id);
      });
      handle("coach", (id, ply, question) => {
        if (
          typeof id !== "string" ||
          !Number.isInteger(ply) ||
          (question !== undefined && typeof question !== "string")
        )
          throw Error("invalid_question");
        return service.coach(id, ply, question);
      });
      handle("attempt", (a) => service.attempt(a));
      handle("favorite", (id, puzzleId, enabled) =>
        service.favorite(id, puzzleId, enabled),
      );
      handle("vision-result", (r) => service.saveVision(r));
      handle("vision-settings", (id, s) => service.visionSettings(id, s));
      handle("complete-lesson", (id) => service.completeLesson(id));
      handle("settings", (s) => service.updateSettings(s));
      handle("activity", (profileId, section, seconds) =>
        service.recordActivity(profileId, section, seconds),
      );
      handle("save-key", async (key) => {
        if (typeof key !== "string" || key.length > 1000)
          throw Error("invalid_key");
        const clean = key.trim();
        if (clean && !/^sk-[\w-]+$/.test(clean)) throw Error("invalid_key");
        if (clean) {
          if (!(await safeStorage.isAsyncEncryptionAvailable()))
            throw Error("secure_storage_unavailable");
          writeFileSync(secret, await safeStorage.encryptStringAsync(clean));
        } else if (existsSync(secret)) unlinkSync(secret);
        service.apiKey = clean;
        service.keyIssue = false;
        notify();
        return service.snapshot();
      });
      handle("export-backup", async () => {
        const result = await dialog.showSaveDialog(win!, {
          defaultPath: `ToShaChess-backup-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{ name: "ToShaChess backup", extensions: ["json"] }],
        });
        if (result.canceled || !result.filePath) return false;
        writeFileSync(
          result.filePath,
          JSON.stringify(
            {
              format: "toshachess-backup",
              version: 2,
              database: store.data,
              studies: service.studies.export(),
              training: service.training.export(),
            },
            null,
            2,
          ),
          "utf8",
        );
        return true;
      });
      handle("import-backup", async () => {
        const result = await dialog.showOpenDialog(win!, {
          filters: [{ name: "ToShaChess backup", extensions: ["json"] }],
          properties: ["openFile"],
        });
        if (result.canceled) return null;
        const file = result.filePaths[0];
        if (statSync(file).size > 100000000) throw Error("Backup > 100 MB");
        const incoming = JSON.parse(readFileSync(file, "utf8"));
        const envelope = incoming.format === "toshachess-backup";
        if (envelope && incoming.version !== 2)
          throw Error("unsupported_backup");
        const merged = mergeBackup(
          store.data,
          envelope ? incoming.database : incoming,
        );
        const mergedStudies = service.studies.prepareMerge(
          envelope ? incoming.studies : [],
          merged.profiles.map((p) => p.id),
        );
        const mergedTraining = service.training.prepareMerge(
          envelope ? (incoming.training ?? []) : [],
          merged.profiles.map((p) => p.id),
        );
        for (const job of service.jobs.values()) job.abort();
        advanced.cancelAll();
        service.selectProfile(null);
        const previous = structuredClone(store.data);
        const previousStudies = service.studies.export(),
          previousTraining = service.training.export();
        try {
          store.replace(merged);
          service.studies.replace(mergedStudies);
          service.training.replace(mergedTraining);
        } catch (error) {
          store.replace(previous);
          service.studies.replace(previousStudies);
          service.training.replace(previousTraining);
          throw error;
        }
        notify();
        return service.snapshot();
      });
      win = new BrowserWindow({
        width: 1440,
        height: 950,
        minWidth: 720,
        minHeight: 540,
        fullscreenable: true,
        fullscreen: true,
        backgroundColor: "#302e2b",
        title: "ToShaChess",
        show: false,
        webPreferences: {
          preload: join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      win.webContents.setWindowOpenHandler(({ url }) => {
        try {
          const target = new URL(url);
          if (
            target.protocol === "https:" &&
            !target.username &&
            !target.password
          )
            void shell.openExternal(target.toString()).catch(() => {});
        } catch {}
        return { action: "deny" };
      });
      const fullscreenChanged = (enabled: boolean) => {
        if (win && !win.isDestroyed())
          win.webContents.send("fullscreen-changed", enabled);
      };
      // On Windows isFullScreen() can still report the old state inside the event.
      win.on("enter-full-screen", () => fullscreenChanged(true));
      win.on("leave-full-screen", () => fullscreenChanged(false));
      win.webContents.on("before-input-event", (event, input) => {
        if (
          input.type !== "keyDown" ||
          input.control ||
          input.alt ||
          input.meta ||
          input.shift
        )
          return;
        if (input.key === "F11") {
          event.preventDefault();
          if (!input.isAutoRepeat) win?.setFullScreen(!win.isFullScreen());
        }
      });
      win.webContents.on("will-navigate", (event) => event.preventDefault());
      win.on("close", (event) => {
        if (closeHandshake && !closeAllowed && !win!.webContents.isCrashed()) {
          event.preventDefault();
          win!.webContents.send("before-close");
        }
      });
      win.once("ready-to-show", () => win?.show());
      await win.loadFile(join(app.getAppPath(), "dist", "index.html"));
    } catch (error) {
      dialog.showErrorBox(
        "ToShaChess",
        `Не удалось запустить приложение / Unable to start.\n${String(error)}\nПереместите папку в доступный для записи каталог / Move the folder to a writable location.`,
      );
      app.quit();
    }
  });
  app.on("window-all-closed", () => app.quit());
  app.on("will-quit", () => service?.dispose());
}
