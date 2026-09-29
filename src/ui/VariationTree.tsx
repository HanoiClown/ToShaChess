import { useMemo, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import { CornerDownRight, Star, MessageSquare } from "lucide-react";
import { playUci } from "../chess/game";
import type { Locale } from "../shared/contracts";
import type { StudyDocument } from "../study/tree";
export function VariationTree({
  study,
  locale,
  onSelect,
}: {
  study: StudyDocument;
  locale: Locale;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    ru = locale === "ru";
  const rows = useMemo(() => {
    const out: {
      id: string;
      text: string;
      level: number;
      variation: boolean;
    }[] = [
      {
        id: study.rootId,
        text: ru ? "Начало" : "Start",
        level: 1,
        variation: false,
      },
    ];
    const visit = (parentId: string, fen: string, level: number) => {
      const parent = study.nodes[parentId],
        ids = [
          parent.mainChildId,
          ...parent.children.filter((c) => c !== parent.mainChildId),
        ].filter((id): id is string => !!id);
      for (const [index, id] of ids.entries()) {
        const board = new Chess(fen),
          prefix = `${board.moveNumber()}.${board.turn() === "b" ? ".." : ""}`,
          move = playUci(board, study.nodes[id].uci!);
        out.push({
          id,
          text: `${prefix} ${move.san}`,
          level,
          variation: index > 0,
        });
        visit(id, board.fen(), level + (index > 0 ? 1 : 0));
      }
    };
    visit(study.rootId, study.initialFen, 1);
    return out;
  }, [study.nodes, study.rootId, study.initialFen, ru]);
  useEffect(() => {
    const container = ref.current;
    const item = container?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    if (!container || !item) return;
    const row = item.getBoundingClientRect(),
      bounds = container.getBoundingClientRect();
    if (row.top < bounds.top) container.scrollTop -= bounds.top - row.top;
    else if (row.bottom > bounds.bottom)
      container.scrollTop += row.bottom - bounds.bottom;
  }, [study.selectedNodeId]);
  return (
    <div
      className="variation-tree"
      role="tree"
      aria-label={ru ? "Дерево вариантов" : "Variation tree"}
      ref={ref}
    >
      {rows.map((row, index) => {
        const n = study.nodes[row.id];
        return (
          <button
            type="button"
            key={row.id}
            role="treeitem"
            aria-level={row.level}
            aria-selected={study.selectedNodeId === row.id}
            tabIndex={study.selectedNodeId === row.id ? 0 : -1}
            data-node-id={row.id}
            data-kind={n.kind}
            style={{
              paddingInlineStart: `${12 + Math.min(row.level - 1, 5) * 12}px`,
            }}
            onClick={() => onSelect(row.id)}
            onKeyDown={(e) => {
              const target =
                e.key === "ArrowUp"
                  ? rows[index - 1]?.id
                  : e.key === "ArrowDown"
                    ? rows[index + 1]?.id
                    : e.key === "ArrowLeft"
                      ? n.parentId
                      : e.key === "ArrowRight"
                        ? n.mainChildId
                        : e.key === "Home"
                          ? study.rootId
                          : e.key === "End"
                            ? rows.at(-1)?.id
                            : null;
              if (target) {
                e.preventDefault();
                onSelect(target);
                ref.current
                  ?.querySelector<HTMLButtonElement>(
                    `[data-node-id="${target}"]`,
                  )
                  ?.focus({ preventScroll: true });
              }
            }}
          >
            <span>
              {row.variation && (
                <CornerDownRight size={13} aria-hidden="true" />
              )}
              {row.text}
              {n.bookmarked && (
                <Star size={13} aria-label={ru ? "Закладка" : "Bookmark"} />
              )}
              {n.comment && (
                <MessageSquare
                  size={12}
                  aria-label={ru ? "С заметкой" : "Has note"}
                />
              )}
            </span>
            <small>
              {n.kind === "lesson"
                ? ru
                  ? "Урок"
                  : "Lesson"
                : n.kind === "engine"
                  ? ru
                    ? "Расчёт"
                    : "Engine"
                  : ru
                    ? "Моя ветка"
                    : "My line"}
            </small>
          </button>
        );
      })}
    </div>
  );
}
