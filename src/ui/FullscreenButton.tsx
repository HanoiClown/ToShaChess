import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import type { Locale } from "../shared/contracts";

export function FullscreenButton({
  locale,
  onError,
}: {
  locale: Locale;
  onError: (error: unknown) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    let receivedEvent = false;
    const update = (value: boolean) => {
      if (!alive) return;
      setEnabled(value);
      document.documentElement.dataset.fullscreen = String(value);
    };
    const unsubscribe = window.chessApp.onFullscreen((value) => {
      receivedEvent = true;
      update(value);
    });
    void window.chessApp
      .getFullscreen()
      .then((value) => {
        if (!receivedEvent) update(value);
      })
      .catch(onError);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  const label =
    locale === "ru"
      ? enabled
        ? "Выйти из полноэкранного режима"
        : "Полноэкранный режим"
      : enabled
        ? "Exit full screen"
        : "Full screen";
  const Icon = enabled ? Minimize : Maximize;
  return (
    <button
      className="icon-button fullscreen-toggle"
      type="button"
      aria-label={label}
      aria-pressed={enabled}
      aria-keyshortcuts={enabled ? "F11 Escape" : "F11"}
      title={`${label} · ${enabled ? "Esc / F11" : "F11"}`}
      onClick={() => void window.chessApp.toggleFullscreen().catch(onError)}
    >
      <Icon size={20} />
    </button>
  );
}
