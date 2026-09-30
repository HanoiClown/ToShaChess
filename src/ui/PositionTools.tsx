import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Locale, Position } from "../shared/contracts";
import { EngineComparison } from "./EngineComparison";
import { AdvancedTools } from "./AdvancedTools";
import "./position-tools.css";

type Purpose = "human" | "explorer" | "tablebase" | "search";
export const TOOL_SETTINGS_INTENT = "tosha-open-tool-settings";

export function PositionTools({
  position,
  locale,
  onPlayMove,
  onOpenSettings,
}: {
  position: Position;
  locale: Locale;
  onPlayMove?: (uci: string) => void;
  onOpenSettings: () => void;
}) {
  const [purpose, setPurpose] = useState<Purpose>("human");
  const ru = locale === "ru";
  const openSettings = () => {
    sessionStorage.setItem(TOOL_SETTINGS_INTENT, "open");
    onOpenSettings();
  };
  return (
    <div className="position-tools">
      <details className="position-toolbox">
        <summary>
          <strong>
            {ru ? "Изучить позицию глубже" : "Explore this position further"}
          </strong>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <div className="position-toolbox-body">
          <label>
            {ru ? "Что хочешь узнать?" : "What would you like to learn?"}
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as Purpose)}
            >
              <option value="human">
                {ru ? "Как ответит человек" : "How a human might reply"}
              </option>
              <option value="explorer">
                {ru
                  ? "Как играли в похожих партиях"
                  : "What happened in other games"}
              </option>
              <option value="tablebase">
                {ru ? "Точный исход окончания" : "Exact endgame outcome"}
              </option>
              <option value="search">
                {ru ? "Получить второе мнение" : "Get a second opinion"}
              </option>
            </select>
          </label>
          {purpose === "human" ? (
            <EngineComparison
              position={position}
              locale={locale}
              embedded
              onOpenSettings={openSettings}
            />
          ) : (
            <AdvancedTools
              key={purpose}
              position={position}
              locale={locale}
              api={window.chessApp.advanced}
              focus={purpose}
              onPlayMove={onPlayMove}
              onOpenSettings={openSettings}
            />
          )}
        </div>
      </details>
    </div>
  );
}
