import type { EngineIdentity } from "../../src/shared/engine-providers";
import { UciSearchProvider } from "./providers";
import type { UciEngineConfig } from "./uci";

/** Optional local search; a tested binary/network must be supplied, never downloads implicitly. */
export class Lc0Provider extends UciSearchProvider {
  constructor(config: UciEngineConfig, identity: Partial<EngineIdentity> = {}) {
    super(
      { id: "lc0", name: "Leela Chess Zero", ...identity },
      { displayName: "Leela Chess Zero", startupTimeoutMs: 90000, ...config },
    );
  }
}
