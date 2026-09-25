import { useEffect, useRef, useState } from "react";

/** Show the player's move and the automatic reply as separate board states. */
export function usePlySequence(scope: string) {
  const [playing, setPlaying] = useState(false);
  const mounted = useRef(false);
  const active = useRef<{ cancelled: boolean; wake?: () => void } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const task = active.current;
      if (task) {
        task.cancelled = true;
        task.wake?.();
      }
    };
  }, [scope]);

  async function play(from: number, to: number, show: (ply: number) => void) {
    if (active.current || !mounted.current) return false;
    const task = {
      cancelled: false,
      wake: undefined as (() => void) | undefined,
    };
    active.current = task;
    setPlaying(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 110
      : 240;
    try {
      for (let ply = from + 1; ply <= to; ply++) {
        if (task.cancelled) return false;
        show(ply);
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, delay);
          task.wake = () => {
            window.clearTimeout(timer);
            resolve();
          };
        });
      }
      return !task.cancelled;
    } finally {
      if (active.current === task) {
        active.current = null;
        if (mounted.current) setPlaying(false);
      }
    }
  }
  return { playing, play };
}
