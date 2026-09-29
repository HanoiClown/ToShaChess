import { useState, useEffect, useRef } from "react";
import { Chess, type PieceSymbol } from "chess.js";
import { useApp } from "../ui/context";
import { savePositionStudy } from "../ui/study-actions";
import {
  draftFromFen,
  emptyDraft,
  validateDraft,
  type PositionDraft,
} from "../editor/position-draft";
import { START, newGame, playUci, terminalResult } from "../chess/game";
import type { Color, EngineLine } from "../shared/contracts";
import { PositionSetupBoard } from "../ui/PositionSetupBoard";
import { Board } from "../ui/Board";
import { CoachCard } from "../ui/CoachCard";
import { engineRequest } from "../shared/engine-requests";
import { bots } from "../bots/catalog";
import { pvSan } from "../analysis/evaluate";
import { PhotoImport } from "../ui/PhotoImport";
import { LastMoveReconstruction } from "../ui/LastMoveReconstruction";
import "../ui/position-editor.css";
const errors: Record<string, [string, string]> = {
  kings: [
    "Нужен один король каждого цвета.",
    "Place exactly one king of each colour.",
  ],
  adjacent: ["Короли не могут стоять рядом.", "Kings cannot be adjacent."],
  pawns: [
    "Убери пешки с первой и восьмой горизонталей.",
    "Pawns cannot be on the first or eighth rank.",
  ],
  castling: [
    "Проверь короля и ладьи для выбранных рокировок.",
    "Castling rights require the king and rook on their starting squares.",
  ],
  ep: [
    "Проверь поле взятия на проходе и положение пешки; счётчик полуходов должен быть 0.",
    "Check the en passant target, pawn placement and halfmove counter (0).",
  ],
  counters: ["Проверь счётчики ходов.", "Check the move counters."],
  previous_check: [
    "Король стороны, которая только что ходила, под шахом.",
    "The side that just moved cannot have its king in check.",
  ],
  invalid_fen: [
    "Некорректный FEN. Нужны все шесть полей.",
    "Invalid FEN. Include all six fields.",
  ],
};
// Session-only drafts remain separate per profile; nothing is exported to backups.
const sessionDrafts = new Map<string, PositionDraft>();
export function clearEditorDrafts() {
  sessionDrafts.clear();
}
export function PositionEditor() {
  const { profile, locale, l, nav, refresh, fail } = useApp();
  const [draft, setDraft] = useState(
      () => sessionDrafts.get(profile.id) ?? draftFromFen(START),
    ),
    [piece, setPiece] = useState<{ color: Color; type: PieceSymbol } | null>({
      color: "w",
      type: "q",
    }),
    [orientation, setOrientation] = useState<Color>("w"),
    [fenText, setFenText] = useState(START),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [lines, setLines] = useState<EngineLine[]>([]),
    [variation, setVariation] = useState<{
      fen: string;
      moves: string[];
    } | null>(null),
    [botId, setBotId] = useState("spark"),
    [color, setColor] = useState<Color>("w");
  const request = useRef<ReturnType<typeof engineRequest> | null>(null);
  const position = variation ? new Chess(variation.fen) : null;
  if (position && variation)
    for (const u of variation.moves) playUci(position, u);
  // Reconstructed/explored positions have their own valid turn and history;
  // an unfinished setup must not disable actions on the board now displayed.
  const checked = validateDraft(
    position ? draftFromFen(position.fen()) : draft,
  );
  useEffect(() => {
    sessionDrafts.set(profile.id, draft);
    request.current?.cancel();
    setLines([]);
    setVariation(null);
    setBusy(false);
  }, [draft]);
  useEffect(() => () => request.current?.cancel(), []);
  useEffect(() => {
    request.current?.cancel();
    setLines([]);
    setBusy(false);
  }, [variation]);
  async function analyze() {
    if (!checked.ok) return;
    request.current?.cancel();
    const r = engineRequest();
    request.current = r;
    setBusy(true);
    setNotice("");
    try {
      const result = await r.analyze({
        initialFen: variation?.fen ?? checked.fen,
        moves: variation?.moves ?? [],
      });
      if (r.active) setLines(result);
    } catch (e) {
      if (r.active) fail(e);
    } finally {
      if (r.active) setBusy(false);
    }
  }
  async function play() {
    if (!checked.ok) return;
    const g = newGame(profile.id, profile.name, color, "training", 0, 0, 1);
    g.initialFen = variation?.fen ?? checked.fen;
    g.moves = [...(variation?.moves ?? [])];
    g.startPly = g.moves.length;
    const bot = bots.find((b) => b.id === botId)!;
    g.botId = bot.id;
    g.botRating = bot.rating;
    g.headers[color === "w" ? "Black" : "White"] = bot.name[locale];
    const start = new Chess(g.initialFen);
    for (const move of g.moves) playUci(start, move);
    g.result = terminalResult(start);
    await window.chessApp.saveGame(g);
    await refresh();
    nav(g.result === "*" ? "play" : "review", g.id);
  }
  return (
    <>
      <div className="page-heading">
        <button
          className="secondary"
          disabled={!checked.ok}
          onClick={() => {
            if (checked.ok)
              void savePositionStudy(
                profile.id,
                {
                  initialFen: variation?.fen ?? checked.fen,
                  moves: variation?.moves ?? [],
                },
                l("Исследование позиции", "Position study"),
              )
                .then((s) => nav("studies", s.id))
                .catch(fail);
          }}
        >
          {l("Открыть дерево вариантов", "Open variation tree")}
        </button>
        <div>
          <h1>{l("Конструктор позиции", "Position editor")}</h1>
          <p>
            {l(
              "Воссоздай момент из партии, проверь идею и сыграй продолжение.",
              "Rebuild a moment from a game, test an idea and play it out.",
            )}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => setOrientation((v) => (v === "w" ? "b" : "w"))}
        >
          {l("Перевернуть", "Flip")}
        </button>
      </div>
      <PhotoImport
        onImport={(position, bottom) => {
          setDraft(position);
          setOrientation(bottom);
          setNotice("");
          const v = validateDraft(position);
          if (v.ok) setFenText(v.fen);
        }}
      />
      <div className="game-layout editor-layout">
        <section className="board-column">
          {variation && position ? (
            <>
              <CoachCard
                locale={locale}
                san={l("Исследование", "Explore")}
                text={l(
                  "Делай ходы на доске. Исходная расстановка сохранена.",
                  "Make moves on the board. Your setup is preserved.",
                )}
                variant
              />
              <Board
                fen={position.fen()}
                orientation={orientation}
                locale={locale}
                lastMove={variation.moves.at(-1)}
                onMove={(u) =>
                  setVariation({ ...variation, moves: [...variation.moves, u] })
                }
              />
              <button
                className="secondary full"
                onClick={() => setVariation(null)}
              >
                {l("Вернуться к расстановке", "Back to setup")}
              </button>
            </>
          ) : (
            <PositionSetupBoard
              draft={draft}
              orientation={orientation}
              locale={locale}
              onSquare={(s) =>
                setDraft((d) => {
                  const pieces = { ...d.pieces };
                  if (piece) pieces[s] = piece;
                  else delete pieces[s];
                  return { ...d, pieces };
                })
              }
            />
          )}
          <div
            className="editor-palette"
            role="group"
            aria-label={l("Фигуры", "Pieces")}
          >
            {(["w", "b"] as const).map((c) => (
              <div key={c}>
                {(["k", "q", "r", "b", "n", "p"] as const).map((t) => (
                  <button
                    key={t}
                    aria-label={`${c}${t}`}
                    aria-pressed={piece?.color === c && piece.type === t}
                    onClick={() => setPiece({ color: c, type: t })}
                  >
                    <img src={`./pieces/${c}${t.toUpperCase()}.svg`} alt="" />
                  </button>
                ))}
              </div>
            ))}
            <button
              className="secondary"
              aria-pressed={!piece}
              onClick={() => setPiece(null)}
            >
              {l("Ластик", "Eraser")}
            </button>
          </div>
          <div className="editor-actions">
            <button
              className="secondary"
              onClick={() => setDraft(emptyDraft())}
            >
              {l("Очистить доску", "Clear board")}
            </button>
            <button
              className="secondary"
              onClick={() => setDraft(draftFromFen(START))}
            >
              {l("Начальная позиция", "Starting position")}
            </button>
          </div>
        </section>
        <section className="side-panel editor-options">
          <LastMoveReconstruction
            draft={draft}
            onExplore={(p) =>
              setVariation({ fen: p.initialFen, moves: p.moves })
            }
          />
          <label>
            {l("Чей ход", "Side to move")}
            <select
              value={draft.turn}
              onChange={(e) =>
                setDraft({ ...draft, turn: e.target.value as Color })
              }
            >
              <option value="w">{l("Белые", "White")}</option>
              <option value="b">{l("Чёрные", "Black")}</option>
            </select>
          </label>
          <fieldset>
            <legend>{l("Права рокировки", "Castling rights")}</legend>
            <div className="editor-actions">
              {["K", "Q", "k", "q"].map((k) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={draft.castling.includes(k)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        castling: "KQkq"
                          .split("")
                          .filter((v) =>
                            v === k
                              ? e.target.checked
                              : draft.castling.includes(v),
                          )
                          .join(""),
                      })
                    }
                  />
                  {k === "K"
                    ? l("Белые O-O", "White O-O")
                    : k === "Q"
                      ? l("Белые O-O-O", "White O-O-O")
                      : k === "k"
                        ? l("Чёрные O-O", "Black O-O")
                        : l("Чёрные O-O-O", "Black O-O-O")}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            {l("Взятие на проходе", "En passant target")}
            <input
              value={draft.ep}
              maxLength={2}
              onChange={(e) => setDraft({ ...draft, ep: e.target.value })}
            />
          </label>
          <div className="editor-actions">
            <label>
              {l("Полуходы без взятий", "Halfmove clock")}
              <input
                type="number"
                min="0"
                value={draft.halfmove}
                onChange={(e) =>
                  setDraft({ ...draft, halfmove: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {l("Номер хода", "Fullmove number")}
              <input
                type="number"
                min="1"
                value={draft.fullmove}
                onChange={(e) =>
                  setDraft({ ...draft, fullmove: Number(e.target.value) })
                }
              />
            </label>
          </div>
          {!checked.ok && (
            <div role="status" className="editor-errors">
              {checked.errors.map((code) => (
                <p key={code}>
                  {errors[code]?.[locale === "ru" ? 0 : 1] ?? code}
                </p>
              ))}
            </div>
          )}
          <label htmlFor="position-fen">FEN</label>
          <textarea
            id="position-fen"
            aria-label="FEN"
            value={fenText}
            onChange={(e) => setFenText(e.target.value)}
            rows={3}
          />
          <div className="editor-actions">
            <button
              className="secondary"
              onClick={() => {
                try {
                  setDraft(draftFromFen(fenText));
                  setNotice("");
                } catch {
                  setNotice(errors.invalid_fen[locale === "ru" ? 0 : 1]);
                }
              }}
            >
              {l("Импорт FEN", "Import FEN")}
            </button>
            <button
              className="secondary"
              disabled={!checked.ok}
              onClick={() => {
                if (checked.ok) {
                  setFenText(checked.fen);
                  setNotice(
                    l(
                      "FEN подготовлен в поле выше — можно скопировать.",
                      "FEN is ready in the field above to copy.",
                    ),
                  );
                }
              }}
            >
              {l("Экспорт FEN", "Export FEN")}
            </button>
          </div>
          {notice && <p role="status">{notice}</p>}
          <button
            className="primary full"
            disabled={!checked.ok || busy}
            onClick={() => void analyze()}
          >
            {busy
              ? l("Расчёт…", "Analyzing…")
              : l("Анализировать позицию", "Analyze position")}
          </button>
          {lines.map((line, i) => (
            <div key={i}>
              <CoachCard
                locale={locale}
                san={`${i + 1}.`}
                score={line.score}
                text={
                  checked.ok
                    ? pvSan(position?.fen() ?? checked.fen, line.pv, 8)
                    : ""
                }
              />
              {checked.ok && line.pv.length > 0 && (
                <button
                  className="secondary"
                  onClick={() =>
                    setVariation({
                      fen: position?.fen() ?? checked.fen,
                      moves: line.pv.slice(0, 1),
                    })
                  }
                >
                  {l("Исследовать продолжение", "Explore continuation")}
                </button>
              )}
            </div>
          ))}
          <label>
            {l("Соперник", "Opponent")}
            <select value={botId} onChange={(e) => setBotId(e.target.value)}>
              {bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name[locale]} · ≈{b.rating} Elo
                </option>
              ))}
            </select>
          </label>
          <label>
            {l("Твой цвет", "Your colour")}
            <select
              value={color}
              onChange={(e) => setColor(e.target.value as Color)}
            >
              <option value="w">{l("Белые", "White")}</option>
              <option value="b">{l("Чёрные", "Black")}</option>
            </select>
          </label>
          <button
            className="primary"
            disabled={!checked.ok || busy}
            onClick={() => void play().catch(fail)}
          >
            {l("Играть отсюда", "Play from here")}
          </button>
        </section>
      </div>
    </>
  );
}
