import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "../src/shared/contracts";
const api: DesktopApi = {
  snapshot: () => ipcRenderer.invoke("snapshot"),
  selectProfile: (id) => ipcRenderer.invoke("select-profile", id),
  updateProfile: (p) => ipcRenderer.invoke("update-profile", p),
  saveGame: (g) => ipcRenderer.invoke("save-game", g),
  importPgn: (t) => ipcRenderer.invoke("import-pgn", t),
  importArchive: () => ipcRenderer.invoke("import-archive"),
  openPgn: () => ipcRenderer.invoke("open-pgn"),
  exportPgn: (id) => ipcRenderer.invoke("export-pgn", id),
  analyze: (id) => ipcRenderer.invoke("analyze", id),
  cancelAnalysis: (id) => ipcRenderer.invoke("cancel-analysis", id),
  engine: (p, l) => ipcRenderer.invoke("engine", p, l),
  cancelEngine: () => ipcRenderer.invoke("cancel-engine"),
  coach: (id, ply, q) => ipcRenderer.invoke("coach", id, ply, q),
  attempt: (a) => ipcRenderer.invoke("attempt", a),
  favorite: (id, puzzleId, enabled) =>
    ipcRenderer.invoke("favorite", id, puzzleId, enabled),
  completeLesson: (id) => ipcRenderer.invoke("complete-lesson", id),
  saveVision: (r) => ipcRenderer.invoke("vision-result", r),
  visionSettings: (id, s) => ipcRenderer.invoke("vision-settings", id, s),
  updateSettings: (s) => ipcRenderer.invoke("settings", s),
  saveKey: (k) => ipcRenderer.invoke("save-key", k),
  exportBackup: () => ipcRenderer.invoke("export-backup"),
  importBackup: () => ipcRenderer.invoke("import-backup"),
  recordActivity: (profileId, section, seconds) =>
    ipcRenderer.invoke("activity", profileId, section, seconds),
  onUpdate: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("state-changed", listener);
    return () => ipcRenderer.removeListener("state-changed", listener);
  },
};
contextBridge.exposeInMainWorld("chessApp", api);
