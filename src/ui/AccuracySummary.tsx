import type { Locale } from "../shared/contracts";
import type { gameAccuracy } from "../analysis/accuracy";
import "./training-feedback.css";
export function AccuracySummary({
  locale,
  accuracy,
}: {
  locale: Locale;
  accuracy: ReturnType<typeof gameAccuracy>;
}) {
  const ru = locale === "ru";
  return (
    <section className="accuracy-summary">
      <h2>{ru ? "Точность партии" : "Game accuracy"}</h2>
      {!accuracy.complete && (
        <small>
          {ru ? "Предварительно" : "Preliminary"} ·{" "}
          {accuracy.w.analyzed + accuracy.b.analyzed}/
          {accuracy.w.total + accuracy.b.total}
        </small>
      )}
      <div className="accuracy-sides">
        {(["w", "b"] as const).map((s) => (
          <div key={s}>
            <span>
              {s === "w" ? (ru ? "Белые" : "White") : ru ? "Чёрные" : "Black"}
            </span>
            <strong>
              {accuracy[s].value === null
                ? "—"
                : `${accuracy[s].value.toFixed(1)}%`}
            </strong>
          </div>
        ))}
      </div>
      <details>
        <summary>
          {ru ? "Как считается точность?" : "How is accuracy calculated?"}
        </summary>
        <p>
          {ru
            ? "Учебная метрика ToShaChess, не рейтинг и не формула Chess.com. Среднее сохранение оценки Stockfish: 100 × (1 − потеря ожидаемого результата). Обычная оценка преобразуется по E = 1 / (1 + exp(−cp / 250)); мат — 1 или 0. Результат зависит от глубины анализа."
            : "A ToShaChess training metric, not a rating or the Chess.com formula. Average preservation of Stockfish evaluation: 100 × (1 − expected-result loss). E = 1 / (1 + exp(−cp / 250)); forced mate is 1 or 0. Results depend on search depth."}
        </p>
      </details>
    </section>
  );
}
