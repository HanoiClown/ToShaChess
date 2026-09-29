import type { Locale, Color } from "../shared/contracts";
import type { materialSummary } from "../analysis/material-summary";
import "./training-feedback.css";
export function MaterialPanel({
  locale,
  summary,
  orientation,
}: {
  locale: Locale;
  summary: ReturnType<typeof materialSummary>;
  orientation: Color;
}) {
  const ru = locale === "ru";
  return (
    <details className="material-panel" open>
      <summary>
        {ru ? "Фигуры и материал" : "Pieces and material"}{" "}
        <b>
          {summary.balance > 0 ? "+" : ""}
          {summary.balance}
        </b>
      </summary>
      {([orientation === "w" ? "b" : "w", orientation] as Color[]).map(
        (side) => (
          <div className="material-side" key={side}>
            <span>
              {side === "w"
                ? ru
                  ? "Белые"
                  : "White"
                : ru
                  ? "Чёрные"
                  : "Black"}
            </span>
            <div className="remaining-pieces">
              {(["k", "q", "r", "b", "n", "p"] as const).map((type) => (
                <span key={type} title={type}>
                  <img
                    alt={type}
                    src={`./pieces/${side}${type.toUpperCase()}.svg`}
                  />
                  <b>{summary.remaining[side][type]}</b>
                </span>
              ))}
            </div>
            <small>
              {ru ? "Взяли:" : "Captured:"}{" "}
              {summary.captured[side].length
                ? summary.captured[side].map((p, i) => (
                    <img
                      key={i}
                      alt={p}
                      src={`./pieces/${side === "w" ? "b" : "w"}${p.toUpperCase()}.svg`}
                    />
                  ))
                : "—"}
            </small>
          </div>
        ),
      )}
    </details>
  );
}
