import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { PieceSymbol } from "chess.js";
import { ImagePlus, RotateCcw } from "lucide-react";
import { useApp } from "./context";
import { PositionSetupBoard } from "./PositionSetupBoard";
import {
  draftFromScan,
  rotateDraft,
  rotateSquare,
} from "../editor/photo-position";
import { validateDraft, type PositionDraft } from "../editor/position-draft";
import type { Color } from "../shared/contracts";
import type { recognizeBoard } from "../editor/photo-recognition";
import "./photo-import.css";

type Crop = { x0: number; y0: number; x1: number; y1: number };
type Scan = NonNullable<Awaited<ReturnType<typeof recognizeBoard>>>;
export function PhotoImport({
  onImport,
}: {
  onImport: (draft: PositionDraft, orientation: Color) => void;
}) {
  const { l, locale } = useApp();
  const [open, setOpen] = useState(false),
    [source, setSource] = useState("");
  const [crop, setCrop] = useState<Crop | null>(null),
    [scan, setScan] = useState<Scan | null>(null);
  const [draft, setDraft] = useState<PositionDraft | null>(null),
    [bottom, setBottom] = useState<Color>("w");
  const [paint, setPaint] = useState("wq"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [imported, setImported] = useState(false),
    [reviewed, setReviewed] = useState<string[]>([]);
  const image = useRef<HTMLImageElement>(null),
    input = useRef<HTMLInputElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null),
    generation = useRef(0),
    url = useRef("");
  useEffect(
    () => () => {
      generation.current++;
      URL.revokeObjectURL(url.current);
    },
    [],
  );

  async function load(file: File) {
    const id = ++generation.current;
    setBusy(false);
    setNotice("");
    if (
      !/^image\/(png|jpeg|webp)$/.test(file.type) ||
      file.size > 20 * 1024 * 1024
    ) {
      setNotice(
        l(
          "Нужен PNG, JPG или WebP до 20 МБ.",
          "Choose a PNG, JPG or WebP up to 20 MB.",
        ),
      );
      return;
    }
    const next = URL.createObjectURL(file),
      probe = new Image();
    probe.src = next;
    try {
      await probe.decode();
      if (id !== generation.current) {
        URL.revokeObjectURL(next);
        return;
      }
      if (
        probe.naturalWidth * probe.naturalHeight > 32_000_000 ||
        Math.min(probe.naturalWidth, probe.naturalHeight) < 128
      )
        throw Error("size");
      URL.revokeObjectURL(url.current);
      url.current = next;
      setSource(next);
      setCrop(null);
      setScan(null);
      setDraft(null);
      setImported(false);
      setOpen(true);
    } catch {
      URL.revokeObjectURL(next);
      if (id === generation.current)
        setNotice(
          l(
            "Не удалось прочитать изображение. Размер: от 128 пикселей по каждой стороне, до 32 Мп.",
            "Could not read this image. Use at least 128 pixels per side, up to 32 megapixels.",
          ),
        );
    }
  }
  useEffect(() => {
    if (!open) return;
    const paste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        e.preventDefault();
        void load(file);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [open]);
  function changeCrop(next: Crop | null) {
    generation.current++;
    setBusy(false);
    setCrop(next);
    setScan(null);
    setDraft(null);
    setNotice("");
  }
  function point(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - box.left) / box.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - box.top) / box.height) * 100)),
    };
  }
  async function recognize() {
    const img = image.current;
    if (!img || !img.complete) return;
    const id = ++generation.current;
    setBusy(true);
    setNotice("");
    setScan(null);
    setDraft(null);
    setReviewed([]);
    setImported(false);
    try {
      const canvas = document.createElement("canvas"),
        scale = Math.min(
          1,
          1600 / Math.max(img.naturalWidth, img.naturalHeight),
        );
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const box = crop
        ? {
            x0: (crop.x0 / 100) * canvas.width,
            y0: (crop.y0 / 100) * canvas.height,
            x1: (crop.x1 / 100) * canvas.width,
            y1: (crop.y1 / 100) * canvas.height,
          }
        : undefined;
      if (box && (box.x1 - box.x0 < 128 || box.y1 - box.y0 < 128))
        throw Error("crop");
      const { recognizeBoard } = await import("../editor/photo-recognition");
      const result = await recognizeBoard(
        ctx.getImageData(0, 0, canvas.width, canvas.height),
        box,
      );
      if (id !== generation.current) return;
      if (!result) {
        setNotice(
          l(
            "Доска не найдена. Выдели её целиком на изображении и попробуй снова.",
            "No board found. Select the entire board in the image and try again.",
          ),
        );
        return;
      }
      const side = result.orientation === "black" ? "b" : "w";
      const initial = draftFromScan(result.placement, side === "b", "w");
      // Check can establish the side to move; otherwise leave the choice to the player.
      if (
        !validateDraft(initial).ok &&
        validateDraft({ ...initial, turn: "b" }).ok
      )
        initial.turn = "b";
      setScan(result);
      setDraft(initial);
      setBottom(side);
    } catch (e) {
      if (id === generation.current)
        setNotice(
          e instanceof Error && e.message === "crop"
            ? l(
                "Выдели всю доску: область должна быть не меньше 128 × 128 пикселей.",
                "Select the whole board: the region must be at least 128 × 128 pixels.",
              )
            : l(
                "Распознавание не удалось. Повтори попытку или расставь фигуры вручную в конструкторе.",
                "Recognition failed. Try again or set up the pieces manually in the editor.",
              ),
        );
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  const uncertain = scan
    ? scan.confidences.flatMap((confidence, i) => {
        const index = bottom === "w" ? i : 63 - i;
        const square = "abcdefgh"[index % 8] + (Math.floor(index / 8) + 1);
        return confidence < 0.7 && !reviewed.includes(square) ? [square] : [];
      })
    : [];
  return (
    <section className="photo-import">
      <button
        className="secondary"
        aria-expanded={open}
        aria-controls="photo-import-panel"
        onClick={() => setOpen(!open)}
      >
        <ImagePlus size={19} />
        {l("Импорт по фото", "Import from image")}
      </button>
      {open && (
        <div
          id="photo-import-panel"
          className="photo-import-panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void load(file);
          }}
        >
          <div className="photo-intro">
            <h2>{l("Из скриншота — на доску", "From screenshot to board")}</h2>
            <p>
              {l(
                "Вставь изображение через Ctrl+V, перетащи сюда или выбери файл. Распознавание работает офлайн, фото никуда не отправляется.",
                "Paste with Ctrl+V, drop an image here or choose a file. Recognition works offline; your image stays on this device.",
              )}
            </p>
          </div>
          <div className="editor-actions">
            <button
              className="secondary"
              onClick={() => input.current?.click()}
            >
              {l("Выбрать изображение", "Choose image")}
            </button>
            <input
              ref={input}
              className="photo-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label={l("Файл с доской", "Board image file")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void load(f);
                e.target.value = "";
              }}
            />
            <span className="muted">
              PNG · JPG · WebP · {l("до 20 МБ", "up to 20 MB")}
            </span>
          </div>
          {source && (
            <div className="photo-workspace">
              <div>
                <div
                  className="photo-preview"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    start.current = point(e);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!start.current) return;
                    const p = point(e),
                      s = start.current;
                    changeCrop({
                      x0: Math.min(s.x, p.x),
                      y0: Math.min(s.y, p.y),
                      x1: Math.max(s.x, p.x),
                      y1: Math.max(s.y, p.y),
                    });
                  }}
                  onPointerUp={(e) => {
                    start.current = null;
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }}
                  onPointerCancel={() => {
                    start.current = null;
                  }}
                >
                  <img
                    ref={image}
                    src={source}
                    draggable={false}
                    alt={l(
                      "Исходное изображение доски",
                      "Original board image",
                    )}
                  />
                  {crop && (
                    <div
                      className="photo-crop"
                      style={{
                        left: `${crop.x0}%`,
                        top: `${crop.y0}%`,
                        width: `${crop.x1 - crop.x0}%`,
                        height: `${crop.y1 - crop.y0}%`,
                      }}
                    />
                  )}
                </div>
                <p className="muted">
                  {l(
                    "Обычно доска находится автоматически. Если нет — выдели мышью внешний край всех 64 полей, без рамки.",
                    "The board is usually found automatically. Otherwise drag around the outside of all 64 squares, excluding the border.",
                  )}
                </p>
                <details className="photo-crop-fields">
                  <summary>
                    {l(
                      "Границы выделения с клавиатуры (%)",
                      "Set crop using keyboard (%)",
                    )}
                  </summary>
                  <div className="editor-actions">
                    {(["x0", "y0", "x1", "y1"] as const).map((key, i) => (
                      <label key={key}>
                        {
                          [
                            l("Слева", "Left"),
                            l("Сверху", "Top"),
                            l("Справа", "Right"),
                            l("Снизу", "Bottom"),
                          ][i]
                        }
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={
                            Math.round(
                              (crop ?? { x0: 0, y0: 0, x1: 100, y1: 100 })[
                                key
                              ] * 10,
                            ) / 10
                          }
                          onChange={(e) =>
                            changeCrop({
                              ...(crop ?? { x0: 0, y0: 0, x1: 100, y1: 100 }),
                              [key]: Math.max(
                                0,
                                Math.min(100, Number(e.target.value)),
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </details>
                <div className="editor-actions">
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => void recognize()}
                  >
                    {busy
                      ? l("Распознаю…", "Reading board…")
                      : l("Распознать доску", "Recognize board")}
                  </button>
                  <button
                    className="secondary"
                    disabled={!crop}
                    onClick={() => changeCrop(null)}
                  >
                    <RotateCcw size={16} />
                    {l("Автообрезка", "Automatic crop")}
                  </button>
                </div>
              </div>
              <div className="photo-result" aria-busy={busy}>
                {!draft && (
                  <p className="muted">
                    {l(
                      "Подходят 2D-скриншоты и диаграммы. Надписи, стрелки и значки могут закрывать фигуры. Фото настоящей доски под углом пока не поддерживаются.",
                      "Use 2D screenshots and diagrams. Text, arrows and badges may cover pieces. Photos of a physical board at an angle are not supported yet.",
                    )}
                  </p>
                )}
                {draft && scan && (
                  <>
                    <h3>{l("Проверь расстановку", "Check the position")}</h3>
                    <p role="status">
                      {uncertain.length
                        ? l(
                            `Проверь отмеченные знаком ? поля: ${uncertain.join(", ")}.`,
                            `Check the squares marked ?: ${uncertain.join(", ")}.`,
                          )
                        : l(
                            "Сравни все фигуры с оригиналом: уверенное распознавание тоже может ошибаться.",
                            "Compare all pieces with the original: even confident recognition can be wrong.",
                          )}
                    </p>
                    <div className="editor-actions">
                      <label>
                        {l("Снизу на фото", "Bottom of the image")}
                        <select
                          value={bottom}
                          onChange={(e) => {
                            const b = e.target.value as Color;
                            setBottom(b);
                            setDraft(rotateDraft(draft));
                            setReviewed(reviewed.map(rotateSquare));
                            setImported(false);
                          }}
                        >
                          <option value="w">{l("Белые", "White")}</option>
                          <option value="b">{l("Чёрные", "Black")}</option>
                        </select>
                      </label>
                      <label>
                        {l("Ход после снимка", "Next to move")}
                        <select
                          value={draft.turn}
                          onChange={(e) => {
                            setDraft({
                              ...draft,
                              turn: e.target.value as Color,
                            });
                            setImported(false);
                          }}
                        >
                          <option value="w">{l("Белые", "White")}</option>
                          <option value="b">{l("Чёрные", "Black")}</option>
                        </select>
                      </label>
                    </div>
                    <PositionSetupBoard
                      draft={draft}
                      orientation={bottom}
                      locale={locale}
                      uncertain={uncertain}
                      onSquare={(s) => {
                        const pieces = { ...draft.pieces };
                        if (paint === "erase") delete pieces[s];
                        else
                          pieces[s] = {
                            color: paint[0] as Color,
                            type: paint[1] as PieceSymbol,
                          };
                        setDraft({ ...draft, pieces });
                        setReviewed([...reviewed, s]);
                        setImported(false);
                      }}
                    />
                    <label>
                      {l(
                        "Исправление: выбери фигуру и нажми поле",
                        "Correction: choose a piece, then click a square",
                      )}
                      <select
                        value={paint}
                        onChange={(e) => setPaint(e.target.value)}
                      >
                        <option value="erase">
                          {l("Пустое поле / ластик", "Empty square / eraser")}
                        </option>
                        {(["w", "b"] as const).flatMap((c) =>
                          ["k", "q", "r", "b", "n", "p"].map((p, i) => (
                            <option key={c + p} value={c + p}>
                              {c === "w"
                                ? l("Белые", "White")
                                : l("Чёрные", "Black")}{" "}
                              ·{" "}
                              {
                                [
                                  l("король", "king"),
                                  l("ферзь", "queen"),
                                  l("ладья", "rook"),
                                  l("слон", "bishop"),
                                  l("конь", "knight"),
                                  l("пешка", "pawn"),
                                ][i]
                              }
                            </option>
                          )),
                        )}
                      </select>
                    </label>
                    <p className="muted">
                      {l(
                        "Ориентация предположена по фигурам — проверь координаты. Рокировка и взятие на проходе по фото неизвестны: они отключены, их можно задать в конструкторе.",
                        "Orientation is estimated from the pieces; check the coordinates. Castling and en passant cannot be known from an image: they start disabled and can be set in the editor.",
                      )}
                    </p>
                    <button
                      className="primary full"
                      onClick={() => {
                        onImport(draft, bottom);
                        setImported(true);
                        setOpen(false);
                      }}
                    >
                      {l("Перенести в конструктор", "Use in position editor")}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {notice && (
            <p role="alert" className="photo-notice">
              {notice}
            </p>
          )}
        </div>
      )}
      {imported && !open && (
        <p role="status" className="muted">
          {l(
            "Позиция перенесена. Проверь очередь хода и фигуры. Ниже можно восстановить последний ход или открыть дерево вариантов.",
            "Position imported. Check the pieces and side to move. Reconstruct the last move below or open the variation tree.",
          )}
        </p>
      )}
    </section>
  );
}
