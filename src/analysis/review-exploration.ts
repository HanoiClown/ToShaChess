import { useEffect, useRef, useState } from "react";
import type { EngineLine, Position } from "../shared/contracts";
import { boardAt, playUci, START } from "../chess/game";
import { engineRequest } from "../shared/engine-requests";

export type ReviewExploration = {
  base: Position;
  moves: string[];
  cursor: number;
};
export function createExploration(position: Position): ReviewExploration {
  return {
    base: { initialFen: position.initialFen, moves: [...position.moves] },
    moves: [],
    cursor: 0,
  };
}
export function explorationPosition(state: ReviewExploration): Position {
  return {
    initialFen: state.base.initialFen,
    moves: [...state.base.moves, ...state.moves.slice(0, state.cursor)],
  };
}
export function moveExploration(
  state: ReviewExploration,
  uci: string,
): ReviewExploration {
  playUci(boardAt(explorationPosition(state)), uci);
  return {
    ...state,
    moves: [...state.moves.slice(0, state.cursor), uci],
    cursor: state.cursor + 1,
  };
}
export function seekExploration(
  state: ReviewExploration,
  cursor: number,
): ReviewExploration {
  return {
    ...state,
    cursor: Math.max(0, Math.min(state.moves.length, cursor)),
  };
}
export function continueExploration(
  state: ReviewExploration,
  line: string[],
  step: number,
): ReviewExploration {
  const board = boardAt(explorationPosition(state));
  for (const move of line) playUci(board, move);
  return {
    ...state,
    moves: [...state.moves.slice(0, state.cursor), ...line],
    cursor: state.cursor + Math.max(0, Math.min(line.length, step)),
  };
}

/** Local-only history and analysis; no saved game or coach data is modified. */
export function useReviewExploration(
  base: Position | undefined,
  context: string,
  enabled: boolean,
) {
  const [session, setSession] = useState<{
    context: string;
    value: ReviewExploration;
  } | null>(null);
  const [result, setResult] = useState<{
    key: string;
    lines: EngineLine[];
  } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const request = useRef<ReturnType<typeof engineRequest> | null>(null);
  const scratch =
    enabled && session?.context === context ? session.value : null;
  const position = scratch
    ? explorationPosition(scratch)
    : (base ?? { initialFen: START, moves: [] });
  const key = `${enabled}|${context}|${position.initialFen}|${position.moves.join(" ")}`;
  const currentKey = useRef(key);
  currentKey.current = key;

  function cancel() {
    request.current?.cancel();
    request.current = null;
    setBusyKey(null);
  }
  function invalidate() {
    cancel();
    setResult(null);
    setErrorKey(null);
  }
  useEffect(() => {
    setSession(null);
  }, [context, enabled]);
  useEffect(() => {
    setResult(null);
    setErrorKey(null);
    setBusyKey(null);
    return () => {
      request.current?.cancel();
      request.current = null;
    };
  }, [key]);

  function update(value: ReviewExploration | null) {
    if (!enabled || !base) return;
    invalidate();
    setSession(value ? { context, value } : null);
  }
  function move(uci: string) {
    if (!enabled || !base) return;
    update(moveExploration(scratch ?? createExploration(base), uci));
  }
  function follow(line: string[], step: number) {
    if (!enabled || !base) return;
    update(continueExploration(scratch ?? createExploration(base), line, step));
  }
  async function analyze() {
    if (!enabled || !base) return;
    invalidate();
    const own = engineRequest();
    request.current = own;
    setBusyKey(key);
    try {
      const lines = await own.analyze(position);
      if (own.active && request.current === own && currentKey.current === key)
        setResult({ key, lines });
    } catch {
      if (own.active && request.current === own && currentKey.current === key)
        setErrorKey(key);
    } finally {
      if (request.current === own) {
        request.current = null;
        setBusyKey(null);
      }
    }
  }
  return {
    position,
    scratch,
    move,
    follow,
    analyze,
    cancel,
    seek: (cursor: number) => {
      if (scratch) update(seekExploration(scratch, cursor));
    },
    reset: () => {
      if (scratch) update(createExploration(scratch.base));
    },
    close: () => update(null),
    lines: result?.key === key ? result.lines : [],
    busy: busyKey === key,
    failed: errorKey === key,
  };
}
