import { useEffect, useState } from "react";
import type { Locale } from "../shared/contracts";
import type { StudyExplanation } from "../study/tree";
import "./study.css";
const glossary = [
  [
    "Темп",
    "Tempo",
    "Один ход. Развивая фигуру с угрозой, можно заставить соперника потратить ход на защиту.",
    "One move. Developing with a threat can make the opponent spend a move defending.",
  ],
  [
    "Компенсация",
    "Compensation",
    "Активность, атака или другие преимущества взамен отданного материала. Её нужно подтвердить ходами.",
    "Activity, an attack or other advantages in exchange for material. It must be demonstrated with moves.",
  ],
  [
    "Связка",
    "Pin",
    "Фигура закрывает линию к королю или более ценной фигуре. Проверь, что случится, если она уйдёт.",
    "A piece blocks a line toward its king or a more valuable piece. Check what happens if it moves.",
  ],
  [
    "Вилка",
    "Fork",
    "Одна фигура атакует несколько целей одновременно; проверь все ответы соперника.",
    "One piece attacks several targets at once; check all of the opponent's replies.",
  ],
  [
    "Инициатива",
    "Initiative",
    "Возможность создавать угрозы, на которые сопернику приходится отвечать.",
    "The ability to create threats that the opponent has to answer.",
  ],
  [
    "Промежуточный ход",
    "Zwischenzug",
    "Перед ожидаемым взятием делается более срочная угроза, например шах.",
    "A more urgent threat, such as check, is played before the expected recapture.",
  ],
];
export function ExplanationPanel({
  explanation,
  locale,
  heading,
  onExplore,
  defaultDetailed = false,
  showShort = true,
}: {
  explanation?: StudyExplanation;
  locale: Locale;
  heading?: string;
  onExplore?: () => void;
  defaultDetailed?: boolean;
  showShort?: boolean;
}) {
  const [detail, setDetail] = useState(defaultDetailed),
    ru = locale === "ru";
  useEffect(() => setDetail(defaultDetailed), [defaultDetailed]);
  return (
    <section
      className="explanation-panel"
      aria-label={ru ? "Объяснение позиции" : "Position explanation"}
    >
      {heading && <h3>{heading}</h3>}
      {showShort && (
        <p className="explanation-short">
          {explanation?.short[locale] ||
            (ru
              ? "Это самостоятельная ветка. Проверь угрозы и ответы на доске; авторского объяснения этой позиции пока нет."
              : "This is your own variation. Check threats and replies on the board; this position has no authored explanation yet.")}
        </p>
      )}
      {explanation?.detail?.[locale] && (
        <>
          <button
            type="button"
            className="text-button explanation-toggle"
            aria-expanded={detail}
            onClick={() => setDetail(!detail)}
          >
            {detail
              ? ru
                ? "Скрыть подробности"
                : "Hide details"
              : ru
                ? "Почему — подробнее"
                : "Why — read more"}
          </button>
          {detail && (
            <div className="explanation-detail">
              {explanation.detail[locale].split(/\n\s*\n/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </>
      )}
      {onExplore && (
        <button type="button" className="secondary" onClick={onExplore}>
          {ru ? "Проверить на доске" : "Explore on the board"}
        </button>
      )}
      {!!explanation?.sources?.length && (
        <details className="explanation-sources">
          <summary>{ru ? "Источники" : "Sources"}</summary>
          <ul>
            {explanation.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
                {s.license && <small> · {s.license}</small>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <details className="study-glossary">
        <summary>{ru ? "Шахматные термины" : "Chess terms"}</summary>
        <dl>
          {glossary.map((t) => (
            <div key={t[0]}>
              <dt>{t[ru ? 0 : 1]}</dt>
              <dd>{t[ru ? 2 : 3]}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
