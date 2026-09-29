import { z } from "zod";
import { Chess } from "chess.js";
import { playUci } from "../chess/game";
import type { StudyDocument } from "./tree";
import { STUDY_LIMITS } from "./limits";
const id = z
  .string()
  .max(100)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const text = z.string().max(STUDY_LIMITS.comment);
const bilingual = z.object({ ru: text, en: text });
const source = z.object({
  label: z.string().max(300),
  url: z
    .string()
    .max(2000)
    .url()
    .refine((s) => /^https?:\/\//.test(s)),
  license: z.string().max(100).optional(),
});
const node = z.object({
  id,
  parentId: id.nullable(),
  uci: z
    .string()
    .regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)
    .nullable(),
  children: z.array(id).max(218),
  mainChildId: id.nullable(),
  kind: z.enum(["lesson", "personal", "engine"]),
  comment: text,
  bookmarked: z.boolean(),
  explanation: z
    .object({
      short: bilingual,
      detail: bilingual.optional(),
      sources: z.array(source).max(20).optional(),
    })
    .optional(),
});
const schema = z.object({
  version: z.literal(1),
  id,
  profileId: id,
  title: z.string().trim().min(1).max(200),
  initialFen: z.string().max(200),
  rootId: id,
  selectedNodeId: id,
  nodes: z.record(id, node),
  headers: z
    .record(
      z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/),
      z.string().max(2000),
    )
    .default({}),
  sourceKey: z.string().max(200).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export function validateStudy(input: unknown): StudyDocument {
  const data = schema.parse(input),
    keys = Object.keys(data.nodes);
  if (!keys.length || keys.length > STUDY_LIMITS.nodes)
    throw Error("study_size");
  if (Object.keys(data.headers).length > 100) throw Error("study_size");
  const root = data.nodes[data.rootId];
  if (
    !root ||
    root.parentId !== null ||
    root.uci !== null ||
    !data.nodes[data.selectedNodeId]
  )
    throw Error("study_invalid_tree");
  const visited = new Set<string>(),
    stack = [
      { id: data.rootId, fen: new Chess(data.initialFen).fen(), depth: 0 },
    ];
  while (stack.length) {
    const item = stack.pop()!,
      current = data.nodes[item.id];
    if (
      !current ||
      visited.has(item.id) ||
      current.id !== item.id ||
      new Set(current.children).size !== current.children.length
    )
      throw Error("study_invalid_tree");
    if (item.depth > STUDY_LIMITS.depth) throw Error("study_depth");
    visited.add(item.id);
    if (
      current.children.length
        ? !current.mainChildId ||
          !current.children.includes(current.mainChildId)
        : current.mainChildId !== null
    )
      throw Error("study_invalid_tree");
    const moves = new Set<string>();
    for (const childId of current.children) {
      const child = data.nodes[childId];
      if (
        !child ||
        child.parentId !== item.id ||
        !child.uci ||
        moves.has(child.uci)
      )
        throw Error("study_invalid_tree");
      const board = new Chess(item.fen);
      playUci(board, child.uci);
      moves.add(child.uci);
      stack.push({ id: childId, fen: board.fen(), depth: item.depth + 1 });
    }
  }
  if (visited.size !== keys.length) throw Error("study_invalid_tree");
  return data;
}
