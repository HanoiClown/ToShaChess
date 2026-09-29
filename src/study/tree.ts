import { Chess } from "chess.js";
import { boardAt, playUci, START } from "../chess/game";
import type { Locale, Position } from "../shared/contracts";
import type { CourseSource } from "../library/courses";
import { STUDY_LIMITS } from "./limits";
export { STUDY_LIMITS } from "./limits";
export type StudyExplanation = {
  short: Record<Locale, string>;
  detail?: Record<Locale, string>;
  sources?: CourseSource[];
};
export type StudyNode = {
  id: string;
  parentId: string | null;
  uci: string | null;
  children: string[];
  mainChildId: string | null;
  kind: "lesson" | "personal" | "engine";
  comment: string;
  bookmarked: boolean;
  explanation?: StudyExplanation;
};
export type StudyDocument = {
  version: 1;
  id: string;
  profileId: string;
  title: string;
  initialFen: string;
  rootId: string;
  selectedNodeId: string;
  nodes: Record<string, StudyNode>;
  headers: Record<string, string>;
  sourceKey?: string;
  createdAt: string;
  updatedAt: string;
};
export function createStudy(input: {
  profileId: string;
  title: string;
  initialFen?: string;
  sourceKey?: string;
}): StudyDocument {
  const rootId = crypto.randomUUID(),
    now = new Date().toISOString();
  const initialFen = new Chess(input.initialFen ?? START).fen();
  return {
    version: 1,
    id: crypto.randomUUID(),
    profileId: input.profileId,
    title: input.title,
    initialFen,
    rootId,
    selectedNodeId: rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        parentId: null,
        uci: null,
        children: [],
        mainChildId: null,
        kind: "personal",
        comment: "",
        bookmarked: false,
      },
    },
    headers: {},
    sourceKey: input.sourceKey,
    createdAt: now,
    updatedAt: now,
  };
}
export function studyPath(
  study: StudyDocument,
  nodeId = study.selectedNodeId,
): StudyNode[] {
  const path: StudyNode[] = [],
    seen = new Set<string>();
  let node = study.nodes[nodeId];
  if (!node) throw Error("study_invalid_node");
  while (node.parentId !== null) {
    if (seen.has(node.id) || path.length >= STUDY_LIMITS.depth)
      throw Error("study_depth");
    seen.add(node.id);
    path.unshift(node);
    node = study.nodes[node.parentId];
    if (!node) throw Error("study_invalid_node");
  }
  if (node.id !== study.rootId) throw Error("study_invalid_tree");
  return path;
}
export function getStudyPosition(
  study: StudyDocument,
  nodeId = study.selectedNodeId,
): Position {
  return {
    initialFen: study.initialFen,
    moves: studyPath(study, nodeId).map((n) => n.uci!),
  };
}
export function selectStudyNode(
  study: StudyDocument,
  id: string,
): StudyDocument {
  if (!study.nodes[id]) throw Error("study_invalid_node");
  return { ...study, selectedNodeId: id };
}
export function addStudyMove(
  study: StudyDocument,
  parentId: string,
  uci: string,
  kind: StudyNode["kind"] = "personal",
): StudyDocument {
  const parent = study.nodes[parentId];
  if (!parent) throw Error("study_invalid_node");
  const position = getStudyPosition(study, parentId);
  if (position.moves.length >= STUDY_LIMITS.depth) throw Error("study_depth");
  const move = playUci(boardAt(position), uci),
    legal = move.from + move.to + (move.promotion ?? "");
  const existing = parent.children.find((id) => study.nodes[id].uci === legal);
  if (existing) return selectStudyNode(study, existing);
  if (Object.keys(study.nodes).length >= STUDY_LIMITS.nodes)
    throw Error("study_size");
  const id = crypto.randomUUID();
  return {
    ...study,
    selectedNodeId: id,
    updatedAt: new Date().toISOString(),
    nodes: {
      ...study.nodes,
      [parentId]: {
        ...parent,
        children: [...parent.children, id],
        mainChildId: parent.mainChildId ?? id,
      },
      [id]: {
        id,
        parentId,
        uci: legal,
        children: [],
        mainChildId: null,
        kind,
        comment: "",
        bookmarked: false,
      },
    },
  };
}
export function updateStudyNode(
  study: StudyDocument,
  id: string,
  patch: Partial<
    Pick<StudyNode, "comment" | "bookmarked" | "explanation" | "kind">
  >,
): StudyDocument {
  if (!study.nodes[id]) throw Error("study_invalid_node");
  if (
    patch.comment !== undefined &&
    patch.comment.length > STUDY_LIMITS.comment
  )
    throw Error("study_comment_size");
  return {
    ...study,
    updatedAt: new Date().toISOString(),
    nodes: { ...study.nodes, [id]: { ...study.nodes[id], ...patch } },
  };
}
export function setStudyMainLine(
  study: StudyDocument,
  id: string,
): StudyDocument {
  const node = study.nodes[id];
  if (!node) throw Error("study_invalid_node");
  if (!node.parentId) return study;
  return {
    ...study,
    updatedAt: new Date().toISOString(),
    nodes: {
      ...study.nodes,
      [node.parentId]: { ...study.nodes[node.parentId], mainChildId: id },
    },
  };
}
export function studyError(error: unknown, locale: Locale) {
  const message = String((error as Error)?.message ?? error);
  const messages: Record<string, [string, string]> = {
    study_size: [
      "Исследование слишком большое (до 4096 позиций).",
      "A study may contain at most 4,096 positions.",
    ],
    study_depth: [
      "Ветка слишком длинная (до 512 полуходов).",
      "A branch may contain at most 512 plies.",
    ],
    study_pgn_size: [
      "PGN слишком большой (до 1 МБ).",
      "PGN must be smaller than 1 MB.",
    ],
    study_pgn_invalid: [
      "Не удалось прочитать PGN. Проверь ходы, скобки и комментарии; импортируй одну партию.",
      "Cannot read PGN. Check moves, parentheses and comments; import one game.",
    ],
    study_pgn_nesting: [
      "Слишком много вложенных вариантов PGN (до 64).",
      "PGN may contain at most 64 nested variations.",
    ],
    study_invalid_tree: [
      "Дерево вариантов повреждено; исходные данные сохранены.",
      "The variation tree is invalid; original data is preserved.",
    ],
  };
  return (
    messages[message]?.[locale === "ru" ? 0 : 1] ??
    (locale === "ru"
      ? "Не удалось выполнить действие с исследованием."
      : "The study action could not be completed.")
  );
}
export { validateStudy } from "./validation";
