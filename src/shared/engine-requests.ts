import type { Position } from "./contracts";
export function engineRequest() {
  const requestId = crypto.randomUUID();
  let cancelled = false;
  return {
    requestId,
    get active() {
      return !cancelled;
    },
    analyze: (position: Position) =>
      window.chessApp.analyzePosition({ requestId, position }),
    cancel: () => {
      cancelled = true;
      void window.chessApp.cancelRequest(requestId).catch(() => {});
    },
  };
}
