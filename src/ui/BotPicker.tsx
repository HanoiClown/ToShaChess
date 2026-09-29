import { bots, botStyle } from "../bots/catalog";
import type { Locale } from "../shared/contracts";
import "./bots.css";
export function BotPicker({
  selectedId,
  locale,
  onSelect,
}: {
  selectedId: string;
  locale: Locale;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bot-picker">
      <h3>{locale === "ru" ? "Выбери соперника" : "Choose an opponent"}</h3>
      <div
        className="bot-catalog"
        role="group"
        aria-label={locale === "ru" ? "Соперники" : "Opponents"}
      >
        {bots.map((b) => (
          <button
            type="button"
            key={b.id}
            className="bot-choice"
            aria-pressed={selectedId === b.id}
            onClick={() => onSelect(b.id)}
          >
            <img src={`./bots/${b.id}.svg`} alt="" />
            <span>
              <strong>
                {b.name[locale]} <small>≈{b.rating} Elo</small>
              </strong>
              <span>{botStyle[b.style][locale]}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="field-help">
        {locale === "ru"
          ? "≈ Elo — ориентир сложности, не подтверждённый рейтинг Chess.com."
          : "≈ Elo is an approximate difficulty guide, not a verified Chess.com rating."}
      </p>
    </div>
  );
}
