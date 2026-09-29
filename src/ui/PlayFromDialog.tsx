import { useEffect, useRef, useState } from "react";
import type { Color, Position } from "../shared/contracts";
import { useApp } from "./context";
import { boardAt } from "../chess/game";
import { useEnginePacks } from "./EnginePacks";
import { createPracticeGame } from "./study-actions";
export function PlayFromDialog({
  position,
  onClose,
  providerId,
}: {
  position: Position;
  onClose: () => void;
  providerId?: "stockfish" | "maia";
}) {
  const { profile, locale, l, nav, refresh, fail } = useApp(),
    ref = useRef<HTMLDialogElement>(null);
  const [color, setColor] = useState<Color>(boardAt(position).turn()),
    [maia, setMaia] = useState(providerId === "maia"),
    [elo, setElo] = useState(1100),
    [busy, setBusy] = useState(false);
  const [strong, setStrong] = useState(providerId === "stockfish");
  const { packs } = useEnginePacks(),
    available = packs.find((p) => p.id === "maia-cpu")?.status === "ready";
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function start() {
    setBusy(true);
    try {
      const game = await createPracticeGame(
        profile,
        position,
        color,
        locale,
        maia
          ? {
              pack: "maia-cpu",
              selfElo: elo,
              opponentElo: 1100,
              temperature: 1,
            }
          : undefined,
        strong,
      );
      await refresh();
      onClose();
      nav(game.result === "*" ? "play" : "review", game.id);
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="practice-dialog"
      onCancel={onClose}
      aria-labelledby="practice-title"
    >
      <h2 id="practice-title">
        {l("Сыграть из этой позиции", "Play from this position")}
      </h2>
      <p>
        {l(
          "История ходов сохранится для движка. Точность будет считаться с этого момента.",
          "The engine keeps the move history. Accuracy starts from this position.",
        )}
      </p>
      <label>
        {l("Твой цвет", "Your colour")}
        <select
          value={color}
          onChange={(e) => setColor(e.target.value as Color)}
        >
          <option value="w">{l("Белые", "White")}</option>
          <option value="b">{l("Чёрные", "Black")}</option>
        </select>
      </label>
      <label>
        {l("Соперник", "Opponent")}
        <select
          value={String(maia)}
          onChange={(e) => setMaia(e.target.value === "true")}
        >
          <option value="false">
            {l("Искра · примерно 600", "Spark · approximately 600")}
          </option>
          <option value="true" disabled={!available}>
            Maia-3 5M{" "}
            {!available &&
              l("— установи в настройках", "— install in Settings")}
          </option>
        </select>
      </label>
      {!maia && (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={strong}
            onChange={(e) => setStrong(e.target.checked)}
          />
          {l(
            "Сильная защита Stockfish · лучший найденный ход за 1,5 секунды",
            "Strong Stockfish defence · best move found in 1.5 seconds",
          )}
        </label>
      )}
      {maia && (
        <label>
          {l("Уровень Maia · шкала Lichess", "Maia level · Lichess scale")}
          <input
            type="number"
            min={600}
            max={2600}
            step={100}
            value={elo}
            onChange={(e) => setElo(Number(e.target.value))}
          />
        </label>
      )}
      <div className="study-actions">
        <button
          className="primary"
          disabled={
            busy ||
            (maia && (!Number.isInteger(elo) || elo < 600 || elo > 2600))
          }
          onClick={() => void start()}
        >
          {busy ? l("Открываем…", "Opening…") : l("Начать", "Start")}
        </button>
        <button className="secondary" disabled={busy} onClick={onClose}>
          {l("Отмена", "Cancel")}
        </button>
      </div>
    </dialog>
  );
}
