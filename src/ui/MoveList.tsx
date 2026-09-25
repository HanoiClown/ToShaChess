import { useEffect, useRef } from "react";
import { Chess } from "chess.js";
import type { GameRecord, Locale } from "../shared/contracts";
import { playUci } from "../chess/game";
import { translate } from "../i18n";
export const qualitySymbol: Record<string, string> = {
  best: "★",
  excellent: "✓",
  good: "✓",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
  brilliant: "!!",
  book: "▤",
};
export function MoveList({
  game,
  selected,
  onSelect,
  locale,
  showQuality = true,
}: {
  game: GameRecord;
  selected: number;
  onSelect: (ply: number) => void;
  locale: Locale;
  showQuality?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    c = new Chess(game.initialFen),
    rows: {
      n: number;
      w?: { ply: number; san: string };
      b?: { ply: number; san: string };
    }[] = [];
  game.moves.forEach((u, i) => {
    const n = c.moveNumber(),
      side = c.turn();
    let row = rows.at(-1);
    if (!row || row.n !== n) {
      row = { n };
      rows.push(row);
    }
    row[side] = { ply: i + 1, san: playUci(c, u).san };
  });
  useEffect(() => {
    ref.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <div
      className="move-list"
      ref={ref}
      role="list"
      aria-label={locale === "ru" ? "Ходы партии" : "Game moves"}
    >
      {!rows.length && (
        <p className="empty-inline">
          {locale === "ru" ? "Первый ход за тобой." : "Your first move awaits."}
        </p>
      )}
      {rows.map((row) => (
        <div className="move-row" key={row.n}>
          <span>{row.n}.</span>
          {(["w", "b"] as const).map((side) => {
            const move = row[side],
              a =
                move && showQuality
                  ? game.analysis.find((a) => a.ply === move.ply)
                  : undefined;
            return move ? (
              <button
                key={side}
                onClick={() => onSelect(move.ply)}
                aria-current={selected === move.ply ? "step" : undefined}
              >
                <span>{move.san}</span>
                {a && (
                  <span
                    className={`quality-dot ${a.quality}`}
                    title={translate(locale, a.quality)}
                  >
                    {qualitySymbol[a.quality]}
                  </span>
                )}
              </button>
            ) : (
              <span key={side} />
            );
          })}
        </div>
      ))}
    </div>
  );
}
