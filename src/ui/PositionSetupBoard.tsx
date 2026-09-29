import type { Square } from "chess.js";
import type { PositionDraft } from "../editor/position-draft";
import type { Color, Locale } from "../shared/contracts";
export function PositionSetupBoard({
  draft,
  orientation,
  onSquare,
  locale,
  uncertain = [],
}: {
  draft: PositionDraft;
  orientation: Color;
  onSquare: (s: Square) => void;
  locale: Locale;
  uncertain?: string[];
}) {
  const files = orientation === "w" ? "abcdefgh" : "hgfedcba",
    ranks = orientation === "w" ? "87654321" : "12345678";
  return (
    <div className="board-frame">
      <div
        className="chessboard setup-board"
        role="group"
        aria-label={locale === "ru" ? "Расстановка фигур" : "Position setup"}
      >
        {[...ranks].flatMap((r, row) =>
          [...files].map((f, col) => {
            const s = (f + r) as Square,
              p = draft.pieces[s];
            return (
              <button
                type="button"
                key={s}
                className={`square ${(f.charCodeAt(0) - 97 + Number(r)) % 2 === 0 ? "light" : "dark"}${uncertain.includes(s) ? " scan-uncertain" : ""}`}
                data-square={s}
                aria-label={`${s} ${p ? p.color + p.type : "empty"}`}
                onClick={() => onSquare(s)}
              >
                {p && (
                  <img
                    src={`./pieces/${p.color}${p.type.toUpperCase()}.svg`}
                    alt=""
                  />
                )}
                {col === 0 && <span className="rank-label">{r}</span>}
                {row === 7 && <span className="file-label">{f}</span>}
                {uncertain.includes(s) && (
                  <span
                    className="scan-question"
                    aria-label={
                      locale === "ru" ? "Проверь поле" : "Check square"
                    }
                  >
                    ?
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
