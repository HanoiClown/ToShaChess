import type { Position } from "../../src/shared/contracts";
import type {
  EngineIdentity,
  SearchAnalysis,
  SearchLimits,
  SearchProvider,
} from "../../src/shared/engine-providers";
import { positionId } from "../../src/chess/game";
import { UciEngine, type UciEngineConfig } from "./uci";

export class UciSearchProvider implements SearchProvider {
  private engine: UciEngine;
  readonly identity: EngineIdentity;
  constructor(identity: EngineIdentity, config: string | UciEngineConfig) {
    this.identity = { ...identity };
    this.engine = new UciEngine(config);
  }
  status() {
    return { providerId: this.identity.id, ...this.engine.status() };
  }
  async analyze(
    position: Position,
    limits: SearchLimits,
    signal?: AbortSignal,
  ): Promise<SearchAnalysis> {
    const snapshot = {
      initialFen: position.initialFen,
      moves: [...position.moves],
    };
    const actual = {
      timeMs: Math.max(50, Math.min(3000, Math.floor(limits.timeMs))),
      multiPv: Math.max(1, Math.min(8, Math.floor(limits.multiPv))),
    };
    const lines = await this.engine.analyze(
      snapshot,
      actual.timeMs,
      actual.multiPv,
      signal,
    );
    return {
      kind: "search-analysis",
      provider: {
        ...this.identity,
        version: this.engine.versionLabel() ?? this.identity.version,
      },
      positionKey: positionId(snapshot),
      limits: actual,
      lines,
    };
  }
  dispose() {
    this.engine.dispose();
  }
}
