import { useLayoutEffect, useRef } from "react";
/** Keep long explanations inside the current viewport without scrolling the board. */
export function usePanelHeight(dependency: unknown) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const resize = () => {
      const element = ref.current;
      if (!element) return;
      element.style.maxHeight = window.innerWidth > 950
        ? `${Math.max(280, window.innerHeight - element.getBoundingClientRect().top - 20)}px`
        : "none";
    };
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [dependency]);
  return ref;
}
