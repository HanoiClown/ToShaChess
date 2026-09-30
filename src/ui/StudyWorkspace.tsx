import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Save,
  FlipVertical2,
} from "lucide-react";
import type { Locale, Color, Position, EngineLine } from "../shared/contracts";
import {
  addStudyMove,
  getStudyPosition,
  selectStudyNode,
  setStudyMainLine,
  studyError,
  updateStudyNode,
  type StudyDocument,
} from "../study/tree";
import { exportStudyPgn, importStudyPgn } from "../study/pgn";
import { boardAt, playUci } from "../chess/game";
import { scoreText } from "../analysis/evaluate";
import { Board } from "./Board";
import { VariationTree } from "./VariationTree";
import { ExplanationPanel } from "./ExplanationPanel";
import "./study.css";
import { usePanelHeight } from "../study/usePanelHeight";
export function StudyWorkspace({
  study,
  onChange,
  locale,
  onSave,
  onAnalyze,
  onPlayFrom,
  orientation = "w",
  defaultDetailed = false,
  analysisTools,
}: {
  study: StudyDocument;
  onChange: (study: StudyDocument) => void;
  locale: Locale;
  onSave?: (study: StudyDocument) => Promise<void>;
  onAnalyze?: (position: Position) => Promise<EngineLine[]>;
  onPlayFrom?: (position: Position) => void;
  orientation?: Color;
  defaultDetailed?: boolean;
  analysisTools?: ReactNode;
}) {
  const ru = locale === "ru",
    node = study.nodes[study.selectedNodeId],
    position = getStudyPosition(study),
    board = boardAt(position);
  const [flipped, setFlipped] = useState(false),
    [status, setStatus] = useState(""),
    [saving, setSaving] = useState(false),
    [busy, setBusy] = useState(false),
    [lines, setLines] = useState<EngineLine[]>([]),
    [pgn, setPgn] = useState("");
  const generation = useRef(0),
    mounted = useRef(true);
  const panelRef = usePanelHeight(study.id);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const heading = resultsHeading.current,
      panel = panelRef.current;
    if (!lines.length || !heading || !panel) return;
    if (getComputedStyle(panel).overflowY === "auto") {
      panel.scrollTo({
        top:
          panel.scrollTop +
          heading.getBoundingClientRect().top -
          panel.getBoundingClientRect().top -
          20,
      });
    } else {
      heading.scrollIntoView({ block: "start" });
    }
  }, [lines]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    generation.current++;
    setLines([]);
    setBusy(false);
    setStatus("");
  }, [study.id, study.selectedNodeId]);
  const apply = (fn: () => StudyDocument) => {
    try {
      onChange(fn());
    } catch (e) {
      setStatus(studyError(e, locale));
    }
  };
  async function save() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(study);
      if (mounted.current)
        setStatus(
          ru
            ? "Исследование сохранено в профиле."
            : "Study saved to your profile.",
        );
    } catch (e) {
      if (mounted.current) setStatus(studyError(e, locale));
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  async function analyze() {
    if (!onAnalyze) return;
    const own = ++generation.current;
    setBusy(true);
    try {
      const result = await onAnalyze(position);
      if (own === generation.current && mounted.current) setLines(result);
    } catch {
      if (own === generation.current && mounted.current)
        setStatus(
          ru
            ? "Анализ недоступен. Ветка сохранена на доске."
            : "Analysis is unavailable. Your variation remains on the board.",
        );
    } finally {
      if (own === generation.current && mounted.current) setBusy(false);
    }
  }
  return (
    <div className="game-layout study-layout">
      <section className="board-column">
        <div className="review-controls study-controls">
          <button
            className="icon-button"
            aria-label={ru ? "Назад в исследовании" : "Previous study move"}
            disabled={!node.parentId}
            onClick={() => onChange(selectStudyNode(study, node.parentId!))}
          >
            <ChevronLeft />
          </button>
          <span>
            {ru ? "Полуходов:" : "Plies:"} {position.moves.length}
          </span>
          <button
            className="icon-button"
            aria-label={ru ? "Вперёд в исследовании" : "Next study move"}
            disabled={!node.mainChildId}
            onClick={() => onChange(selectStudyNode(study, node.mainChildId!))}
          >
            <ChevronRight />
          </button>
          <button
            className="icon-button"
            aria-label={ru ? "Перевернуть доску" : "Flip board"}
            onClick={() => setFlipped(!flipped)}
          >
            <FlipVertical2 size={18} />
          </button>
          {onSave && (
            <button
              className="secondary"
              disabled={saving}
              onClick={() => void save()}
            >
              <Save size={17} />
              {saving
                ? ru
                  ? "Сохраняем…"
                  : "Saving…"
                : ru
                  ? "Сохранить"
                  : "Save"}
            </button>
          )}
        </div>
        <Board
          fen={board.fen()}
          orientation={
            flipped ? (orientation === "w" ? "b" : "w") : orientation
          }
          locale={locale}
          lastMove={node.uci ?? undefined}
          onMove={(u) => apply(() => addStudyMove(study, node.id, u))}
        />
        <p className="study-note">
          {ru
            ? "Исследуй любые легальные ходы за обе стороны. Исходный урок и партия не меняются."
            : "Explore any legal move for either side. The original lesson and game stay unchanged."}
        </p>
        <p className="study-note">
          {ru
            ? "ПКМ: рисуй план по шагам, продолжая стрелку с её конца. Красные стрелки — за сторону сверху, оранжевые — снизу. ЛКМ или Escape очищает метки."
            : "Right-drag to plan step by step, continuing from an arrow's endpoint. Red arrows belong to the top side, orange to the bottom. Left-click or Escape clears marks."}
        </p>
      </section>
      <section
        className="side-panel study-panel scroll-panel"
        ref={panelRef}
        tabIndex={0}
        aria-label={
          ru ? "Ходы и анализ позиции" : "Position moves and analysis"
        }
      >
        <label>
          {ru ? "Название исследования" : "Study title"}
          <input
            value={study.title}
            maxLength={200}
            onChange={(e) =>
              onChange({
                ...study,
                title: e.target.value,
                updatedAt: new Date().toISOString(),
              })
            }
          />
        </label>
        <VariationTree
          study={study}
          locale={locale}
          onSelect={(id) => onChange(selectStudyNode(study, id))}
        />
        <div className="study-actions">
          <button
            className="secondary"
            aria-pressed={node.bookmarked}
            onClick={() =>
              apply(() =>
                updateStudyNode(study, node.id, {
                  bookmarked: !node.bookmarked,
                }),
              )
            }
          >
            <Bookmark size={16} />
            {ru ? "Закладка" : "Bookmark"}
          </button>
          <button
            className="secondary"
            disabled={
              !node.parentId ||
              study.nodes[node.parentId].mainChildId === node.id
            }
            onClick={() => apply(() => setStudyMainLine(study, node.id))}
          >
            {ru ? "Сделать основной" : "Make main line"}
          </button>
          {onPlayFrom && (
            <button className="secondary" onClick={() => onPlayFrom(position)}>
              {ru ? "Сыграть отсюда" : "Play from here"}
            </button>
          )}
        </div>
        <p role="status" className="study-status">
          {status}
        </p>
        <section
          className="study-analysis"
          aria-label={ru ? "Анализ позиции" : "Position analysis"}
        >
          <h3>{ru ? "Анализ позиции" : "Position analysis"}</h3>
          {onAnalyze && (
            <button
              className="primary"
              disabled={busy || board.isGameOver()}
              onClick={() => void analyze()}
            >
              {busy
                ? ru
                  ? "Считаем…"
                  : "Analyzing…"
                : ru
                  ? "Проверить Stockfish"
                  : "Check with Stockfish"}
            </button>
          )}
          {!!lines.length && (
            <div className="study-engine-lines">
              <h4 ref={resultsHeading}>
                {ru
                  ? "Лучшие найденные продолжения Stockfish"
                  : "Best continuations found by Stockfish"}
              </h4>
              <p>
                {ru
                  ? "Оценка за белых. Нажми на продолжение, чтобы добавить его в список ходов и разобрать на доске."
                  : "Evaluation from White’s side. Select a continuation to add it to the move list and explore it on the board."}
              </p>
              {lines.map((line, i) => {
                const b = boardAt(position);
                let sans: string[] = [];
                try {
                  sans = line.pv.slice(0, 20).map((u) => playUci(b, u).san);
                } catch {
                  return null;
                }
                return (
                  <button
                    className="study-engine-line"
                    key={i}
                    onClick={() =>
                      apply(() => {
                        let next = study,
                          parent = node.id;
                        for (const u of line.pv.slice(0, 20)) {
                          next = addStudyMove(next, parent, u, "engine");
                          parent = next.selectedNodeId;
                        }
                        return selectStudyNode(next, node.id);
                      })
                    }
                  >
                    <strong>{scoreText(line.score, locale)}</strong>
                    <span>{sans.join(" ")}</span>
                    <small>{ru ? "Добавить ветку" : "Add line"}</small>
                  </button>
                );
              })}
            </div>
          )}
          {analysisTools}
        </section>
        <div className="study-commentary">
          <ExplanationPanel
            explanation={node.explanation}
            locale={locale}
            defaultDetailed={defaultDetailed}
            heading={
              board.history().at(-1) ??
              (ru ? "Начальная позиция" : "Starting position")
            }
          />
          <label>
            {ru ? "Личная заметка" : "Personal note"}
            <textarea
              aria-label={ru ? "Личная заметка" : "Personal note"}
              value={node.comment}
              maxLength={10000}
              rows={3}
              onChange={(e) =>
                apply(() =>
                  updateStudyNode(study, node.id, { comment: e.target.value }),
                )
              }
            />
          </label>
        </div>
        <details className="study-pgn">
          <summary>
            {ru ? "Импорт и экспорт PGN" : "Import and export PGN"}
          </summary>
          <p>
            {ru
              ? "Одна партия с вариантами и комментариями, до 1 МБ. Импорт создаёт новое исследование; сохрани текущие изменения перед импортом."
              : "One game with variations and comments, up to 1 MB. Import creates a new study; save current edits before importing."}
          </p>
          <textarea
            aria-label="PGN"
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            rows={5}
            maxLength={1000000}
          />
          <div className="study-actions">
            <button
              className="secondary"
              onClick={() =>
                apply(() => importStudyPgn(pgn, { profileId: study.profileId }))
              }
            >
              {ru ? "Импортировать" : "Import"}
            </button>
            <button
              className="secondary"
              onClick={() => {
                try {
                  setPgn(exportStudyPgn(study));
                } catch (e) {
                  setStatus(studyError(e, locale));
                }
              }}
            >
              {ru ? "Получить PGN" : "Generate PGN"}
            </button>
          </div>
        </details>
      </section>
    </div>
  );
}
