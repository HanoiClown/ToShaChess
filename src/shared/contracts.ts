export type Locale = "ru" | "en";
export type Color = "w" | "b";
export type Quality =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "brilliant"
  | "book";
export type Score = { cp: number; mate: number | null }; // always white POV
export type EngineLine = { score: Score; pv: string[]; depth: number };
export type Position = { initialFen: string; moves: string[] };
export type Analysis = {
  ply: number;
  before: EngineLine;
  after: EngineLine;
  best: string;
  quality: Quality;
  loss: number;
  provisional: boolean;
};
export type SkillLevel = "new" | "beginner" | "intermediate" | "advanced";
export type CreateProfileInput = {
  learning?: Profile["learning"];
  name: string;
  nickname: string;
  skillLevel: SkillLevel;
  rating?: number;
  locale: Locale;
};
export type Profile = {
  opponent?: {
    provider: "stockfish" | "maia";
    botId: string;
    color: Color;
    maia: NonNullable<GameRecord["maia"]>;
  };
  learning?: {
    minutes: 15 | 30 | 60;
    goal: "basics" | "tactics" | "openings" | "balanced";
    explanation: "short" | "detailed";
  };
  theme?: "green" | "purple" | "blue" | "red";
  id: string;
  name: string;
  nickname?: string;
  skillLevel?: SkillLevel;
  /** Optional self-reported rating; 0 means no rating yet. */
  rating?: number;
  locale: Locale;
  level: "new" | "beginner";
  color: string;
};
export type Attempt = {
  id: string;
  profileId: string;
  itemId: string;
  theme: string;
  correct: boolean;
  at: string;
  seconds: number;
};
export type ReviewItem = {
  id: string;
  fen: string;
  best: string;
  theme: string;
  due: string;
  interval: number;
  gameId?: string;
  ply?: number;
};
export type VisionSettings = {
  duration: 0 | 30 | 60 | 120;
  orientation: Color;
  coordinates: boolean;
};
export type VisionResult = VisionSettings & {
  id: string;
  profileId: string;
  at: string;
  seconds: number;
  correct: number;
  wrong: number;
};
export type Progress = {
  favorites: string[];
  vision: VisionResult[];
  visionSettings: VisionSettings;
  completed: string[];
  attempts: Attempt[];
  reviews: ReviewItem[];
  activity: { id: string; at: string; seconds: number; section: string }[];
};
export type GameRecord = {
  id: string;
  profileId: string;
  initialFen: string;
  moves: string[];
  headers: Record<string, string>;
  playerColor: Color;
  mode: "normal" | "training" | "import";
  bot: boolean;
  playedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  analysis: Analysis[];
  explanations: Partial<Record<Locale, Record<string, string>>>;
  clock?: { w: number; b: number; increment: number };
  level?: number;
  botId?: string;
  botRating?: number;
  /** Imported position history is preserved, but accuracy starts after this ply. */
  startPly?: number;
  strongStockfish?: boolean;
  maia?: {
    pack: import("./packs").PackId;
    selfElo: number;
    opponentElo: number;
    temperature: number;
  };
};
export type Usage = {
  id: string;
  month: string;
  reserved: number;
  actual: number | null;
};
export type Database = {
  version: 1;
  profiles: Profile[];
  games: GameRecord[];
  progress: Record<string, Progress>;
  usage: Usage[];
  settings: {
    budget: number;
    sound: boolean;
    volume: number;
    engineMs: number;
    botQuips?: boolean;
  };
  archiveImported: boolean;
};
export type Snapshot = {
  database: Database;
  activeProfile: string | null;
  hasKey: boolean;
  keyIssue: boolean;
  dataPath: string;
  analysisJobs: string[];
  notice: string | null;
};
export type CoachReply = { source: "local" | "openai"; text: string };
export interface DesktopApi {
  onBeforeClose(callback: () => Promise<boolean>): () => void;
  advanced: import("./optional-tools").AdvancedToolsApi;
  listTrainingCards(): Promise<import("../training/types").TrainingCard[]>;
  saveTrainingCard(
    card: import("../training/types").TrainingCard,
  ): Promise<import("../training/types").TrainingCard>;
  reviewTrainingCard(
    input: import("../training/types").TrainingReviewInput,
  ): Promise<import("../training/types").TrainingCard>;
  postponeTrainingCard(
    id: string,
  ): Promise<import("../training/types").TrainingCard>;
  deleteTrainingCard(id: string): Promise<void>;
  packs(): Promise<import("./packs").PackState[]>;
  onPacks(callback: () => void): () => void;
  installPack(
    id: import("./packs").PackId,
  ): Promise<import("./packs").PackState[]>;
  verifyPack(
    id: import("./packs").PackId,
  ): Promise<import("./packs").PackState[]>;
  cancelPack(id: import("./packs").PackId): Promise<void>;
  removePack(
    id: import("./packs").PackId,
  ): Promise<import("./packs").PackState[]>;
  predictHuman(input: {
    requestId: string;
    position: Position;
    pack: import("./packs").PackId;
    selfElo: number;
    opponentElo: number;
  }): Promise<import("./engine-providers").HumanPrediction>;
  listStudies(
    sourceKey?: string,
  ): Promise<import("../study/tree").StudyDocument[]>;
  saveStudy(
    study: import("../study/tree").StudyDocument,
  ): Promise<import("../study/tree").StudyDocument>;
  deleteStudy(id: string): Promise<void>;
  getFullscreen(): Promise<boolean>;
  toggleFullscreen(): Promise<void>;
  onFullscreen(callback: (enabled: boolean) => void): () => void;
  libraryStatus(): Promise<import("./library").LibraryStatus>;
  libraryPuzzles(
    filter: import("./library").LibraryFilter,
  ): Promise<import("./library").PuzzlePage>;
  libraryLookup(ids: string[]): Promise<import("../content/puzzles").Puzzle[]>;
  libraryGames(
    filter: import("./library").GameFilter,
  ): Promise<{ items: import("./library").LibraryGame[]; more: boolean }>;
  libraryGamePgn(id: number): Promise<string>;
  snapshot(): Promise<Snapshot>;
  selectProfile(id: string | null): Promise<Snapshot>;
  createProfile(input: CreateProfileInput): Promise<Snapshot>;
  updateProfile(profile: Profile): Promise<Snapshot>;
  saveGame(game: GameRecord): Promise<Snapshot>;
  importPgn(text: string): Promise<{ added: number; skipped: number }>;
  importArchive(): Promise<{ added: number; skipped: number }>;
  openPgn(): Promise<string | null>;
  exportPgn(id: string): Promise<boolean>;
  analyze(id: string): Promise<void>;
  cancelAnalysis(id: string): Promise<void>;
  engine(position: Position, level?: number): Promise<EngineLine[]>;
  analyzePosition(input: {
    requestId: string;
    position: Position;
  }): Promise<EngineLine[]>;
  botMove(input: {
    requestId: string;
    position: Position;
    botId: string;
    maia?: GameRecord["maia"];
    strong?: boolean;
  }): Promise<{ move: string; line?: EngineLine }>;
  cancelRequest(requestId: string): Promise<void>;
  cancelEngine(): Promise<void>;
  coach(id: string, ply: number, question?: string): Promise<CoachReply>;
  attempt(attempt: Attempt): Promise<Snapshot>;
  favorite(
    profileId: string,
    puzzleId: string,
    enabled: boolean,
  ): Promise<Snapshot>;
  saveVision(result: VisionResult): Promise<Snapshot>;
  visionSettings(
    profileId: string,
    settings: VisionSettings,
  ): Promise<Snapshot>;
  recordActivity(
    profileId: string,
    section: string,
    seconds: number,
  ): Promise<void>;
  completeLesson(id: string): Promise<Snapshot>;
  updateSettings(settings: Database["settings"]): Promise<Snapshot>;
  saveKey(key: string): Promise<Snapshot>;
  exportBackup(): Promise<boolean>;
  importBackup(): Promise<Snapshot | null>;
  onUpdate(callback: () => void): () => void;
}
declare global {
  interface Window {
    chessApp: DesktopApi;
  }
}
