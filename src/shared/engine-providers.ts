import type { EngineLine, Position } from "./contracts";

export type EngineIdentity = {
  id: string;
  name: string;
  version?: string;
  network?: string;
};
export type EngineState =
  "idle" | "starting" | "ready" | "busy" | "error" | "closed";
export type ProviderStatus = {
  providerId: string;
  state: EngineState;
  error?: string;
};
export type SearchLimits = { timeMs: number; multiPv: number };
export type SearchAnalysis = {
  kind: "search-analysis";
  provider: EngineIdentity;
  positionKey: string;
  limits: SearchLimits;
  lines: EngineLine[];
};
export type HumanSettings = { selfElo: number; opponentElo: number };
export type HumanCandidate = { uci: string; probability: number };
/** A model's move policy is not an engine score, win probability or accuracy. */
export type HumanPrediction = HumanSettings & {
  kind: "human-prediction";
  provider: EngineIdentity;
  positionKey: string;
  candidates: HumanCandidate[];
};
export type EngineRequestContext = {
  requestId: string;
  profileId: string;
  sessionId: string;
  providerId: string;
  positionKey: string;
};
export type EngineRequestGroup = {
  profileId?: string;
  sessionId?: string;
  providerId?: string;
};
export interface SearchProvider {
  readonly identity: EngineIdentity;
  analyze(
    position: Position,
    limits: SearchLimits,
    signal?: AbortSignal,
  ): Promise<SearchAnalysis>;
  status(): ProviderStatus;
  dispose(): void;
}
export interface HumanProvider {
  readonly identity: EngineIdentity;
  predict(
    position: Position,
    settings: HumanSettings,
    signal?: AbortSignal,
  ): Promise<HumanPrediction>;
  status(): ProviderStatus;
  dispose(): void;
}
