import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  safeStorage,
  Menu,
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
import { exportGame } from "../src/chess/game";
let win: BrowserWindow | null = null,
  service: AppService;
const root = app.isPackaged ? process.resourcesPath : app.getAppPath();
const dataPath =
  process.env.CHESS_HOME_DATA ??
  join(app.isPackaged ? dirname(app.getPath("exe")) : app.getAppPath(), "data");
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
      const notify = () => {
        if (win && !win.isDestroyed()) win.webContents.send("state-changed");
      };
      service = new AppService(
        store,
        join(root, "stockfish", "stockfish-windows-x86-64-universal.exe"),
        notify,
      );
      const secret = join(dataPath, "api-key.enc");
      if (existsSync(secret)) {
        try {
          service.apiKey = (
            await safeStorage.decryptStringAsync(readFileSync(secret))
          ).result;
        } catch {
          service.keyIssue = true;
        }
      }
      if (store.recovered) service.notice = "storage_recovered";
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
      handle("snapshot", () => service.snapshot());
      handle("select-profile", (id) => service.selectProfile(id));
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
        let added = 0,
          skipped = 0;
        for (const file of readdirSync(folder).filter((x) =>
          x.endsWith(".pgn"),
        )) {
          const count = service.importPgn(
            readFileSync(join(folder, file), "utf8"),
          );
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
          JSON.stringify(store.data, null, 2),
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
        const merged = mergeBackup(
          store.data,
          JSON.parse(readFileSync(file, "utf8")),
        );
        for (const job of service.jobs.values()) job.abort();
        service.selectProfile(null);
        store.replace(merged);
        notify();
        return service.snapshot();
      });
      win = new BrowserWindow({
        width: 1440,
        height: 950,
        minWidth: 940,
        minHeight: 700,
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
      win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      win.webContents.on("will-navigate", (event) => event.preventDefault());
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
  app.on("before-quit", () => service?.dispose());
}
