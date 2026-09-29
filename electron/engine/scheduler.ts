import type {
  EngineRequestContext,
  EngineRequestGroup,
} from "../../src/shared/engine-providers";
import { cancelledError } from "./uci";

type Pending = {
  context: EngineRequestContext;
  controller: AbortController;
  cancel: () => void;
};
/** Latest request wins within one profile/session/provider; other providers remain independent. */
export class EngineScheduler {
  private requests = new Map<string, Pending>();
  private closed = false;
  run<T>(
    context: EngineRequestContext,
    task: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (this.closed) return Promise.reject(Error("Engine scheduler closed"));
    const keys: (keyof EngineRequestContext)[] = [
      "requestId",
      "profileId",
      "sessionId",
      "providerId",
      "positionKey",
    ];
    if (
      !context ||
      keys.some(
        (key) =>
          typeof context[key] !== "string" ||
          !context[key].length ||
          context[key].length > 512,
      )
    )
      return Promise.reject(Error("Invalid engine request context"));
    const snapshot = { ...context };
    this.cancelGroup({
      profileId: context.profileId,
      sessionId: context.sessionId,
      providerId: context.providerId,
    });
    this.cancelRequest(context.requestId);
    const controller = new AbortController();
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    let settled = false;
    const finish = (success: boolean, value: unknown) => {
      if (settled) return;
      settled = true;
      if (this.requests.get(snapshot.requestId)?.controller === controller)
        this.requests.delete(snapshot.requestId);
      success ? resolve(value as T) : reject(value);
    };
    const cancel = () => {
      controller.abort();
      finish(false, cancelledError());
    };
    this.requests.set(snapshot.requestId, {
      context: snapshot,
      controller,
      cancel,
    });
    try {
      const pending = task(controller.signal);
      Promise.resolve(pending).then(
        (value) => {
          if (controller.signal.aborted) finish(false, cancelledError());
          else finish(true, value);
        },
        (error) => finish(false, error),
      );
    } catch (error) {
      finish(false, error);
    }
    return result;
  }
  cancelRequest(requestId: string) {
    this.requests.get(requestId)?.cancel();
  }
  cancelGroup(group: EngineRequestGroup) {
    for (const pending of [...this.requests.values()]) {
      if (
        Object.entries(group).every(
          ([key, value]) =>
            value === undefined ||
            pending.context[key as keyof EngineRequestContext] === value,
        )
      )
        pending.cancel();
    }
  }
  cancelProvider(providerId: string) {
    this.cancelGroup({ providerId });
  }
  dispose() {
    this.closed = true;
    this.cancelGroup({});
  }
}
