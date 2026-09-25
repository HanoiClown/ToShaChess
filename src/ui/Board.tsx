import { useState, useLayoutEffect, useRef } from "react";
import { Chess, type Square } from "chess.js";
import type { Color, Locale, Score } from "../shared/contracts";
import { scoreText } from "../analysis/evaluate";
import { boardTransition, travelOffset } from "../chess/board-transition";
import { playSound } from "../audio/sounds";
type Props = {
  fen: string;
  orientation?: Color;
  onMove?: (uci: string) => void;
  disabled?: boolean;
  lastMove?: string;
  arrow?: string;
  hintSquare?: string;
  locale?: Locale;
  small?: boolean;
  coordinates?: boolean;
  showPieces?: boolean;
  onSquare?: (square: string) => void;
};
export function Board({
  fen,
  orientation = "w",
  onMove,
  disabled = false,
  lastMove,
  arrow,
  hintSquare,
  locale = "ru",
  small = false,
  coordinates = true,
  showPieces = true,
  onSquare,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const previous = useRef({ fen, orientation, showPieces });
  const [selected, setSelected] = useState<Square | null>(null),
    [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(
      null,
    );
  const c = new Chess(fen),
    files = orientation === "w" ? "abcdefgh" : "hgfedcba",
    ranks = orientation === "w" ? "87654321" : "12345678";
  useLayoutEffect(() => {
    setSelected(null);
    setPromotion(null);
  }, [fen, orientation, showPieces, disabled, hintSquare]);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { fen, orientation, showPieces };
    if (!showPieces || !before.showPieces || orientation !== before.orientation)
      return;
    const transition = boardTransition(before.fen, fen);
    const board = boardRef.current;
    if (!transition || !board) return;
    const size = board.getBoundingClientRect().width / 8;
    if (!size) return;
    playSound(transition.sound);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;
    const moving: { animation: Animation; square: Element }[] = [];
    for (const { from, to } of transition.pieces) {
      const square = board.querySelector(`[data-square="${to}"]`);
      const piece = square?.querySelector("img");
      if (!square || !piece || typeof piece.animate !== "function") continue;
      const { x, y } = travelOffset(from, to, orientation);
      square.classList.add("piece-moving-square");
      const animation = piece.animate(
        [
          { transform: `translate(${x * size}px, ${y * size}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 210, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
      animation.onfinish = () => square.classList.remove("piece-moving-square");
      moving.push({ animation, square });
    }
    const cancel = () => {
      for (const { animation, square } of moving) {
        animation.onfinish = null;
        animation.cancel();
        square.classList.remove("piece-moving-square");
      }
    };
    const onMotionPreference = () => {
      if (reducedMotion.matches) cancel();
    };
    reducedMotion.addEventListener("change", onMotionPreference);
    return () => {
      reducedMotion.removeEventListener("change", onMotionPreference);
      cancel();
    };
  }, [fen, orientation, showPieces]);
  const targets = selected
    ? c.moves({ square: selected, verbose: true }).map((m) => m.to)
    : [];
  function move(from: Square, to: Square) {
    const legal = c
      .moves({ square: from, verbose: true })
      .filter((m) => m.to === to);
    if (!legal.length) return false;
    if (legal.some((m) => m.promotion)) {
      setPromotion({ from, to });
      return true;
    }
    onMove?.(from + to);
    setSelected(null);
    return true;
  }
  function select(square: Square) {
    if (!disabled && onSquare) {
      onSquare(square);
      return;
    }
    if (disabled || !onMove) return;
    if (selected && move(selected, square)) return;
    setSelected(c.get(square)?.color === c.turn() ? square : null);
  }
  const arrowXY = (square: string) => ({
    x: files.indexOf(square[0]) * 12.5 + 6.25,
    y: ranks.indexOf(square[1]) * 12.5 + 6.25,
  });
  const from = arrow ? arrowXY(arrow.slice(0, 2)) : null,
    to = arrow ? arrowXY(arrow.slice(2, 4)) : null;
  const names =
    locale === "ru"
      ? {
          p: "пешка",
          n: "конь",
          b: "слон",
          r: "ладья",
          q: "ферзь",
          k: "король",
        }
      : {
          p: "pawn",
          n: "knight",
          b: "bishop",
          r: "rook",
          q: "queen",
          k: "king",
        };
  return (
    <div className={`board-frame ${small ? "board-small" : ""}`}>
      <div
        ref={boardRef}
        className="chessboard"
        role="group"
        aria-label={locale === "ru" ? "Шахматная доска" : "Chessboard"}
        aria-disabled={disabled}
      >
        {[...ranks].flatMap((rank, row) =>
          [...files].map((file, col) => {
            const square = (file + rank) as Square,
              p = showPieces ? c.get(square) : undefined,
              isLight = (file.charCodeAt(0) - 97 + Number(rank)) % 2 === 0;
            return (
              <button
                type="button"
                key={square}
                data-square={square}
                data-hint={hintSquare === square ? "true" : undefined}
                className={`square ${isLight ? "light" : "dark"} ${selected === square ? "selected" : ""} ${lastMove?.slice(0, 2) === square || lastMove?.slice(2, 4) === square ? "last" : ""} ${hintSquare === square ? "hint-source" : ""}`}
                aria-label={`${square}${p ? " " + (p.color === "w" ? (locale === "ru" ? "белые" : "white") : locale === "ru" ? "чёрные" : "black") + " " + names[p.type] : ""}`}
                aria-description={
                  hintSquare === square
                    ? locale === "ru"
                      ? "Подсказка: сходи этой фигурой"
                      : "Hint: move this piece"
                    : undefined
                }
                onClick={() => select(square)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!disabled && onMove) {
                    const from = e.dataTransfer.getData("text/plain");
                    if (/^[a-h][1-8]$/.test(from)) move(from as Square, square);
                  }
                }}
              >
                {p && (
                  <img
                    src={`./pieces/${p.color}${p.type.toUpperCase()}.svg`}
                    alt=""
                    draggable={!disabled && !!onMove && p.color === c.turn()}
                    onDragStart={(e) => {
                      setSelected(square);
                      e.dataTransfer.setData("text/plain", square);
                    }}
                  />
                )}
                {hintSquare === square && (
                  <span
                    className="hint-source-ring"
                    data-testid="piece-hint"
                    aria-hidden="true"
                  />
                )}
                {coordinates && col === 0 && (
                  <span className="rank-label">{rank}</span>
                )}
                {coordinates && row === 7 && (
                  <span className="file-label">{file}</span>
                )}
                {targets.includes(square) && (
                  <span className={p ? "capture-ring" : "move-dot"} />
                )}
                {p?.type === "k" && p.color === c.turn() && c.isCheck() && (
                  <span className="check-ring" />
                )}
              </button>
            );
          }),
        )}
        {from && to && (
          <svg
            className="board-arrows"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="3"
                markerHeight="3"
                refX="2"
                refY="1.5"
                orient="auto"
              >
                <path d="M0,0 L3,1.5 L0,3Z" fill="#f5ac38" />
              </marker>
            </defs>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#f5ac38"
              strokeWidth="2.2"
              strokeOpacity=".86"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        )}
        {promotion && (
          <div
            className="promotion"
            role="dialog"
            aria-label={
              locale === "ru" ? "Превращение пешки" : "Pawn promotion"
            }
          >
            <p>{locale === "ru" ? "Выбери фигуру" : "Choose a piece"}</p>
            <div>
              {["q", "r", "b", "n"].map((p) => (
                <button
                  key={p}
                  aria-label={names[p as keyof typeof names]}
                  onClick={() => {
                    onMove?.(promotion.from + promotion.to + p);
                    setPromotion(null);
                  }}
                >
                  <img
                    src={`./pieces/${c.turn()}${p.toUpperCase()}.svg`}
                    alt={p}
                  />
                </button>
              ))}
            </div>
            <button className="text-button" onClick={() => setPromotion(null)}>
              {locale === "ru" ? "Отмена" : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export function EvalBar({
  score,
  orientation = "w",
}: {
  score?: Score;
  orientation?: Color;
}) {
  const amount = score ? Math.max(3, Math.min(97, 50 + score.cp / 12)) : 50;
  return (
    <div
      className={`eval-bar ${orientation === "b" ? "inverted" : ""}`}
      title={score ? scoreText(score) : "—"}
    >
      <div style={{ height: `${100 - amount}%` }} />
      <span>{score ? scoreText(score) : "—"}</span>
    </div>
  );
}
