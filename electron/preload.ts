import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "../src/shared/contracts";
const api: DesktopApi = {
  onBeforeClose: (callback) => {
    const listener = () => {
      void callback()
        .then((ready) => {
          if (ready) return ipcRenderer.invoke("close-ready");
        })
        .catch(() => {});
    };
    ipcRenderer.on("before-close", listener);
    void ipcRenderer.invoke("close-listen");
    return () => ipcRenderer.removeListener("before-close", listener);
  },
  advanced: {
    engineConfig: () => ipcRenderer.invoke("advanced-engineConfig"),
    chooseEngine: (kind) => ipcRenderer.invoke("advanced-chooseEngine", kind),
    chooseNetwork: () => ipcRenderer.invoke("advanced-chooseNetwork"),
    configureEngine: (config) =>
      ipcRenderer.invoke("advanced-configureEngine", config),
    engineStatus: () => ipcRenderer.invoke("advanced-engineStatus"),
    compare: (input) => ipcRenderer.invoke("advanced-compare", input),
    cancel: (id) => ipcRenderer.invoke("advanced-cancel", id),
    explorerStatus: () => ipcRenderer.invoke("advanced-explorerStatus"),
    buildExplorer: (options) =>
      ipcRenderer.invoke("advanced-buildExplorer", options),
    cancelExplorer: () => ipcRenderer.invoke("advanced-cancelExplorer"),
    explore: (position, ratingBand) =>
      ipcRenderer.invoke("advanced-explore", position, ratingBand),
    tablebase: (position) => ipcRenderer.invoke("advanced-tablebase", position),
    chooseTablebaseDirectory: () =>
      ipcRenderer.invoke("advanced-chooseTablebaseDirectory"),
    optionalPacks: () => ipcRenderer.invoke("advanced-optionalPacks"),
    installOptionalPack: (id) =>
      ipcRenderer.invoke("advanced-installOptionalPack", id),
    cancelOptionalPack: (id) =>
      ipcRenderer.invoke("advanced-cancelOptionalPack", id),
    verifyOptionalPack: (id) =>
      ipcRenderer.invoke("advanced-verifyOptionalPack", id),
    removeOptionalPack: (id) =>
      ipcRenderer.invoke("advanced-removeOptionalPack", id),
  },
  listTrainingCards: () => ipcRenderer.invoke("training-list"),
  saveTrainingCard: (card) => ipcRenderer.invoke("training-save", card),
  reviewTrainingCard: (input) => ipcRenderer.invoke("training-review", input),
  postponeTrainingCard: (id) => ipcRenderer.invoke("training-postpone", id),
  deleteTrainingCard: (id) => ipcRenderer.invoke("training-delete", id),
  packs: () => ipcRenderer.invoke("packs-list"),
  onPacks: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("packs-changed", listener);
    return () => ipcRenderer.removeListener("packs-changed", listener);
  },
  installPack: (id) => ipcRenderer.invoke("packs-install", id),
  verifyPack: (id) => ipcRenderer.invoke("packs-verify", id),
  cancelPack: (id) => ipcRenderer.invoke("packs-cancel", id),
  removePack: (id) => ipcRenderer.invoke("packs-remove", id),
  predictHuman: (input) => ipcRenderer.invoke("maia-predict", input),
  listStudies: (sourceKey) => ipcRenderer.invoke("study-list", sourceKey),
  saveStudy: (study) => ipcRenderer.invoke("study-save", study),
  deleteStudy: (id) => ipcRenderer.invoke("study-delete", id),
  getFullscreen: () => ipcRenderer.invoke("fullscreen-get"),
  toggleFullscreen: () => ipcRenderer.invoke("fullscreen-toggle"),
  onFullscreen: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, enabled: boolean) =>
      callback(enabled);
    ipcRenderer.on("fullscreen-changed", listener);
    return () => ipcRenderer.removeListener("fullscreen-changed", listener);
  },
  libraryStatus: () => ipcRenderer.invoke("library-status"),
  libraryPuzzles: (f) => ipcRenderer.invoke("library-puzzles", f),
  libraryLookup: (ids) => ipcRenderer.invoke("library-lookup", ids),
  libraryGames: (f) => ipcRenderer.invoke("library-games", f),
  libraryGamePgn: (id) => ipcRenderer.invoke("library-game-pgn", id),
  snapshot: () => ipcRenderer.invoke("snapshot"),
  selectProfile: (id) => ipcRenderer.invoke("select-profile", id),
  createProfile: (input) => ipcRenderer.invoke("create-profile", input),
  updateProfile: (p) => ipcRenderer.invoke("update-profile", p),
  saveGame: (g) => ipcRenderer.invoke("save-game", g),
  importPgn: (t) => ipcRenderer.invoke("import-pgn", t),
  importArchive: () => ipcRenderer.invoke("import-archive"),
  openPgn: () => ipcRenderer.invoke("open-pgn"),
  exportPgn: (id) => ipcRenderer.invoke("export-pgn", id),
  analyze: (id) => ipcRenderer.invoke("analyze", id),
  cancelAnalysis: (id) => ipcRenderer.invoke("cancel-analysis", id),
  engine: (p, l) => ipcRenderer.invoke("engine", p, l),
  analyzePosition: (input) => ipcRenderer.invoke("analyze-position", input),
  botMove: (input) => ipcRenderer.invoke("bot-move", input),
  cancelRequest: (id) => ipcRenderer.invoke("cancel-request", id),
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
