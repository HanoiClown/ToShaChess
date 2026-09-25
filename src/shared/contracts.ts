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
  name: string;
  nickname: string;
  skillLevel: SkillLevel;
  rating?: number;
  locale: Locale;
};
export type Profile = {
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
  settings: { budget: number; sound: boolean; engineMs: number };
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
