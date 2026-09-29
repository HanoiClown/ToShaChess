import { Lightbulb } from "lucide-react";
import type { Locale, Quality, Score } from "../shared/contracts";
import { translate } from "../i18n";
import { qualitySymbol } from "./MoveList";
import { scoreText } from "../analysis/evaluate";
import "./training-feedback.css";
export function CoachCard({
  locale,
  san,
  quality,
  score,
  text,
  pending,
  variant,
}: {
  locale: Locale;
  san: string;
  quality?: Quality;
  score?: Score;
  text: string;
  pending?: boolean;
  variant?: boolean;
}) {
  const ru = locale === "ru";
  return (
    <section className="coach-card" aria-live="polite">
      <div className="coach-portrait" aria-hidden="true">
        <Lightbulb size={28} />
      </div>
      <div className="coach-bubble">
        <div className="coach-card-title">
          {quality && (
            <span className={`quality-badge ${quality}`}>
              {qualitySymbol[quality]}
            </span>
          )}
          <strong>
            {variant ? (ru ? "Учебный вариант" : "Study variation") : san}
            {quality ? ` — ${translate(locale, quality)}` : ""}
          </strong>
          {score && (
            <span
              className="coach-score"
              title={
                ru
                  ? "Оценка за белых. + / M: белые; − / −M: чёрные."
                  : "White perspective. + / M: White; − / −M: Black."
              }
            >
              {score.mate === 0 ? (ru ? "Мат" : "Checkmate") : scoreText(score)}
            </span>
          )}
        </div>
        <p>
          {pending
            ? ru
              ? "Stockfish проверяет ход…"
              : "Stockfish is checking the move…"
            : text}
        </p>
      </div>
    </section>
  );
}
