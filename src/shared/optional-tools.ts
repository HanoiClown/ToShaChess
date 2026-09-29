import type { Position } from "./contracts";
import type {
  SearchAnalysis,
  SearchLimits,
  ProviderStatus,
} from "./engine-providers";

export type OptionalEngineConfig = {
  id: "lc0" | "custom";
  name: string;
  executable: string;
  args?: string[];
  networkPath?: string;
  backend?: "cpu" | "cuda";
  options?: Record<string, string | number | boolean | null>;
};
export type TablebaseMove = {
  uci: string;
  wdl: -2 | -1 | 0 | 1 | 2;
  dtz: number;
};
export type TablebaseResult = {
  kind: "tablebase";
  status: "available" | "missing" | "unsupported";
  source: "syzygy" | "rules";
  perspective: "side-to-move";
  positionKey: string;
  halfmoveClock: number;
  wdl: -2 | -1 | 0 | 1 | 2 | null;
  dtz: number | null;
  /** DTZ can be rounded by one ply in the original tables; it is never DTM. */
  dtzRounded: boolean;
  moves: TablebaseMove[];
  reason?: string;
  canClaimFiftyMoves?: boolean;
};
export type ExplorerRatingBand =
  "all" | "under1000" | "1000-1599" | "1600-2199" | "2200plus" | "unknown";
export type ExplorerBuildOptions = {
  maxGames?: number;
  maxPly?: number;
  rebuild?: boolean;
};
export type ExplorerStatus = {
  state: "missing" | "idle" | "building" | "ready" | "cancelled" | "error";
  processedGames: number;
  indexedGames: number;
  skippedGames: number;
  availableGames: number;
  maxPly: number;
  source: string;
  firstDate: string | null;
  lastDate: string | null;
  error?: string;
};
export type ExplorerMove = {
  uci: string;
  san: string;
  games: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
};
export type ExplorerResult = {
  positionKey: string;
  status: ExplorerStatus;
  ratingBand: ExplorerRatingBand;
  games: number;
  moves: ExplorerMove[];
};
export type OptionalPackId = "syzygy-3-5" | "lc0-cpu";
export type OptionalPackState = {
  id: OptionalPackId;
  title: string;
  status: "missing" | "installing" | "ready" | "error" | "cancelled";
  bytes: number;
  downloadBytes: number;
  installedBytes: number;
  message: string;
  license: string;
  source: string;
};
/** Props/API contract; host owns native file dialogs, persistence, and IPC validation. */
export interface AdvancedToolsApi {
  engineConfig(): Promise<OptionalEngineConfig | null>;
  chooseEngine(kind: "lc0" | "custom"): Promise<OptionalEngineConfig | null>;
  chooseNetwork(): Promise<string | null>;
  configureEngine(config: OptionalEngineConfig | null): Promise<void>;
  engineStatus(): Promise<ProviderStatus>;
  compare(input: {
    requestId: string;
    position: Position;
    limits: SearchLimits;
  }): Promise<SearchAnalysis>;
  cancel(requestId: string): Promise<void>;
  explorerStatus(): Promise<ExplorerStatus>;
  buildExplorer(options: ExplorerBuildOptions): Promise<ExplorerStatus>;
  cancelExplorer(): Promise<void>;
  explore(
    position: Position,
    ratingBand?: ExplorerRatingBand,
  ): Promise<ExplorerResult>;
  tablebase(position: Position): Promise<TablebaseResult>;
  chooseTablebaseDirectory(): Promise<string | null>;
  optionalPacks(): Promise<OptionalPackState[]>;
  installOptionalPack(id: OptionalPackId): Promise<void>;
  cancelOptionalPack(id: OptionalPackId): Promise<void>;
  verifyOptionalPack(id: OptionalPackId): Promise<void>;
  removeOptionalPack(id: OptionalPackId): Promise<void>;
}
